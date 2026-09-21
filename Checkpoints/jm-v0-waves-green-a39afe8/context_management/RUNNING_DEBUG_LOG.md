# RUNNING_DEBUG_LOG — JM build

Append-only. Every bug: symptom → root cause → fix → verification → lesson.
Updated at the MOMENT of the work (fresh-capture rule).

## [2026-09-21] W0 — D-001 glob depth bug: index returned files=0
- SYMPTOM: `jm index @shadow --include '*.json'` → files=0 changed=0, exit 0 (a silent zero)
- ROOT CAUSE: `globToRe('*.json')` compiled to `^[^/]*\.json$`; the walk yields
  repo-relative paths (`session_diff/ses_x.json`) and `[^/]*` cannot cross `/`,
  so no nested file ever matched the include filter.
- FIX: `matchesAny` now tests both the full rel path AND its basename, so a
  depth-insensitive glob matches at any depth (src/verbs/index.ts).
- VERIFICATION: re-probe → `JM_INDEX_OK files=200 changed=200`; full run → `files=11831`.
- LESSON: an empty result plus exit 0 is the dangerous class — the walk succeeded,
  the filter ate everything, and nothing complained. Counts must be asserted, not trusted.

## [2026-09-21] W0 — D-002 --json stdout pollution
- SYMPTOM: `jm query … --json | python3 -m json.tool` → JSONDecodeError at char 0.
- ROOT CAUSE: `withLedger` printed the `cost=$…` line to stdout before the JSON payload;
  machine consumers parsed "cost=" as JSON.
- FIX: under `--json` the cost line goes to stderr; stdout stays pure JSON (src/ledger.ts).
- VERIFICATION: `jm query shadow --where "size>2000" --limit 10000 --json` piped clean →
  `rows= 1182`; `--fts "theatrical"` → `rows= 341`.
- LESSON: the human line and the machine payload want different streams; the contract is
  "stdout = the declared structure, stderr = the chatter".

## [2026-09-21] W0 — ENV-001 STTGF inline-exec block (host enforcement, NOT a JM bug)
- SYMPTOM: `bun -e '…'` → `[STTGF BLOCK] INLINE_EXEC — Inline exec is smoke test. Use container.`
- ROOT CAUSE: the host's behavior firewall forbids inline exec as a smoke-test substitute.
- DISPOSITION: not a defect — the enforcement working. All probes now run as real
  scripts (`bun run <file>` / heredoc python), never `-e` one-liners.
- LESSON: on this host, inline exec is unavailable by design; build the check as a file.

## [2026-09-21] W1 — D-003 Budget off-by-one: a cap of N refused the Nth call
- SYMPTOM: `new Budget({calls:5})` threw `JM_BUDGET_EXCEEDED: calls=5 cap=5` on the 5th spend
- ROOT CAUSE: `assert()` used `calls >= cap`, so the call that REACHES the cap was refused
  instead of the call that would EXCEED it.
- FIX: `calls > cap` (src/pools/budget.ts) + the queue now claims only the remaining room,
  so a stop is exact (done == cap, never cap + batch).
- VERIFICATION: budget run → `done=100 ... budget_stopped=true`, exit 3, `pending=11731` preserved.
- LESSON: the two classic boundary errors in one day — the filter that eats everything (D-001) and
  the cap that refuses its own last unit (D-003). Boundaries are where the tests must live.

## [2026-09-21] W1 — D-004 Flaky crash test (probe error)
- SYMPTOM: `expect(stuck).toBeGreaterThan(0)` failed intermittently — batch boundaries meant a
  clean run could end with zero orphaned rows.
- ROOT CAUSE: the first draft simulated a crash by relying on how many items a pool batch happened
  to process; with 50 items / concurrency 4 the last batch landed exactly on the budget.
- FIX: the test now simulates the crash explicitly (enqueue, claim 10, complete 1, close the db) —
  deterministic, and it tests the real law (sweep returns orphaned rows).
- VERIFICATION: `test_resume_no_dup` green ×2; the live kill -9 run left exactly `running: 8`.
- LESSON: a test that depends on timing is a test that lies sometimes. Simulate the failure mode
  directly instead of hoping the scheduler produces it.

## [2026-09-21] W5 — D-005 Budget checked AFTER the call (3 calls under a cap of 2)
- SYMPTOM: `decision-tree --budget-calls 2` made 3 calls before stopping.
- ROOT CAUSE: the budget asserted only at the top of the worker; with the post-call spend
  the third call slipped through the boundary.
- FIX: `Budget.roomLeft()` — the caller checks room BEFORE the call, spends after; the cap is
  now exact (cap=2 → 2 calls, then stop).
