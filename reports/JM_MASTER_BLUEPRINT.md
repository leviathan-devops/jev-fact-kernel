# JEV MANAGER — MASTER BLUEPRINT

**The intelligence architecture: how the tool thinks.**


## THE INTELLIGENCE ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────┐
│                     THE INTELLIGENCE STACK                          │
│                                                                     │
│  LAYER 5 · THE GATES (the enforcement)                              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ push-gate · st-detect · spec-audit · the CI workflow        │   │
│  │ ENFORCES: spec compliance, test quality, non-theatricality, │   │
│  │ documentation currency, zero drift                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                          ▲                                          │
│  LAYER 4 · THE DECISIONS (the policy layer)                         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ decision-tree · route · the recipe format                   │   │
│  │ TRANSLATES: calibrated probabilities into act/escalate/noop │   │
│  │ MECHANISM: the policy ladder (p >= act → act, p >= flag →   │   │
│  │ escalate, else noop). The MODEL informs; the CODE decides.  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                          ▲                                          │
│  LAYER 3 · THE JUDGE (the calibrated intelligence)                  │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ JevK5 4B Q8_0 GGUF on GPU · /v1/systemone · ~1s · $0       │   │
│  │ PRODUCES: typed answers with calibrated probabilities        │   │
│  │ TYPES: noul (probability), choice (selection), score (level)│   │
│  │ CALIBRATION: ECE 0.037 (p=0.8 means 80%, measured)          │   │
│  │ BATCHING: N items in ONE request (askManyBatch)             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                          ▲                                          │
│  LAYER 2 · THE NARROWING (the deterministic filter)                 │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ query (FTS5/BM25) · scan (keyword+excerpt) · cluster        │   │
│  │ (signatures) · extract (regex → structured)                 │   │
│  │ REDUCES: millions of tokens → the candidates that matter    │   │
│  │ COST: $0, instant, no model needed                           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                          ▲                                          │
│  LAYER 1 · THE INDEX (the substrate)                                │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ SQLite + FTS5 · the target registry · the root-set guard    │   │
│  │ STORES: files, documents (chunked), cache, decisions, meta  │   │
│  │ GUARANTEES: crash-safe (WAL), incremental (mtime+sha),      │   │
│  │ no duplication (reconcileRoots)                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## THE CORE INSIGHT

**The tool separates FINDING from JUDGING from DECIDING.**

Most "AI tools" conflate all three: they use an LLM to search, to evaluate, and to decide —
in one opaque step. JevManager separates them into five layers, each with a clear contract:

1. **INDEX** — deterministic, free, crash-safe. No intelligence needed.
2. **NARROW** — deterministic, free, instant. FTS5 + regex. Reduces the search space by 99%.
3. **JUDGE** — calibrated probabilities from a local model. The ONLY layer that uses the model.
4. **DECIDE** — code, not the model. A policy ladder translates p=0.88 into act/escalate/noop.
5. **GATE** — enforcement. Named failures with actionable remedies.

**Why this matters:** the expensive layer (the judge) only sees the 1% that survives the
narrowing. The decision is deterministic and reproducible. The gate is mechanical, not judgment-based.

## THE CALIBRATION PRINCIPLE

The judge produces CALIBRATED probabilities, not binary answers. This means:

- `p=0.8` means "80% of the time, when the model says 0.8, it is correct" (ECE 0.037)
- You can set a threshold that matches your risk tolerance:
  - `act >= 0.9` for high-confidence automation
  - `act >= 0.7` for standard workflow
  - `act >= 0.5` for exploratory analysis

**The model does NOT decide. The policy decides.** The model informs the probability; the
policy ladder (code, deterministic, auditable) makes the call.

## THE BATCHING PRINCIPLE

N items are judged in ONE HTTP request. This is not an optimization — it is a design decision:

- The API takes N questions per request (measured: 400 questions in 2.39s, time flat in n)
- The cost is per-token, not per-request
- `requests=1` for 40 candidates is the normal state, not a special case

**The `requests=` field is printed on every judged verb** so a regression to N requests is
immediately visible.

## THE GATE PRINCIPLE

The push gate enforces six independent checks, each producing a named, actionable failure:

```
spec component?  → the spec component EXISTS in the codebase
built correctly? → the code compiles (tsconfig + src files)
tested correctly?→ the tests are REAL (st-detect, not shitty)
not theatrical?  → the judged theatricality score passes
Docs updated?    → the docs are newer than the code
Zero drift?      → the stated SHA matches the actual bundle
```

