# THE RUNTIME LEDGER — what RUNNING taught that READING could not
(the runtime-grade H6 artifact: every break, in the seat, with the verbatim evidence)

## RL-01 · 2026-09-23 · HTTP 402 — THE CREDITS RAN OUT MID-BUILD, AND NOTHING BOUND THE RATE
**THE STANCE:** I am the driver of the JevManager surfaces (`jm` CLI on ~/.jm · the `jev-manager`
MCP server · `jm serve` · the pre-commit hook). Declared before the first operation.

**OP 01** — `jm route --task "find every instance of a missing credential across a corpus"`
PRE-REGISTERED EXPECTATION: `JM_ROUTE ... requests=1` (W2's gate).
**ACTUAL, VERBATIM:**
```
JM_ERROR: Error: JM_JUDGE_HTTP_402: {"detail":{"error_type":"billing_error","message":"Your
organization has no available TypeSafe API credits. Please add more credits and/or set up
auto-reload at https://console.typesafe.ai/settings/bi
```
exit 2, wall 0.75s.

**OP 02** — `jm evaluate --cases /tmp/w2-cases.json --questions /tmp/w2-q.json --key is_failure`
PRE-REGISTERED EXPECTATION: `n=6 requests=1`.
**ACTUAL, VERBATIM:** the same `JM_JUDGE_HTTP_402 billing_error`, exit 2, wall 0.33s.

**THE MECHANISM (not "the provider": the DESIGN).** Nothing in the engine bounds REQUEST
FREQUENCY. `Budget{calls,usd}` is per-INVOCATION and resets every run; the earlier live tests in
this session (`find` at 100 judged candidates, `filter` at 40, `decide`, `route`, `evaluate`,
three 10-run flake windows each re-driving the suite) each opened their own budget from zero. The
402 is the account's ceiling being reached by a series of individually-reasonable calls — which is
exactly the failure the pin's §1 F-2 names: *"NO request-frequency bound: nothing caps
calls/second; a 100k-row batch is 250 unthrottled requests."*

**THIS IS A DESIGN DEFECT, NOT AN ENVIRONMENT ONE.** The provider behaved correctly: it refused.
The engine had no mechanism to make the refusals unnecessary, and no mechanism to pace itself
before the ceiling.

**DISPOSITION:** W2's LIVE gate is **BLOCKED** (retry condition: credits reloaded — the code path
is complete and the battery is green; only the wire is unavailable). W3 — the rate limiter +
bounded retry — is PROMOTED: it is the direct remedy, and the pin's law applies (*"state them and
continue on independent fronts; never stall the build"*).

**THE LESSON:** an unmeasured cost and an unbounded RATE are the same class of defect — the guard
that exists is per-call, and the failure arrives per-second. A budget without a rate limiter is a
budget for one invocation, and a build is not one invocation.