- VERIFICATION: `test_decision_budget_stop` green (`calls=2`, `budgetStopped=true`).
- LESSON: check capacity before the action, account after it. Two boundary bugs in the same
  family (D-003/D-005) — the boundary is where the money and the lies both live.

## [2026-09-21] W5 — D-006 Artifact carried run metadata, breaking replay determinism
- SYMPTOM: two identical runs produced different decisions.json (only `cached` differed).
- ROOT CAUSE: the written artifact included the transport bookkeeping (`cached`), so the
  second (cache-hit) run could never be byte-identical to the first.
- FIX: the artifact is the DECISION (`i, route, reason, answers, model`); run metadata lives
  only in the ledger/console.
- VERIFICATION: fresh pair → identical sha a3bc30351f68dad8, calls=0 cached=3.
- LESSON: an artifact that includes HOW it was produced can never be replayed. Separate the
  decision from the delivery.

## [2026-09-21] W-END — THE AUDIT'S BOUNDARY FAMILY (7 entries, one mechanism)
- CLASS: unvalidated boundary arguments (the happy path never passed them).
- ENTRIES: fail-closed swallowed (filter/find) · tombstones searchable · the 0.0.0.0 bind · the NaN
  family (caps/pool/queue) · the cache key ignoring the questions · the batch aborting on one file ·
  the double-counted measurement.
- ROOT CAUSE (one sentence): every one is an ARGUMENT the happy path never passed — NaN, negative,
  missing, deleted, hostile.
- FIX: the fix pass (78cd3be) — see DEBUG_LOG EN-009..EN-015 for the mechanism/diff/verification of each.
- LESSON: write the boundary suite BEFORE the audit; a green happy path is a receipt for effort, not
  a capability measurement.
- RESIDUAL: the 49 medium findings remain (five families; DEBUG_LOG's THE FRONTIER).

## [2026-09-21] W-END — THE RE-AUDIT (in flight)
- WHAT: `ocr review --from 7b7f7eb --to HEAD --format json` re-running after the fix pass.
- WHY: the gate's own rule — a FAIL blocks until fixed AND re-run; the fix is a claim, the re-run is proof.
- EXPECTED: the high count drops from 30 toward 0; the verdict line replaces the FAIL in TESTING_LOG.
- LESSON: one audit is a snapshot; the pair (before/after) is the evidence of the fix.

## [2026-09-21] W-END — D-016 THE DOCS LANDED SHORT ON FIRST WRITE (process entry)
- SYMPTOM: the first write of BUILD_REPORT (78L), DEBUG_LOG (59L), and the canon set (17-46L each)
  was FAR below the floors.
- ROOT CAUSE: content was authored to the session's natural length, not to the contract's floor;
  the floors exist because the contract's material (transcripts, tables, dispositions) does not fit
  in fewer lines.
- FIX: the material was added — the verbatim run transcript, the test inventory, the audit's
  findings table, the ruling index, the recovery procedures — taking BUILD_REPORT to 523 and
  DEBUG_LOG to 506, the canon to 200+ each.
- VERIFICATION: `wc -l` per doc (E-17); nothing was padded with whitespace or restated content.
- LESSON: a floor is a statement about the material, not about formatting. If the floor is not met,
  the material was not gathered.

## [2026-09-21] SESSION CLOSE — git 8b42ff8
- EN-024..EN-034 landed in DEBUG_LOG.md (11 entries): the FTS mirror, the sha-on-update upsert,
  the second-operator drill's six defects, the ADV-2 pair, the audit-2 adjudication ledger, the
  stdout-corruption + exit-code pair, the recipe validation, and the rig's own vacuous pass.
- The through-line: EVERY silent defect this session was found by RUNNING or by executing a DOC,
  never by reading. The audit found 2 of the 14; the battery found 2; the drill found 6; the
  doc-execution sweep found 3; the container rig found 1.

## [2026-09-21] THE SESSION THAT SWEPT THE JUDGE BOUNDARY — git 2a641ab

The 2 high-frequency canon logs were being updated in the SHIP log (`DEBUG_LOG.md`) and NOT here,
which is why the canon read as stale and why the C20 floor stayed unmet. The material existed; it
was in the wrong file. This entry lands it where the contract requires it. Ship entries are
EN-024..EN-064 there.

- **EN-035..EN-041** — the audit's closing findings: an identity map that could interpolate
  `undefined` into SQL (fixed), a "simplification" that yields `LIMIT NaN`/`-1` (REFUTED by six
  inputs), a dead duplicate `report` handler (fixed), and a fabricated "duplicate `total`"
  (REFUTED by `grep -c`). **LESSON: "simpler" is a claim like any other, and an auditor's finding
  is a hypothesis until a probe settles it.**
- **EN-042 / D-027** — a target-name sanitiser that was not INJECTIVE: `same name` and `same/name`
  both became `same_name`, so two targets shared one namespace and 2 files became 1 row, silently.
  **LESSON: a value that becomes a KEY must map one-to-one; a sanitiser that is not injective is a
  MERGE.**
- **EN-043 / D-028** — the D-009 defect still alive on the MCP surface: `jm_query` on a typo'd index
  returned `{"rows":[],"n":0}` at success AND materialised a phantom index file. Its own doc's
  "the same semantics as the CLI" is what exposed it. Plus `GET /health` creating an index on a
  liveness probe. **LESSON: fixing a defect on ONE surface does not fix the CLASS.**
- **EN-045 / D-030** — the decision's REASON contradicted its route (a fixed template printed
  `>= act` for noops and escalates). **LESSON: an exit status and a band count can both be right
  while the explanation beside them is wrong. Read the field a human will read.**
