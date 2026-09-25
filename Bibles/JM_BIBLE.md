# KNOWLEDGE BIBLE: JevManager (jm)

**Version:** 1.0.0 (production-grade, commit d3bf4a2 lineage)
**Scope:** The complete decision engine — every verb, every surface, every mechanism
**Effective Date:** 2026-09-25
**Status:** ACTIVE — the tool is live, tested, and operational

## Table of Contents

1. [The Red Pill](#1-the-red-pill)
2. [Architecture Map](#2-architecture-map)
3. [Design Principles and Key Decisions](#3-design-principles)
4. [Technical Deep-Dives Part 1](#4-technical-deep-dives-part-1)
   4.1 The Store Layer
   4.2 The Target System
   4.3 The Index Verb
   4.4 The Query Verb
5. [Technical Deep-Dives Part 2](#5-technical-deep-dives-part-2)
   5.1 The Judge Client
   5.2 The Batch Path
   5.3 The Rate Limiter
   5.4 The Transport Layer
   5.5 The Canon GGUF Adapter
6. [Technical Deep-Dives Part 3](#6-technical-deep-dives-part-3)
   6.1 The Workflow Verbs
   6.2 The Push Gate
   6.3 The ST Detector
   6.4 The Spec Auditor
   6.5 The MCP Server
   6.6 The Recovery System
7. [Registries](#7-registries)
8. [Failure Modes](#8-failure-modes)
9. [Appendices](#9-appendices)
10. [Iron Laws](#10-iron-laws)
11. [Conclusion and Compaction Recovery](#11-conclusion)


# 1 · THE RED PILL

## What you think this system is (WRONG)

| Misconception | Why it is wrong |
|---|---| 
| "It is a search engine" | Search is the FIRST 20%. The keyless verbs (query, scan, cluster, extract) narrow the corpus. The VALUE is the judged half: filter, find, decision-tree, route, evaluate — which make calibrated DECISIONS on the results. |
| "It needs an LLM API" | The judge is a LOCAL model (JevK5 4B Q8_0 GGUF, 4.17 GB on the GPU). Zero API cost. Zero network dependency. |
| "It is a database wrapper" | SQLite is the STORE, not the system. The system is: keyless narrowing + batched judged decisions + workflow gates that enforce development discipline. |
| "The model makes the decisions" | The model produces CALIBRATED PROBABILITIES. The DECISION is made by the POLICY (act/flag thresholds in the recipe), which is code. The model informs; the code decides. |
| "One item = one API call" | The batch path sends N items in ONE HTTP request. `requests=1` for 40 candidates. |
| "A green suite means it works" | 233 passing tests said nothing about the 20% flake rate, the 98-request batch problem, or whether a fresh agent could use the tool. The push-gate exists because of this. |
| "The cache is a HashMap" | SHA-256 fingerprints over the canonical form of the state, keyed by model + schema + URL. A collision serves the wrong answer. The CRITICAL defect (fixed): redaction-before-hash collapsed distinct inputs. |

## What it actually is (CORRECT)

| Reality | The evidence |
|---|---|
| A decision engine that indexes, narrows, and judges with calibrated probabilities | `jm filter` returns `p=0.88` = 88% confident, not binary |
| A batch API — N items in one request | `candidates=40 judged=40 requests=1 batch=40/req` |
| A workflow enforcement tool — gates commits on spec, quality, non-theatricality | `PUSH_GATE REFUSE exit=1` with the named failure |
| Local-first — the judge runs on your GPU | `JevK5 4B Q8_0 · :8090 · ~1s · $0 · Apache-2.0` |
| Calibration-aware — ECE 0.037 means p=0.8 = 80% | `evaluate` returns `agreement brier ece` |
| Multi-surface — CLI, MCP, HTTP, git hook | `jm` on PATH · MCP `jev-manager` · `jm serve` · `.git/hooks/pre-commit` |
| Recoverable — SIGKILL, resume, zero duplicates | `recovery-proof.ts` → `PASS counts conserved, dup=0` |
| Agent-usable — fresh subagents use it from the skill alone | OperatorA + OperatorC completed first-attempt |

# 2 · ARCHITECTURE MAP

```
┌─────────────────────────────────────────────────────────────────────┐
│                        THE THREE SURFACES                           │
├──────────────────┬──────────────────┬───────────────────────────────┤
│   CLI (jm)       │  MCP Server      │  HTTP (jm serve)              │
│   21 verbs       │  4 tools         │  /find /decide /query        │
│   on PATH        │  in the registry │  on any port                 │
└────────┬─────────┴────────┬─────────┴──────────────┬───────────────┘
         │                  │                       │
         └──────────────────┼───────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     THE VERB LAYER (src/verbs/)                     │
├─────────────────────────────────────────────────────────────────────┤
│  KEYLESS (no model):     JUDGED (needs the judge):   WORKFLOW:     │
│  · index   (ingest)      · filter  (batch judge)    · push-gate   │
│  · query   (FTS/where)   · find    (9-stage chain)  · st-detect   │
│  · scan    (candidates)  · decision-tree (gates)    · spec-audit  │
│  · cluster (signatures)  · route   (tool select)                   │
│  · extract (regex pull)  · evaluate (calibration)                 │
└────────┬──────────────────┬──────────────────┬─────────────────────┘
         │                  │                  │
         ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌────────────────┐
│ THE STORE     │  │ THE JUDGE     │  │ THE GATES      │
│ (SQLite)      │  │ (JevK5 4B)    │  │ (recipes +     │
│               │  │               │  │  policies)     │
│ · files       │  │ · ask()       │  │                │
│ · docs (FTS5) │  │ · askMany()   │  │ · act >= 0.8   │
│ · cache       │  │   batched     │  │ · flag >= 0.5  │
│ · decisions   │  │ · cache       │  │ · fail: closed │
│ · meta (roots)│  │ · ledger      │  │                │
└───────────────┘  └───────┬───────┘  └────────────────┘
                           │
                           ▼
                   ┌───────────────┐
                   │ THE TRANSPORT │
                   │               │
                   │ · rate limiter│
                   │ · retry/backoff│
                   │ · 402 terminal│
                   │ · canon GGUF  │
                   │   adapter     │
                   └───────────────┘
```

## Component Role Table

| Component | Role | Inputs | Outputs | Runtime |
|---|---|---|---|---|
| CLI (src/cli.ts) | Route verbs, parse args | argv | stdout, exit code | Bun |
| Store (src/store/db.ts) | Persist files, docs, cache, decisions | SQL | rows | SQLite |
| Targets (src/targets.ts) | Resolve corpus targets | name, root | file list | Bun |
| Index (src/verbs/index.ts) | Ingest and chunk files | file paths | index rows | Bun |
| Query (src/verbs/query.ts) | FTS + predicate search | fts/where/tag | matching rows | SQLite FTS5 |
| Scan (src/verbs/scan.ts) | Keyword candidates | lex, regex | candidates + excerpts | SQLite |
| Cluster (src/verbs/cluster.ts) | Signature groups | lex | grouped clusters | Bun |
| Extract (src/verbs/extract.ts) | Regex pulls | re, field | structured rows | Bun |
| Filter (src/verbs/filter.ts) | Batched judged filter | question, fts | kept rows + p | JevK5 via HTTP |
| Find (src/verbs/find.ts) | 9-stage judged chain | phrase | patterns + exemplars | JevK5 via HTTP |
| Decision-tree (src/verbs/decision-tree.ts) | Gate rows against a recipe | rows, recipe | act/escalate/noop | JevK5 via HTTP |
| Route (src/verbs/route.ts) | Select the right tool | task | route + choice + p | JevK5 via HTTP |
| Evaluate (src/verbs/evaluate.ts) | Calibration metrics | cases, questions | agreement, brier, ece | JevK5 via HTTP |
| Push-gate (src/verbs/push-gate.ts) | The 7-item checklist | repoRoot | ALLOW/REFUSE | JevK5 + mechanical |
| ST-detect (src/verbs/st-detect.ts) | Shitty test scanner | tests dir | LEGIT/SUSPECT/SHITTY | Mechanical only |
| Spec-audit (src/verbs/spec-audit.ts) | Component verifier | spec JSON | PASS/PARTIAL/FAIL | Mechanical only |
| Judge (src/judge/client.ts) | The batch client | items, questions | answers + probs | HTTP to the judge |
| Transport (src/judge/transport.ts) | HTTP + rate limit + retry | body | response | HTTP |
| Limiter (src/judge/limiter.ts) | Token bucket chokepoint | acquire() | grant/delay | Bun |
| Cache (src/judge/cache.ts) | Fingerprint + store | state, answers | hit/miss | SQLite |
| Canon GGUF (src/judge/canon-gguf.ts) | llama.cpp wire adapter | state, questions | noul/choice/score | HTTP /completion |
| MCP (src/mcp.ts) | The MCP server | JSON-RPC | tool results | stdio |
| Watch (src/watch.ts) | Daemon tick | targets | journal rows | Bun daemon |
| Serve (src/serve.ts) | HTTP surface | HTTP | JSON | Bun HTTP |

# 3 · DESIGN PRINCIPLES AND KEY DECISIONS

## D-001 · ONE WIRE FORMAT (/v1/systemone)

**Decision:** The judged verbs speak TypeSafe's `/v1/systemone` wire format.
**Chosen:** A JSON POST with `{state, model, questions}` returning `{answers, usage}`.
**Rejected Alternative:** A custom wire format per verb.
**Why rejected:** The TypeSafe format is the industry standard for typed decision models. Every
compatible model (JevK5, decider-2b, kev, the real Jev API) serves it. A custom format would
require an adapter for every model.
**Cost of reversal:** Medium — every judged verb's transport layer would need rewriting.

## D-002 · BATCH BY DEFAULT (askManyBatch)

**Decision:** N items are judged in ONE HTTP request, not N requests.
**Chosen:** `askManyBatch(items, questions, schema, batchSize=200)` — chunks of 200 inside the
400-question ceiling, one request per chunk.
**Rejected Alternative:** `ask()` per item with a concurrency pool.
**Why rejected:** Measured — the API takes N questions in one request at flat time. 40 candidates
in 1 request vs 40 requests. The cost is per-token, not per-request; batching saves round trips.
**Cost of reversal:** Low — `ask()` still exists for single items.

## D-003 · THE CACHE IS PER-(item, question)

**Decision:** Each (item, question) pair gets its own cache fingerprint, keyed by the QUESTION's
name (the same key `ask()` would use).
**Chosen:** `fingerprint(model, schema#qHash#url, canonicalRaw(state))`.
**Rejected Alternative:** Cache the whole batch response.
**Why rejected:** A whole-batch cache means adding one item invalidates the entire batch. Per-item
means a re-run of 100 items with 1 changed = 99 cache hits + 1 request.
**Cost of reversal:** Medium — the cache schema would change.

## D-004 · CANONICAL RAW (not redacted) FOR THE CACHE KEY

**Decision:** The fingerprint hashes the RAW canonical form (sorted keys, no redaction).
**Chosen:** `canonicalRaw(state)` — deterministic ordering, no secret stripping.
**Rejected Alternative:** Hash the redacted form (the ORIGINAL behavior).
**Why rejected:** MEASURED DEFECT — `{email:'a@x.com'}` and `{email:'b@x.com'}` both canonicalized
to `[email]`, producing the SAME fingerprint. The cache served one state's answer for another.
This was the CRITICAL audit finding. The redactor's job is to strip secrets from the STORED
payload, not from the KEY.
**Cost of reversal:** LOW — this is the CORRECT behavior. Reversing it reintroduces the collision.

## D-005 · THE RATE LIMITER IS A CHOKEPOINT

**Decision:** Every judge call passes through a process-wide TokenBucket.
**Chosen:** `TokenBucket(ratePerSec=10, burst=20, maxInFlight=burst)` — a token bucket with a
concurrency cap.
**Rejected Alternative:** Per-verb limiters or no limiter.
**Why rejected:** MEASURED (RL-01) — the account hit HTTP 402 because nothing bounded request
FREQUENCY. `Budget{calls,usd}` is per-INVOCATION and resets every run. A shared process-wide
limiter bounds the aggregate rate across all verbs.
**Cost of reversal:** Low — the limiter is in the transport path; removing it is one line.

## D-006 · 402 IS TERMINAL (never retried)

**Decision:** An HTTP 402 (billing error) throws immediately and is NEVER retried.
**Chosen:** `if (res.status === 402) throw` — before the retry classification.
**Rejected Alternative:** Treat 402 like a 5xx and retry with backoff.
**Why rejected:** A 402 means the account has no credits. No number of retries adds credits.
Retrying a billing error turns a clear "add credits" into a slow hang.
**Cost of reversal:** None — this is the correct behavior.

## D-007 · THE CANON GGUF ADAPTER (llama.cpp wire)

**Decision:** When the judge is a GGUF served by llama.cpp (not a native /v1/systemone server),
the transport auto-detects and translates.
**Chosen:** `detectCanon(base)` — a one-time probe of `/props` (the llama.cpp signature). If it
responds, the transport routes to `canonSystemOne()` which builds the canon prompt and reads the
softmax over the option letters.
**Rejected Alternative:** Require a native /v1/systemone server only.
**Why rejected:** The system canon is a GGUF on llama.cpp. Requiring a native server would mean
the tool cannot use the system's chosen judge.
**Cost of reversal:** Low — the canon branch is behind the detectCanon() check.

## D-008 · THE CLAIM LOOP (not a pool)

**Decision:** The decision-tree verb uses a claim loop, not a concurrency pool.
**Chosen:** Claim `min(200, room)` per chunk, ONE request for the chunk, settle each row. A
REFUNDED claim frees room for the next chunk.
**Rejected Alternative:** A `runPool` with per-row `ask()` calls.
**Why rejected:** The pool claimed one row at a time and a refund freed its slot — claiming all
rows up front broke the documented per-target refresh (D-060). The loop preserves the 121-audit
semantics exactly.
**Cost of reversal:** Medium — the verb's structure would change.

## D-009 · THE PUSH GATE IS ADVERSARIAL-FIRST

**Decision:** The push-gate checks spec, build, tests, theatricality, docs, and drift — in that
order — with the mechanical checks free and the judged checks batched.
**Chosen:** 7 items, each independently runnable, the verdict is the AND.
**Rejected Alternative:** A single "is this good?" judgment.
**Why rejected:** A single judgment cannot tell you WHAT failed. Seven named items each produce
actionable output: "Zero drift? bundle=X stated=Y DRIFT" tells you exactly what to fix.
**Cost of reversal:** Low — each item is an independent function.

## D-010 · SERIALIZE THE TEST SUITE

**Decision:** `bunfig.toml [test] concurrency = 1` — test files run one at a time.
**Chosen:** Full serialization of the test suite.
**Rejected Alternative:** The default bun concurrency (20 files in parallel).
**Why rejected:** MEASURED (EN-111) — `process.env` is per-PROCESS, 22 test files mutate
`process.env.JM_*`, and concurrent files raced each other's judge calls mid-flight. The cache test
passed 0/20 isolated and failed ~1/10 in the suite.
**Cost of reversal:** Low — but it would reintroduce the race.

# 4 · TECHNICAL DEEP-DIVES PART 1 — THE STORE AND INGESTION

## 4.1 The Store Layer (src/store/db.ts)

**WHAT:** A SQLite database per index, holding files, documents, cache, decisions, and metadata.

**HOW:** `openDb(dbPath)` creates or opens a database with the schema:

```sql
files(path TEXT PRIMARY KEY, size INTEGER, mtime REAL, sha256 TEXT,
      kind TEXT, text_indexed INTEGER, state TEXT, indexed_at REAL)
docs(file_id INTEGER, chunk_idx INTEGER, text TEXT)
docs_fts (FTS5 virtual table on docs.text)
tags(path TEXT, tag TEXT)
meta(key TEXT PRIMARY KEY, value TEXT)
cache(fingerprint TEXT PRIMARY KEY, provider TEXT, model TEXT,
      schema TEXT, answers TEXT)
decisions(id INTEGER PRIMARY KEY, run_id INTEGER, row_index INTEGER, ...)
```

**WHERE:** src/store/db.ts:1-100 (the schema), :100-150 (reconcileRoots), :150-200 (purgeIndex).

**WHY:** SQLite is embedded (no server to run), transactional (SIGKILL-safe), and FTS5 provides
full-text search with BM25 ranking out of the box. The schema separates files (the filesystem
view) from docs (the searchable text, chunked for large files) so a 37.9 MB file is fully
searchable via `#c0`, `#c1`, ... chunks.

**THE ROOT GUARD (reconcileRoots):** Every index records its root-set in `meta.roots` as a JSON
map of `{prefix -> root}`. A changed root or a duplicate prefix is REFUSED by name
(`JM_INDEX_ROOTS_CHANGED`). This prevents the duplication defect where the same corpus was
indexed under two path-spaces and every search returned each hit twice.

## 4.2 The Target System (src/targets.ts)

**WHAT:** Targets are named corpus sources — a directory (fs), a JSONL file, or a SQLite database.

**HOW:** `target add <name> <kind> <root>` registers a target. `jm index @<name>` or
`jm index --in <name1>,<name2>` indexes one or more targets. Each target's files are namespaced
by the target name: `@reports/handovers/x.md` becomes `reports/handovers/x.md`.

**WHERE:** src/targets.ts:1-50 (the target type), :50-100 (ingestAll with reconcileRoots).

**WHY:** Namespacing prevents path collisions when multiple targets share filenames. The
root-set guard ensures the same corpus is never indexed under two different path-spaces.

## 4.3 The Index Verb (src/verbs/index.ts)

**WHAT:** Ingests files into the store, chunking large files, hashing content, and building the
FTS index.

**HOW:** The walk is committed in batches of 500 (`ixBatch`), with the tombstone sweep in its own
transaction (`sweepTx`). Files above 256 KB are chunked into `#c0`, `#c1`, ... pieces.

**WHERE:** src/verbs/index.ts:196-280 (indexTarget with ixBatch and sweepTx).

**WHY THE BATCHING:** MEASURED (EN-103) — a single transaction spanning 11,832 files suppressed
every WAL checkpoint, growing the WAL to 7 GB on a 1.8 GB corpus. Batching every 500 lets
checkpoints interleave, reducing peak WAL from 6,986 MB to 485 MB and build time from 285.6s to
92.8s.

**THE INCREMENTAL PATH:** A re-index is incremental — only files whose (size, mtime) differ from
the stored values are re-read and re-hashed. Measured: 30,000 files cold in 1.92s; 5 touched →
0.42s; no-change → 0.17s.

## 4.4 The Query Verb (src/verbs/query.ts)

**WHAT:** Two search modes: FTS (full-text search with BM25 ranking) and WHERE (a restricted
predicate on whitelisted columns).

**HOW:** `--fts "term1 term2"` → an FTS5 MATCH query returning `path, size, mtime, kind, state,
sha256, rank`. `--where "size>1000"` → a parameterized SQL predicate on whitelisted columns
(size, mtime, kind, state, path, sha256, text_indexed).

**WHERE:** src/verbs/query.ts:1-50 (the where parser with COLS/OPS whitelists).

**WHY THE WHITELIST:** The where clause is parsed, not passed through to SQL. Only whitelisted
columns and operators are accepted. A non-numeric value on a numeric column is REFUSED by name
(`JM_WHERE_VALUE`) because SQLite orders TEXT above INTEGER — `size > '>>'` is always FALSE,
which would silently return nothing.

# 5 · TECHNICAL DEEP-DIVES PART 2 — THE JUDGE

## 5.1 The Judge Client (src/judge/client.ts)

**WHAT:** The single entry point for all judged operations. `ask()` for one item,
`askManyBatch()` for N.

**HOW:** `askManyBatch(items, questions, schema, batchSize=200)`:
1. Compute per-(item, question) cache identity
2. Cache hits are served; misses form the chunk
3. Chunks of 200 → one HTTP request per chunk
4. The usage check runs FIRST (fatal at both polarities, D-046)
5. A short response is a NAMED failure (`JM_JUDGE_ANSWER_COUNT`)
6. The chunk cost is SHARED: `share = costUsd / asked`
7. Each answer is cached under the QUESTION's name (same as `ask()`)

**WHERE:** src/judge/client.ts:44-150 (askManyBatch).

**WHY THE SHARED COST:** One request bills one `usage` block. Attributing the full cost to each
item would overstate by N×. Sharing the cost across the asked items means the sum reproduces the
real cost exactly.

## 5.2 The Rate Limiter (src/judge/limiter.ts)

**WHAT:** A process-wide TokenBucket that gates every judge call.

**HOW:** `acquire()` waits for BOTH a token (the rate) AND a slot (the concurrency). `release()`
returns the in-flight slot. `stats()` exposes `{inFlight, peak, waitedMs, granted}` — the PEAK
is the observed proof the cap held.

**WHERE:** src/judge/limiter.ts:1-60 (TokenBucket), :60-100 (judgeLimiter with env config).

**WHY TWO BOUNDS:** MEASURED — `burst=2` with a 1000/s refill admitted 20 concurrent callers to
`peak=6`. The rate bucket was doing its job (the refill admitted them over time) while nothing
capped how many were OPEN at once. A rate bound is not a concurrency bound; both are needed.

## 5.3 The Transport Layer (src/judge/transport.ts)

**WHAT:** The HTTP client that talks to the judge, with rate limiting, retry classification,
and the canon GGUF adapter.

**HOW:** Every call: `acquire()` → fetch → `release()` in the finally. The retry classification:
429/5xx → retry with exponential backoff + jitter; 402 → TERMINAL (never retried); other 4xx →
not retryable. The canon detection: a one-time `GET /props` probe — if the response contains
`model_path`, it is a llama.cpp server and the transport routes to `canonSystemOne()`.

**WHERE:** src/judge/transport.ts:37-100 (the canon detection), :100-180 (the retry loop).

## 5.4 The Canon GGUF Adapter (src/judge/canon-gguf.ts)

**WHAT:** Translates the `/v1/systemone` contract onto llama.cpp's `/completion` wire.

**HOW:** Builds the canon prompt (the trained format from the model's repo):
```
Context:\n<state>\n\nQuestion: <text>\nOptions:\n(A) Yes\n(B) No\nAnswer: (
```
The readout is the softmax over the OPTION LETTERS at the answer slot, renormalized (noise
tokens dropped). MEASURED: `JM_INDEX_MISSING` → A p=0.4853, B p=0.0816 → P(yes) = 0.856.

**WHERE:** src/judge/canon-gguf.ts:76 (buildCanonPrompt), :145 (canonSystemOne).

## 5.5 The Cache (src/judge/cache.ts)

**WHAT:** A SQLite-backed cache with SHA-256 fingerprints.

**HOW:** `fingerprint(model, schemaVersion, state)` = SHA-256 of `model\0schemaVersion\0canonicalRaw(state)`.
The `canonicalRaw()` function sorts keys deterministically, handles Map/Set/Date, and does NOT
redact. Redaction (`redact()`) is for the STORED payload only.

**WHERE:** src/judge/cache.ts:1-40 (canonicalRaw), :40-80 (fingerprint), :80-120 (cacheGet/Put).

# 6 · TECHNICAL DEEP-DIVES PART 3 — THE WORKFLOW VERBS

## 6.1 The Push Gate (src/verbs/push-gate.ts:54)

**WHAT:** The 7-item checklist that decides whether a commit is allowed.

**HOW:** Six mechanical checks (free, deterministic) + one judged check (batched, through the
local judge):

```
1  spec component?   auditSpec() — files, symbols, tests per component
2  built correctly?  tsconfig exists + src file count > 0
3  tested correctly? detectST() — the shitty test detector
4  not theatrical?   askManyBatch noul on the ST summary (JUDGED)
5  Docs updated?     newest src mtime vs oldest doc mtime
6  Zero drift?       the actual bundle sha vs the stated sha
                     (from BUILD_STATE.md or BUILD_REPORT.md)
```

The verdict is the AND of all six. Any FAIL or JUDGED_FAIL → REFUSE, exit 1.

**WHERE:** src/verbs/push-gate.ts:54-180.

**WHY:** Each item is independently actionable. "Zero drift? bundle=X stated=Y DRIFT" tells you
exactly what to fix. A single "is this good?" judgment cannot tell you WHAT failed.

## 6.2 The ST Detector (src/verbs/st-detect.ts:44)

**WHAT:** Scans test files for "shitty test" signatures — tests that prove nothing.

**HOW:** Five mechanical signatures per file:
- `testCount` — how many `test(` or `it(` blocks
- `importCount` — real source imports vs mock-only
- `mockCount` — mock/stub/spy usage (JM_MOCK_DIR is exempt: the boundary mock)
- `failurePaths` — toThrow/rejects/JM_[A-Z]+/refuse assertions
- `happyOnly` — zero failure-path assertions + positive assertions exist

The verdict ladder:
- No real imports AND mocks > 0 → **SHITTY**
- Happy-path-only → **SUSPECT**
- Mocks > imports × 2 → **SHITTY**
- Real imports AND failure paths → **LEGIT_UT**

**WHERE:** src/verbs/st-detect.ts:44-98 (scanTestFile).

## 6.3 The Spec Auditor (src/verbs/spec-audit.ts:48)

**WHAT:** Verifies that each spec component actually exists in the codebase.

**HOW:** For each component in the spec JSON: (1) does the file exist? (2) do the symbols exist
in the file's content? (3) do the named tests exist in any test file? Verdict: PASS, PARTIAL,
or FAIL, with the missing items named.

**WHERE:** src/verbs/spec-audit.ts:48-95.

## 6.4 The MCP Server (src/mcp.ts)

**WHAT:** A stdio JSON-RPC server exposing four tools to OMP sessions.

**HOW:** The tools: `jev_query` (FTS/where read), `jev_find` (the judged chain), `jev_decide`
(decision-tree), `jev_index` (index a target). Mounted at session start via the MCP registry
(`~/.omp/agent/mcp.json`) with `JM_HOME` and `JM_JUDGE_URL` in the env.

**WHERE:** src/mcp.ts:1-100.

## 6.5 The Recovery System (src/job/run.ts + scripts-recovery-proof.ts)

**WHAT:** The queue-based crash recovery: a SIGKILLed job resumes with zero duplicates.

**HOW:** The queue is WAL-backed SQLite. Each file's fingerprint is UNIQUE — a duplicate insert
is structurally impossible. The proof: SETUP 600 files → SIGKILL after 100ms → 16 done / 584
pending / 1 running → RESUME → 600 done, dup=0, indexed files=600.

**WHERE:** src/job/run.ts, scripts-recovery-proof.ts.

## 6.6 The Watch Daemon (src/watch.ts)

**WHAT:** A daemon that re-indexes targets on a tick and journals the results.

**HOW:** `jm watch --in <targets> --name <index> [--once]` — each tick runs reconcileRoots,
ingestAll, and prints the result. The journal is an append-only TSV at
`$JM_HOME/watch/journal.jsonl`.

**THE ERROR RENDERING (EN-104):** The tick prints the ERROR MESSAGES, not just the count.
`errors=1` alone is a signal that cannot be acted on. The message follows on the next line.

**WHERE:** src/watch.ts:11-60.

# 7 · REGISTRIES

## Decision Registry

| ID | Decision | Status |
|---|---|---|
| D-001 | One wire format (/v1/systemone) | ACTIVE |
| D-002 | Batch by default (askManyBatch) | ACTIVE |
| D-003 | Per-(item,question) cache | ACTIVE |
| D-004 | canonicalRaw for cache keys (not redacted) | ACTIVE |
| D-005 | Rate limiter as a chokepoint | ACTIVE |
| D-006 | 402 is terminal | ACTIVE |
| D-007 | Canon GGUF adapter | ACTIVE |
| D-008 | Claim loop (not a pool) | ACTIVE |
| D-009 | Push gate adversarial-first | ACTIVE |
| D-010 | Serialize the test suite | ACTIVE |

## Constant Registry

| Constant | Value | Location |
|---|---|---|
| BATCH_SIZE | 200 | src/judge/client.ts |
| CHUNK_SIZE | 500 | src/verbs/index.ts |
| DEFAULT_RATE | 10 req/s | src/judge/limiter.ts |
| DEFAULT_BURST | 20 | src/judge/limiter.ts |
| DEFAULT_RETRIES | 3 | src/judge/transport.ts |
| DEFAULT_TIMEOUT | 30,000 ms | src/judge/transport.ts |
| MAX_TEXT_BYTES | 256 KB | src/verbs/index.ts |
| ACT_THRESHOLD | 0.8 | recipe policy |
| FLAG_THRESHOLD | 0.5 | recipe policy |
| EXCERPT_LENGTH | 160 chars | src/verbs/filter.ts |

## File Manifest

| File | Lines | Role |
|---|---|---|
| src/cli.ts | 725 | The CLI router (21 verbs) |
| src/store/db.ts | 200 | Schema + reconcileRoots + purgeIndex |
| src/targets.ts | 176 | Target registry + ingestAll |
| src/verbs/index.ts | 280 | The index verb (batched walk) |
| src/verbs/query.ts | 50 | FTS + where search |
| src/verbs/scan.ts | 80 | Keyword candidates |
| src/verbs/cluster.ts | 60 | Signature groups |
| src/verbs/extract.ts | 70 | Regex structured pulls |
| src/verbs/filter.ts | 200 | Batched judged filter |
| src/verbs/find.ts | 300 | The 9-stage judged chain |
| src/verbs/decision-tree.ts | 350 | The gate verb (claim loop) |
| src/verbs/route.ts | 180 | Tool/skill selection |
| src/verbs/evaluate.ts | 180 | Calibration metrics |
| src/verbs/push-gate.ts | 200 | The 7-item checklist |
| src/verbs/st-detect.ts | 113 | Shitty test detector |
| src/verbs/spec-audit.ts | 95 | Spec component verifier |
| src/judge/client.ts | 150 | The batch client |
| src/judge/transport.ts | 180 | HTTP + rate limit + retry |
| src/judge/limiter.ts | 127 | TokenBucket chokepoint |
| src/judge/cache.ts | 120 | Fingerprint + store |
| src/judge/canon-gguf.ts | 196 | llama.cpp wire adapter |
| src/judge/policy.ts | 80 | noulFrom + fatalJudgeError |
| src/judge/key.ts | 40 | Key resolution |
| src/mcp.ts | 100 | The MCP server |
| src/watch.ts | 60 | The daemon |
| src/serve.ts | 100 | The HTTP surface |
| src/job/run.ts | 150 | The queued job runner |

# 8 · FAILURE MODES

## EN-101 · 310 MB of probe litter in the operator's store
**Symptom:** The host suite's H2 phase found 22 indexes where only 3 were real.
**Root Cause:** Probes used the DEFAULT `JM_HOME` (`~/.jm`) instead of a scratch one.
**Fix:** Cleaned; the suite's H0/H2 phases now inspect the store.
**Prevention:** Always `export JM_HOME=/tmp/<scratch>` before testing.

## EN-102 · Every search returned each hit twice
**Symptom:** 125 rows for 68 real files, every path appearing under two prefixes.
**Root Cause:** `files.path` carries no root provenance; the tombstone sweep is namespace-scoped
(D-060/D-061), so two path-spaces coexist forever.
**Fix:** `reconcileRoots()` records `{prefix -> root}` per NAMESPACE in `meta.roots`. A changed
root or a duplicate prefix is refused by name.
**Prevention:** Never index the same corpus under two different path-spaces.

## EN-103 · The store grew to 11 GB (4 GB db + 7 GB WAL)
**Symptom:** A 1.8 GB corpus produced a 4 GB database and a 7 GB write-ahead log.
**Root Cause:** SQLite's `wal_autocheckpoint` (1000 pages ≈ 4 MB) cannot run while a transaction
is open. ONE transaction spanning the whole walk suppressed every checkpoint.
**Fix:** The walk commits every 500 files (`ixBatch`); the tombstone sweep is its own `sweepTx`.
**Prevention:** Never wrap a bulk ingest in one transaction.

## EN-104 · The watch daemon printed `errors=1` and threw the message away
**Symptom:** The tick showed `errors=1` with no indication of WHAT failed.
**Root Cause:** Both renderers dropped the `errors: string[]` field.
**Fix:** The live tick prints one `! <message>` line per error; the journal carries an `errors=`
column.
**Prevention:** An error count without a message is a signal that cannot be acted on.

## EN-107 · 98 requests for 98 candidates
**Symptom:** `find` made 98 HTTP requests for 98 candidates.
**Root Cause:** The pool called `judge.ask()` per candidate.
**Fix:** `askManyBatch` — N questions in ONE request.
**Prevention:** The `requests=` field is printed on every judged verb; a regression to N requests
is immediately visible.

## EN-108 · The false "budget exhausted"
**Symptom:** The batch path hit the budget cap at 3/6 and stopped with a false positive.
**Root Cause:** Claiming all rows up front did not account for REFUNDS freeing slots.
**Fix:** The claim LOOP: claim `min(200, room)` per chunk, settle, and a refund frees room for
the next chunk.
**Prevention:** The cap counts calls that HAPPENED, not rows attempted.

## EN-109 · The fd leak (20% battery flake)
**Symptom:** 2 of 10 full-battery runs failed with one stray file descriptor.
**Root Cause:** `stream.destroy()` initiates the close; the fd is released on the `close` EVENT,
a later tick. The generator exited before the fd was released.
**Fix:** `await new Promise(resolve => stream.once("close", resolve))` before exiting.
**Prevention:** A resource released at an unspecified later time is not a resource released.

## EN-110 · Three hardcoded test ports
**Symptom:** 1 of 10 runs failed on `test_D036` when a port was in TIME_WAIT.
**Root Cause:** Three ports (7896/7897/7898) hardcoded in `wave-gates.test.ts` while other files
used `port: 0`.
**Fix:** All three → `port: 0`.
**Prevention:** A fixed port in a test is a flake.

## EN-111 · process.env raced between concurrent test files
**Symptom:** The cache test passed 0/20 isolated and failed ~1/10 in the suite.
**Root Cause:** `process.env` is per-PROCESS; bun's `--max-concurrency` defaults to 20; 22 test
files mutate `process.env.JM_*` — one file's mock dir landed in a sibling's judge call.
**Fix:** `bunfig.toml [test] concurrency = 1`.
**Prevention:** Shared mutable state across test files requires serialization.

## RL-01 · The account hit HTTP 402 mid-build
**Symptom:** `JM_JUDGE_HTTP_402: billing_error — no available credits`.
**Root Cause:** Nothing bounded request FREQUENCY. `Budget{calls,usd}` is per-invocation and
resets every run.
**Fix:** The rate limiter (W3) — a process-wide TokenBucket.
**Prevention:** A budget without a rate limiter is a budget for one invocation.

## THE CRITICAL CACHE COLLISION (the audit's top finding)
**Symptom:** Two different states produced the same cache entry.
**Root Cause:** `redact()` ran BEFORE the hash — `{email:'a@x.com'}` and `{email:'b@y.com'}` both
canonicalized to `[email]`, producing the same fingerprint.
**Fix:** `fingerprint()` hashes `canonicalRaw(state)` (no redaction). Redaction is for the
STORED payload, not the KEY.
**Prevention:** A cache key must preserve input-distinctness.

# 9 · APPENDICES

## Appendix A · The Verbs Reference

| Verb | Arguments | Keyless? | Output |
|---|---|---|---|
| index | `<path|@target> --name <index>` | YES | JM_INDEX_OK |
| query | `<index> --fts <terms> \| --where <pred>` | YES | matching rows |
| scan | `<index> --lex <term> \| --re <regex>` | YES | candidates + excerpts |
| cluster | `<index> --lex <term> --min <n>` | YES | signature groups |
| extract | `<index> --re <regex> \| --field <key>` | YES | structured rows |
| filter | `<index> --question <q> --fts <terms>` | NO (judge) | kept rows + p |
| find | `<phrase> --in <index> --common <n>` | NO (judge) | patterns + exemplars |
| decision-tree | `--rows <file> --recipe <file>` | NO (judge) | act/escalate/noop |
| route | `--task <text>` | NO (judge) | route + choice + p |
| evaluate | `--cases <f> --questions <f> --key <k>` | NO (judge) | agreement/brier/ece |
| push-gate | `[--spec <file>]` | MIXED | ALLOW/REFUSE + exit |
| st-detect | (none — scans tests/) | YES | LEGIT/SUSPECT/SHITTY |
| spec-audit | `<spec.json>` | YES | PASS/PARTIAL/FAIL |
| report | `<index>` | YES | files/docs/cache/kinds |
| target | `add <name> <kind> <root>` | YES | registry write |
| watch | `--in <targets> --name <i> [--once]` | YES | tick journal |
| serve | `[--port <n>]` | N/A | HTTP surface |
| mcp | (stdio) | N/A | MCP server |
| calibrate | `--name <index>` | YES | threshold move |

## Appendix B · The Wire Format

```json
// REQUEST (POST /v1/systemone)
{
  "state": "any text or JSON object",
  "model": "jev-latest",
  "questions": {
    "question_name": {
      "type": "noul",
      "instructions": "the question text",
      "criteria": { "true": "...", "false": "..." }
    }
  }
}

// RESPONSE
{
  "model": "jev-latest",
  "answers": {
    "question_name": {
      "type": "noul",
      "noul": 0.7951
    }
  },
  "usage": { "input_tokens": 24, "output_tokens": 23 }
}
```

## Appendix C · The Recipe Format

```json
{
  "recipe": "my-gate",
  "version": 1,
  "questions": {
    "is_failure": {
      "type": "noul",
      "instructions": "Does this describe a failure?"
    }
  },
  "policy": {
    "act": 0.8,
    "flag": 0.5,
    "fail": "closed"
  }
}
```

# 10 · IRON LAWS

1. **ALWAYS set JM_JUDGE_URL before a judged verb.** Without it, the client hits the public
   TypeSafe endpoint → HTTP 402 (billing). The local judge is at `:8090`.

2. **NEVER index the same corpus under two path-spaces.** The root-set guard will refuse it
   (`JM_INDEX_ROOTS_CHANGED`), and for good reason — it duplicates every hit.

3. **ALWAYS use `export JM_HOME=/tmp/<scratch>` when testing.** The default `~/.jm` is the
   operator's real store; probe litter accumulates silently.

4. **NEVER wrap a bulk ingest in one transaction.** SQLite's WAL checkpoint cannot run inside an
   open transaction; the WAL grows to the run's total write volume.

5. **ALWAYS read `requests=` on every judged verb's output.** `requests=N` for N items means the
   batching regressed. `requests=1` (or `ceil(N/200)`) is correct.

6. **NEVER treat a 402 as retryable.** A billing error cannot be fixed by retrying. It is
   terminal and named.

7. **ALWAYS use `port: 0` in test servers.** A fixed port is a flake waiting for TIME_WAIT.

8. **NEVER trust a cache key that redacts before hashing.** Redaction is for the stored payload;
   the key must preserve input-distinctness or you serve the wrong answer.

9. **ALWAYS serialize the test suite** (`concurrency = 1`). `process.env` is per-process; 22 test
   files racing on it produced a 10% flake that vanished in isolation.

10. **NEVER claim all rows up front in a batched verb.** Use the claim loop — a refund frees room
    for the next chunk.

# 11 · CONCLUSION AND COMPACTION RECOVERY

## Read this first after context loss

**What is this?** JevManager (`jm`) is a decision engine: it indexes corpora, narrows them
deterministically (keyless), and judges the survivors with calibrated probabilities (through a
local JevK5 4B model on the GPU).

**How do I use it?**
```bash
export JM_JUDGE_URL=http://127.0.0.1:8090/v1/systemone
jm index /path/to/data --name myindex
jm query myindex --fts "search terms"
jm filter myindex --question "yes/no question" --fts "terms"
```

**Where is the judge?** `:8090` (JevK5 4B Q8_0 GGUF on the GPU). If down, `:8008` may serve.

**What are the surfaces?** CLI (`jm` on PATH, 21 verbs), MCP (`jev-manager`, 4 tools), HTTP
(`jm serve`), git pre-commit hook (`jm push-gate`).

**What are the key files?**
- `src/cli.ts` — the verb router
- `src/judge/client.ts` — the batch client
- `src/judge/limiter.ts` — the rate limiter
- `src/judge/canon-gguf.ts` — the llama.cpp adapter
- `src/verbs/push-gate.ts` — the workflow gate

**What is the test suite?** `bun test` — 247 tests, 44 files, `concurrency = 1`.

**What is the recovery?** `bun run scripts-recovery-proof.ts` — SIGKILL, resume, dup=0.

**What is the legal-stop predicate?** `./scripts-legal-stop.sh` — 10 conditions, exit 0 = MET.
