# SPEC_VIOLATION_LOG — every place the build deviated from the DPL1 spec
(append-only · the spec is `packages/jm-production-grade/DPL1_SPEC.md`)

## SV-01 · W2's LIVE gate could not run against TypeSafe — verified against the LOCAL judge instead
**Spec:** §6 *"route -> JM_ROUTE ... requests=1"* against the live API.
**Deviation:** the account hit `HTTP 402 billing_error` (RL-01) mid-build, so the live wire was
unavailable. The gate was re-run against kev-0.6b serving `/v1/systemone` on 127.0.0.1:8008.
**Adjudication:** the CONTRACT under test (N items -> ONE request) is judge-independent — the
`requests=` counter measures round trips, not the endpoint. Verified on the local judge:
`route requests=1 (12 items) · evaluate requests=1 (6 cases) · filter requests=1 batch=3/req`.
**Status:** RESOLVED (the deviation preserved the spec's intent; the operator directed the local
judge in the first place).

## SV-02 · W5's "required check" is authored but not yet REQUIRED on a remote
**Spec:** §1 F-4 — the gate as a required status check.
**Deviation:** `.github/workflows/gate.yml` exists and encodes the full ladder (L0/L1/L2
adverse-first), but this repo has no remote CI run yet and "required" is a branch-protection
setting that can only be set by the repo owner.
**Status:** OPEN — the workflow is the deliverable the spec can demand; the branch-protection
toggle is operator-owned.

## SV-03 · OperatorB aborted on infrastructure, not on capability
**Spec:** §9.1 — two fresh operators each succeed on the FIRST attempt.
**Deviation:** OperatorB was aborted at 15m32s. The transcript shows first-class operation
(loaded the skill, verified the environment, picked the right verb, applied the calibration law,
routed around TTSR interrupts) — the failure was kev-on-CPU at ~5s/question against a 12-row
measurement, which timed out.
**Adjudication:** the ARTIFACT (the skill) worked; the JUDGE was too slow. This is a defect in the
test ENVIRONMENT, and the fix is the judge (decider-2b on GPU: 4ms vs 5s), not the skill.
**Status:** OPEN — re-dispatch against the faster judge (W7).
