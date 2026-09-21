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

## [2026-09-21] W1 — JOB RUNTIME (queue + resume + pools + budget) landed
- WHAT: src/job/{store,queue,run,indexJob}.ts · src/pools/{pool,budget}.ts ·
  tests/{resume,budget}.test.ts · the `jm index --queued` path.
- WHY: crash-safety is a gate, not a promise: rows are crash-first, ack-on-complete, and the
  sweep returns orphans; the budget is a hard stop that leaves work resumable.
- HOW: fingerprint UNIQUE = idempotency; `running` rows = the crash surface; exact budget claims.
- EVIDENCE: kill -9 at done=1328/running=8 → resume `resumed=8` → `done=11831 running=0`,
  `DONE=11831 DISTINCT_DONE=11831 -> dup=ZERO`; budget run → `done=100 budget_stopped=true` exit 3;
  battery 10 pass / 0 fail · tsc exit 0.
- NEXT: W2 adapters (sqlite/jsonl) + cross-target query.

## [2026-09-21] W3+W5 — JUDGE CLIENT + DECISION-TREE landed (the core product path)
- WHAT: src/judge/{key,transport,cache,policy,client}.ts · src/verbs/decision-tree.ts ·
  the `jm decision-tree` CLI verb · tests/decision.test.ts.
- WHY: this is the product — bounded evidence in, typed calibrated judgment out, cached
  forever, routed by policy, recorded. Everything else is plumbing.
- HOW: key resolution env→file (fingerprint only); the ONE network seam (transport) with a
  canned-response mode for tests; cache fingerprint = sha256(model ⊕ schema ⊕ canonical(redact(state)));
  policy thresholds never inline; fail-closed without a key.
- EVIDENCE (THE LIVE RECEIPT): real API, model jev-1.13.0 — daemon-crash row → act 0.97,
  README-typo row → noop 0.08, checkout-500s row → act 0.90, cost $0.000044 for 3 calls.
  Replay → calls=0 cached=3; two fresh runs byte-identical (sha a3bc30351f68dad8).
  Battery 13 pass / 0 fail · tsc exit 0.
- NEXT: W3 retrieve verbs + W4 find chain.
