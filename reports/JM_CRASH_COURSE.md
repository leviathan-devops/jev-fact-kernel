# THE JEV MANAGER — THE OPERATOR CRASH COURSE
### How to use it, how it actually works, and how to make agents smarter with it
**Written 2026-09-29 after a live measurement session. Every number below was measured, not assumed.**

---

## 0 · WHAT WAS BROKEN (the two config defects this session found and fixed)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  DEFECT 1 · mcp.json pointed at a URL THAT DOES NOT EXIST                │
│                                                                          │
│  mcp.json said:  JM_JUDGE_URL = http://127.0.0.1:8008/v1/systemone       │
│  measured:       POST :8008/v1/systemone  →  HTTP 404                    │
│                                                                          │
│  WHY IT "WORKED" ANYWAY: the client has a canon adapter that DETECTS a   │
│  llama.cpp server and rewrites the call to :8008/completion. So every    │
│  judge call silently took the FALLBACK path:                             │
│    · N calls for N items (requests=100 for 100 candidates)               │
│    · the CLIENT's prompt instead of the purpose-built one                │
│                                                                          │
│  THE MEASURED COST (the same find, both endpoints):                      │
│    :8008 →  172 → 100 → 0 → 0    0 kept, 0 patterns, 100 requests        │
│    :8090 →  192 → 100 → 34 → 3   34 kept, 3 patterns, 1 request          │
│                                                                          │
│  FIXED: mcp.json → http://127.0.0.1:8090/v1/systemone                    │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│  DEFECT 2 · THE CLI HAD NO DEFAULT ENDPOINT                              │
│                                                                          │
│  judgeUrl() = process.env.JM_JUDGE_URL ?? TYPESAFE_URL                   │
│  TYPESAFE_URL is the PUBLIC api → HTTP 402, "no available credits"       │
│  A 402 is TERMINAL (not retried by design) — every judged verb refused.  │
│                                                                          │
│  FIXED: export JM_JUDGE_URL=http://127.0.0.1:8090/v1/systemone           │
│         appended to ~/.bashrc (idempotent)                               │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 1 · HOW IT ACTUALLY WORKS — THE STACK, AS MEASURED

```
┌───────────────────────────────────────────────────────────────────────────┐
│                        YOU / AN AGENT / A SCRIPT                          │
└──────┬──────────────────┬──────────────────┬──────────────────────────────┘
       │                  │                  │
       ▼                  ▼                  ▼
 ┌───────────┐     ┌─────────────┐    ┌──────────────┐
 │  jm CLI   │     │  MCP server │    │  jm serve    │
 │  21 verbs │     │  4 tools    │    │  HTTP API    │
 │ on PATH   │     │ stdio       │    │  :<port>     │
 └─────┬─────┘     └──────┬──────┘    └──────┬───────┘
       │                  │                  │
       └──────────────────┼──────────────────┘
                          ▼
          ┌───────────────────────────────┐
          │  THE VERB LAYER               │
          │  keyless │ judged │ gates     │
          └────────┬───────────┬──────────┘
                   │           │
        ┌──────────▼──┐   ┌────▼────────────────────────────┐
        │  THE STORE  │   │  THE JUDGE CLIENT               │
        │  SQLite     │   │  · cache (fingerprint-keyed)    │
        │  + FTS5     │   │  · rate limiter (token bucket)  │
        │             │   │  · retry (429/5xx/abort only)   │
        │  ~/.jm/     │   │  · 402 = TERMINAL, never retry  │
        │  index/     │   │  · 256KB outbound cap           │
        │   *.sqlite  │   └────────────┬────────────────────┘
        └─────────────┘                │
                                       ▼
                    ┌──────────────────────────────────────┐
                    │  detectCanon(base) — THE FORK        │
                    │                                      │
                    │  is the base a llama.cpp server?     │
                    └───────┬──────────────────┬───────────┘
                            │ NO               │ YES
                            ▼                  ▼
              ┌─────────────────────┐  ┌──────────────────────────┐
              │ NATIVE PATH         │  │ CANON PATH (fallback)    │
              │ POST /v1/systemone  │  │ POST /completion PER ITEM│
              │ N questions / 1 req │  │ N items = N requests     │
              │ the server's prompt │  │ the CLIENT's prompt      │
              │ :8090               │  │ :8008                    │
              └──────────┬──────────┘  └───────────┬──────────────┘
                         │                          │
                         └────────────┬─────────────┘
                                      ▼
                    ┌──────────────────────────────────────┐
                    │  systemone-server.py  (pid 1086379)  │
                    │  /home/leviathan/jevk5-runtime/      │
                    │  --llama http://127.0.0.1:8008       │
                    │  --port 8090                         │
                    │                                      │
                    │  builds the JevK5 canon prompt,      │
                    │  reads the letter-logit distribution │
                    └──────────────────┬───────────────────┘
                                       ▼
                    ┌──────────────────────────────────────┐
                    │  beellama llama-server (pid 3704055) │
                    │  jevk5-4b-Q8_0.gguf                  │
                    │  :8008 · -ngl 999 · -c 16384 · kv f16│
                    │  ~92-100 ms per question             │
                    └──────────────────────────────────────┘
```

