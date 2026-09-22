# DPL1 SPEC — JevManager: production-grade for agents (the BINDING AUTHORITY)

Predecessor: `DEBUG_LOG.md` EN-101..EN-109 · `packages/jm-production-grade/wave-plan.md` (`WAVES: 6`)
Base tree: `master @ 828ace2` · bundle sha `6092f398c2264134`

## §0 THE PROBLEM
The engine indexes mountains (105 MB/s, 84 MB flat RSS, true incremental) and decides well
(judged filtering, the 9-stage find chain, decision-tree gates proven as a git pre-commit).
It is NOT yet production-grade for agent handoff: two judged verbs still make one request per
item, there is no request-frequency bound, the queue's crash recovery is designed but never
PROVEN, and the gate is a local hook rather than a required check.

## §1 FAILURE INVENTORY (measured, this session — never hypothetical)
| id | the failure | the evidence |
|---|---|---|
| F-1 | `route` + `evaluate` make ONE HTTP request per item | `route` made 12 calls for 12 candidates; `evaluate` 5 for 5 — while the API takes N questions in ONE request (measured: n=400 in 2.39s, time flat in n) |
| F-2 | NO request-frequency bound | nothing caps calls/second; a 100k-row batch is 250 unthrottled requests |
| F-3 | crash recovery UNPROVEN | the queue is WAL-backed and resumable BY DESIGN (`src/job/store.ts`) but no `kill -9` resumption has ever been run |
| F-4 | the gate is a LOCAL hook | proven blocking commits in a scratch repo; not a required status check anywhere |
| F-5 | the container round is STALE | last: 208/9 before the keyless-artifact fixes; the tool is not mounted in every session |
| F-6 | the docs lag the code | canon docs do not exist for this project; the ship docs exist (BUILD_REPORT/DEBUG_LOG) but no AUDIT GATE line |

## §2 FIX PLAN (contracts — the interfaces land FIRST, in W1)
```
AskManyBatch(items: {id,state}[], questions: Record<string,Question>, schema, batchSize=200)
  -> { answers: Record<`${id}__${q}`, Answer>, requests: number, cached: number, cachedKeys: string[],
       asked: number, inputTokens: number, costUsd: number, usageMissing: number }
  INVARIANTS: (a) the usage check runs FIRST and is FATAL at BOTH polarities (D-046);
              (b) a missing ANSWER is a NAMED failure (JM_JUDGE_ANSWER_COUNT), never a silent skip;
              (c) the cache is keyed per (item,question) by the QUESTION's own name, so a batched
                  pair and a single ask() share one row; (d) the model reported is the one that
                  PRODUCED the cache (a cold run and a cached run must agree byte-for-byte).

RateLimiter(ratePerSec, burst) -> { acquire(): Promise<void>; release(): void; stats(): {inFlight, peak, waited} }
  INVARIANTS: the cap is enforced in the PATH (a chokepoint), never in a doc; the peak in-flight
              count is OBSERVABLE; a 429 -> exponential backoff with jitter -> a NAMED refusal on
              exhaustion (never an unbounded retry loop).

JobRecovery: a job killed at ANY point resumes from the WAL queue; `done + pending + running` is
  conserved across the kill; no row is lost and none is double-processed (the fingerprint UNIQUE).

GateVerdict = { gate: "PASS" | "FAIL" | "BLOCKED"; findings: { file: string; line: number; severity: string }[] }
  INVARIANTS: FAIL blocks every ship-ready claim; BLOCKED is NEVER reported as PASS.
```
OPERATOR DIRECTIVES (verbatim): *"you can send fucking hundreds of inputs in 1 batch and it costs
the exact fucking same"* · *"MAKE SURE THIS IS FUCKIGN WIRED PROPERLY FOR BATCH INPUTS NOT FUCKING
1 AT A TIME"* · *"WHAT IS LEFT UNTIL I CAN FUCKING HAND THIS TO AGENTS AND IT FUCKING WORKS"*.

## §3 WAVE ORDER (owners + mechanical done-when gates)
W1 interfaces -> W2 batch route+evaluate -> W3 limiter+retry -> W4 recovery proof -> W5 CI+container
-> W6 docs+checkpoint. W1 gates everything; W2..W5 are INDEPENDENT after it (disjoint files) and
run CONCURRENTLY; W6 closes. No wave dispatches on a CLAIMED-complete predecessor.

## §4 TESTING TIERS
L0 tsc · L1 unit (pure only) · L2 script-test (real modules, real sandbox, observation channels) ·
L3 live API (the real endpoint, the real store) · L4 container rig (the deployed launcher).

## §5 ANTI-PATTERNS
A green battery as capability · a mock standing in for the wire · a retry loop with no ceiling ·
"resumable by design" without a kill · a gate that exists but is not required · a doc claiming a
state the code does not have · reporting a probe-misuse as a code bug.

## §6 SUCCESS CRITERIA (command-verifiable)
```
jm route --task "<t>"            -> JM_ROUTE ... requests=1
jm evaluate --cases F --questions Q -> JM_EVAL ... requests=1
a forced 429                     -> retries, then JM_JUDGE_RATE_EXHAUSTED
kill -9 mid-job; restart         -> jm report --job <id> reconciled: YES, counts conserved
bun test                         -> 0 fail across N consecutive runs (the flake rate MEASURED)
the container round              -> its own suite counts, pasted
```

## §7 RESUME GUIDE
`packages/jm-production-grade/` (this spec + wave-plan + blueprint) · `MASTER_PROMPT.md` ·
`DEBUG_LOG.md` EN-101..EN-109 (the defects already killed) · `scripts-host-suite.sh` (12/12) ·
`.trident/wave-audit/` for per-wave verdicts.

## §8 OPEN QUESTIONS
- The exact licensed rate for this key (nobody has measured it; the limiter must be CONFIGURABLE).
- Whether the gate becomes a GitHub required check (needs a remote; local-only today).

## APPENDIX — ZERO-TRUST AUDIT OF THIS SPEC
Every failure in §1 carries a MEASURED number from this session. §2's invariants each name the
defect they prevent. No §3 wave is declared done without a pasted tool result. The spec claims
nothing it did not observe.
