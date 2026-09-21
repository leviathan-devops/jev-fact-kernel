# EVIDENCE_STATE — JM (append-only evidence; summary section replaced)

## SUMMARY
Battery 18 pass / 0 fail / 87 expects · tsc exit 0 · live judge verified · crash-resume verified ·
budget verified · cache determinism verified · adversarial sweep passed after 1 fix.
**AUDIT GATE: BLOCKED (audit lane not run)** — no ship-ready claim is made.

## EVIDENCE ENTRIES

### E-01 — the battery (2026-09-21)
`bun test tests/` -> `18 pass / 0 fail / 87 expect() calls / Ran 18 tests across 8 files.`
`bunx tsc --noEmit` -> exit 0.

### E-02 — the index gate (C1/C2)
`JM_INDEX_OK files=11831 changed=11831 gone=0 text=11306 ms=4019`
then `JM_INDEX_OK files=11831 changed=0 gone=0 text=0 ms=60` (ratio 2.5%).

### E-03 — the crash-resume gate (C13)
SIGKILL mid-queued-index -> queue `done=1328 pending=10495 running=8`;
resume -> `resumed=8 done=11831 pending=0 running=0`;
`DONE=11831 DISTINCT_DONE=11831 -> dup=ZERO`; index rows `files=11831`, fts `11306`.

### E-04 — the budget gate (C10)
`--budget-calls 100` -> `done=100 pending=11731 running=0 budget_stopped=true`, exit 3.

### E-05 — the live judge (C6/C7)
Real API, model `jev-1.13.0`: daemon-crash `act 0.97`, README-typo `noop 0.08`,
checkout-500s `act 0.90`; `cost=$0.000044 calls=3`.
Replay -> `calls=0 cached=3`; two fresh runs sha `a3bc30351f68dad8` (identical).

### E-06 — the HTTP surface (C14 partial)
`/health` -> key_source=file, fingerprint `463e63ca5302`.
`/decide` -> `noul 0.98`, `$0.0000124`; replay `cached=true cost=0`. `/jobs` -> the job stores.

### E-07 — the find chain (C5)
`find "theatrical claim without evidence" --in @reports` -> trend `44 -> 30 -> 1 -> 1`;
pattern `jevfiregate runtimekernel` n=1, exemplar `p=0.80` quoted.

### E-08 — the adversarial sweep (C19 partial)
5 probe families green; D-007 found (backspace byte disabled secret redaction) -> fixed ->
control-char sweep 1 -> 0; live injection `act 0.99` vs benign `noop 0.01`;
cache `emails in cache: False · fingerprints only: True`.

### E-09 — the calibration mechanism (C-partial)
`calibrate` -> `decisions=3 act=2 escalate=0 noop=1 mean=0.65 truth=0`;
`--truth 1 replay_matched` -> recorded; `--apply` wrote `calibration:<ts>` into `meta`.
