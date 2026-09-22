# MASTER_PROMPT — JevManager: production-grade for agents (the depth behind the pin)

The pin is the contract; THIS is the detail. A fresh session reads the pin, then this file, then
the build package at `packages/jm-production-grade/`.

## 1 · WHAT THIS SYSTEM IS (so the work has a frame)
A decision engine over three surfaces sharing one store: the CLI (`jm`), the MCP server
(`jev-manager`, four tools), and the HTTP surface (`jm serve`). It indexes corpora keylessly and
incrementally, narrows them deterministically, and judges the survivors through TypeSafe's System
One (`api.typesafe.ai/v1/systemone`) with per-item caching and a shared cost ledger.

## 2 · THE OPERATOR'S DIRECTIVES (verbatim — these govern, not a paraphrase)
- *"you can send fucking hundreds of inputs in 1 batch and it costs the exact fucking same"*
- *"MAKE SURE THIS IS FUCKIGN WIRED PROPERLY FOR BATCH INPUTS NOT FUCKING 1 AT A TIME"*
- *"WHAT IS LEFT UNTIL I CAN FUCKING HAND THIS TO AGENTS AND IT FUCKING WORKS"*
- *"can use it to start intelligently indexing mountains of data"*
- *"and building decision making gates in git workflows"*

## 3 · THE MEASURED BASELINE (re-verify on FIRST REPLY; these are frozen at 0becfe4)
```
 repo      /home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/JevManager @ master 0becfe4
 src       34 files / 4857 lines      tests 44 files / 5909 lines
 bundle    src bundle sha256 6092f398c2264134
 battery   233 pass / 0 fail (1048 expects, 41 files, ~40s)
 tsc       exit 0
 flake     0/30 — three consecutive 10-run windows after TWO fixes (EN-109 fd release, EN-110 ports)
 rig       host-live primary; container-testing tool (omp-ct:master) when mounted
 store     ~/.jm — 4.0G, indexes: shadow (11832 files) · reports (68) · all · decisions
 launcher  scripts-jm-mcp.sh (registry env: JM_HOME=/home/leviathan/.jm) · shim ~/.local/bin/jm
```
THE HONEST BASELINE HISTORY: this read **232/1** at the first measurement. Ten-run windows read
2/10, 3/10, 2/10, 1/12, 1/10 — a ~20% flake. TWO defects were found by measuring rather than
assuming, and both are now fixed and pinned. A baseline copied from a prior pin would have missed
both.

## 4 · WHAT IS ALREADY TRUE (do not rebuild it)
| the capability | the proof |
|---|---|
| batch judging | `filter` 40 candidates -> `requests=1`; `find` 38 -> `requests=1`; `decision-tree` 20 rows -> `requests=1` (cold, live API) |
| the API's ceiling | n=400 in ONE request, 2.39s, TIME FLAT in n, ~38 input tokens/question |
| indexing mountains | 30,000 files cold 1.92s; 5 touched -> 0.42s; no-change 0.17s; maxrss 84MB flat |
| the 11GB store defect | the walk now commits every 500 (`ixBatch`); peak WAL 6986MB -> 485MB; build 285.6s -> 92.8s |
| the duplication defect | `reconcileRoots` — one index, one root-set, recorded per NAMESPACE |
| the git gate | a real pre-commit: an unevidenced claim -> exit 1, the commit refused; the same change WITH evidence -> exit 0 |
| the host suite | `scripts-host-suite.sh` 12/12 against the deployed launcher |

## 5 · WHAT IS LEFT (the pin's waves)
```
W1  the frozen interfaces (the parallelism enabler)
W2  route + evaluate on askManyBatch        <- F-1, the last two one-request-per-item verbs
W3  a rate limiter + bounded retry          <- F-2, no frequency bound exists
W4  crash recovery, PROVEN by kill -9       <- F-3, "resumable by design" is not a proof
W5  the gate as a required check + a FRESH container round  <- F-4/F-5
W6  canon docs (11) + ship docs + a sealed checkpoint       <- F-6
```

## 6 · THE PARALLELISM SHAPE (why W1 exists)
W1 lands the TYPES (`src/judge/types.ts`): `AskManyBatch`, `RateLimiter`, `JobRecovery`,
`GateVerdict`. After W1, W2/W3/W4/W5 touch DISJOINT files and run CONCURRENTLY:
```
W2  src/verbs/route.ts · src/verbs/evaluate.ts
W3  src/judge/limiter.ts (new) · src/judge/transport.ts
W4  src/job/run.ts · src/job/store.ts · tests/recovery.test.ts (new)
W5  .github/workflows/gate.yml (new) · scripts-host-suite.sh
```
W6 closes (docs + checkpoint). Only W6 depends on all; no wave dispatches on a CLAIMED-complete
predecessor — the boundary check runs tsc on the combined tree first.

