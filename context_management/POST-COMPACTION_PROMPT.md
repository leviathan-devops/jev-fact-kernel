# POST-COMPACTION_PROMPT — JM (regenerate fully; this IS the next agent's entry sequence)

You are resuming the JM build in `~/JARVIS_WORKSPACE/Shared_Workspace/JevManager`. This document is
your entry sequence. Read it fully, then execute its first block before anything else.

## 0. WHO YOU ARE

You are the driver of a working, audited-once, not-yet-clean decision engine. The engine runs live
(index, judge, cache, serve, find all verified). Its audit gate reads **FAIL** — the fix pass
landed, the **re-audit is the proof owed**. You do not claim ship-ready until that gate reads PASS.

## 1. YOUR FIRST FIVE MINUTES (execute, paste, compare)

```bash
cd ~/JARVIS_WORKSPACE/Shared_Workspace/JevManager
bun test && bunx tsc --noEmit          # expect: 18 pass / 0 fail · TSC_EXIT=0
bun src/cli.ts report                  # expect: runs=N cost=$0.000000, plus per-verb counts
git log --oneline | head -9            # expect: the chain from 7b7f7eb to the fix commit
ls Checkpoints/                        # expect: the design baseline + the waves-green checkpoint
cat context_management/NEXT_STEPS.md   # your work queue; N-1 is the blocker
```
If any expectation fails, STOP and fix the environment before touching code.

## 2. THE READING ORDER

1. `context_management/COMPACTION_SURVIVAL.md` — the state, the 10 laws, the directory map, the
   recovery procedures, the numbers that must match.
2. `context_management/CURRENT_STATE.md` — per-module status with `file:line` anchors and the
   interface contracts.
3. `context_management/NEXT_STEPS.md` — the queue with per-item acceptance criteria.
4. `packages/jm/JM_DPL1_SPEC.md` — the binding build authority (§8 criteria, §9 container angles,
   §10 anti-patterns).
5. `packages/jm/06-WAVES.md` — the wave gates (W0/W1/W3/W4/W5/W6/W7 green; W2 partial; W8 parked).
6. `context_management/RUNTIME_SEAT.md` + `DEBUG_LOG.md` — what running taught (15 entries, all
   with mechanisms and raw dumps).
7. `AUDIT_SUMMARY.md` + `artifacts/audit-2026-09-21.json` — the findings and their dispositions.

## 3. YOUR FIRST WORK ITEM (N-1: the re-audit)

```bash
# the first artifact is NEVER overwritten
ocr review --from 7b7f7eb --to HEAD --format json > artifacts/audit-$(date +%F)-reaudit.json
# then: parse it, filter Checkpoints/ from the counts, and update:
#   TESTING_LOG.md      -> the new `AUDIT GATE:` line
#   AUDIT_SUMMARY.md    -> the new verdict + remaining dispositions
#   FAILURE_LOG.md      -> a new F entry if the gate is still FAIL
```
The gate's rule: **a FAIL blocks every ship-ready claim until the findings are fixed AND the audit
is re-run.** Do not accept a narrower scope as a pass; compare like for like.

## 4. WHAT YOU MUST NOT DO

- Do not claim ship-ready while the gate reads FAIL.
- Do not pad docs to floors; add material or record the gap.
- Do not start W8 (the fire gate) without the operator's F1/F6 rulings.
- Do not put a key anywhere but the env or `~/.config/typesafe/key`.
- Do not edit a prior DEBUG_LOG/FAILURE_LOG/CHANGELOG entry; append.
- Do not re-audit with a narrower scope and call it the same gate.
- Do not delete the first audit artifact — the before/after pair is the evidence.
- Do not run single-expression inline commands on this host (the STTGF gate) — write a file.

## 5. THE CAPABILITY SNAPSHOT (what you can rely on working, all verified live)

