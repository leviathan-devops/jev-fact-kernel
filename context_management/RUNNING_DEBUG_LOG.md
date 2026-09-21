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
