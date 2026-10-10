# DEBUG_LOG — the jev OMP tool (ship package v1.0, 2026-10-07)

> The bug chain of this build: the registration saga (three days, three root-cause layers) and the
> audit hardening arc (six rounds, 19 critical/high adjudicated). Authored from the live
> JevManager DEBUG_LOG entries EN-115..117 + the audit sessions' transcripts; the honest line
> count note: the material is finite (a two-file extension); no padding.

## BUG SUMMARY TABLE

| # | Bug | Class | Root cause | Fix | Verified by |
|---|---|---|---|---|---|
| 1 | The invisible tool (3 days) | registration/delivery | the registration was correct; a live wire set is frozen at construction + later snapshot re-applications strip late tools + a silent handler hid it | both-branch receipts + serialized before_agent_start re-assert + CAS | fresh-boot receipts; /dump 23 tools; the direct call (ledger 20→21) |
| 2 | buildArgs dropped params for 5 verbs | silent wrong answer | watch/evaluate/spec-audit/push-gate/st-detect fell to `default` | completed coverage + per-verb refusals | JEV_NEED_EVAL_ARGS etc. live |
| 3 | timeout/abort mapped to exit 0 | masked failure | `e?.code ?? 0` flattened errno/signal | exit truth + errno/signal/killed surfaced | audit R1/R3 + JEV_CANCELLED path |
| 4 | `--json` corrupted by the stderr splice + marker | machine-consumer break | `joined = out + stderr`; an HTML-comment truncation marker | raw stdout in json mode; in-band JSON envelopes; details.stderr | audit R2/R6 |
| 5 | caller abort reported as judge outage | misdiagnosis | the abort forwarded into the probe; catch → "unreachable" | `__CALLER_CANCELLED__` sentinel → JEV_CANCELLED | audit R2 |
| 6 | unvalidated paths / flag injection | input hygiene | raw values to execFile | leading-dash guards + async stat.isFile+R_OK+realpath | audit R1/R3/R4 |
| 7 | JM_BIN untrusted | exec hygiene | env-controlled path, isFile-only | realpath + reject group/world-writable | audit R4 |
| 8 | execFile without encoding | runtime portability | Buffers on Node break string helpers | `encoding:"utf8"` | audit R5 |
| 9 | surrogate-guard asymmetry | boundary | decrementing on a trailing LOW orphaned the high half | high-only guard | audit R5 |
| 10 | the R6 "critical" | probe-error | reviewer conflated .isFile (353) with the parent .isDirectory (366) | none — refuted with evidence | `grep -n isDirectory index.js` |

## THE FULL CHAINS

### BUG 1 — THE INVISIBLE TOOL (the three-day saga)
- **Symptom:** `jev` loaded, receipted, executable via `xd://jev` — yet absent from the operator's
  live session wire schema. Operator verbatims in the FAILURE_LOG F-23.
