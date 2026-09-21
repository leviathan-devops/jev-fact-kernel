# NEXT_STEPS — JM (overwrite; the live queue)

## IMMEDIATE (blocks the legal stop)
1. **Run the code-audit lane** over the W0–W7 diff; write the artifact; quote
   `AUDIT GATE: PASS|FAIL|BLOCKED` into TESTING_LOG. (Currently BLOCKED — the only thing
   standing between this build and a ship-ready claim.)
2. **The second-operator drill**: a zero-context subagent, given ONLY `README.md` +
   `packages/jm/`, must operate JM end-to-end; its questions are the doc holes.
3. **Doc floors**: raise BUILD_REPORT + DEBUG_LOG to 500+ with real per-wave detail; complete the
   canon set to 200+ each (the 2 logs + the seat record are already live).

## WAVE QUEUE (from packages/jm/06-WAVES.md)
- **W2 remainder** — the `sqlite` + `jsonl` adapters; query `@ocdb` (the 4 opencode DBs); the
  `--in all` resolution across ≥3 targets.
- **W3 remainder** — `extract` (semera NER/relations) + `cluster` as a standalone verb.
- **W8 (parked)** — the fire gate: needs F1/F6 + the `pi` wrap points opened.

## CALIBRATION QUEUE (evidence-gated)
- Reach ≥50 decisions with `later_truth` filled, then let `calibrate` move a threshold and record
  the row. (Today: n=3; the mechanism is proven, the move is not earned.)

## RISK REGISTER
| risk | mitigation |
|------|-----------|
| the @ocws 219G corpus chews disk/time | skip-rules design reviewed before any walk |
| escalation band never exercised live | craft a 0.5–0.8 fixture set and run it |
| provider rate limits under N-way concurrency | the pool sizes to the limiter; budget caps exist |
| doc drift from the build | the 2 logs update at the moment of work (already practiced) |
