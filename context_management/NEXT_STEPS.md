# NEXT_STEPS — JM (overwrite; the live queue with acceptance criteria)

**TREE SHA: `e8097b887c2dd0fd33e900660f85b784` (git 2a641ab)** - every canon doc that carries this line carries THIS sha; a disagreement means one is stale. Re-derive with ./scripts-seal.sh





























## THE BLOCKER (nothing ships while this is red)

### N-1 — Re-run the audit and land the verdict
- **What:** `ocr review --from 7b7f7eb --to HEAD --format json` (already in flight), then replace the
  `AUDIT GATE:` line in TESTING_LOG with the new verdict and update `AUDIT_SUMMARY.md`.
- **Acceptance:** the new artifact exists; the verdict line reads PASS (0 critical/high) or the
  remaining findings are enumerated with dispositions.
- **Why it blocks:** the gate's own rule — a FAIL blocks every ship-ready claim until fixed + re-run.
- **Cost if skipped:** a build that cannot be defended as reviewed.

## THE MEDIUM FRONTIER (49 findings, five families — the next fix wave)

### N-2 — Unfiltered/unsanitised inputs
- **What:** sanitise `--name`/`--job` before path joins (`src/store/db.ts:indexPathFor`,
  `src/job/store.ts:jobDir`); make queue fingerprints root-relative (`src/job/indexJob.ts`).
- **Acceptance:** a name containing `../` cannot escape `~/.jm/`; a job moved to another root resumes
  with the same fingerprints.
- **Test:** a new `test_path_sanitisation` + a fingerprint-stability fixture.

### N-3 — Missing cleanup on state change
- **What:** delete `docs`/`docs_fts` rows when a file is tombstoned; add a cache prune (by age/hits);
  add a job-dir sweep.
- **Acceptance:** after deleting a file and re-indexing, the FTS row is gone; `~/.jm` growth is bounded.
- **Test:** extend `test_index_incremental` with an FTS-absence assertion.

### N-4 — Guards that exist but are not wired
- **What:** honour `Policy.fail` in the decision verbs (fail-open vs fail-closed per recipe); add a
  retry policy for `queue.state='failed'` rows.
- **Acceptance:** a recipe with `fail:"open"` continues on a judge outage and marks the rows; a failed
  row is retried at most N times then parked.
- **Test:** `test_policy_fail_open` + `test_queue_retry_cap`.

### N-5 — Test-harness coupling
- **What:** make the mock transport's counter robust (an in-memory counter, not a sidecar file);
  document the checkpoint-exclusion rule in the test README.
- **Acceptance:** parallel mock tests cannot race the counter.
- **Test:** run the decision suite with `--concurrency` style parallelism.

### N-6 — Maintainability
- **What:** split `src/cli.ts` (246 lines) into per-verb modules; extract the duplicated severity
  extraction in `find.ts`/`decision-tree.ts`.
- **Acceptance:** no file over ~150 lines in `src/verbs/`; behaviour unchanged (battery green).

## THE WAVE QUEUE (from packages/jm/06-WAVES.md)

### N-7 — W2 remainder: the sqlite + jsonl adapters
- **What:** `src/adapters/sqlite.ts` (read-only attach, table list, row extract) and
  `src/adapters/jsonl.ts` (stream parse); wire `--in @ocdb`.
- **Acceptance:** `jm query @ocdb --where "…"` returns rows from `session/part/message`; the adapter
  never writes to the source DB.
- **Note:** the `@ocdb` table list is ASSUMED (`session,part,message`) — verify before wiring.

### N-8 — W8: the fire gate (blocked on F1/F6)
- **What:** the reflex script schema + `jef validate` + the assembler + `destructive-edit` in OBSERVE.
- **Acceptance:** `jef validate` refuses a gateless script; `test_firegate_twin` gives opposite
  verdicts on the same-shape pair; tokens per firing <= 5,000.
- **Blocker:** the operator's F1/F6 rulings + the `pi` wrap points opened.