### The measured endpoint facts

| Endpoint | What it is | `/v1/systemone` | `/completion` | Batching |
|---|---|---|---|---|
| `:8090` | `systemone-server.py` — the purpose-built wrapper | **HTTP 200** | — | **N questions in 1 request** |
| `:8008` | raw beellama llama.cpp | **HTTP 404** | HTTP 200 | 1 question per call |

### The measured speed (this session)

| Workload | Endpoint | Wall | Requests |
|---|---|---|---|
| 3 questions, 1 state | `:8090` | **1,209 ms** | 1 |
| 3 separate prompts | `:8008` | 6,023 ms | 3 |
| 100 candidates (the find chain) | `:8090` | **21.9 s** | **1** |
| 20 candidates (filter) | `:8008` | 19.4 s | 20 |

**The batching is real and it is the whole design.** 100 candidates = ONE HTTP request. Free.

### The control test (does it actually discriminate?)

```
POSITIVE  (an obvious instance)     →  :8090 → 0.9150     :8008 → 0.9218
NEGATIVE  (an obvious non-instance) →  :8090 → 0.1464
                                          ─────────────
                                          gap: 0.77
```

The judge discriminates correctly. It is not a coin flip.

---

## 2 · THE FOUR MCP TOOLS — HOW TO CALL THEM FROM AN AGENT

These are live in this session (`jev-manager` MCP server). An agent calls them as tools.

```
┌───────────────────────────────────────────────────────────────────────────┐
│  jev_index      index a target's corpus (keyless, incremental by sha)     │
│  jev_query      search the index — FTS or a SQL predicate (keyless)      │
│  jev_find       the 9-stage chain: seeds → patterns (judged)             │
│  jev_decide     ask the judge a typed question about a state (judged)    │
└───────────────────────────────────────────────────────────────────────────┘
```

### jev_index — build or refresh an index

```json
{"in": "all", "index": "myindex"}
```
`in` = `all` or a comma-separated target list. Targets are registered in `~/.jm/targets.json`.

### jev_query — the keyless search (FREE, instant)

```json
{"index": "failurepatterns", "fts": "theatrical", "limit": 5}
{"index": "failurepatterns", "where": "size>20000", "limit": 10}
{"index": "failurepatterns", "tag": "kind=text", "limit": 10}
```

**Measured output** (real rows, ranked by BM25 — lower `rank` = better):

```
failurelogs/JARVIS-FACTORY__jarvis-upper__THEATRICALITY_LOG.md    rank -1.615
failurelogs/JARVIS_DISCORD__SPEC_VIOLATION_LOG.md                 rank -1.563
failurelogs/Graph_Intelligence__THEATRICALITY_LOG.md              rank -1.529
```

### jev_decide — ask the judge a question (THE core primitive)

```json
{
  "state": {"anything": "you want judged"},
  "questions": {
    "is_this_theatrical": {
      "type": "noul",
      "instructions": "Does this contain a claim without evidence behind it?",
      "criteria": {"true": "the claim names real evidence", "false": "it asserts without evidence"}
    }
  },
  "schema": "my-gate-v1"
}
```

**Measured output:**
```json
{"answers": {"is_this_theatrical": {"type":"noul","noul":0.4712}},
 "cached": false, "model": "canon-gguf", "cost_usd": 0.00000252}

  NOTE: the vendor prints a `cost_usd` field computed as `input_tokens x USD_PER_INPUT_TOKEN`
  (client.ts:13 — the HOSTED api's published rate). Running locally NOTHING IS BILLED.
  Read it as a SAVINGS figure: that call would have cost that much on the hosted API.
```

