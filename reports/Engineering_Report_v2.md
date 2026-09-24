# JEV MANAGER — ENGINEERING REPORT v2

**Series:** JevManager production-grade
**Date:** 2026-09-23
**Commit:** 4368044
**Bundle:** 1539e318f156274a

## THE LOCAL DECIDER MODEL

JM uses **decider-2b v10** (Mapika/decider-2b) serving `POST /v1/systemone` at `127.0.0.1:8008` on the RTX 4080 GPU (4.2GB VRAM).

This is the SAME model the Plutus V6 build uses — `decider_client.py` points at the same `127.0.0.1:8008`. No conflict with limite-1b (math, port 8100) or nomic-embed (embeddings, port 8001).

To restart after a reboot:
```bash
cd /home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/JevManager/vendor/decider
DECIDER_MODEL=Mapika/decider-2b DECIDER_SHARED_FORK_GB=2 DECIDER_GRAPH_TOKEN_BUDGET=8192
nohup uv run --extra serve uvicorn decider.serve:app --host 127.0.0.1 --port 8008 &
```

To use it:
```bash
export JM_JUDGE_URL=http://127.0.0.1:8008/v1/systemone
jm route --task "your task here"
jm evaluate --cases cases.json --questions questions.json --key is_failure
jm filter myindex --question "does this describe a failure?" --fts "term" --limit 50
```

## HOW TO USE IT

```bash
# INDEX (keyless, incremental)
jm index /path/to/corpus --name myindex

# NARROW keylessly (no model, no cost)
jm scan myindex --lex "term"
jm query myindex --fts "term"
jm extract myindex --re "regex"

# JUDGE with the local decider-2b (batched, requests=1)
jm evaluate --cases cases.json --questions questions.json --key is_failure
jm filter myindex --question "does this describe a failure?" --fts "term" --limit 50
jm find "the phrase" --in myindex --common 2
jm decision-tree --rows rows.jsonl --recipe recipe.json
jm route --task "what you want to do"
```

## HOW IT WAS TESTED

Every judged verb was tested against decider-2b on the local GPU. No TypeSafe API calls.

| verb | command | result | requests |
|---|---|---|---|
| route | `jm route --task "find every missing credential"` | p=0.371, route=noop | 1 |
| evaluate | `jm evaluate --cases w2-cases.json --questions w2-q.json --key is_failure` | agreement=83.3%, brier=0.1332 | 1 |
| filter | `jm filter k --question "does this describe a failure?" --fts "index" --limit 3` | candidates=3 judged=3 | 1 |
| decision-tree | `jm decision-tree --rows gate-rows.jsonl --recipe gate-recipe2.json` | rows=20 decided=20 | 1 |

The full 237-test battery uses the MOCK transport (no model needed). The LIVE gate runs against decider-2b.

## THE TERMINAL GATE — THREE OPERATORS

Three independent agents used JevManager. Two were fresh subagents with ZERO session context.

| operator | task | status |
|---|---|---|
| the build session | the reference operations | completed |
| OperatorA (fresh) | corpus triage | completed |
| OperatorC (fresh) | the git gate | completed, 37m43s, first attempt |

OperatorC blocked an unevidenced claim at exit 1, allowed an evidenced one at exit 0, ran negative controls, proved fail-closed, and iterated its own recipe when v1 under-separated.

## THE BUG LEDGER

| bug | root cause | fix |
|---|---|---|
| every hit returned twice | no root provenance; namespace-scoped sweep | reconcileRoots per-namespace |
| the store grew to 11GB | one transaction spanning 11,832 files suppressed checkpoints | ixBatch every 500 |
| the fd leak (20% flake) | destroy() releases on the 'close' EVENT | await the close event |
| three hardcoded test ports | the lesson not carried to wave-gates | all to port: 0 |
| process.env raced between files | 22 files mutate env; bun runs 20 concurrently | concurrency = 1 |
| 98 requests for 98 candidates | the pool + ask() per candidate | askManyBatch |
| errors=1, message thrown away | both renderers dropped the errors field | print the messages |
| the account hit 402 mid-build | nothing bounded request frequency | the rate limiter |

## THE NUMBERS

| metric | value |
|---|---|
| battery | 237 pass / 0 fail |
| expect() calls | 1209 |
| tsc | exit 0 |
| host suite | 12/12 PASS |
| recovery | exit 0 (dup=0, 600/600) |
| flake rate | 0/20 (concurrency=1) |
| src | 36 files / 5183 lines |
| tests | 46 files / 6007 lines |
| bundle sha256 | 1539e318f156274a |
| DEBUG_LOG | 3249 lines |
| BUILD_REPORT | 1850 lines |
| canon docs | 12 |
| checkpoint | jm-production-grade-55dc761 |

## THE HONEST GAPS