### N-9 — The MCP surface and the watch daemon
- **What:** `jm mcp` (tools `jm_query`, `jm_find`, `jm_decide`, `jm_index` — BUILT, verified by
  handshake + a real tools/call; the design doc's `jm_extract`/`jm_index_status` were never
  built) and `jm watch` (BUILT: an idempotent tick with a real JSONL journal)
  (manager-machine frame: index-watch, judge-drain, cache-gc, calibration-tick).
- **Acceptance:** an OMP session calls `jm_find` and receives rows; the daemon ticks with a recorded
  kill path.

## THE DISCIPLINE QUEUE

### N-10 — The second-operator drill
- **What:** a zero-context subagent, given ONLY `README.md` + `packages/jm/`, must operate JM
  end-to-end. Its questions are the doc holes; its failures are the UX findings.
- **Acceptance:** the transcript shows the agent indexing, querying, and judging without help.

### N-11 — Calibration to the move
- **What:** accumulate >= 50 decisions with `later_truth` filled, then let `calibrate` move a
  threshold and record the calibration row.
- **Acceptance:** the row exists with the evidence (bands, mean, the reason).

### N-12 — The escalation band, live
- **What:** craft a fixture set that lands rows in 0.5–0.8 and verify the escalate route end to end.
- **Acceptance:** the escalation file is non-empty from a LIVE run.

## RISK REGISTER

| risk | mitigation | owner |
|------|-----------|-------|
| the re-audit finds new highs in the fix diff | the fix pass is small and reviewed line by line | next session |
| `@ocws` (219G) chews disk/time | skip-rules design reviewed before any walk | operator + W2 |
| provider rate limits under N-way concurrency | pool sizes to the limiter; budget caps exist | W5 follow-up |
| doc drift from the build | the 2 logs update at the moment of work | every session |
| the checkpoint grows unbounded | a sweep policy for old checkpoints | operator |


## NOTE (2026-09-21) — the battery moved 18/0 -> 24/0 during the frontier wave
The wave added `tests/guards.test.ts` (6 pins) and the traversal-law probe fix; the battery is now
89 pass / 0 fail / 343 expects / 9 files with `tsc` exit 0. Docs synced: living instructions carry
the new counts; historical records are annotated, not rewritten.

## THE DETAILED ACCEPTANCE CRITERIA (what "done" means per item)

### N-1 acceptance (the audit re-run)
```
 [ ] artifacts/audit-<date>-reaudit.json exists (the first artifact is never overwritten)
 [ ] TESTING_LOG carries the new `AUDIT GATE:` line
 [ ] AUDIT_SUMMARY.md carries the new verdict + the remaining findings' dispositions
 [ ] if PASS: the BUILD_REPORT's audit section is updated with the new counts
 [ ] if FAIL: the new highs are enumerated with dispositions and the gate stays FAIL
```

### N-2 acceptance (input sanitisation)
```
 [ ] `jm target add 'x/../../etc' fs /tmp` cannot escape ~/.jm/index/
 [ ] `--job '../x'` cannot escape ~/.jm/jobs/
 [ ] a job whose root moves resumes with the same fingerprints (root-relative keys)
 [ ] test_path_sanitisation green; battery still green
```

### N-3 acceptance (cleanup)
```
 [ ] delete a file -> re-index -> the FTS row is GONE (assert absence, not just the files row)
 [ ] `jm cache prune --older-than 30d` exists and reports the rows removed
 [ ] `jm job gc --keep 5` exists and reports the dirs removed
```

### N-4 acceptance (wired guards)
```
 [ ] a recipe with `fail:"open"` continues through a judge outage and marks the rows `gate_unavailable`
 [ ] a recipe with `fail:"closed"` (the default) still exits 2
 [ ] a failed queue row retries at most 3 times then parks with the error recorded
```

### N-7 acceptance (adapters)
```
 [ ] `jm index @ocdb --kind sqlite --tables session,part,message` completes
 [ ] `jm query @ocdb --fts "<a known phrase>"` returns rows with ids
 [ ] the source DB's mtime is unchanged after the run (read-only proof)
```

