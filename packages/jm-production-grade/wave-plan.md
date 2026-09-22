# WAVE PLAN — JevManager: production-grade for agents

WAVES: 6

## W1 — INTERFACES (the parallelism enabler) · owner: interface desk
- FILES (disjoint): `src/judge/types.ts` (NEW), `packages/jm-production-grade/INTERFACES.md`
- DELIVERABLE: the frozen contracts every other wave builds against — `AskManyBatch`,
  `RateLimiter` (`acquire()/release()/stats()`), `JobRecovery` (`resume(jobId)`),
  `GateVerdict` (`{ gate: "PASS"|"FAIL"|"BLOCKED"; findings: Finding[] }`).
- DONE-WHEN: `bunx tsc --noEmit` exit 0 AND the interface file exports every named type.
- TEST IDS: `test_interfaces_exported`

## W2 — BATCH ROUTE + EVALUATE · owner: judge desk
- FILES (disjoint): `src/verbs/route.ts`, `src/verbs/evaluate.ts`
- DELIVERABLE: both verbs on `askManyBatch` — the same pattern already landed in
  filter/find/decision-tree. Route: the shortlist's per-candidate question in ONE request.
  Evaluate: the case set in ONE request per repetition.
- DONE-WHEN: `JM_ROUTE ... requests=1` and `JM_EVAL ... requests=1` on a 12-item input,
  measured against the LIVE api.typesafe.ai (not the mock).
- TEST IDS: `test_route_batches_one_request`, `test_evaluate_batches_one_request`

## W3 — RATE LIMITER + RETRY · owner: transport desk
- FILES (disjoint): `src/judge/limiter.ts` (NEW), `src/judge/transport.ts`
- DELIVERABLE: a per-key token-bucket with a MEASURED rate; `429`/`5xx` -> exponential
  backoff with jitter, bounded retries, a LOUD named refusal on exhaustion.
- DONE-WHEN: a probe drives the limiter past its cap and the peak in-flight count is
  pasted; a forced 429 retries and then refuses by name.
- TEST IDS: `test_limiter_caps_concurrency`, `test_transport_retries_then_names`

## W4 — CRASH RECOVERY PROOF · owner: queue desk
- FILES (disjoint): `src/job/run.ts`, `src/job/store.ts`, `tests/recovery.test.ts` (NEW)
- DELIVERABLE: `kill -9` mid-job, restart, prove resumption from the WAL queue with the
  exact done/pending counts on both sides of the kill.
- DONE-WHEN: the before/after row counts are pasted from `sqlite3` and `jm report --job`.
- TEST IDS: `test_job_resumes_after_sigkill`

## W5 — CI GATE + CONTAINER ROUND · owner: rig desk
- FILES (disjoint): `.github/workflows/gate.yml` (NEW), `scripts-host-suite.sh`
- DELIVERABLE: the pre-commit gate promoted to a required status check; a FRESH container
  round of the host suite on the deployed launcher.
- DONE-WHEN: the container suite reports its own pass/fail counts, and the workflow file
  names the gate step.
- TEST IDS: `test_host_suite_all_pass`

## W6 — DOCS + CHECKPOINT · owner: doc desk
- FILES (disjoint): `context_management/*` (11), the 5 ship docs, `Checkpoints/<token>/`
- DELIVERABLE: canon + ship docs at their floors with the AUDIT GATE line; a sealed
  checkpoint (src + dist + docs + manifest + ONE seal mode).
- DONE-WHEN: the U-gates and S-gates pass and the checkpoint structure gate prints.
- TEST IDS: `test_canon_docs_present`