**THE CRITERIA LAW:** the `criteria` field sets the POLARITY. If you write the question
"is this theatrical?" but the criteria are `true = "the claim names real evidence"`, then a
HIGH noul means NOT theatrical. **Write the criteria so high = the thing you asked about.**

### jev_find — the 9-stage chain

```json
{"phrase": "theatrical verification claim", "common": 2, "structure": "json", "index": "failurepatterns"}
```

**Measured output (through the FIXED endpoint):**
```
JM_FIND trend: 192 → 100 → 34 → 3
   (seeds → candidates → KEPT → patterns; 100 judged, 34 kept; 1 request)
cost=$0.002345 (a savings figure — nothing is billed)   wall=21.9s
```

**READ THE TREND — it is the health check:**
| Position | Means | Healthy |
|---|---|---|
| 1st | seeds — how many rows the tokens can reach | any |
| 2nd | candidates — capped at `--limit` (default 100) | = limit |
| 3rd | **KEPT** — passed `minP` (fixed at 0.8) | >0 |
| 4th | patterns — survived `--common` | >0 |
| tail | **requests** | **1** for ≤200 candidates |

**`0 kept` is the alarm.** It means either the corpus genuinely has nothing, OR the judge is
unreachable and the chain degraded. Check `requests=`: `100 requests` = the canon fallback path.

---

## 3 · THE CLI — THE VERBS, GROUPED BY WHAT THEY COST

```
┌──────────────────────────────────────────────────────────────────────────┐
│  KEYLESS — free, instant, deterministic, no model                        │
│    index · query · scan · cluster · extract · report · target · watch    │
├──────────────────────────────────────────────────────────────────────────┤
│  JUDGED — the local model, free, batched                                 │
│    filter · find · decision-tree · route · evaluate                      │
├──────────────────────────────────────────────────────────────────────────┤
│  GATES — mechanical verdicts, exit codes                                 │
│    push-gate · st-detect · spec-audit · calibrate                        │
└──────────────────────────────────────────────────────────────────────────┘
```

### The one-time setup (DONE — appended to ~/.bashrc)

```bash
export JM_JUDGE_URL=http://127.0.0.1:8090/v1/systemone
```

### The daily verbs

```bash
# INDEX — build or refresh
jm index /path/to/corpus --name mydata
jm index @mytarget --name mydata            # via the target registry
jm index @mytarget --queued --job myjob     # crash-safe, resumable

# QUERY — the keyless find (FREE)
jm query mydata --fts "search terms"
jm query mydata --where "size>20000"
jm query mydata --fts "terms" --json        # for an agent

# SCAN — keyword with excerpts (FREE)
jm scan mydata --lex "timeout" --limit 30
jm scan mydata --re "E[A-Z]+[0-9]+"

# EXTRACT — structured pulls (FREE)
jm extract mydata --re "ERROR \[([A-Z_]+)\] (.+)" --limit 100
jm extract mydata --field level              # a JSON field from jsonl/sqlite

# CLUSTER — group by signature (FREE)
jm cluster mydata --lex "error" --min 2

# FILTER — the judged narrowing (THE workhorse)
jm filter mydata --question "is this a security issue?" --fts "auth" --min-p 0.5

# FIND — the 9-stage pattern chain
jm find "the phrase" --in mydata --common 2

# DECISION-TREE — rows + recipe → act/escalate/noop
jm decision-tree --rows rows.jsonl --recipe recipe.json

# ROUTE — pick the right tool from a catalogue
jm route --task "find every missing credential"

# EVALUATE — measure the judge's calibration
jm evaluate --cases cases.json --questions q.json --key is_failure

# THE GATES
jm push-gate                 # ALLOW/REFUSE + exit code
jm st-detect                 # LEGIT/SUSPECT/SHITTY per test file
jm spec-audit spec.json      # PASS/PARTIAL/FAIL
```

---

## 4 · HOW TO MAKE AGENTS SMARTER WITH THIS

This is the actual unlock. The judge is a **decision primitive** — a function an agent can call
that returns a CALIBRATED PROBABILITY instead of making it guess.

### THE FIVE PATTERNS

