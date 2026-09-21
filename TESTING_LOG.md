# TESTING_LOG — JM test plan + results (append-only; plan ZONE 1, results ZONE 2)

## ZONE 1 — THE PLAN (what needs testing)

### SCRIPT — the battery (bun) — Status: PASSED
- **What:** every pure decision surface + store + queue + budget + judge path.
- **How:** `bun test tests/` — 8 files.
- **PASS criteria:** zero failures; every assertion reads an OBSERVATION CHANNEL (bytes, rows, exit).
- **FAIL criteria:** any red; any assertion on an internal call count.

### CONTAINER / HOST-LIVE — the runtime seat — Status: PASSED (host-live)
- **What:** the CLI + HTTP surface operated first-person against real corpora and the real API.
- **How:** the 17 numbered operations in `context_management/RUNTIME_SEAT.md`.
- **PASS criteria:** every op with a pre-registered expectation; defects enumerated (never zero).

### ADVERSARIAL — the pressure sweep — Status: PASSED (1 confirmed defect found+fixed)
- **What:** boundaries, redaction, cache key, SQL-injection shapes, empty inputs, live injection.
- **PASS criteria:** a full pass with ZERO confirmed defects AFTER the fixes; unswept frontier named.

### AUDIT — the code-audit gate — Status: **FAIL (re-audit: 6 high, all fixed)**
- **What:** the qwen-code-audit artifact + its `AUDIT GATE:` line.
- **Why blocked:** the audit lane was not run in this session (no `qwen-code-audit` invocation on this diff).
- **Resume condition:** run the audit lane over the W0–W7 diff, write the artifact, quote the verdict line.
- **AUDIT GATE: BLOCKED (re-audit lane failed) — the first run's FAIL stands as the last valid verdict** — the lane RAN (`ocr review --from 7b7f7eb --to HEAD`),
  provider muse-free, 6m2s, 174 comments / 50 files; canonical (src+tests) = 91 findings
  (30 high / 49 medium / 12 low). Artifact: `artifacts/audit-2026-09-21.json`; summary:
  `AUDIT_SUMMARY.md`. A fix pass addressed the high set (fail-closed propagation, tombstone
  filtering, loopback bind, NaN guards, fingerprint covering the questions, per-file index guard,
  failed-row recording, arg-parser completeness). **The gate stays FAIL until a RE-AUDIT passes.**

## ZONE 2 — THE RESULTS (what was observed)

## TEST RESULT — 2026-09-21 — the battery

### SCRIPT
- **The run:** `bun test tests/` (8 files) and `bunx tsc --noEmit`.
- **The raw output (tail):** `24 pass / 0 fail / 110 expect() calls / Ran 24 tests across 9 files.` · `TSC_EXIT=0`
- **The verdict:** PASS
- **The artifacts:** tests/{store,index,query,ledger,resume,budget,decision,adversarial}.test.ts

## TEST RESULT — 2026-09-21 — the runtime seat

### HOST-LIVE
- **The run:** OP-01..OP-17 (RUNTIME_SEAT.md).
- **The raw output (excerpts):** `files=11831 changed=11831 ms=4019` · `changed=0 ms=60` ·
  `done=1328 pending=10495 running=8` -> `resumed=8 done=11831 running=0` ·
  `DONE=11831 DISTINCT_DONE=11831` · `done=100 budget_stopped=true` exit 3 ·
  live `act 0.97 / noop 0.08 / act 0.90` at `$0.000044` · `calls=0 cached=3` sha-identical ·
  `/decide` `noul 0.98` `$0.0000124` · find trend `44 -> 30 -> 1 -> 1` ·
  N=4 concurrent all answered · starve `exit 2` no output · hostile `exit 1`.
- **The verdict:** PASS (6 defects found by running, all fixed + re-proven).
- **The artifacts:** `context_management/RUNTIME_SEAT.md`, the DEBUG_LOG entries EN-001..EN-008.

## TEST RESULT — 2026-09-21 — the adversarial sweep

### SCRIPT + LIVE
- **The runs:** the 5 probe families + the live injection discrimination + the cache-privacy probe.
- **The raw output:** `test_adv_redaction` RED first (the backspace byte) -> fixed -> green;
  injection `act 0.99` vs benign `noop 0.01`; cache holds `fingerprints only: True`, no PII.