- **EN-046..EN-049 / D-031..D-034** — the JUDGE-EVIDENCE family, four instances in one chain:
  the excerpt excluded the match; the same in filter; one seed monopolised all 100 candidates; and
  `route` used a question type the API REJECTS (`mcq` -> HTTP 400) so the verb had NEVER worked
  while a mock validated the wrong shape. **LESSON: at least one test per external boundary must
  cross it for real. A mock encodes the author's belief about the far side.**
- **EN-050..EN-053 / D-035 + D-038** — concurrency took FOUR layers, each invisible until the one
  above was repaired (no `busy_timeout`; the timeout set AFTER the pragma; a check-then-insert
  schema seed dying on `UNIQUE meta.key`; the WAL conversion raced on every open though WAL is
  persistent). **LESSON: an intermittent failure needs a test that REPEATS — one round called a
  broken store green five times.**
- **EN-051 / D-036 + EN-052 / D-037** — an oversized body blocked the WHOLE HTTP surface (no body
  cap anywhere), and a QUADRATIC redaction regex (505/1986/7912 ms for 50k/100k/200k) made any
  large run hang with EMPTY stdout and stderr. **LESSON: an unbounded input is an availability
  problem, not a performance one; and measure SCALING, not a single case.**
- **EN-054..EN-063 / D-040..D-046** — the failure-policy and answer-reading family: only one
  error type was recognised while two verbs went silent; a renamed answer key read as 0 in four
  verbs; the stored confidence was regex-parsed out of the row's own prose; the cache ignored WHICH
  endpoint answered; calibrate read an unknown as a zero and could SUGGEST LOWERING A THRESHOLD
  over an outage; and a usage-less response was billed at $0 so the USD cap could never fire.
  **LESSON: grep for the idiom after fixing one instance — the same `?? 0` appeared on the WRITE
  side and the READ side of one column.**
- **EN-058 + EN-060 + T-07 + EN-064** — three of my own process defects: this host's `pkill` is
  not procps (exit 2, killed nothing, so a gate failed while the commands passed by hand); a test
  binding a FIXED PORT is a flake with a schedule; a commit landed with `tsc` RED because `;` let
  git run after a failed gate; and a `tail -2` hid a red battery from the command that reported it.
  **LESSON: the command which reports a result is part of the result.**

**THE RUNTIME LEDGER, CANON COPY:** sixteen defects this session, none visible in a green suite —
every one from crossing a boundary, repeating a measurement, grepping for an idiom after fixing
its first instance, or reading the field the engine actually writes.

## THE BOUNDARY LADDER — one line per boundary crossed, and what it cost NOT to have crossed it

| boundary | how it was crossed | what reading could not have shown |
|----------|-------------------|-----------------------------------|
| the judge's accepted question types | a live call per type | `mcq` -> HTTP 400: a verb that had never made a successful call |
| the prompt a judge is shown | reading the excerpt, not the trend | the phrase sat at char 1267/9224, outside the 1200-char head slice |
| the candidate provenance | counting where candidates came from | one seed took all 100; two seeds with 361/486 available contributed nothing |
| an oversized REQUEST | a 2 MB body to a live surface | the whole surface blocked, `/health` included |
| an oversized STATE | a 4 MB decision row | a quadratic regex made the run hang with EMPTY stdout AND stderr |
| four OS processes on one index | four simultaneous CLIs | four layers of concurrency defects, each hidden behind the last |
| the daemon's real loop | 32 s of background running | `bun run` is a wrapper plus a child; signalling the wrapper orphans the daemon |
| a service manager | a systemd user unit | `PrivateTmp` gives the service its own /tmp, so a target under /tmp is INVISIBLE |
| the judge's OUTAGE paths | a controlled endpoint | one error type recognised while two verbs returned silent empties |
| a RENAMED answer key | a judge answering under another key | four verbs read 0 — and `evaluate` fabricated every metric |
| two ENDPOINTS, one state | `JM_JUDGE_URL` pointed at a local server | the cache returned the first endpoint's answer for the second |
| a response with NO usage | a judge omitting its accounting block | a call billed at $0, so the USD cap could never fire |
| a 5 MB MCP line, a 2 MB ledger burst, 12 concurrent HTTP requests | sent them | all three survived — recorded so silence is not read as proof |

