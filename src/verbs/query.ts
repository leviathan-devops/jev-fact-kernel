// src/verbs/query.ts — the query verb: --where (restricted predicate) · --fts · --tag.
import type { Database } from "bun:sqlite";

export interface QueryOpts { where?: string; fts?: string; tag?: string; limit?: number; }

const COLS = new Set(["size", "mtime", "kind", "state", "path", "sha256", "text_indexed"]);
// A WHITELIST, not an identity map. As an identity map this was dead weight AND a latent trap:
// `OPS[op]` yields `undefined` for any op not in the object, which would interpolate the literal
// word "undefined" into the SQL (the regex currently prevents it, but the guard was in the wrong
// place). Checking membership and using `op` directly says what it means.
const OPS = new Set([">=", "<=", "!=", ">", "<", "="]);

/** Parse `col op value [AND col op value]` — whitelisted columns/ops only. */
type Bind = string | number;
function parseWhere(expr: string): { sql: string; params: Bind[] } {
  const parts = expr.split(/\s+AND\s+/i);
  const clauses: string[] = []; const params: Bind[] = [];
  for (const part of parts) {
    const m = part.trim().match(/^([a-z_]+)\s*(>=|<=|!=|=|>|<)\s*(.+)$/i);
    if (!m) throw new Error(`JM_WHERE_INVALID: cannot parse "${part.trim()}"`);
    const [, col, op, rawVal] = m;
    if (!COLS.has(col)) throw new Error(`JM_WHERE_COLUMN: "${col}" is not queryable`);
    if (!OPS.has(op)) throw new Error(`JM_WHERE_OP: "${op}" is not a supported operator`);   // loud, never `undefined` in the SQL
    let val: Bind = rawVal.trim().replace(/^['"]|['"]$/g, "");
    if (/^-?\d+(\.\d+)?$/.test(String(val))) val = Number(val);
    clauses.push(`f.${col} ${op} ?`); params.push(val);
  }
  return { sql: clauses.join(" AND "), params };
}

export interface QueryRow { path: string; size: number; mtime: number; kind: string | null; state: string; sha256: string | null; }

export function queryIndex(db: Database, opts: QueryOpts = {}): QueryRow[] {
  const rawLimit = opts.limit ?? 50;
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.floor(Math.min(rawLimit, 10_000)) : 50;   // NaN/negative/float -> default (LIMIT -1 would mean unlimited)
  const params: Bind[] = [];
  let sql: string;
  if (opts.fts) {
    sql = `SELECT f.path, f.size, f.mtime, f.kind, f.state, f.sha256
             FROM docs_fts x JOIN files f ON f.path = x.path
            WHERE docs_fts MATCH ? AND f.state != 'gone'`;
    params.push(opts.fts);
  } else {
    sql = `SELECT f.path, f.size, f.mtime, f.kind, f.state, f.sha256 FROM files f WHERE f.state != 'gone'`;
  }
  if (opts.where) {
    const w = parseWhere(opts.where);
    sql += ` AND ${w.sql}`; params.push(...w.params);
  }
  if (opts.tag) {
    if (!opts.tag.includes("=")) throw new Error(`JM_TAG_INVALID: "${opts.tag}" (expected name=value)`);
    const eq = opts.tag.indexOf("=");
    const k = opts.tag.slice(0, eq), v = opts.tag.slice(eq + 1);   // value may itself contain '='
    sql += ` AND f.path IN (SELECT path FROM tags WHERE name = ? AND value = ?)`;
    params.push(k, v);
  }
  const order = opts.fts ? ` ORDER BY bm25(docs_fts)` : ` ORDER BY f.size DESC`;
  sql += order + ` LIMIT ?`; params.push(limit);   // bound, never interpolated   // FTS by relevance, scans by size
  return db.query(sql).all(...params) as QueryRow[];
}
