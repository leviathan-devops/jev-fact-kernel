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
- The engine works live; the battery is 24/0; tsc is 0; the ledger holds 32+ runs.
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
- EVIDENCE: `bunx tsc --noEmit` exit 0 · `bun test` 89 pass / 0 fail / 343 expects / 9 files ·
  commits `9ea25f5` + `ccbd40f`.
- NEXT: the re-audit verdict on the poolside lane; then frontier wave 2 (the remaining ~35 mediums).

## [2026-09-21] SESSION CLOSE — git 8b42ff8
- Battery 89 pass / 0 fail / 343 expects / 17 files · tsc exit 0.
- W2/W3/W5/W6/W7 landed; all four surfaces live; container rig T1–T7 PASS 7/7 in Debian 12 + host.
- 14 defects fixed this session (D-008..D-021), each with a probe and a pin or a doc correction.
- README §18 (the operating contract) written from a zero-context operator's gaps, then EXECUTED:
  25/25 claims verified, which itself found 3 defects.
- AUDIT GATE: BLOCKED (src chunk partial; two chunks complete with 0 findings).

## [2026-09-21] BUILD LOG — the boundary-sweep session — git 2a641ab

- **SURFACES:** all four proven live — CLI (17 verbs), HTTP (`/decide`, `/find`, `/health`,
  `/jobs`), MCP (stdio, 4 tools), daemon (**as a systemd user unit**: start, tick, `kill -9`
  restart via `Restart=on-failure`, clean stop).
- **RUNNERS, all sealed:** `scripts-gates.sh` (41 checks, non-zero exit on any failure),
  `scripts-real-corpus.sh` (the host's actual 11,832 files + 2,309 rows from four DBs, ~33 GB,
  sources verified unchanged), `scripts-container-rig.sh` (spec §9 T1–T7 in a fresh Debian-12
  container AND on the host), `scripts-jm-mcp.sh`, `scripts-jm-watch.sh` (the `exec` launcher),
  `scripts-seal.sh` (replaces subtrees rather than nesting them, and re-syncs every canon TREE SHA).
- **BATTERY:** 163 pass / 0 fail / 727 expects / 32 files; `tsc` exit 0 — re-verified FROM the
  seal's own copy on every refresh.
- **THE AUDIT GATE:** BLOCKED. Two of three chunks reached `complete` with zero findings; the
  36-file source chunk is `partial` in every attempt (all lanes return 0 tokens). Five methods
  tried and recorded in `AUDIT_SUMMARY.md` §5.1 — including `--concurrency 1`, which returned
  **62 requests, 62 failed, 0 tokens** and thereby DISPROVED its own burst hypothesis.
- **W8:** PARKED on the operator-owned F1/F6 rulings; `src/firegate/` does not exist and `jef` is
  not installed, stated in README §7/§10 and VIOLATION_LOG C15–C18.
- **THE DEFECT LEDGER:** 16 defects (D-027..D-046) plus 3 environment/process facts, all fixed or
  refuted with their probe, all pinned or gated.

## PER-WAVE RECORD (the wave table's gates, as built)

- **W0 CORE CLI — GREEN.** `index @shadow` twice: `files=11831 changed=11831 text=11306 ms=4019`,
  then `changed=0 ms=60` (1.5% of the first pass against a `<10%` gate). Known rows return by FTS
  and by `--where`. The incremental mechanism has TWO paths (a (size, mtime) fast path and a
  content-sha slow path) and both are exercised.
- **W1 JOB RUNTIME — GREEN.** The crash contract is proven by a REAL SIGKILL, not a hook: the rig
  polls the job store until a row is `running`, kills exactly there, and asserts `orphaned > 0`
  before it will call the angle passed. Resume: `done=400 distinct=400`. Budgets: a cap of 5 stops
  at exactly 5 (exit 3), and the claim is SYNCHRONOUS so concurrent lanes cannot overshoot.
- **W2 TARGETS — GREEN, on the real corpora.** fs · jsonl · sqlite adapters; `--in a,b|all`; one
  query returns a bare `a.md`, a `rows.jsonl#L2` and a `source.sqlite#issues/2`. `scripts-real-corpus.sh`
  runs it against the host's actual 11,832 files and 2,309 rows sampled from four databases
  (~33 GB) in ~53 s, with the sources verified byte-unchanged.
