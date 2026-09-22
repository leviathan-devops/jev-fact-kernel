// src/verbs/scan.ts — W3/S9: seeds -> candidates. Deterministic, keyless, no model.
// A scan is the CANDIDATE GENERATOR: it narrows the corpus with lexemes/regex/BM25 and hands
// rows to filter/find. It never decides anything — that is filter's and the judge's job.
import type { Database } from "bun:sqlite";
import { queryIndex, type QueryRow } from "./query.ts";

export interface ScanOpts {
  lex?: string;              // FTS5 MATCH expression (the seed)
  re?: string;               // an optional regex gate over the row's TEXT (not just the path)
  where?: string;            // a row predicate
  limit?: number;            // candidates to return (default 200, cap 10000)
  candidateLimit?: number;   // rows pulled from the index before the regex gate (default 10x limit)
}

/** How much text surrounds a regex hit in the excerpt. */
const EXCERPT_BEFORE = 60;
const EXCERPT_AFTER = 140;
/** The excerpt length when no regex gate ran (there is no hit to centre on). */
const EXCERPT_HEAD = 140;

export interface Candidate {
  path: string;
  size: number;
  state: string;
  /** The ORDERING key the scan actually sorts on: the regex hit count when a gate ran, else 1.
   *  This is NOT a relevance score — an audit found the old comment claimed "BM25 rank-derived",
   *  which was never true. The real BM25 value is `rank` when the scan used an FTS seed. */
  score: number;
  /** SQLite bm25() for an FTS-seeded scan (LOWER = better), absent for a --where-only scan. */
  rank?: number;
  hits: number;              // regex hit count over the row text
  excerpt: string;           // the first hit's context, so a human sees WHY it matched
}

export interface ScanResult {
  candidates: Candidate[];
  scanned: number;           // rows the index produced before the regex gate
  returned: number;
  truncated: boolean;
  reApplied: boolean;
  ms: number;
}

const MAX_LIMIT = 10_000;

/** Scan the index for candidates. Deterministic and keyless (C11). */
export function scanIndex(db: Database, opts: ScanOpts = {}): ScanResult {
  const t0 = Date.now();
  const rawLimit = opts.limit ?? 200;
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.floor(Math.min(rawLimit, MAX_LIMIT)) : 200;
  const pull = Math.min((opts.candidateLimit ?? limit * 10), MAX_LIMIT);

  let rows: QueryRow[];
  if (opts.lex) rows = queryIndex(db, { fts: opts.lex, where: opts.where, limit: pull });
  else rows = queryIndex(db, { where: opts.where, limit: pull });

  let re: RegExp | null = null;
  if (opts.re) {
    // A USER-SUPPLIED PATTERN IS AN AVAILABILITY BOUNDARY (audit scan.ts:59). `new RegExp(re)` runs
    // against arbitrary document text with no complexity guard, so a catastrophically backtracking
    // pattern hangs the process. MEASURED: `/(a+)+$/` against 28 `a`s + `!` takes **356 ms**, and
    // the cost is EXPONENTIAL — ~40 characters is minutes, and the input is the caller's documents.
    // JavaScript has no regex timeout, so the guard has to be STATIC: refuse the nested-quantifier
    // shape that produces super-linear backtracking. **This is a heuristic, not a proof** — it
    // catches the classic `(a+)+`, `(a*)*`, `(a|a)*`, `a++` family, and a pattern it misses is
    // still bounded by the document text it runs against. The alternative is a silent hang.
    const nestedQuantifier = /\((?:[^()\\]|\\.)*[+*][^()]*\)[+*{]|[+*]{2}|\(\?(?:[^)]*)\)[+*]/;
    if (nestedQuantifier.test(opts.re)) {
      throw new Error(`JM_SCAN_RE_UNSAFE: the pattern contains a nested quantifier, which backtracks catastrophically (measured: 356 ms at 28 characters, exponential beyond) — rewrite it without a quantified group that itself repeats`);
    }
    try { re = new RegExp(opts.re, "i"); }
    catch (err) { throw new Error(`JM_SCAN_RE_INVALID: ${String(err).slice(0, 120)}`); }   // LOUD: a bad regex is a client error
  }

  const candidates: Candidate[] = [];
  const textStmt = db.query("SELECT text FROM docs WHERE path = ?");
  for (const r of rows) {
    let hits = 0;
    let excerpt = "";
    if (re) {
      const doc = textStmt.get(r.path) as { text: string } | null;
      if (!doc) continue;                                   // no text indexed -> cannot be regex-matched
      const matches = doc.text.match(new RegExp(re.source, "gi"));
      if (!matches || matches.length === 0) continue;
      hits = matches.length;
      const at = doc.text.search(re);
      excerpt = doc.text.slice(Math.max(0, at - EXCERPT_BEFORE), at + EXCERPT_AFTER).replace(/\s+/g, " ").trim();
    } else {
      const doc = textStmt.get(r.path) as { text: string } | null;
      excerpt = doc ? doc.text.slice(0, EXCERPT_HEAD).replace(/\s+/g, " ").trim() : "";
    }
    candidates.push({ path: r.path, size: r.size, state: r.state, score: hits || 1, rank: r.rank, hits, excerpt });
  }

  candidates.sort((a, b) => (b.hits - a.hits) || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));   // deterministic order
  const out = candidates.slice(0, limit);
  return {
    candidates: out,
    scanned: rows.length,
    returned: out.length,
    truncated: candidates.length > limit || rows.length >= pull,
    reApplied: re !== null,
    ms: Date.now() - t0,
  };
}