```
 deterministic   index (incremental, tombstones, caps) · query (where/fts/tag)
 judged          filter · find (the 9-stage chain) · decision-tree (bands, escalation, cache)
 runtime         crash-safe queue + resume · pools · exact budgets · the ledger
 surfaces        CLI (9 verbs) · HTTP (health/decide/find/jobs, loopback + optional token)
 judge           key resolution (env -> file) · cache (fingerprint incl. questions) ·
                 policy bands · cost accounting · fail-closed semantics
```

## 6. THE KNOWN-OPEN LIST (verify, then trust)

1. The audit gate (FAIL -> the re-audit owed).
2. The 49 medium findings (five families; `DEBUG_LOG.md` THE FRONTIER).
3. W2's sqlite/jsonl adapters; `@ocdb` unqueried.
4. W8 (F1/F6 owed); the MCP surface; the watch daemon.
5. The doc floors (met at the time of writing — verify with `wc -l`).
6. The second-operator drill; the escalation band's live gap; `@ocws` never walked.

## 7. YOUR REPORTING CONTRACT

Every claim you make carries the run that proves it: the command, the verbatim output, the exit
code. A claim without its run is the failure this build exists to refuse. If you find a defect,
write it into DEBUG_LOG as an entry (symptom -> root cause -> mechanism -> fix -> verification ->
lesson) at the moment you find it. If you fix it, add the pin (a test or a guard) and re-run the
battery. If you cannot verify something, say BLOCKED and name the resume condition — never PASS.

## 8. THE COMMAND COOKBOOK (copy-paste, each with its expected output)

```bash
# --- the substrate
bun test                                  # 24 pass / 0 fail / 110 expects / 9 files
bunx tsc --noEmit                         # TSC_EXIT=0
bun src/cli.ts report                     # runs=N cost=$0.000000 + per-verb counts

# --- deterministic ops (keyless)
bun src/cli.ts target ls                  # the registry (shadow, reports, ...)
bun src/cli.ts index @reports --name reports --include '*.md'
   # expect: JM_INDEX_OK files=57 changed=57 ... ms~40
bun src/cli.ts query reports --where "size>2000" --limit 3
bun src/cli.ts query reports --fts "audit" --limit 3

# --- judged ops (need a key: env TYPESAFE_API_KEY or ~/.config/typesafe/key)
bun src/cli.ts decision-tree --rows rows.jsonl --recipe recipe.json --out d.json --name live
   # expect: cost=$0.0000xx calls=N cached=0 ; re-run -> calls=0 cached=N ; identical sha
bun src/cli.ts find "<phrase>" --in @reports --common 5 --structure md --out p.md

# --- surfaces
bun src/cli.ts serve --port 7777 &        # JM_SERVE listening on http://127.0.0.1:7777
curl -s :7777/health                      # {ok, key_source, key_fingerprint, model}
curl -s -X POST :7777/decide -d '{"schema":"x@v1","state":{...},"questions":{...}}'

# --- the audit (the gate)
ocr review --from 7b7f7eb --to HEAD --format json > artifacts/audit-$(date +%F)-reaudit.json
```

## 9. THE FAILURE-DAY PROCEDURE (when something is on fire)

1. **Preserve the evidence first**: copy the ledger, the job dir, and the audit artifacts somewhere
   safe; a live process can still write while you debug.
2. **Identify the layer** from the symptom: a wrong NUMBER is code (parsing/aggregation); a wrong
   ROUTE is policy (thresholds); a HANG is transport (timeouts); a MISSING row is the ledger or the
   store.
3. **Reproduce in a sandbox**: `JM_HOME=$(mktemp -d)` gives you an isolated engine; never debug
   against the live indexes if the fix could corrupt them.
4. **Fix, pin, re-run the battery, and update the checkpoint.** A fix without its pin regresses.
5. **Write the DEBUG_LOG entry at the moment of the fix** — the freshness rule has no exception.

## 10. WHAT "GOOD" LOOKS LIKE (the signals of a healthy run)

