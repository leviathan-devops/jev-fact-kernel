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

## [2026-09-21] W3+W5 — THE JUDGE CLIENT + DECISION-TREE (the product path)
- WHAT: src/judge/{key,transport,cache,policy,client}.ts · src/verbs/decision-tree.ts · the
  `jm decision-tree` CLI verb · tests/decision.test.ts.
- WHY: this is the product — bounded evidence in, typed calibrated judgment out, cached forever,
  routed by policy, recorded. Everything else is plumbing.
- HOW: key resolution env→file (fingerprint only); the ONE network seam with a canned-response mode;
  fingerprint = sha256(model ⊕ schema#questionsHash ⊕ canonical(redact(state))); thresholds in
  policy objects; fail-closed without a key.
- EVIDENCE: real API — daemon-crash `act 0.97`, README-typo `noop 0.08`, checkout-500s `act 0.90`,
  `$0.000044`; replay `calls=0 cached=3`; two runs sha `a3bc30351f68dad8`.
- NEXT: W4 find chain (landed the same session: 44 → 30 → 1 → 1).

## [2026-09-21] W6+W7 — SURFACES + CALIBRATION
- WHAT: src/serve.ts (health/decide/find/jobs) · src/calibrate.ts (bands, truth, the calibration row).
- EVIDENCE: `/decide` `noul 0.98` `$0.0000124`; replay `cached=true cost=0`; `calibrate` → decisions=3
  act=2 noop=1 mean=0.65; a calibration row written with the honest n=3 note.

## [2026-09-21] P4 — THE RUNTIME SEAT (17 operations)
- WHAT: the seat declared; OPS 01-17 executed first-person; the push set (N=4, starve, hostile, empty).
- EVIDENCE: the full table in RUNTIME_SEAT.md; 6 defects found by running.
- LESSON: the corpus that was the wrong corpus (session_diff is diff blobs) — targeting is a decision.

## [2026-09-21] P5 — THE ADVERSARIAL SWEEP
- WHAT: 5 probe families + the live injection discrimination + the redaction probe.
- EVIDENCE: injection `act 0.99` vs benign `noop 0.01`; cache fingerprints only, no PII; D-007 found.
- LESSON: the invisible byte (0x08) that killed secret redaction — scan generated writes for C0 bytes.

## [2026-09-21] P6 — THE AUDIT (the gate that said no)
- WHAT: `ocr review` over the full range: 174 comments, 91 canonical (30 high).
- EVIDENCE: artifacts/audit-2026-09-21.json; AUDIT_SUMMARY.md; the gate line in TESTING_LOG.
- NEXT: the fix pass (78cd3be) landed all highs; the RE-AUDIT is the proof owed.

## [2026-09-21] W-END — DOCS TO FLOOR + THE AUDIT GATE STORY
- WHAT: BUILD_REPORT 523L · DEBUG_LOG 506L · the canon set each >= 200L · the 3 logs >= 90L ·
  AUDIT_SUMMARY.md · artifacts/audit-2026-09-21.json landed in the repo.
- WHY: the doc contract's floors, met with material (transcripts, tables, dispositions) rather than
  whitespace — the anti-padding law.
- HOW: the run transcript from the session itself; the test inventory from the files; the audit's
  findings from its own artifact; the ruling tables from the session's decisions.
- EVIDENCE: `wc -l` per doc (see EVIDENCE_STATE E-17); the audit artifact's sha; the gate line in
  TESTING_LOG reading `AUDIT GATE: FAIL (0 critical, 30 high) — fixes applied, re-audit owed`.
- NEXT: the re-audit verdict; then the medium frontier (N-2..N-6).

## [2026-09-21] SESSION CLOSE — THE STATE THE NEXT LOG ENTRY INHERITS
- The engine works live; the battery is 18/0; tsc is 0; the ledger holds 32+ runs.
- The audit gate reads FAIL (the first run's 30 highs, all fixed; the re-audit in flight).
- The medium frontier (49 findings, five families) is the next fix wave.
- W2's adapters, W8, the MCP/watch surfaces: unbuilt, with their acceptance criteria written.
- The checkpoint `jm-v0-waves-green-a39afe8` carries the post-fix tree; refresh it after any change.
- The two logs above carry the moment-of-work entries; this one closes the session's arc.

## [2026-09-21] FRONTIER WAVE 1 — THE MEDIUM FINDINGS (the audit's second layer)
- WHAT: 14 medium findings fixed — path sanitisation (`safeName`, hash-suffixed derived names),
  the job-id traversal guard, `busy_timeout`, the registry loud-fail, the `@target` existence check,
  the query limit clamp, FTS `bm25` ordering, the policy guard (unknown types never route on
  confidence), the calibrate guards (empty-truth exclusion, no same-ms overwrite, malformed-policy
  tolerance, missing-table safety), the serve 400-on-malformed + key-metadata gate, and the queue's
  payload adoption (a re-enqueue of a pending row now takes the NEW payload).
- WHY: the audit's medium set is where the risk lives; each fix addresses a CLASS, not an instance.
- HOW: surgical patches grounded in the audit's own finding text (extracted per file), plus
  `tests/guards.test.ts` pinning six of the new behaviours.
- EVIDENCE: `bunx tsc --noEmit` exit 0 · `bun test` 24 pass / 0 fail / 110 expects / 9 files ·
  commits `9ea25f5` + `ccbd40f`.
- NEXT: the re-audit verdict on the poolside lane; then frontier wave 2 (the remaining ~35 mediums).