- **The verdict:** PASS after fix (D-007; control-char sweep 1 -> 0).
- **The artifacts:** tests/adversarial.test.ts; DEBUG_LOG EN-007.

### THE RE-AUDIT ATTEMPT (2026-09-21, second run)
```
$ ocr review --from 7b7f7eb --to HEAD --format json
status: failed
message: "Review failed: 0 finding(s); 53 of 53 selected item(s) failed."
llm: muse-free / muse-spark-1.3-contributor-free
summary: files_reviewed 53 · comments 0 · total_tokens 0 · elapsed 2m49s
retry_report: 76 requests · 76 retried · 380 retries · 0 recovered · 76 failed
artifact: artifacts/audit-2026-09-21-reaudit-BLOCKED.json
```
**AUDIT GATE: BLOCKED** — a degraded run is NEVER reported as PASS (the degraded-run law). The
first run's `FAIL (0 critical, 30 high)` remains the last VALID verdict; the fix pass landed all
30 highs; the re-audit is owed **when a lane recovers**. Alternative lanes to try, per the
workspace's ocr skills: the zen-free adapter (port 4098) and the poolside-direct lane
(`--provider poolside --model laguna-s-2.1:high`). The retry condition: any lane that returns
non-zero tokens.

### THE RE-AUDIT (2026-09-22, poolside-laguna-s lane)
```
$ ocr review --from 7b7f7eb --to HEAD --provider poolside-laguna-s --format json
status: partial
llm: {'provider': 'poolside-laguna-s', 'model': 'poolside/laguna-s-2.1'}
message: "Review partially complete: 45 finding(s); 21 of 55 selected item(s) failed."
summary: files_reviewed 55 · comments 45 · elapsed 46m24s · tokens 12,264,380
canonical (src+tests): 37 — high 6 · medium 18 · low 13
artifact: artifacts/audit-2026-09-22-reaudit.json
```
**AUDIT GATE: FAIL (0 critical, 1 high)** — second re-audit: `52 canonical` (1 high / 24 medium / 27 low) on `poolside-laguna-s` in 1h37m20s. The 1 high (the stale-ack race) was fixed and pinned this session. **A FOURTH audit is owed to close the gate.** Artifact: `artifacts/audit-2026-09-22-reaudit2.json`. The first run's 30 highs are superseded by this run's 6; the medium
frontier (18) joins the existing N-2..N-6 queue.

### THE SECOND RE-AUDIT (2026-09-22, poolside-laguna-s lane)
```
status: partial
llm: poolside-laguna-s / poolside/laguna-s-2.1
message: "Review partially complete: 131 finding(s); 12 of 56 selected item(s) failed."
summary: files_reviewed 56 · comments 131 · elapsed 1h37m20s
canonical (src+tests): 52 — high 1 / medium 24 / low 27
artifact: artifacts/audit-2026-09-22-reaudit2.json
```
**AUDIT GATE: BLOCKED (lane rate-limited) — the fourth run's FAIL stands as the last VALID verdict.** Fourth run (superseded): `6 canonical` (1 critical / 2 high / 2 medium / 1 low) on `poolside-laguna-s`. The 1 critical is REFUTED BY EVIDENCE (schema applies; all tables exist). The 1 high (cached spend) + the medium frontier were fixed this session. **A FIFTH audit is owed to close the gate.** Artifact: `artifacts/audit-2026-09-22-reaudit3.json`.
high; the 24 mediums join the frontier queue. The gate closes only on a clean fourth run.

### THE THIRD RE-AUDIT (2026-09-22, poolside-laguna-s lane)
```
status: partial
llm: poolside-laguna-s / poolside/laguna-s-2.1
message: "Review partially complete: 15 finding(s); 35 of 56 selected item(s) failed."
canonical (src+tests): 6 — critical 1 / high 2 / medium 2 / low 1
```
**AUDIT GATE: FAIL (0 critical, 1 high)** — the critical is refuted by a live probe (all 13
tables exist; `db.run` applies every statement); the 2 highs (cached spend in filter/find —
plus the same class found and fixed in decision-tree) and the 2 mediums are fixed and pinned.
The gate closes only on a clean fifth run.