**A gate that cannot tell you WHAT failed is not a gate.** Each item independently produces
its own evidence.

## THE LOCAL-FIRST PRINCIPLE

The judge runs on the local GPU. No API keys, no network dependency, no billing.

- JevK5 4B Q8_0 GGUF: 4.17 GB on disk, ~5 GB VRAM
- Latency: ~1s per batch (not per item)
- Cost: $0.00
- Privacy: your data never leaves the machine

**The canon adapter** (`canon-gguf.ts`) means the tool works with ANY llama.cpp-served model,
not just native /v1/systemone servers. The transport auto-detects via `/props`.

## THE RECOVERY PRINCIPLE

Every ingest is crash-safe:
- WAL-backed SQLite (SIGKILL mid-transaction → the WAL replays on next open)
- UNIQUE fingerprints (a duplicate insert is structurally impossible)
- The proof: SIGKILL after 100ms → 16 done / 584 pending → resume → 600 done, dup=0

## THE AGENT-INTEGRATION PRINCIPLE

The tool is designed for agent consumption:
- The MCP server (4 tools) is registered in the OMP registry
- The skill (`jev-manager-operator`) teaches a fresh agent how to use it
- The `JM_JUDGE_URL` is in the registry env (a fresh session gets the local judge)
- Two fresh subagents (zero context) completed their tasks on the first attempt

## THE FORWARD MAP — WHAT THIS TOOL WILL BE USED FOR

Based on the architecture (index → narrow → judge → decide → gate) and the first-principles
analysis of what agents need:

**Data intelligence:**
- Extract structured data from any corpus (API endpoints, config values, error codes)
- Find patterns across large codebases (duplicate code, similar bugs, related docs)
- Monitor codebase health over time (the watch daemon)
- Build searchable knowledge bases from any documentation

**Decision automation:**
- Prioritize backlogs by urgency/impact (decision-tree with a priority recipe)
- Route tasks to the right tool/agent (route, 650+ entry catalogue)
- Evaluate change safety (decision-tree with a deploy recipe)
- Gate commits on evidence quality (push-gate as a pre-commit hook)

**Quality enforcement:**
- Detect shitty tests before they merge (st-detect)
- Verify spec compliance mechanically (spec-audit)
- Detect documentation drift (the push-gate's "Zero drift?" item)
- Prevent theatrical work (the judged theatricality score)

**Agent orchestration:**
- An agent uses `route` to pick its next tool
- An agent uses `filter` to narrow a search space before acting
- An agent uses `decision-tree` to decide whether to proceed or escalate
- An agent uses `push-gate` to validate its own work before committing

**Knowledge management:**
- Index session transcripts for pattern analysis
- Extract lessons learned from post-mortems
- Build a decision registry from architecture decision records
- Create a searchable index of all project knowledge

## THE ARCHITECTURE DIAGRAM — THE FULL SYSTEM

```
┌─────────────────────────────────────────────────────────────────────┐
│                         THE AGENT                                    │
│  (any OMP session, any script, any CI pipeline)                    │
└───────┬──────────────────┬──────────────────┬───────────────────────┘
        │                  │                  │
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│  CLI (jm)     │  │  MCP Server   │  │  HTTP (serve) │
│  21 verbs     │  │  4 tools      │  │  REST API     │
└───────┬───────┘  └───────┬───────┘  └───────┬───────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           ▼
              ┌────────────────────────┐
              │  THE VERB LAYER        │
              │  keyless | judged | gate│
              └───────────┬────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
   ┌────────────┐  ┌────────────┐  ┌────────────┐
   │  STORE     │  │  JUDGE     │  │  GATES     │
   │  (SQLite)  │  │  (JevK5)   │  │  (recipes) │
   │            │  │            │  │            │
   │  files     │  │  noul      │  │  act≥0.8   │
   │  docs FTS5 │  │  choice    │  │  flag≥0.5  │
   │  cache     │  │  score     │  │  fail:cls  │
   │  decisions │  │  batched   │  │            │
   │  meta      │  │  cached    │  │  push-gate │
   └────────────┘  └─────┬──────┘  └────────────┘
                          │
                   ┌──────┴──────┐
                   │  TRANSPORT  │
                   │  · limiter  │
                   │  · retry    │
                   │  · 402-term │
                   │  · canon    │
                   └──────┬──────┘
                          │
                   ┌──────┴──────┐
                   │  JevK5 4B   │
                   │  Q8_0 GGUF  │
                   │  on GPU     │
                   │  :8090      │
                   └─────────────┘
```