### N-8 acceptance (the fire gate, when unblocked)
```
 [ ] `jef validate` refuses a script with no gate (exit non-zero, L1 named)
 [ ] `test_firegate_twin` -> opposite verdicts on the repair/revert pair
 [ ] `test_firegate_i4` -> tokens <= 5,000 with `truncated` set when cut
 [ ] zero judge calls from the stream matcher (the I3 latency probe)
```

### N-10 acceptance (the drill)
```
 [ ] a fresh subagent, given only README.md + packages/jm/, indexes @reports and runs one
     decision-tree batch without asking a question the docs answer
 [ ] every question it DOES ask is logged as a doc hole with the fix applied
```

## THE ORDER OF WORK (dependency-correct)

```
 N-1 (the re-audit)          — closes or re-opens the gate; everything else waits on its verdict
 N-2..N-6 (the medium wave)  — the same session as N-1's verdict, in the listed order
 N-7 (adapters)              — unblocks @ocdb and the second corpus
 N-10 (the drill)            — after the docs settle; its findings feed N-6
 N-11/N-12 (calibration)     — after >= 50 later-truth rows exist
 N-8 (the fire gate)         — gated on the operator's F1/F6
 N-9 (mcp/watch)             — after N-7 (the surfaces expose the adapters)
```

## WHAT NOT TO DO NEXT

- Do not claim ship-ready while the gate reads FAIL.
- Do not pad docs to floors; add the material or record the gap.
- Do not start W8 without F1/F6.
- Do not re-audit with a narrower scope and call it a pass — the gate compares like for like.
- Do not delete the first audit artifact; the pair (before/after) is the evidence of the fix.

## THE SESSION HANDOFF NOTE (what the next session should read first)

If you are the next session: read `COMPACTION_SURVIVAL.md` (the state + laws), then
`POST-COMPACTION_PROMPT.md` (your entry sequence), then this file's N-1 (the blocker). The
single sentence that orients everything: **the engine works live; the audit gate says it is not
reviewed clean; fix the medium frontier, re-run the audit, and only then claim anything.**

The second sentence: **the two things most likely to be forgotten are the doc floors (now met)
and the checkpoint refresh after any code change** — the checkpoint is the rollback point and a
stale checkpoint is a broken baseline.

## THE DEFINITION OF DONE (for the whole JM v0.1 line)

JM v0.1 is DONE when, on this host:

1. `AUDIT GATE: PASS` (0 critical/high) over the full build range, artifact on disk, line in TESTING_LOG.
2. All canon docs >= 200 lines with >= 3 file:line refs; ship docs at their floors; cross-consistent.
3. W2's adapters built and `@ocdb` queried live.
4. The second-operator drill passed with the asked questions logged and fixed.
5. The checkpoint refreshed, sealed, and its battery verified from the copy.
6. A receipt posted: baseline diff, battery, the audit verdict line, the runtime ledger, the checkpoint.

Until all six hold, this line is OPEN, and the goal stays active.

## THE LAST WORD (for whoever opens this file first)

N-1 is the whole game right now. Everything else on this list makes JM better; N-1 makes it
DEFENSIBLE. Run the audit, land the verdict, and let the gate decide — because the one thing this
build proved, fifteen times over, is that the system's own evidence is more honest than its
author's confidence.

### AND THE SECOND SENTENCE
The medium frontier (N-2..N-6) is not busywork: it is where the audit said the risk lives. Each item
there is a class, not an instance — fixing the pattern prevents the next twelve instances.

## DOC GAPS FROM THE SECOND-OPERATOR DRILL (2026-09-21, zero-context operator, 12/12 stale claims reproduced)
The drill completed all 9 steps. Its CODE defects were fixed this session (G1 unknown index was a
silent empty + phantom file; G2 `@target` did not dispatch by kind; `index <file>` was a silent
no-op with an empty stored path; G9 `--structure csv` rendered markdown; G13 `find` ignored
JM_HOME; G14 ledger `args` dropped flags). The remaining DOC work:

- **N-10** `README §10` must document the multi-target verbs (`index --in a,b|all`, `query --in`),
  `scan`/`cluster`/`extract`, `report`, `journal`, `target ls|rm`, and the exit-code table
  (0 ok / 1 runtime / 2 client error / 2 JEV_NO_KEY).