### THE FIFTH AUDIT ATTEMPT — ALL LANES RATE-LIMITED (2026-09-22)
```
lane probes (2-file commit scope):
  muse-free                failed  0 tokens
  openrouter-laguna-s-free failed  0 tokens
  openrouter-laguna-xs-free complete 5,093 tokens  <- the only working lane
  poolside-laguna-s        failed  429 rate_limited (90/90 requests)
  poolside-laguna-xs       no json (context canceled)

full-scope runs on the working lane:
  xs-free @ 58 files  -> failed (429 upstream shared pool)
  xs-free @ 26 files (--exclude Checkpoints,artifacts,docs) -> partial: 4 findings,
    21/26 items failed, 8/25 requests failed, 160,471 tokens
  artifact: artifacts/audit-2026-09-22-scoped-BLOCKED.json
```
**AUDIT GATE: BLOCKED** — a degraded run is NEVER reported as PASS (the degraded-run law). The
fourth run's `FAIL (0 critical, 1 high)` remains the last VALID verdict. The scoped run's 4
findings were adjudicated and dispositioned (2 high fixed + pinned, 1 medium fixed, 1 medium
REFUTED by JS single-thread semantics). **The retry condition: any lane returning non-zero tokens
across the full scope.**

### W2 GATE — TARGETS + ADAPTERS (GREEN, 2026-09-22)
```
$ jm index --in all --name w2all
fixTree  fs      rows=2  changed=2  4ms
fixRows  jsonl   rows=2  changed=2  6ms
fixDb    sqlite  rows=2  changed=2  1ms
$ jm query --in all --name w2all --fts tombstone
23  new  a.md
38  new  /tmp/w2fix/rows.jsonl#L2
60  new  /tmp/w2fix/src.sqlite#issues/2     <- ONE query, THREE kinds
$ jm target rm nope   ->  JM_TARGET_UNKNOWN: nope   exit=1   (LOUD, never a silent subset)

C11 keyless: index --in all exit=0 · query --in all exit=0
incremental: run A changed=2 (writes shas) -> run B changed=0 -> run C changed=0
mutate one row -> changed=1, new text queryable, old text GONE from FTS
sqlite source read-only: size+mtime unchanged before/after ingest
monkey: JM_ADAPTER_UNKNOWN · JM_SQLITE_MISSING · malformed jsonl line KEPT + findable
battery 36 pass / 0 fail / 159 expects / 11 files · tsc exit 0
```
**W2: GREEN.** (`src/targets.ts` 154L, `src/adapters/{sqlite,jsonl}.ts` 62+38L, `tests/adapters.test.ts`.)