1. the code audit is BLOCKED (provider 429; retry when quota resets)
2. the CI gate is authored, not REQUIRED on a remote
3. no container round (the tool was not mounted this session)
4. the decider server is not supervised (nohup, restart command above)
5. decider-2b thresholds may need re-tuning (its honest scale vs kev's overconfident one)
6. no semantic retrieval (FTS5 + predicates only)
7. walk() materializes paths (~200MB at 1M files)

## THE ARCHITECTURE

### The Judge Batch Path

```
askManyBatch(items, questions, schema, batchSize=200)
  client.ts
  1. per-(item,question) cache identity
  2. cacheGet the MISS set
  3. chunks of 200 (inside the 400-question ceiling)
  4. ONE request per chunk
  5. usage check FIRST - fatal at both polarities (D-046)
  6. answer count check - JM_JUDGE_ANSWER_COUNT on short
  7. the chunk cost SHARED: share = costUsd / asked
  8. cachePut per pair, keyed by the QUESTION name
RETURNS: answers, model (the cached one), requests, cached, costUsd
```

### The Rate Limiter

```
TokenBucket(ratePerSec, burst, maxInFlight)
  limiter.ts
  acquire(): waits for a token AND a slot
  release(): returns the in-flight slot
  stats(): {inFlight, peak, waitedMs, granted}
  the peak IS the proof the cap held
env: JM_JUDGE_RATE=10, JM_JUDGE_BURST=20, JM_JUDGE_RETRIES=3
```

### The Recovery Proof

```
SETUP: 600 files
FIRE: jm index --queued --job killproof
KILL: SIGKILL after 100ms (no cleanup)
BEFORE: done=16 pending=576 running=8, dup=0, indexed=17
RESUME: the same command re-run
AFTER: done=600, dup=0, indexed=600
PASS: counts conserved, dup=0
```

### The Root-Set Guard

```
reconcileRoots(db, [{prefix, root}], rebuild)
  db.ts:150
  validate the root EXISTS before any write
  load meta.roots = {prefix: root}
  CONFLICTS: a moved root, or a new prefix for a recorded root
  refuse by name (JM_INDEX_ROOTS_CHANGED)
  --rebuild purges + re-records
```

### The Wire Contract (decider-2b)

```json
{"model":"decider-v10","answers":{"is_failure":{"type":"noul","noul":0.7234}},"usage":{"input_tokens":36,"output_tokens":0}}
```

## THE LIFECYCLE MAP

```
INDEX (keyless, incremental, batched 500)
  |
  v
NARROW (keyless: scan, cluster, extract, query)
  |
  v
JUDGE (batched: askManyBatch, requests=1)
  |
  v
DECIDE (gated: decision-tree, the policy ladder)
  |
  v
GATE (pre-commit: exit 0 allows, exit 1 blocks)
```

## THE RUNTIME TRACE

```
t=0      the caller invokes jm route --task "..."
t=1ms    cli.ts parses; the task hits targetsIn
t=3ms    reconcileRoots validates the root exists
t=5ms    askManyBatch: per-item cache identity; N misses
t=10ms   the rate limiter acquire() grants a token
t=12ms   the HTTP request goes to the local judge
t=1000ms decider-2b responds; usage present
t=1005ms the cost is SHARED across the asked items
t=1010ms the answers are mapped back by id__qname
t=1015ms the result is returned with requests=1
```

## THE FILE MANIFEST

```
src/adapters/jsonl.ts        MOD  awaits 'close' (the fd fix)
src/judge/client.ts          MOD  askManyBatch + the cache fix
src/judge/limiter.ts         NEW  the TokenBucket chokepoint
src/judge/transport.ts       MOD  limiter + retry + 402-terminal
src/judge/types.ts           NEW  the frozen contracts
src/store/db.ts              MOD  reconcileRoots + purgeIndex
src/verbs/decision-tree.ts   MOD  batched + the claim loop
src/verbs/evaluate.ts        MOD  batched per repetition
src/verbs/filter.ts          MOD  batched
src/verbs/find.ts            MOD  batched
src/verbs/index.ts           MOD  the walk batches (ixBatch)
src/verbs/route.ts           MOD  batched
src/watch.ts                 MOD  the error messages rendered
.github/workflows/gate.yml   NEW  the CI gate
tests/interfaces.test.ts     NEW  the W1 gate
tests/limiter.test.ts        NEW  the W3 gates
scripts-recovery-proof.ts    NEW  the SIGKILL proof
scripts-legal-stop.sh        NEW  the mechanical STOP predicate
.trident/runtime-ledger.md   NEW  RL-01
.trident/operator-gate/      NEW  the operator transcripts
.trident/RECEIPT.md          NEW  the legal-stop record
```

## WHAT WAS TRIED AND REJECTED

1. Laya as the local judge - needs a custom adapter server. Rejected for decider-2b.
2. kev-0.6b on CPU - 5s per question, the operator gate timed out. Replaced by decider-2b on GPU.
3. Batching all k repetitions into ONE request - destroyed the cache contract. Fixed: one request per repetition.
4. Claiming all rows up front in the decision-tree batch - hit the cap at 3/6. Fixed with the claim loop.
5. A fixed-port test stub - three ports hardcoded. Fixed: all to port 0.

## WHAT'S NEEDED FROM THE OPERATOR

1. Re-fire the code audit: qwen-code-audit action=review from=d3bf4a2 to=HEAD
2. Set branch protection on the remote to require the gate workflow
3. Restart the decider server after a reboot (the command is above)
4. Restart the bonsai llama-server when the GPU is no longer needed
5. Re-tune JM policy thresholds for decider-2b's honest calibration scale