- **N-11** Key management: the TWO sources (`TYPESAFE_API_KEY`, `~/.config/typesafe/key`), which
  verbs need the judge, and the fail-closed contract (CLI exit 2, HTTP 503, nothing written).
- **N-12** A RECIPE FILE schema (--recipe takes a path; §11 defines a recipe only in prose).
- **N-13** The MCP operating contract: transport (stdio), a paste-ready JSON-RPC line, the
  handshake question, and the tool list (now corrected in §13).
- **N-14** The watch surface: journal location, the auto-derived index name (and the absence of
  `--name`), idempotency, and which of §13's four named duties a tick actually performs
  (only index-watch is observable — the other three are STALE-OR-UNBUILT).
- **N-15** `report`'s field definitions, and that `report <bogus>` reads the GLOBAL registry and
  ledger (now refusing a missing index, but the global-ledger read remains to document).
- **N-16** The pointer-vs-body query contract: `query` returns pointer metadata; the row BODY is
  reachable via `scan`/`extract`.

---

## CURRENT (appended 2026-09-21, git 8b42ff8)



**Battery: 89 pass / 0 fail / 343 expects / 17 files · `bunx tsc --noEmit` exit 0.**
**Container rig (spec §9 T1–T7): PASS 7/7 in a fresh Debian-12 container AND on the host.**

### What landed after the wave-1 foundation
- **W2 TARGETS** — fs · jsonl · sqlite adapters; `--in a,b|all`; row-level incrementality by
  content sha; the sqlite SOURCE proven read-only. Fixed D-008 (two targets' same-named files
  collapsed into ONE row — a silent row loss).
- **W3 RETRIEVE** — `scan` (regex gate + hit counts + excerpts) · `cluster` (signature groups, no
  model) · `extract` (capture-group pulls; md/json/csv).
- **W5 DECIDE** — `route` (the catalogue Choice, injection text on act, runner-up logged) ·
  `evaluate` (agreement/Brier/ECE/variance + `--replay`).
- **W6 SURFACES** — the **MCP** stdio surface (jm_query/jm_find/jm_decide/jm_index) and the
  **watch daemon** (idempotent tick, real JSONL journal). All four surfaces now live.
- **W7** — `report` (read-only status over the store + ledger).
- **README §18 — THE OPERATING CONTRACT**, written from a zero-context operator's 14 reported
  gaps and then EXECUTED: 25 claims verified against the live engine, which found three more
  defects (the cost line corrupted piped output; per-verb exit codes; `target add` accepted a
  phantom root).

### The defect ledger (all fixed, all pinned)
D-008 cross-target row collapse · D-009 unknown index returned empty+exit 0 (and created a phantom
index file) · D-010 `@sqlite-target` indexed the DB file, not its rows · D-011 `index <file>` was a
silent no-op · D-012 `--structure csv` rendered markdown · D-013 `find` ignored JM_HOME · D-014 the
ledger dropped the flags · D-015 a target NAME was a path fragment · D-016 `route` injected an
out-of-catalogue choice · D-017 the cost line corrupted piped stdout · D-018 per-verb exit codes ·
D-019 `target add` accepted a nonexistent root · D-020 a questions-less recipe "succeeded" as
noop=all · D-021 `--in` silently dropped `--queued`.

### The gates
- **P6 DOCUMENT: BLOCKED.** The audit's tests-chunk and root-chunk are COMPLETE with 0 findings;
  the src chunk (36 files) is PARTIAL in every attempt — upstream rate limits. Half a dozen runs,
  every finding adjudicated (9 confirmed+fixed, 6 REFUTED by probe). Method + ledger:
  `AUDIT_SUMMARY.md`. NEVER PASS while the largest chunk is unmeasured.
- **W8 FIRE GATE: NOT BUILT** — parked on the operator-owned F1/F6 rulings.
- Residual, named: the unswept frontier is the src chunk under a working lane; `@ocws` never
  walked; the escalation band has no live row.