- **W3 RETRIEVE — GREEN.** `scan` (regex gate, hit counts, bounded excerpt), `cluster`
  (deterministic signatures, no model), `extract` (capture groups; md/json/csv). `test_filter_bands`
  asserts ids, per-row probabilities, the kept/rejected split, and a cache-absorbed replay.
- **W4 FIND — GREEN.** The pin's named `test_find_patterns` did not exist; writing it found three
  defects. Every pattern carries `n`, exemplar ids and a probability; the candidate set is
  round-robin across seeds so one token cannot monopolise a search.
- **W5 DECIDE — GREEN.** Live judging on the real API; a 100-row batch makes 100 calls and 0 on the
  replay, byte-identical. `route` works against the live judge for the first time (one `noul` per
  shortlisted candidate over a deterministic shortlist) and picks `omp-session-forensics` at 0.800
  for a session-log task. Fail-closed is now honoured for EVERY outage, not just a missing key.
- **W6 SURFACES — GREEN.** HTTP (`/decide` live, `/health` a pure report, `/find` refusing a
  missing index, a 1 MiB body cap), MCP (stdio, handshake verified, read tools refusing a missing
  index), daemon (an idempotent tick, a real JSONL journal, and a systemd user unit whose `kill -9`
  restart is observed).
- **W7 REPORT / CALIBRATE — GREEN.** `report` is a read (no row written) and counts a malformed
  ledger line as `failed`; `report --job` reconciles the queue against the ledger (exit 0 reconciled,
  3 not, 2 for a typo); `calibrate` counts UNKNOWN rows and excludes them, and an outage can no
  longer emit a lower-the-threshold suggestion.
- **W8 FIRE GATE — PARKED.** No code. Stated in README §7/§10 and VIOLATION_LOG C15–C18.

## THE SEAL HISTORY (every sealed state, and what it verified)

| seal | sha | battery FROM THE COPY | note |
|------|-----|----------------------|------|
| wave-0 | `35e77425` | 18 / 0 | Mode B, src-empty recorded as an honest gap at round zero |
| post second-operator r1 | `35e77425` | 30 / 0 | the CLI fixed; the drill's six defects pinned |
| W2/W3 | `a75230e3` | 71 / 0 | the adapters and the retrieval verbs |
| W5/W6/W7 | `22178de5` | 116 / 0 | all four surfaces; the container rig carried by the seal |
| post D-030/D-031 | `f53b9b57` | 130 / 0 | round-robin seeds; the excerpt anchored on the match |
| post D-035..D-038 | `72f5a8c5` | 141 / 0 | the four-layer concurrency fix |
| post D-040..D-044 | `f69a828f` | 157 / 0 | the judge policy, the answer reader, the cache endpoint scope |
| post D-046 | `e8097b88` | 163 / 0 | the unmeasured cost; the canon logs landed |

Each row was produced by `scripts-seal.sh`, which REPLACES each subtree (never copies into it),
re-syncs every canon doc's TREE SHA line, regenerates BUILD_STATE's inventories, and then runs the
battery and the structure gate FROM THE COPY. A row that cannot point at a verified copy does not
belong here.

## THE ARTIFACT INVENTORY

- `artifacts/container-rig-2026-09-21.json` — the spec §9 T1–T7 tokens, both environments.
- `artifacts/audit-*.json` — EIGHT preserved audit runs, none overwritten, including the two
  `BLOCKED` ones and the partial one this document refuses to call a pass.
- `docs/blueprints/` — the design canon (the runtime layer, the engine blueprint).
- `packages/jm/` — the build package: the DPL1 spec (the binding authority), the wave plan, the
  goal prompts, the depth doc.
- `recipes/screening-escalate.json` — the worked recipe, live-proven (act/escalate/noop = 1/1/1).
- The five runners, all sealed.

- **CURRENT:** git 2a641ab — the canon logs landed where the contract reads them, closing the
  filing half of C20; the floor half is now met in all three logs by material, not by padding.
