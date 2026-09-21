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

### AUDIT — the code-audit gate — Status: **BLOCKED**
- **What:** the qwen-code-audit artifact + its `AUDIT GATE:` line.
- **Why blocked:** the audit lane was not run in this session (no `qwen-code-audit` invocation on this diff).
- **Resume condition:** run the audit lane over the W0–W7 diff, write the artifact, quote the verdict line.
- **AUDIT GATE: BLOCKED (audit lane not run this session — never reported as PASS)**

## ZONE 2 — THE RESULTS (what was observed)

## TEST RESULT — 2026-09-21 — the battery

### SCRIPT
- **The run:** `bun test tests/` (8 files) and `bunx tsc --noEmit`.
- **The raw output (tail):** `18 pass / 0 fail / 87 expect() calls / Ran 18 tests across 8 files.` · `TSC_EXIT=0`
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