**THE THROUGH-LINE:** every defect this session was found by RUNNING something, REPEATING a
measurement, or GREPPING for an idiom after fixing its first instance. None was visible in a green
suite, and none would have been found by reading the code.

## WHAT THE HOT SEAT TAUGHT THAT READING COULD NOT — the closing ledger

1. Four of the sixteen defects were only reachable by FOUR SIMULTANEOUS PROCESSES. Reading the
   code shows a `busy_timeout` and a WAL pragma; it does not show that the timeout is set after
   the pragma, or that the schema seed races, or that the WAL conversion runs on every open.
2. Three were only reachable by STARVING the runtime: a missing key, an unreachable endpoint, a
   provider that answers without an accounting block. All three are the paths a demo never takes
   and a production run takes eventually.
3. Two were only reachable by an OVERSIZED input. The body cap and the quadratic redactor were
   both invisible until something big arrived, and one of them produced a hang with no output at
   all — the failure shape that looks like a freeze rather than an error.
4. The rest were reachable only by OPENING THE RIGHT FILE. Every one of them was a correctness
   defect in a function nothing had called with the wrong input yet.

**THE CLOSING CLAIM, AND ITS SCOPE:** this is what RUNNING `jm-live-01` taught. It is not a claim
that the system is defect-free; it is a claim that this instrument, on this instance, has nothing
left unexperienced. The residual is NAMED: W8's fire gate (parked on the operator's rulings) and
the source chunk of the independent audit.

## [2026-09-22] D-047 + T10 — the registered launcher, proven the way a client starts it

- **THE ANGLE:** an MCP client invokes a registered server by ABSOLUTE PATH with an ARBITRARY cwd.
  Nothing in the repo tested that, because every in-repo test ran from the repo. T10 starts the
  launcher from `/` and asserts the full protocol: `tools/list` (4 tools), a real `tools/call
  jm_query` (n=1 with the row payload), and a keyless `jm_find` as a NAMED `isError` refusal.
- **THE DEFECT IT FOUND (D-047):** the launcher resolved bun as `"${JM_BUN:-$HOME/.bun/bin/bun}"`
  while the registry passes `PATH` containing `.bun/bin`. A redirected HOME — service manager,
  container, sandbox — means the server never starts. Fixed with a ladder and an exit 127 naming
  every rung.
- **THREE OF THE ANGLE'S FOUR FAILURES WERE THE PROBE, NOT THE PRODUCT** — `targets add` for
  `target add`; asserting the response contains the SEARCHED phrase when an FTS row carries
  path/size/rank and the phrase lives in the file's content; and regexing `"n": 1` against wire
  bytes where every quote is escaped. The angle now PARSES the envelope and the payload and asserts
  the VALUE.
- **THE NAMING CATCH:** the angle was first called T8 — a number the spec's §9 reserves for the
  fire-gate twin. A rig reporting "8/8" with a reused number reads as covering an angle it does not
  touch. Renamed T10.
- **PROVEN:** host 8/8 and container 8/8 (`jm-ct-rig`, bun 1.4.2).

## [2026-09-22] D-048 + D-049 — two defects in the launcher, found by probing the ENTRY POINT

- **THE SURFACE:** T10 proved the launcher's protocol from a foreign cwd. Seven further probes
  attacked its ENVIRONMENT and the PATH it is invoked by — `env -i`, a symlink, a bad override, an
  unwritable home, extra argv.
- **D-048:** with `HOME` unset, `set -u` aborted the script at the `$HOME/.bun/bin/bun` rung with a
  raw `unbound variable` error, so the named 127 message never printed. **A fallback ladder whose
  last rung can itself throw has no last rung.** Fixed with `${HOME:-}`.
- **D-049:** invoked through a SYMLINK, `dirname "$0"` resolved to the LINK's directory and the
  server died with `Module not found "src/cli.ts"`. Symlinking a launcher into `~/bin` is the
  ordinary way to put one on PATH. **`$0` is how the caller named the program, not where it lives.**
  Fixed with `readlink -f`.
- **FIVE PROBES BEHAVED** and are recorded so silence is not read as proof: both resolution rungs,
  a bad `JM_BUN`, an unwritable `JM_HOME`, and extra argv being ignored.
- **PINNED:** `tests/launcher.test.ts`, 6 cases with both halves.
