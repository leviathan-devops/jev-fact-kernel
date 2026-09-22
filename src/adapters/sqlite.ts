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
    // EVERY PRIMARY-KEY COLUMN, NOT JUST THE FIRST. `PRAGMA table_info.pk` is the 1-based ORDINAL
    // WITHIN the key, so `.find(c => c.pk === 1)` picks one column of a composite key — and when that
    // column's value REPEATS across rows, every one of them collapses onto the same ref.
    // MEASURED: a `PRIMARY KEY (a,b)` table with a=1 for four rows (b=0..3) produced ONE indexed file
    // at `#pairs/1` while the ingest reported `rows=4 changed=4` — four rows became one, silently.
    // (The audit's own example, `(a,b)` with distinct `a`, does NOT collide — so the finding was
    // right about the mechanism and its example was the benign case; the defect is real and the probe
    // had to construct the colliding input.) The composite key is joined with `/`, which no column
    // value can contain after the ref's own escaping. Found by the audit (sqlite:45).
    const pkCols = (db.query(`PRAGMA table_info(${quoteIdent(table)})`).all() as { name: string; pk: number }[])
      .filter((c) => c.pk > 0)
      .sort((a, b) => a.pk - b.pk)
      .map((c) => c.name);
    const stmt = db.query(
      pkCols.length > 0
        ? `SELECT * FROM ${quoteIdent(table)} LIMIT ?`
        : `SELECT rowid AS "__jm_rowid", * FROM ${quoteIdent(table)} LIMIT ?`,
    );
    for (const raw of stmt.all(limit) as Record<string, unknown>[]) {
      const row = { ...raw };
      const rowid = row.__jm_rowid;
      delete row.__jm_rowid;                    // identity, not content: keep it out of the FTS text
      let text = rowText(table, row);
      if (text.length > maxText) text = text.slice(0, maxText);
      const pk = pkCols.length > 0 ? pkCols.map((c) => String(row[c])).join("/") : String(rowid ?? "");
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