- **Diagnosis process (the failures first):** (a) source archaeology over OMP internals for hours
  (the goal path, the mount notices, the persisted-set hunt) — the decisive instruments
  (`stat` vs `ps -o lstart`, a fresh-boot A/B, `/dump`) came last; (b) a model's self-report
  (`NOT-TOP-LEVEL`/`CANNOT-CALL`) was treated as a measurement for ~20 minutes while its own
  `/dump` carried jev top-level (tool #20 of 23) — the instrument law, retested the hard way.
- **Root cause (three layers):** see BUG SUMMARY #1 + the BUILD_REPORT §2.2. The fingerprint that
  named it: the live set = `goal` appended LAST + `jev` missing — exactly
  `setActiveToolsByName([...previousTools, "goal"])` with a snapshot lacking the extension tool.
- **Fix:** both-branch receipts; `before_agent_start` idempotent re-assert, serialized through one
  promise chain, with a verify-after-write retry; the pi surface typeof-guarded.
- **Verification:** the fresh boot receipt `jev already in the active set`; the clean-room `/dump`
  (23 tools, jev present); the refreshed session's DIRECT call executing (ledger 20→21).
- **Lesson:** mtime(file) vs lstart(process) FIRST; test the FRESH BOOT; a model's self-report is
  not an instrument; log both branches.

### BUG 2 — THE FIVE VERBS THAT SILENTLY DROPPED THEIR PARAMS
- **Symptom:** `evaluate`/`watch`/`spec-audit`/`push-gate`/`st-detect` validated, then ran as bare
  `jm <verb> [--json]` — every verb-specific param silently discarded. `evaluate` even paid the
  90s judge warm-up then discarded its inputs.
- **Root cause:** `buildArgs`'s switch had no cases for them; `default: break` is a silent drop.
- **Fix:** completed coverage (evaluate → `--cases/--questions/--key/--k`; watch →
  `--once/--interval/--name`; spec-audit → positional; push-gate → `--spec`; st-detect → bare) +
  required-arg refusals + new schema params (cases/questions/qkey/spec/once/k/interval).
- **Verification:** `JEV_NEED_EVAL_ARGS` fires live; the CLI's own signatures read from
  `src/cli.ts:506-655` before wiring.
- **Lesson:** a `default: break` in an arg builder is a silent-drop machine; every verb case or a
  named refusal.

### BUG 3 — THE EXIT CODE THAT LIED (timeout/abort → exit 0)
- **Symptom:** a timeout-kill or AbortSignal abort produced `ok:true` with partial/empty output.
- **Root cause:** `const e = err as {code?: number} | null; res({code: e?.code ?? 0 ...})` —
  execFile sets `killed`/`signalCode` (not `code`) on those paths; `?? 0` mapped them to success.
- **Fix:** `let code = 0; if (e) code = typeof e.code === "number" ? e.code : 1;` + errno string +
  signal + killed surfaced in `details` and in the `JEV_EXIT_*` line.
- **Verification:** the audit's R1/R3 rounds; the JEV_CANCELLED path for caller aborts.
- **Lesson:** "exit 0" must be earned; every non-numeric error shape is a failure.

### BUG 4 — THE `--json` CORRUPTION (two layers)
- **Symptom:** machine callers received unparseable output exactly when output was large or the
  CLI wrote stderr (the cost line!).
- **Root cause:** (a) `joined = out + "\n[stderr]\n" + err` was returned as text even in json mode;
  (b) truncation appended an HTML comment to sliced stdout; (c) later, the oversize refusal was a
  bare text line while every other failure was a JSON envelope.
- **Fix:** json mode returns RAW stdout; stderr lives in `details.stderr` (truncated); every
  failure path in json mode returns a `JSON.stringify` envelope (code≠0, empty, oversize);
  truncation is a surrogate-safe slice flagged by `details.truncated/totalChars`.
- **Verification:** audit R2/R6 rounds; the envelopes reviewed in the transcripts.
- **Lesson:** a machine contract needs ONE shape per outcome; never splice human text into it.

### BUG 5 — CALLER ABORT REPORTED AS A JUDGE OUTAGE
- **Symptom:** cancelling a call produced `JEV_JUDGE_DOWN` ("the judge is unreachable").
- **Root cause:** the caller signal was forwarded into the probe's AbortController; the resulting
  AbortError fell into the generic unreachable catch.
- **Fix:** `if (signal?.aborted) return "__CALLER_CANCELLED__"` → `JEV_CANCELLED`; the same check
  added after `run()` (an aborted execFile is not a CLI failure).
- **Verification:** audit R2/R3.
- **Lesson:** cancellation is a first-class outcome; name it.

### BUGS 6-9 — THE HYGIENE CLUSTER (paths, injection, JM_BIN, encoding, surrogates)
Each carries its root cause + fix in the SUMMARY TABLE; the shared lesson: input hygiene is a
LAYER (guards before the subprocess), and the runtime contract (utf8) must be explicit — Bun's
defaults are not the contract.

### BUG 10 — THE PROBE-ERROR (the reviewer's critical)
- **Claim:** "the out-parent validation uses .isFile() instead of .isDirectory()".
- **Refutation:** `grep -n 'isFile\|isDirectory' index.js` → `353: ...isFile()` (the FILE params) ·
  `366: parentOk = (await stat(parent)).isDirectory();` — the claim contradicts the code.
- **Disposition:** probe-error, evidence attached, no code change. The round's 2 style lows
  (nested ternaries) were fixed anyway (r7).
- **Lesson:** adjudicate EVERY finding with a mechanical probe (Side A probe-error / Side B
  confirmed defect) — accepting or dismissing wholesale both lose.

## REGRESSION WATCH
- Any change to `buildArgs` must keep every verb covered or refuse by name (BUG 2 class).
- Any change to the exit handling must keep the errno/signal surfacing (BUG 3 class).
- Any change to the output path must keep json mode raw-stdout + envelopes (BUG 4 class).
- Any change to the activation handlers must keep both-branch receipts + the serialized re-assert
  (BUG 1 class).
- The audit lane: rerun `provider=poolside-laguna-s` when it recovers; re-adjudicate any new
  findings with probes.

## IRON LAWS (from this build)
1. mtime(file) vs lstart(process) before any live-process diagnosis.
2. The fresh boot is the delivery contract; a live wire set is frozen at construction.
3. A model's self-report is not an instrument — `/dump` or the transcript is.
4. An activation handler logs BOTH branches; silence is a bug.
5. `default: break` in an arg builder is a silent-drop machine.
6. Exit 0 is earned; every non-numeric error shape is a failure.
7. One shape per machine outcome; never splice human text into `--json`.
8. Adjudicate every audit finding with a probe — fix, decline-with-evidence, or refute.