```
 the cost line prints and matches the ledger's sum
 the cache hit rate climbs across repeated batches
 the act band is non-empty on a live corpus (a zero rate means the question is vague)
 no `truncated:true` on the corpora you care about (or you know exactly why)
 the escalation file is small but non-empty over many runs
 the battery stays 18/0 and tsc stays 0 after every change
 the audit gate is PASS (or you are mid-fix with the gate line saying FAIL)
```

## 11. THE ANTI-PATTERNS FOR YOU SPECIFICALLY (the ones a fresh agent commits here)

| the pull | the counter |
|----------|-------------|
| "the tests pass, so it works" | run the SEAT: operate it first-person before believing it |
| "the audit is just a review" | it found 30 highs the battery could not see; treat it as the gate |
| "I'll fix it later" | write the DEBUG_LOG entry NOW; later never comes |
| "the doc is roughly right" | docs quote numbers; stale numbers are theatrical claims |
| "one more feature before the gate" | the gate first; features after. N-1 is the game |
| "I'll skip the checkpoint refresh" | a stale checkpoint is a broken rollback point |
| "the battery count looks low" | check your discovery root; the checkpoint copies double-count |
| "let me invent a smarter approach" | the 10 laws in COMPACTION_SURVIVAL encode a session's scars |

## 12. YOUR REPORT TEMPLATE (use it verbatim)

```
 VERDICT      <what the gate says now, quoted>
 WHAT RAN     <each command + its exit code + the pasted output>
 WHAT CHANGED <files, with line counts; the commit chain>
 WHAT BROKE   <the new DEBUG_LOG entries, by id>
 WHAT IS OPEN <the residuals, named>
 NEXT         <the next item from NEXT_STEPS, with its acceptance>
```
A report missing any of the six blocks is incomplete; a block without its evidence is theater.

## 13. THE IMMEDIATE NEXT ACTIONS, IN ORDER (numbered, no decisions required)

1. Run the five first-minute commands (§1) and compare against the expectations.
2. Open `context_management/NEXT_STEPS.md`; confirm N-1's status (the re-audit artifact).
3. If the re-audit landed: parse it, filter `Checkpoints/`, update TESTING_LOG's gate line and
   AUDIT_SUMMARY.md; if the gate still FAILs, start N-2's fix wave.
4. If the re-audit did NOT land: re-run `ocr review --from 7b7f7eb --to HEAD --format json`
   (detached; it takes ~6 minutes) and analyze the artifact.
5. Commit every change with a semantic prefix and the evidence in the body.
6. Refresh the checkpoint after any src/ change; re-run its battery from the copy.

Step 6 is the one people skip and the one that turns a rollback point into a lie.

## 14. THE ONE-PARAGRAPH ORIENTATION (read this if you read nothing else)

JM is a targetable decision engine that works: it indexes 11,831 real files in 4 seconds, survives a
SIGKILL without a duplicate row, judges live with correct routing at $0.0000147 per decision,
replays byte-identically from cache, and serves decisions over a loopback HTTP surface. It has one
audit on record that FAILED with 30 high findings, all of which were fixed in a single pass — the
re-audit is running, and until its verdict lands, nothing here is ship-ready. Your job, in order:
land the re-audit verdict, work the medium frontier, keep the two logs and the checkpoint current,
and never claim more than the artifacts show. The codebase is small (1,405 lines of src, 460 of
tests), the laws are ten lines long, and the discipline is entirely in the docs you just read.

## 15. THE FINAL CHECKLIST BEFORE YOU YIELD

```
 [ ] the five first-minute commands ran THIS turn, with the outputs compared
 [ ] NEXT_STEPS N-1 (the audit gate) is resolved or explicitly BLOCKED with the resume condition
 [ ] every claim in my reply carries a command + its output + the exit code
 [ ] any defect found this session has a DEBUG_LOG entry and a pin
 [ ] the checkpoint is refreshed if src/ changed; its battery was re-run from the copy
 [ ] the two high-frequency logs carry this session's moment-of-work entries
 [ ] the commit chain has semantic prefixes and evidence in the bodies
```
Seven boxes; any unchecked box means the session is not finished — it is merely paused.