```
┌───────────────────────────────────────────────────────────────────────────┐
│  PATTERN 1 · NARROW BEFORE YOU SPEND ATTENTION                            │
│                                                                           │
│  BEFORE: an agent reads 300 files to find the 3 that matter.              │
│          cost: 300 file reads in the context window.                      │
│                                                                           │
│  AFTER:  jm filter mydata --question "..." --fts "..." --min-p 0.5        │
│          the agent receives the ~12 rows that passed, WITH probabilities. │
│          cost: 1 local HTTP request. Free.                               │
│                                                                           │
│  THE MECHANISM: the judge reads the candidates; the agent reads the       │
│  verdicts. The bulk reading happens on YOUR GPU, not in the paid          │
│  context window.                                                          │
└───────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────┐
│  PATTERN 2 · SELF-GATE BEFORE COMMITTING                                  │
│                                                                           │
│  Wire it as a git pre-commit hook:                                        │
│    .git/hooks/pre-commit:  export JM_JUDGE_URL=...; jm push-gate          │
│                                                                           │
│  The agent's OWN commit is refused unless six mechanical items pass:      │
│    spec component? · built correctly? · tested correctly?                 │
│    not theatrical? · docs updated? · zero drift?                          │
│                                                                           │
│  THE MECHANISM: the agent cannot claim done — the gate decides.           │
└───────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────┐
│  PATTERN 3 · ASK THE JUDGE INSTEAD OF GUESSING                            │
│                                                                           │
│  An agent facing "should I act on this?" calls jev_decide with the        │
│  state and the question. It receives p=0.87 — and the RECIPE decides:     │
│    p >= 0.8 → act      p >= 0.5 → escalate      p < 0.5 → noop            │
│                                                                           │
│  THE MECHANISM: the model informs, the CODE decides. The ladder is        │
│  deterministic and auditable. An agent that says "I think this is          │
│  probably fine" has no evidence; p=0.87 with a stated ladder does.        │
└───────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────┐
│  PATTERN 4 · MEASURE THE AGENT'S OWN CALIBRATION                          │
│                                                                           │
│  Build a labelled case file (cases.json) + the questions.                 │
│  jm evaluate → agreement=83.3% brier=0.1332 ece=0.0327                    │
│                                                                           │
│  brier < 0.25 and ece < 0.05 = the probabilities are TRUSTWORTHY.         │
│  THE MECHANISM: this is how you justify wiring the judge into a gate.     │
└───────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────┐
│  PATTERN 5 · THE PATTERN HUNT (find)                                      │
│                                                                           │
│  The 9-stage chain answers "where does X recur?" with n + exemplars.      │
│  Each pattern carries its support count and up to 3 quoted exemplars.     │
│                                                                           │
│  THE MECHANISM: an agent asked "is this bug recurring?" gets a MEASURED   │
│  answer (n=4, 3 exemplar paths at p=0.9x) instead of an impression.       │
└───────────────────────────────────────────────────────────────────────────┘
```

### THE RECIPE FORMAT (how to define a gate)

```json
{
  "recipe": "my-gate",
  "version": 1,
  "questions": {
    "is_failure": {
      "type": "noul",
      "instructions": "Does this describe a failure with a root cause?"
    }
  },
  "policy": {"act": 0.8, "flag": 0.5, "fail": "closed"}
}
```

- `act: 0.8` — p ≥ 0.8 → **act**
- `flag: 0.5` — p ≥ 0.5 → **escalate**
- `fail: "closed"` — a judge failure REFUSES rather than degrading

**`fail: "closed"` is the default and it is correct.** A judge that cannot be reached must
never look like a considered "no".

---

## 5 · MAXIMIZING THE VALUE — THE OPERATING RULES

### RULE 1 · ALWAYS set `JM_JUDGE_URL` (now automatic in new shells)

Without it: the public endpoint → **HTTP 402, terminal, never retried**. Every judged verb refuses.

### RULE 2 · Read `requests=` on every judged verb

```
100 judged · 1 request    ← healthy, batching live
100 judged · 100 requests ← the canon fallback; the endpoint is wrong
```

### RULE 3 · `0 kept` is an ALARM, not an answer

With `minP` fixed at 0.8, a genuinely-narrow phrase returns nothing. Before concluding
"no matches exist", verify the judge answered: check `calls=` and `cost=`. `calls=0` = the
judge was never reached.

### RULE 4 · The first call after idle is COLD (measured: 54s)

The model reloads into VRAM. Subsequent calls: **~100ms-1.2s**. The client's timeout is 30s
per attempt × 3 attempts. A cold 54s run can trip `JM_JUDGE_RETRY_EXHAUSTED`.

**Do a warm-up call before a batch:**
```bash
curl -s -o /dev/null http://127.0.0.1:8090/health
```

### RULE 5 · Index once, judge many

