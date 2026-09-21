# RUNNING_BUILD_LOG — JM build

Append-only, updated at the moment of work.

## [2026-09-21] W0 — CORE CLI (index/query/store/ledger) landed
- WHAT: src/store/{schema,db}.ts · src/ledger.ts · src/verbs/{index,query}.ts ·
  src/cli.ts · tests/{helpers,store,index,query,ledger}.test.ts · package.json · tsconfig.json
- WHY: the substrate every later wave consumes — one store per index, FTS5 for text,
  append-only ledger with one row per invocation, and the cost line on every run.
- HOW: `bun:sqlite` + FTS5 (pre-flighted green before writing); incremental index by
  (size,mtime) fast-path with sha256 + tombstones; bounded text (≤256KB into FTS5) and
  bounded hashing (≤8MB), both recorded via `truncated`.
- EVIDENCE: `bun test tests/` → 6 pass / 0 fail / 26 expects · `tsc --noEmit` → exit 0 ·
  `jm index @shadow` → files=11831 (4.0s) · re-run → changed=0 (60ms, ratio 2.5%) ·
  `query --where "size>2000"` → 1182 rows · `--fts "theatrical"` → 341 rows.
- NEXT: W1 job runtime (queue + resume + budgets).