### W3 GATE — RETRIEVE (scan · cluster · extract) — GREEN
```
$ jm scan w2all --lex tombstone --re 'tomb\w+'            # keyless, deterministic
1  38  /tmp/w2fix/rows.jsonl#L2  {"kind":"evt","msg":"tombstone delta"}
1  23  a.md                      alpha tombstone record
$ jm cluster w2all --lex tombstone
n=1  text       .             [alpha,record,tombstone]  a.md
n=1  jsonl:fixRows /tmp/w2fix [delta,kind,tombstone]    rows.jsonl#L2
$ jm extract w2all --lex tombstone --re 'service (\w+)'   -> total: 2, empty: 0

D-008 CRITICAL found + fixed: two targets holding the same relative path merged into ONE row
(the second read changed=0). Paths are now namespaced by target; both rows stored, both findable.
battery 59 pass / 0 fail / 232 expects / 14 files · tsc exit 0
```
**W3: GREEN** (with D-008 recorded as the wave's critical find).

### W5/W7 GATE — ROUTE · EVALUATE · REPORT — GREEN
```
$ jm route --catalogue                                # keyless, pure read
entries: 456   (the LIVE skill/tool catalogue on this host)
$ jm route --task "index the shadow corpus"           # HOME redirected: no env key, no key file
route exit=2   JM_ERROR: JEV_NO_KEY: ... no TYPESAFE_API_KEY and no ~/.config/typesafe/key
$ jm evaluate --cases F --questions F --key flag      # same sandbox
evaluate exit=2  JEV_NO_KEY                                        (C12 fail-closed, ZERO decisions)
$ jm report w2all
index: w2all (72.0 KB) · files: 6 live · docs/fts: 6/6 · runs: 0 · cache: 0 rows
kinds: text=2 sqlite:fixDb=2 jsonl:fixRows=2
ledger: 23 rows · 23 ok · 0 failed · $0.000000 · verbs index=12 query=5 scan=2 cluster=2 extract=2

route ladder (mocked transport): p=0.91 -> act + injection text + runner-up logged;
                                p=0.60 -> escalate, NO injection (never act on a weak signal)
evaluate: metrics n/k/agreement/brier/ece/variance; k=3 repeats -> 2 cache hits, variance 0
          (numerical-zero fix: identical answers reported 1.2e-32 before)
report: a READ — runs row count unchanged before/after; a malformed ledger line counts as failed
battery 69 pass / 0 fail / 271 expects / 15 files · tsc exit 0
```
**W5/W7: GREEN.**

### SECOND-OPERATOR DRILL (L3/L4 acceptance: a zero-context operator must be able to run it)
```
OPERATOR   SecondOperator2 (agent `sonic`, zero project context, dispatched with a 9-step script)
DOCS READ  README §10 (Quickstart) · README §13 (surfaces) · context_management/RUNTIME_SEAT.md
RESULT     all 9 steps completed · 14 doc gaps · 12 stale/wrong doc claims reproduced
REPO STATE `git status --porcelain` EMPTY after the drill (the operator modified nothing)

CODE DEFECTS (all re-verified by hand, all fixed, all pinned):
  D-009 CRITICAL  unknown index -> empty result + exit 0 + a PHANTOM index file
  D-010           `jm index @sqlite-target` indexed the .sqlite FILE, not its rows
  D-011           `jm index <file>` was a silent no-op (files=0, exit 0)
  D-012           `--structure csv` rendered markdown; `--out x.csv` wrote JSON
  D-013           `jm find` wrote to /tmp, ignoring JM_HOME
  D-014           ledger `args` dropped flags -> a row could not reconstruct its run
DOC FIXES: README §10/§11/§13 corrected (MCP tool list was wrong in TWO places, --recipe takes a
FILE, csv claim, ledger-row claim, the "after Wave 6" future tense); RUNTIME_SEAT's two stale
appendix claims annotated with the drill's evidence; N-10..N-16 recorded as the doc backlog.
battery 71 pass / 0 fail / 281 expects / 15 files · tsc exit 0
```
**SECOND-OPERATOR GATE: PASSED** (the operator completed the work; the engine's defects it exposed
are fixed and pinned; the residual doc gaps are named as N-10..N-16 rather than papered over).

### ADV-2 — THE ADVERSARIAL PASS OVER THE SURFACES ADDED AFTER THE FIRST SWEEP
```
13 probes: targets/adapters · scan/cluster/extract · route/evaluate · mcp/watch/report
RESULT: 2 CONFIRMED DEFECTS on the first run, both fixed, both pinned.

D-015 target NAME used as a path fragment -> a row key prefixed `../` and collided with a
      sibling namespace. FIX safeTargetName(); VERIFIED `_evil/a.md`.
D-016 `route` emitted an injection for a choice OUTSIDE the catalogue (`skill:NOT-IN-MENU` at
      p=0.99) -> a model would be told to use a non-existent capability. FIX: the menu is the
      contract; an out-of-menu winner escalates and the reason names it.

PASSED NEGATIVE HALF (recorded, so silence is never read as proof): catastrophic-regex bound,
regex metachars literal, no-capture-group extract, hostile MCP frames, symlink loop, empty store,
zero-table sqlite, malformed jsonl, probabilities not summing to 1.
battery 84 pass / 0 fail / 310 expects / 16 files · tsc exit 0
```
**ADV-2: PASSED (with a non-empty defect ledger — a zero-defect sweep would have been the red flag).**

### THE AUDIT GATE, FINAL STATE (2026-09-21, end of session)
```
CHUNKED METHOD (the only one that completes under upstream rate limits):
  tests/  4 files  status=complete  findings 6 -> all fixed -> re-run: COMPLETE, 0 findings
  root    3 files  status=complete  0 findings
  src/   36 files  status=PARTIAL in EVERY attempt (18-file and 21-file halves also failed)
                   findings seen: 1 low + 1 high + 3 low/medium + 1 high + 1 medium
                   ALL adjudicated: 9 fixed, 6 REFUTED by probe (see AUDIT_SUMMARY §4)
  lanes at close: openrouter-laguna-xs-free 0 tokens · poolside-laguna-s 0 tokens ·
                  muse-free 0 tokens (a 2-file probe returns nothing on any lane)
```
**AUDIT GATE: BLOCKED.** Not FAIL (the known state is clean), not PASS (the largest chunk never
completed). Retry condition: any lane returning non-zero tokens across the full 36-file source
scope -> expect status=complete; zero findings flips the gate to PASS.
Full method + ledger + the paste-ready re-run sequence: `AUDIT_SUMMARY.md`.

### THE OPERATING CONTRACT AS A PROBE (README §18) — 25 claims, 3 defects found
```
METHOD  every claim in README §18 was executed against the live CLI before being trusted
RESULT  first run: 20 passed / 5 failed
        2 failures were the VERIFIER's own stale expectations (corrected)
        3 were REAL DEFECTS:
          D-017 the cost line went to STDOUT -> a piped csv/json was CORRUPTED (silent)
          D-018 exit codes were per-verb (a typo'd index: 1 from query, 2 from extract)
          D-019 `target add` accepted a root that does not exist
        after the fixes: 25 passed / 0 failed, and the doc's own `target rm` line was corrected

battery 88 pass / 0 fail / 331 expects / 17 files · tsc exit 0
```

### THE CONTAINER RIG (spec §9, angles T1–T7) — PASS 7/7 IN THE CONTAINER AND ON THE HOST
```
HARNESS  tests/container/harness.ts  (standalone; a passToken is emitted ONLY by the assertion
         that names it — it cannot be typed into existence; exit 1 when any angle fails)
CONTAINER jm-ct-rig  image=omp-ct:master  Debian GNU/Linux 12 (bookworm)  kernel 6.17.0-35
          bun 1.4.2  cwd=/jm  JM_HOME=container-local /tmp
          isolation: NO host key file, NO TYPESAFE env var. (The host skills dir IS bind-mounted
          and visible; T1–T7 do not use it — recorded rather than glossed.)
HOST      the SAME harness file, run before the container run

PASS  T1  JM_INDEX_OK files=500                     files=500 rows=500
PASS  T2  JM_INDEX_DELTA=3                          changed=3 of 500
PASS  T3  JM_CACHE_HITS=100 JM_JUDGE_CALLS=0        first=100 calls, second=0, cached=100
PASS  T4  JM_EXIT=2 JM_DECISIONS_WRITTEN=0          exit=2, 0 decisions, JEV_NO_KEY
PASS  T5  JM_RESUME_OK dup=0                        SIGKILL mid-claim: 8 orphaned -> resumed,
                                                    done=400 distinct=400
PASS  T6  JM_BUDGET_STOPPED calls=5                 stopped=true, done=5 of 100
PASS  T7  JM_ADVERSARIAL_SURVIVED                   no throw across 9 hostile inputs
JM_CONTAINER_RIG PASS — 7/7 angles                  (identical on both)

artifact: artifacts/container-rig-2026-09-21.json · runner: scripts-container-rig.sh
```
**T8/T9 (fire gate twin, token cap) belong to W8 and are NOT claimed.**

### W4 GATE — FIND (C5) — GREEN, and the missing named test is written
```
$ bun test -t test_find_patterns
3 pass · 0 fail · 31 expects
  test_find_patterns ................ every pattern carries n + EXEMPLAR IDS (C5 literally)
  test_find_phrase_with_no_matches ... empty pattern set + a valid trend, no throw, no fabrication
  test_find_budget_caps_the_chain .... a capped chain STOPS and says so

THE PIN NAMED `test_find_patterns`; IT DID NOT EXIST. Writing it found three defects:
  D-023  `--fts "split-brain"` leaked a raw SQLiteError at exit 1 -> JM_FTS_INVALID, exit 2
  D-024  `--budget-calls 1` made 3 calls in the POOL verbs (check-then-await) -> claim/settle
  D-025  `--common N` was accepted and NEVER READ (documented in the MCP schema) -> applied
battery 96 pass / 0 fail / 399 expects / 19 files · tsc exit 0
```
**W4: GREEN** (with the named test that the contract required and the code never had).

### ADV-3 — THE RE-SWEEP OF THE SURFACE CHANGED SINCE ADV-2
```
12 probes over: Budget.claim/settle · validateRecipe · safeTargetName · the FTS input path ·
the watch tick · the index roots.   RESULT: 12 pass / 0 fail / 120 expects

D-027 CONFIRMED by the sweep (the only defect it found, and it was a CRITICAL class):
  `same name` and `same/name` both sanitised to `same_name` -> one namespace -> 2 files became
  1 row, silently. The sanitiser is now injective (a digest disambiguates any name it had to
  change; an already-safe name keeps its exact key). 2 rows, both bodies findable, pinned.

PASSED (the negative half, recorded so silence is not read as proof): 20 synchronous claims
against a cap of 5 grant exactly 5; cached settles refund; phantom settles create no credit;
9 hostile recipe shapes all refuse; 10 hostile target-name shapes all neutralise; 10 hostile FTS
expressions all become JM_FTS_INVALID while the valid ones still match; two concurrent ticks on
one index leave 2 clean rows; a vanished root is survivable; a file root and a directory root
agree; a missing root is loud.
battery 110 pass / 0 fail / 534 expects / 20 files · tsc exit 0
```
**ADV-3: PASSED with a non-empty ledger.** The full-surface adversarial frontier is now: ADV-1
(the W0 surface), ADV-2 (post-W1 surfaces), ADV-3 (everything changed since ADV-2) — all three run,
all findings fixed, the unswept frontier NAMED as the parked W8 surface (the fire gate has no code
to probe).

### THE SECOND-OPERATOR DRILL, ROUND 2 — the operating contract put to the test
```
OPERATOR   SecondOperator3 (zero context, docs-only: README 10/13/18 + RUNTIME_SEAT)
RESULT     all 10 steps completed · 1 docs-insufficient verdict · 3 defects · 1 false doc line
REPO       nothing modified by the operator

WHAT §18 GOT RIGHT (verified by an operator who had never seen the engine):
  steps 1,2,3,5,6,7,8 = docs-sufficient, each citing its §18.x sub-section
  (targets/--in, pointers-vs-body, report fields, serve+health, the MCP session shape,
   the tick and its journal object) — the round-1 gaps are CLOSED.

WHAT IT STILL FOUND:
  D-028  `jm_query` with a typo'd index returned {"rows":[],"n":0} at success AND created a
         phantom index — the D-009 defect, alive on the MCP surface (fixed: read tools refuse)
  W5     `GET /health` MATERIALISED index/decisions.sqlite (fixed: health is a pure report)
  D-029  `/find` on a missing index threw a 500 (fixed: 404 with the engine's own sentence)
  W1     §18.9 said a tick's index comes from `--in` (`a,b`->`a+b`); measured `index/all.sqlite`.
         The doc line was FALSE and is corrected; `--name` added to the watch usage.
battery 111 pass / 0 fail / 539 expects / 20 files · tsc exit 0
```
**ROUND 2: PASSED** — the documented contract carried a zero-context operator through all ten
steps, and the three defects it exposed are fixed and pinned.

### THE NAMED-TEST AUDIT — every id the wave table and the pin require
The wave table (packages/jm/06-WAVES.md) names a test id per wave; the pin's proof contract names
six selectable ones. A systematic sweep found THREE more absent — `test_filter_bands` (W3),
`test_serve_decide` (W6), `test_calibrate_row` (W7) — the same hole that hid three defects when
`test_find_patterns` was written earlier in this session.

```
DECLARED + PASSING BY SELECTOR (bun test -t <id>):
  test_index_incremental 1/0 · test_store_roundtrip 1/0 · test_query_known_rows 1/0
  test_resume_no_dup 1/0 · test_budget_cap 1/0 · test_adapter_delta 1/0
  test_filter_bands 2/0 · test_find_patterns 1/0 · test_cache_zero_calls 1/0
  test_decision_fail_closed 1/0 · test_serve_decide 2/0 · test_calibrate_row 1/0
ABSENT (correctly): test_firegate_twin — W8 is parked; the fire gate has no code to test.

What writing them found: filter's question key is `match` (not `flag`), the /decide body asks
`flag`, and find asks `is_instance` — three different keys across three verbs, and answering the
wrong one leaves every p at 0, which READS as "the code is broken" when the mock is what is wrong.
battery 116 pass / 0 fail / 580 expects / 21 files · tsc exit 0
```
