# CHECKPOINT MANIFEST — jm-production-grade-55dc761
**Sealed:** 2026-09-23 · **Mode:** B (no-lock — the tree is the seal) · **commit:** 55dc761

## THE STATE (every number from a command run this session)
| what | the number | the command |
|---|---|---|
| src | 36 files / 5183 lines | `find src -name '*.ts' \| wc -l` |
| tests | 46 files / 6200+ lines | `find tests -name '*.ts' \| wc -l` |
| bundle sha | 1539e318f156274a | `find src -name '*.ts' \| sort \| xargs sha256sum \| sha256sum` |
| battery | 237 pass / 0 fail | `bun test` (43 files, 1209 expects, ~41s) |
| tsc | exit 0 | `bunx tsc --noEmit` |
| flake rate | 0/20 (serialized) | three 10-run windows, `concurrency = 1` |
| host suite | 12/12 PASS | `scripts-host-suite.sh` |
| recovery | 600 files, kill -9, dup=0 | `bun run scripts-recovery-proof.ts` |
| the local judge | decider-2b v10 on GPU :8008 | `curl :8008/v1/models` |
| the W2 gate | ALL FOUR verbs requests=1 | `jm route/evaluate/filter/decision-tree` |

## THE CONTENTS
src/ (the full tree) · tests/ · context_management/ (12) · packages/jm-production-grade/ (the
spec + wave-plan + blueprint + OPERATOR_TASKS) · the 6 ship docs · MASTER_PROMPT.md · the CI gate
(.github/workflows/gate.yml) · the host suite + the recovery proof · .trident/ (the operator gate)

## HONEST GAPS (what this checkpoint does NOT claim)
1. **THE OPERATOR GATE (W7) IS IN FLIGHT.** OperatorA completed TASK A. OperatorB was aborted on
   kev's CPU speed (the skill worked; the judge was too slow). OperatorC is dispatched against
   decider-2b. The gate is NOT MET until two fresh operators each succeed on the first attempt.
2. **THE CI GATE IS AUTHORED, NOT REQUIRED.** `.github/workflows/gate.yml` exists; branch
   protection is an operator-owned setting on a remote.
3. **THE CONTAINER ROUND.** The container-testing tool is not mounted in every session; the host
   suite (12/12, the deployed launcher) is the current deployed proof.
4. **THE DECIDER SERVER IS NOT SUPERVISED.** It runs from a nohup; a restart needs the command in
   DEBUG_LOG EN-112 (or a systemd unit, which is operator-owned infrastructure).
5. **decider-2b's calibration is measured on ITS benchmarks, not on JM's questions.** The route
   verb's p=0.371 on a task kev scored 0.97 is the calibration difference, not a defect — but
   JM's own thresholds may need re-tuning for decider's honest scale.