## 7 · THE PROOF LADDER (what each tier is FOR)
```
L0  tsc --noEmit                     the syntax floor — worth nothing alone
L1  unit tests (pure functions)      the regression net
L2  script-test (real modules, real sandbox, OBSERVATION-channel assertions only)
L3  the LIVE API                     the real endpoint, the real store, `requests=` printed
L4  the container rig + host-live    the deployed launcher, the real session
```
A claim without its tier artifact is VOID. `requests=N` is the batching proof and must be pasted.

## 8 · THE ADVERSARIAL SURFACE (adversarial FIRST)
The decision functions to probe, by contract:
- `askMany` — a usage-less response (FATAL at both polarities), a SHORT response
  (`JM_JUDGE_ANSWER_COUNT`), a cache hit (must report the CACHED row's model), a 400-item chunk.
- `reconcileRoots` — a moved root, a second prefix for a recorded root, `--rebuild` on an
  unrecorded store, a missing root (must refuse BEFORE any write).
- `Budget` — a claim never settled, a refund that must free a slot, an unknown cap key.
- `streamJsonl` — an early abandon (the fd must be released before the generator exits).
- `parseWhere` — a non-numeric value on a numeric column, an injection-shaped value.
The corpus EXPANDS per pass; the loop terminates only on a FULL pass with ZERO confirmed defects.

## 9 · THE RUNTIME SEAT (the author's seat is the default failure)
The driver operates the REAL surfaces: the `jm` CLI on the real store, the MCP server over stdio,
`jm serve` over HTTP, and the pre-commit hook in a real repo. Every operation is numbered with a
PRE-REGISTERED expectation. A break is the deliverable. ZERO bugs found is a RED FLAG.

## 10 · THE DOC CONTRACT
canon: `context_management/` (11 docs, 200+ lines each, 3+ file:line refs, the 5 read-first docs
agreeing on the bundle sha). ship: BUILD_REPORT (500+), DEBUG_LOG (500+ — it already carries
EN-101..EN-110), FAILURE_LOG, SPEC_VIOLATION_LOG, TESTING_LOG (plan + results), THEATRICALITY_LOG
(with the OPERATOR-CAUGHT count). AUDIT GATE: a code-audit artifact on disk + the verdict line in
TESTING_LOG; FAIL blocks, BLOCKED is never PASS.

## 11 · THE HONEST REMAINDER (what this pin does NOT claim)
- The exact licensed request rate for this key is UNMEASURED — the limiter must be configurable.
- The GitHub required-check needs a remote; local-only today.
- Semantic retrieval (embeddings) is out of scope: the index is FTS5 + predicates, not vectors.

## 12 · THE INTERFACES IN FULL (W1 lands these; every other wave builds against them)
```ts
// src/judge/types.ts — THE FROZEN CONTRACTS
export interface AskItem { id: string; state: unknown; }

export interface AskManyResult {
  answers: Record<string, JudgeAnswer>;   // keyed `${item.id}__${questionName}`
  model: string;                          // the model that PRODUCED the cache on a cached run
  requests: number;                       // HTTP round trips — the batching proof
  cached: number; cachedKeys: string[];   // per-item, so the caller settles per item
  asked: number; inputTokens: number; costUsd: number; usageMissing: number;
}

export interface RateLimiter {
  acquire(): Promise<void>;   // resolves when a slot is free
  release(): void;            // returns the slot
  stats(): { inFlight: number; peak: number; waitedMs: number };   // the peak is OBSERVABLE
}

export interface JobRecovery {
  resume(jobId: string): Promise<{ done: number; pending: number; running: number }>;
}

export interface GateVerdict {
  gate: "PASS" | "FAIL" | "BLOCKED";
  findings: { file: string; line: number; severity: string }[];
}
```
INVARIANTS THAT MUST SURVIVE (each pinned by an existing test):
- the usage check runs FIRST and is FATAL at BOTH polarities (D-046);
- a missing ANSWER is a NAMED failure, never a silent skip;
- a cached run and a cold run produce BYTE-IDENTICAL artifacts (the model field included);
- a REFUNDED claim frees a budget slot (a cap counts calls that HAPPENED, not rows attempted);
- a refusal writes NOTHING to disk (validate before the store is touched).

## 13 · THE PHASE GATES (all 8; each is a mechanical exit, not a feeling)
```
P0 ABSORB       the baseline re-measured THIS turn; no inherited number survives
P1 SPEC         the build package on disk; the spec is the binding authority
P2 PREFLIGHT    every wave's gate provable BEFORE dispatch; the board initialized
P3 EXECUTE      every wave audited (per-hunk verdicts + coverage); battery green on the COMBINED tree
P4 RUNTIME      a live instance operated; the bug ledger non-empty
P5 ADVERSARIAL  a FULL corpus pass: ZERO confirmed defects; the frontier named
P6 DOCUMENT     U-gates + S-gates green WITH the AUDIT GATE line
P7 CHECKPOINT   the structure gate passed (src · dist+SHA · docs · manifest · ONE seal mode)
P8 VERDICT      the legal-stop definition met IN FULL
```

## 14 · THE DERAILEMENTS THIS TREE HAS ACTUALLY PRODUCED (recognize; do not re-live)
1. **Measuring once and concluding.** The flake read 0/10 after the first fix and 3/10 in the next
   window. One measurement window is not a measurement; three are.
2. **Chasing instances instead of the class.** Two hunts chased individual failing tests; the one
   that found the real defect swept for the CLASS (`grep -rn "port: [0-9]" tests/*.ts`) and found
   all three sites at once.
3. **A green battery offered as capability.** 233 passing tests said nothing about the 20% flake or
   the 98-request batch; only driving the real surface found those.
4. **Believing a design is a proof.** The queue was "resumable by design" for days; no kill -9 had
   ever been run. W4 exists because of this.
5. **A test double that flatters the engine.** Eight stubs returned fixed keys; the engine batched
   and they answered nothing. The wire's contract is the double's contract.
6. **Scope shrink under a large ask.** "What is left" is a LIST, not a reason to ship a subset.
7. **A fix that satisfied a broken test.** The injection test ENSHRINED the silent-empty behaviour;
   satisfying it would have preserved the bug. Adjudicate BOTH sides before fixing either.

## 15 · THE FALSE-COMPLETE SHAPES (these never close the run)
1. **Stationarity** — "no change in N turns" is not done; re-probe, widen, or escalate.
2. **Sub-inner pass** — a green battery / a single wave green never closes the run.
3. **Memory-complete** — "I verified this already" without a this-turn re-run is STALE.
4. **Theater-complete** — a prose summary, a typed-but-unrun command, a verdict without its
   quoted tool result.
5. **Blocked-as-done** — a quota or rig-down BLOCKED needs its resume condition and a re-fire.
6. **Partial-scope close** — one wave's green with siblings open is progress, not completion.
7. **"Zero bugs" as success** — with an empty runtime ledger, it means the seat was never taken.
8. **A green battery as capability** — see §14.3.

## 16 · RESUME POINTERS (a fresh session continues from DISK, never from frozen numbers)
```
 the build package   packages/jm-production-grade/{DPL1_SPEC.md, wave-plan.md, BLUEPRINT.md}
 this file           MASTER_PROMPT.md
 the defect history  DEBUG_LOG.md  (EN-101 .. EN-110 — every defect already killed, with evidence)
 the deployed proof  scripts-host-suite.sh  (12/12 against the registry's launcher)
 wave audits         .trident/wave-audit/  (per-wave per-hunk verdicts)
 the store           ~/.jm  (indexes + ledger.jsonl + targets.json)
 the MCP registry    ~/.omp/agent/mcp.json  (server `jev-manager`)
 the pin's board     the task tree (todo) — re-derived from disk on resume
```

## 17 · THE ONE-SENTENCE TEST OF DONE
A zero-context agent, handed ONLY this repo and the operating docs, can point `jm` at a corpus,
narrow it, judge it in batches, gate a commit on the result, and re-prove all of it — and every
number it reports is reproducible by a command in this file.

## 18 · THE TEST INVENTORY (the named selectors the waves gate on)
```
test_index_refuses_a_changed_root_set      the root-set guard (the duplication defect)
test_rebuild_purges_an_index_with_no_recorded_roots   --rebuild on an old store
test_where_numeric_value_is_validated      the where-value defect (TEXT sorts above INTEGER)
test_early_abandon_does_not_leak_fds       the fd release (EN-109)
test_D036_oversized_body_is_refused_and_the_surface_survives   the body cap (EN-110's port)
test_mcp_decide_refuses_non_noul_before_the_network            same-semantics across surfaces
test_watch_renders_the_error_message_not_just_the_count        the dropped message
test_cache_zero_calls                      the cache law + byte-identical replay
test_reindexing_one_target_leaves_the_others_alone             D-060, the documented refresh
```
Run them as `bun test -t <selector>`. The full battery is `bun test` (233 pass / 0 fail).

## 19 · THE ECONOMICS (why the batching matters, in the operator's terms)
One judged item costs ~38 input tokens (~$0.0000124) and a CACHE HIT costs $0. The cost is per
TOKEN, not per request — so N items in ONE request costs the same as N items in N requests, minus
the round trips. Measured: n=400 in one request at 2.39s with time FLAT in n. A 100,000-row
corpus is therefore ~250 requests (chunked at 200), not 100,000 — and a re-run of unchanged input
is ~0 requests (the per-item cache).
