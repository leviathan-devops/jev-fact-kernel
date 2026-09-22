// src/adapters/sqlite.ts — W2: attach a SQLite source READ-ONLY and enumerate its rows.
// LAW: the adapter never writes to the source (the source DB's mtime must be unchanged).
import { Database } from "bun:sqlite";
import { existsSync, statSync } from "node:fs";

export interface SqliteTable { name: string; rows: number; columns: string[]; }
export interface SqliteRow { table: string; pk: string | null; row: Record<string, unknown>; text: string; }

/** Open a source DB read-only (bun:sqlite `readonly` — no accidental writes). */
export function openSource(path: string): Database {
  if (!existsSync(path)) throw new Error(`JM_SQLITE_MISSING: ${path}`);
  const db = new Database(path, { readonly: true });
  db.run("PRAGMA busy_timeout = 5000");
  return db;
}

export function listTables(db: Database): string[] {
  const rows = db.query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all() as { name: string }[];
  return rows.map((r) => r.name);
}

export function tableInfo(db: Database, table: string): SqliteTable {
  const cols = db.query(`PRAGMA table_info(${quoteIdent(table)})`).all() as { name: string; pk: number }[];
  const count = db.query(`SELECT COUNT(*) AS n FROM ${quoteIdent(table)}`).get() as { n: number };
  return { name: table, rows: count.n, columns: cols.map((c) => c.name) };
}

/** Render one row as indexable text (column: value pairs) for FTS. */
export function rowText(table: string, row: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(row)) {
    if (v === null || v === undefined) continue;
    const s = typeof v === "string" ? v : JSON.stringify(v);
    if (s.length === 0) continue;
    parts.push(`${k}: ${s.slice(0, 4000)}`);
  }
  return parts.join("\n");
}

/** Enumerate rows from the named tables, capped per table (bounded state, bible L2). */
export function* rowsOf(db: Database, tables: string[], opts: { limitPerTable?: number; maxTextBytes?: number } = {}): Generator<SqliteRow> {
  const limit = opts.limitPerTable ?? 10_000;
  const maxText = opts.maxTextBytes ?? 65_536;
  for (const table of tables) {
    const pkCol = (db.query(`PRAGMA table_info(${quoteIdent(table)})`).all() as { name: string; pk: number }[]).find((c) => c.pk === 1)?.name ?? null;
    // EVERY ROW NEEDS AN IDENTITY, AND A TABLE WITHOUT AN EXPLICIT PRIMARY KEY STILL HAS ONE: its
    // `rowid`. `SELECT *` never returns `rowid`, so `pk` was `null` for every row of such a table and
    // the downstream ref collapsed to the constant "0" — MEASURED: five rows in a PK-less table
    // produced ONE indexed file at `#notes/0`, while the ingest reported `rows=5 changed=5`. Silent
    // data loss reported as success, on a table shape that is entirely ordinary. Found by the audit
    // (H-2). (`WITHOUT ROWID` tables always declare a PK, so the fallback is always available here.)
    const stmt = db.query(
      pkCol
        ? `SELECT * FROM ${quoteIdent(table)} LIMIT ?`
        : `SELECT rowid AS "__jm_rowid", * FROM ${quoteIdent(table)} LIMIT ?`,
    );
    for (const raw of stmt.all(limit) as Record<string, unknown>[]) {
      const row = { ...raw };
      const rowid = row.__jm_rowid;
      delete row.__jm_rowid;                    // identity, not content: keep it out of the FTS text
      let text = rowText(table, row);
      if (text.length > maxText) text = text.slice(0, maxText);
      const pk = pkCol ? String(row[pkCol]) : String(rowid ?? "");
      yield { table, pk, row, text };
    }
  }
}

export const quoteIdent = (name: string): string => `"${name.replace(/"/g, '""')}"`;

/** A source fingerprint: path + size + mtime — the read-only proof reads this before and after. */
export function sourceStat(path: string): { size: number; mtimeMs: number } {
  const st = statSync(path);
  return { size: st.size, mtimeMs: st.mtimeMs };
}