Indexing is keyless and incremental (by content sha). Re-running it is cheap — and so is the
judge: it runs on local hardware, indefinitely free. The only "cost" you spend is GPU time.

### RULE 6 · Use the keyless verbs FIRST

```
query / scan / extract / cluster  → keyless: instant, deterministic
filter / find / decision-tree     → the local judge, batched
```

A regex can often answer the question. Reach for the judge when the question is
*semantic* ("is this a failure?", "is this a duplicate?", "should I act?").

### RULE 7 · The store is at `~/.jm`

```
~/.jm/index/*.sqlite     the indexes (shadow.sqlite is 4.0 GB)
~/.jm/targets.json       the target registry
~/.jm/ledger.jsonl       every decision, appended
~/.jm/jobs/              the queued-job state (crash recovery)
~/.jm/watch/             the watch daemon's journal
```

**Set `JM_HOME=/tmp/scratch` when testing** — probe litter in the real store is a documented
failure mode (EN-101: 310 MB of probe indexes).

---

## 6 · THE SMOKE TEST — PROVE IT WORKS IN 4 COMMANDS

```bash
export JM_JUDGE_URL=http://127.0.0.1:8090/v1/systemone

# 1 · the judge is alive
curl -s http://127.0.0.1:8090/health
#    → {"ok": true, "model": "jevk5-4b-v0.2-Q8_0", "runtime": "gguf"}

# 2 · the keyless path
jm query failurepatterns --fts "theatrical" --limit 3

# 3 · the judged path (this is the one that was broken)
jm find "theatrical verification claim" --in failurepatterns --common 2
#    → 192 → 100 → 34 → 3    1 request

# 4 · the primitive
echo '{"state":{"claim":"all tests pass"},"questions":{"evidence":{"type":"noul","instructions":"is there evidence?"}}}' > /tmp/s.json
curl -s -X POST http://127.0.0.1:8090/v1/systemone -H "Content-Type: application/json" --data-binary @/tmp/s.json
```

---

## 7 · WHAT TO DO WHEN IT BREAKS

```
┌────────────────────────┬──────────────────────────────────────────────────┐
│ SYMPTOM                │ CAUSE + REMEDY                                   │
├────────────────────────┼──────────────────────────────────────────────────┤
│ HTTP 402 billing_error │ JM_JUDGE_URL unset → the public endpoint.        │
│                        │ export JM_JUDGE_URL=http://127.0.0.1:8090/...    │
├────────────────────────┼──────────────────────────────────────────────────┤
│ kept=0, calls=0        │ the judge was never reached — the run degraded.  │
│                        │ check the endpoint; check requests=              │
├────────────────────────┼──────────────────────────────────────────────────┤
│ RETRY_EXHAUSTED        │ cold start (54s measured) or a heavy batch.      │
│                        │ warm it: curl :8090/health; retry                │
├────────────────────────┼──────────────────────────────────────────────────┤
│ requests=N for N items │ the canon fallback path — the endpoint is a      │
│                        │ llama.cpp server, not the systemone wrapper      │
├────────────────────────┼──────────────────────────────────────────────────┤
│ JM_INDEX_MISSING       │ the index does not exist. jm index --in all ...  │
├────────────────────────┼──────────────────────────────────────────────────┤
│ JM_JUDGE_USAGE_MISSING │ the response had no usage block — an unmeasured  │
│                        │ cost. Fatal by design (D-046).                   │
└────────────────────────┴──────────────────────────────────────────────────┘
```

---

## 8 · THE ONE-PARAGRAPH SUMMARY

The Jev Manager is a **decision engine with two halves**: a *keyless* half that indexes any
corpus into SQLite+FTS5 and narrows it with deterministic code (free, instant), and a *judged*
half that asks a **local 4B model on your GPU** (`jevk5-4b-Q8_0` at `:8090`) typed questions
about the survivors, returning **calibrated probabilities**. A policy ladder — not the model —
turns `p=0.87` into act/escalate/noop. It runs **locally and free** (no API, no key, no
billing), batches **100 candidates into ONE HTTP request**, and answers in ~22 seconds. An agent gains: the ability to
narrow a search space before spending context, to gate its own commits mechanically, to ask a
calibrated question instead of guessing, and to measure its own judgment quality. This session
found and fixed two config defects that were silently forcing every call down the slow fallback
path (`mcp.json` pointed at a 404; the CLI had no default endpoint) — the fix took a find from
**0 patterns / 100 requests → 3 patterns / 1 request**.
