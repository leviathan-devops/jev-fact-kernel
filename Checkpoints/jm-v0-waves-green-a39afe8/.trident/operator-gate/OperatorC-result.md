# OperatorC — TASK B (the git gate) — COMPLETED
**Duration:** 37m43s · **Judge:** decider-2b v10 on GPU · **First attempt:** YES

## THE RESULT (the operator's own report, verbatim)
```json
{
  "task": "W7 operator gate TASK B: pre-commit evidence gate driven by jm",
  "repo": "/tmp/gate-test",
  "hook_sha256": "cf7be702c2220e79f33b624076c8f264747201f9d707c4d1020ce933a8d4c2c1",
  "recipe": "evidence-gate@v2",
  "blocked_commit_exit": 1,
  "blocked_evidence": { "attempts": 2, "route": "act", "noul": 0.8777, "content": "unevidenced rollout-success claim", "commit_count_unchanged": true },
  "allowed_commit_exit": 0,
  "allowed_evidence": { "commit": "cb03dac", "content": "evidenced report: bun test 17/0, log-scan 0 errors in 1204 events, sha256=9f2c1ab, /health 200", "route": "noop" },
  "negative_controls": [ { "content": "plain code retry.sh", "exit": 0 }, { "content": ".gitignore", "exit": 0 } ],
  "fail_closed_proof": { "fault": "jq pretty-print malformed rows -> jm exit 1 mid-judge", "result": "hook refused at exit 1 with named JM_ERROR, no commit landed" },
  "measured_scores": { "direct_claim": 0.8877, "closure_claim_recipe_v1": 0.464, "closure_claim_recipe_v2": 0.8777, "evidenced": 0.2766, "plain_code": 0.2065 },
  "honest_remainder": "recipe v1 false-allowed the achievement/closure claim family (0.464, commits 6b68f9c/04a5ba3 landed); v2 question added achievement/closure framing and outcome-number-vs-evidence distinction; family now blocks at 0.8777."
}
```

## WHY THIS IS FIRST-CLASS (the §9.2 checklist, each verified from the transcript)
| the check | the evidence |
|---|---|
| found the tools without being told | `jm decision-tree` from the skill alone |
| completed the task | the hook blocks at exit 1, allows at exit 0, both PROVEN |
| read the result | quotes the noul scores, the exit codes, the commit shas |
| no undocumented failure | every gotcha it hit is named (the shim's cd, jq pretty-print, hook env) |
| reproducible | the recipe and hook shas are recorded |

## WHAT IT DID BEYOND THE TASK
- **NEGATIVE CONTROLS** (the task did not ask): plain code and .gitignore pass — the hook does not over-fire
- **FAIL-CLOSED PROOF** (the task did not ask): a fault injected mid-judge -> refused at exit 1, named, no commit landed
- **ITS OWN CALIBRATION ITERATION**: recipe v1 false-allowed a claim family at 0.464; it measured,
  diagnosed (the question lacked achievement/closure framing), iterated to v2 (0.8777), and REPORTED
  the false-allows honestly in `honest_remainder` — **the skill's calibration law, applied unprompted**
