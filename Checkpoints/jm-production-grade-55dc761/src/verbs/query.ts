// src/verbs/query.ts — the query verb: --where (restricted predicate) · --fts · --tag.
import type { Database } from "bun:sqlite";

export interface QueryOpts { where?: string; fts?: string; tag?: string; limit?: number; }

const COLS = new Set(["size", "mtime", "kind", "state", "path", "sha256", "text_indexed"]);
// A WHITELIST, not an identity map. As an identity map this was dead weight AND a latent trap:
// `OPS[op]` yields `undefined` for any op not in the object, which would interpolate the literal
// word "undefined" into the SQL (the regex currently prevents it, but the guard was in the wrong
// place). Checking membership and using `op` directly says what it means.
const OPS = new Set([">=", "<=", "!=", ">", "<", "="]);
// THE NUMERIC COLUMNS, and why the distinction is load-bearing (audit-by-probe, found while proving
// the operator skill: `--where 'size>>>'` exited 0 with EMPTY output). The parser accepted `>>` as
// the VALUE because `(.+)` is greedy, and then bound it as a STRING — producing `f.size > '>>'`.
// **SQLite orders TEXT ABOVE INTEGER, so that comparison is FALSE for every row**, and the operator
// gets an empty result at exit 0 that is indistinguishable from "no matches". Measured:
//   `size > 0` -> 1 row · `size > '>>'` -> 0 rows · `size > '10 AND'` -> 0 rows
// Same class as D-009/D-028/D-054: a malformed input answered as an empty success. A value for a
// NUMERIC column must BE a number, or the query refuses by name.
const NUMERIC_COLS: Record<string, true> = { size: true, mtime: true, text_indexed: true };

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
    const numeric = /^-?\d+(\.\d+)?$/.test(String(val));
    if (numeric) val = Number(val);
    // A NUMERIC COLUMN NEEDS A NUMERIC VALUE (see NUMERIC_COLS above). Without this, `size>>>`
    // bound `">>"` as a string, and SQLite's TEXT-above-INTEGER ordering made the predicate FALSE
    // for every row — an empty result at exit 0, indistinguishable from "no matches".
    if (NUMERIC_COLS[col] === true && !numeric) {
      throw new Error(`JM_WHERE_VALUE: "${col}" is numeric, so "${rawVal.trim()}" is not a comparable value`);
    }
    clauses.push(`f.${col} ${op} ?`); params.push(val);
  }
  return { sql: clauses.join(" AND "), params };
}

export interface QueryRow {
  path: string; size: number; mtime: number; kind: string | null; state: string; sha256: string | null;
  /** BM25 relevance for an FTS query (LOWER = better in SQLite's bm25(); absent for a non-FTS
   *  query, which is ordered by size). Surfaced so callers do not have to re-derive a rank. */
  rank?: number;
}

export function queryIndex(db: Database, opts: QueryOpts = {}): QueryRow[] {
  const rawLimit = opts.limit ?? 50;
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.floor(Math.min(rawLimit, 10_000)) : 50;   // NaN/negative/float -> default (LIMIT -1 would mean unlimited)
  const params: Bind[] = [];
  let sql: string;
  // AN OPERATOR-FACING FTS QUERY IS FORGIVING (the second half of the same defect). FTS5's tokenizer
  // splits on `_`, `-` and `.`, so `--fts ttsr_injection` searched for a SINGLE token that does not
  // exist and returned NOTHING while the text sat indexed — the exact "point at X, find all Y" case
  // failing silently. MEASURED: `ttsr_injection` → 0 rows; `ttsr AND injection` → 22. So a BARE
  // IDENTIFIER (no FTS operators, no quotes) containing a separator is translated into its parts
  // ANDed together — which is what a person typing an identifier means. Anything that already looks
  // like an FTS expression is passed through untouched, so the query language stays available.
  const ftsQuery = (() => {
    const raw = opts.fts ?? "";
    const looksLikeExpression = /["'*()]|\b(AND|OR|NOT|NEAR)\b/i.test(raw);
    if (looksLikeExpression) return raw;
    const parts = raw.split(/[^A-Za-z0-9]+/).filter((t) => t.length > 0);
    if (parts.length <= 1) return raw;
    return parts.map((p) => `"${p}"`).join(" AND ");
  })();
  if (opts.fts) {
    // THE JOIN GOES THROUGH `docs`, NOT BY PATH (a bug this fix's own change introduced). The previous
    // form was `docs_fts x JOIN files f ON f.path = x.path` — correct while every doc's path WAS the
    // file's path, and WRONG the moment large files began being CHUNKED (`rel#c0`, `rel#c1`, …): chunk
    // rows never match `f.path`, so a chunked file's text became searchable in the index and
    // **invisible through `query --fts`**. MEASURED on the GI session directory: 0 of 313 chunked fts
    // rows joined, and `--fts ttsr_injection` returned nothing while raw `MATCH` returned 18.
    //
    // ONE JOIN, NO AGGREGATION. `bm25()` must be called with the FTS table in scope and cannot be
    // aggregated (SQLite: "unable to use function bm25 in the requested context"), so a chunked file
    // legitimately yields SEVERAL rows — one per matching chunk. That is honest for a search result
    // (the path carries its `#cN`, so the operator sees WHICH part matched) and it keeps the query a
    // single flat SELECT that every downstream clause can extend. A plain (non-chunked) file still
    // yields exactly one row, so nothing changes for the common case.
    sql = `SELECT f.path, f.size, f.mtime, f.kind, f.state, f.sha256, bm25(docs_fts) AS rank
             FROM docs_fts
             JOIN docs d ON d.path = docs_fts.path
             JOIN files f ON f.id = d.file_id
            WHERE docs_fts MATCH ? AND f.state != 'gone'`;
    params.push(ftsQuery);
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
  // FTS ORDERS BY RELEVANCE, SCANS BY SIZE. No GROUP BY: a chunked file yields one row per matching
  // chunk on purpose (the path carries its `#cN`, so the operator sees WHICH part hit), and grouping
  // would require aggregating `bm25()`, which SQLite refuses in any context but the plain SELECT.
  const order = opts.fts ? ` ORDER BY rank` : ` ORDER BY f.size DESC`;
  sql += order + ` LIMIT ?`; params.push(limit);   // bound, never interpolated
  try {
    return db.query(sql).all(...params) as QueryRow[];
  } catch (err) {
    // An FTS5 MATCH expression is a QUERY LANGUAGE and the phrase comes from the user. Malformed
    // syntax ("split-brain", "x OR", "NEAR(", "table:col", "*") used to leak a raw SQLiteError at
    // exit 1 - the wrong code for a client error, carrying driver internals. Name it and help.
    // (D-023, found by the adversarial pass over the post-W1 surfaces.)
    const m = String(err);
    if (opts.fts && /fts5|MATCH|parse error|no such column|unterminated|syntax error/i.test(m)) {
      throw new Error(`JM_FTS_INVALID: "${opts.fts}" is not a valid FTS5 expression - quote a literal phrase in double quotes (\"split-brain\") and use AND/OR/NEAR only between quoted terms [${m.slice(0, 80)}]`);
    }
    throw err;
  }
}
