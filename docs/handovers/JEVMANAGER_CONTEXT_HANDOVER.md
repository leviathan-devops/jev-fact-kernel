# JEVMANAGER CONTEXT HANDOVER — PRIMARY AGENT DUMP
## Duplicate this session's working memory into a fresh agent
### Paste this file first. Then unzip the rest of the pack. Then do not renegotiate the rulings.

```
Package:    JEVMANAGER_CONTEXT_HANDOVER
Written:    2026-09-29
Author:     the session that built the Bible, found the blocker, ran the runtime test
Consumer:   local TUI / fresh agent
Freeze:     JevManager @ ff2f490 · tree sha 07c96789730595377891934f34152610
            Judge: jevk5-4b-v0.2-Q8_0 @ http://127.0.0.1:8090/v1/systemone
            Host:  ~/jevk5-runtime/systemone-server.py (pid varies) → beellama :8008
```

**CONFLICT RULE — copy this into your own notes and never re-derive it:**

```
If this handover conflicts with a BINDING spec on implementation detail, BINDING wins.
If a BINDING spec conflicts with a SUPERSEDED spec, BINDING wins.
Dead paths named in this handover OVERRIDE any superseded "keep-alive / v1 daemon" language.
Adjacent products are OTHER PRODUCTS. They are never the drive.
```

The three BINDING documents, in priority order:
1. `/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/JevManager/README.md` (804 lines) — the operational contract
2. `/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/JevManager/Bibles/JM_BIBLE.md` (769 lines) — the engineering reference
3. `/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/JevManager/reports/JM_MASTER_BLUEPRINT.md` (220 lines) — the intelligence architecture

Everything else in this pack is either HANDOVER (this file + the crash course + the two tools),
SUPERSEDED (old checkpoints), HOST BIBLE (the runtime), or ADJACENT (jevgrep, the warheads).

---

# 0 · WHO YOU ARE NOW

You are the agent taking over the JevManager build. You are a **builder**, not a police
orchestrator. Your job is to make the decision engine work and stay working.

**Your stance:**

- **The judge is LOCAL and FREE.** It runs on this host's GPU. There is no API key, no billing,
  no quota. When a `cost_usd` field appears in output, it is computed as
  `input_tokens x USD_PER_INPUT_TOKEN` (`src/judge/client.ts:13`, the HOSTED api's published
  rate). It is a SAVINGS figure — what the call WOULD have cost elsewhere. **Nothing is billed.**
  The operator corrected this explicitly; do not reintroduce price language.
- **You run the tool before you reason about it.** This session found
  four defects that reading the code did not reveal and running it revealed in minutes:
  the dead zero-drift gate, the dropped `criteria`, the mcp.json 404, the CLI's missing default.
  Reading is for locating; running is for knowing.
- **A gate that cannot pass is a gate that always lies.** Prove BOTH directions before you trust
  any mechanical check: a correct input must PASS, a single mutated input must FAIL.
- **Every number you publish carries its conditions.** "0 kept" means nothing without the
  question shape and the threshold that produced it.

**What you will NOT reopen:**

1. The judge is `:8090` (the systemone adapter). `:8008` is the raw llama.cpp backend, reachable
   only through the canon adapter's `/completion` rewrite. `:8008/v1/systemone` is a **404**.
2. `choice` and `score` questions ARE supported. The local adapter's `normalized()`
   (`~/jevk5-runtime/systemone-server.py:44`) accepts `("noul", "choice", "score")`. Both forms of
   `choice` are measured and working. **Do not restore the noul-only guard.**
3. The `criteria` field is forwarded. It was dropped; that was the core blocker; it is fixed.
4. The judge costs nothing. There is no budget to conserve. `Budget{calls,usd}` exists as a
   runaway GUARD, not as a spending limit.

---

# 1 · THE ARC OF THIS SESSION

## 1.1 The requests, in order

| # | The ask | What it produced |
|---|---|---|
| 1 | Write a Bible + Operator's Manual + Master Blueprint for JevManager | 3 docs, 1,317 lines, commit `6002568` |
| 2 | "Give me the full file path. Order these and see if these need to be approved and improve that if there's anything fault." + `audit` | 4 structural defects found and fixed, commit `e24b6c8` |
| 3 | "Give me practical examples. Like how can I actually implement this in my builds right now?" | the two tools + the QUESTION-SHAPE LAW, commits `66d0356` `bf99c64` |
| 4 | "dont hallucinate price costs this is local and indefinitely free" | 9 price claims corrected across the crash course |
| 5 | "the local judge is noul-only — what does this mean? JevK5 has all normal jev functions" | **the operator was RIGHT.** The guard was measured against the HOSTED api and blocked a working capability |
| 6 | "HUGE BUG LITERALLY BLOCKS CORE INFRA. FIX IMMEDIATELY." | the `criteria` drop + the guard. commit `ff2f490` |
| 7 | Use the tool to collect + classify every failure from every ship doc in the last 5 days, then derive prevention actions | 666 docs → 658 classified, 5 requests, 118.9 s |
| 8 | Thanatos context + codebase-forensics use case | §4 and the forensics pipeline in the crash course |
| 9 | Bug-hypothesis hunting: "I suspect bugs X, Y, Z exist — how do we prove it from the code?" | the hypothesis→evidence loop |
| 10 | "Also look at the JevGrep tool that was just installed" | located: `jg` at `/home/leviathan/.npm-global/bin/jg`, skill `jevgrep-local-jev-wiring` |
| 11 | `/handover-package` | this document + the zip |

## 1.2 RULINGS THE OPERATOR ALREADY MADE — DO NOT REOPEN

**R-01 · THE JUDGE IS LOCAL AND FREE.**
> "dont hallucinate price costs this is local and indefinitely free"

Consequence: strip every price claim from anything you author. The `cost_usd` field is a savings
figure. `DEBUG_LOG.md` already recorded this before the correction: *"$0 per judgment
(self-hosted, no API billing), no rate limit ceiling, no per-invocation budget reset."*

**R-02 · JEVK5 HAS ALL NORMAL JEV FUNCTIONS.**
> "the local judge is noul-only - what does this mean? JevK5 has all normal jev functions"

Consequence: the noul-only guard was FALSE and is DELETED. `choice` and `score` work. **When a
tool refuses a capability, probe the ENDPOINT before believing the refusal.**

**R-03 · FIX CORE-INFRA BLOCKERS IMMEDIATELY, BEFORE ANY OTHER WORK.**
> "HUGE BUG LITERALLY BLOCKS CORE INFRA. FIX IMMEDIATELY."

Consequence: classification was impossible; everything else stopped until it ran.

**R-04 · RIP THE SLOP OUT.**
> "/skill:black-hat-audit-wave RIP THIS TOOL APART FIX ALL OF THE SLOP"

Consequence: the audit is not a report — it is a fix pass. Every finding gets a fix or a named
adjudication.

**R-05 · THE TOOL MUST DO REAL WORK, NOT DEMOS.**
> "Use this tool to do all of this. That will show me that this works correctly and this will also
> give us more real documentation use cases of how the tool actually works."

Consequence: the acceptance test for this tool is a REAL corpus producing a REAL answer, not a
green suite.

## 1.3 What this session produced (file table)

| Path | Lines | What |
|---|---|---|
| `Bibles/JM_BIBLE.md` | 769 | the engineering reference (11 sections) |
| `reports/JM_MASTER_BLUEPRINT.md` | 220 | the 5-layer intelligence architecture |
| `reports/JM_OPERATORS_MANUAL.md` | 328 | 20 use cases with commands |
| `reports/JM_CRASH_COURSE.md` | 516 | the stack as measured, the MCP tools, the question-shape law |
| `jm-gate-install.sh` | 87 | install the pre-commit gate in any repo |
| `jm-triage.sh` | 39 | narrow a directory before an agent reads it |
| `src/verbs/push-gate.ts` | edited | the dead zero-drift check repaired |
| `src/verbs/decision-tree.ts` | edited | the `criteria` drop + the guard, both fixed |
| `context_management/RUNNING_DEBUG_LOG.md` | +166 | EN-112, EN-113, EN-114 |
| `mcp.json` | edited | `:8008` → `:8090` |

---

# 2 · THE PRODUCT IN ONE PAGE

**One sentence:** JevManager is a decision engine that indexes any corpus into SQLite+FTS5, narrows
it with deterministic code for free, and asks a local 4B model typed questions about the survivors —
returning calibrated probabilities that a POLICY LADDER (code, not the model) turns into
act/escalate/noop.

```
┌───────────────────────────────────────────────────────────────────────────┐
│                        YOU / AN AGENT / A SCRIPT                          │
└──────┬──────────────────┬──────────────────┬──────────────────────────────┘
       ▼                  ▼                  ▼
 ┌───────────┐     ┌─────────────┐    ┌──────────────┐
 │  jm CLI   │     │  MCP server │    │  jm serve    │
 │  21 verbs │     │  4 tools    │    │  HTTP API    │
 └─────┬─────┘     └──────┬──────┘    └──────┬───────┘
       └──────────────────┼──────────────────┘
                          ▼
          ┌───────────────────────────────┐
          │  THE VERB LAYER               │
          │  keyless │ judged │ gates     │
          └────────┬───────────┬──────────┘
        ┌──────────▼──┐   ┌────▼────────────────────────────┐
        │  THE STORE  │   │  THE JUDGE CLIENT               │
        │  SQLite     │   │  cache · rate limiter · retry   │
        │  + FTS5     │   │  402 = TERMINAL, never retry    │
        │  ~/.jm/     │   └────────────┬────────────────────┘
        └─────────────┘                ▼
                    ┌──────────────────────────────────────┐
                    │  detectCanon(base) — THE FORK        │
                    │  is the base a llama.cpp server?     │
                    └───────┬──────────────────┬───────────┘
                            │ NO               │ YES
                            ▼                  ▼
              ┌─────────────────────┐  ┌──────────────────────────┐
              │ NATIVE PATH         │  │ CANON PATH (fallback)    │
              │ POST /v1/systemone  │  │ POST /completion PER ITEM│
              │ N questions / 1 req │  │ N items = N requests     │
              │ :8090               │  │ :8008                    │
              └──────────┬──────────┘  └───────────┬──────────────┘
                         └────────────┬─────────────┘
                                      ▼
                    ┌──────────────────────────────────────┐
                    │  systemone-server.py                 │
                    │  --llama http://127.0.0.1:8008       │
                    │  --port 8090                         │
                    └──────────────────┬───────────────────┘
                                       ▼
                    ┌──────────────────────────────────────┐
                    │  beellama llama-server               │
                    │  jevk5-4b-Q8_0.gguf · :8008          │
                    │  -ngl 999 · -c 16384 · kv f16        │
                    └──────────────────────────────────────┘
```

**MEASURED PERFORMANCE (this session, on this host):**

| Workload | Result |
|---|---|
| 666 files · 349,396 lines indexed | **609 ms** |
| 21-term vocabulary census | **1.1 s** |
| 100 candidates, one find chain | **21.9 s · 1 request** |
| 150 rows classified (10-class choice) | **1 request** |
| 658 records classified (5 chunks) | **118.9 s · 5 requests** |
| one judge question, warm | **~92–140 ms** |
| one judge question, COLD (first after idle) | **54,284 ms** |

**What it is NOT:**

- Not a grep replacement. Exact strings → `grep`. Call graphs → `ripwire`/`graph-query`.
- Not a code generator. Not an LSP.
- Not a chat model. It answers typed questions, not prose.
- Not hosted. Nothing leaves the host.

---

# 3 · HOST / FREEZE INTERNALS

## 3.1 The coordinates

```
judge adapter   /home/leviathan/jevk5-runtime/systemone-server.py
                --llama http://127.0.0.1:8008 --port 8090
                ThreadingHTTPServer  (threaded — parallel calls queue on the GPU)

backend         beellama llama-server, model jevk5-4b-Q8_0.gguf
                :8008 · -ngl 999 · -c 16384 · --flash-attn on
                --cache-type-k f16 --cache-type-v f16 · -np 1 (ONE GPU slot)

store           ~/.jm/index/*.sqlite · ~/.jm/targets.json · ~/.jm/ledger.jsonl
home            ~/.jm  (JM_HOME overrides)

external bridge socat 0.0.0.0:8091 -> 127.0.0.1:8090  (a second host reaching the judge)
```

## 3.2 The endpoints, and which one is real

| endpoint | what | `/v1/systemone` | `/completion` | batching |
|---|---|---|---|---|
| **`:8090`** | the systemone adapter | **HTTP 200** | — | **N questions / 1 request** |
| `:8008` | raw llama.cpp | **HTTP 404** | HTTP 200 | 1 question per call |

**THIS WAS DEFECT #1 OF THE SESSION.** `mcp.json` pointed at
`http://127.0.0.1:8008/v1/systemone` — a URL that returns 404. It "worked" because the client's
`detectCanon()` sees a llama.cpp server, rewrites the call to `:8008/completion`, and takes the
fallback path. The measured cost of that silent fallback, on the same corpus:

```
  :8008 ->  172 -> 100 -> 0 -> 0     0 kept, 0 patterns, 100 requests
  :8090 ->  192 -> 100 -> 34 -> 3   34 kept, 3 patterns, 1 request
```

**Fixed:** `mcp.json` now carries `http://127.0.0.1:8090/v1/systemone`.
**Required:** an OMP restart — the MCP env is read at process start, so a running process still
holds the old value.

## 3.3 The question types — what exists and what does not

`normalized()` in the adapter (line 44) accepts exactly three types:

```python
if question.get("type") not in ("noul", "choice", "score"):
    raise ValueError(f"unknown question type {question.get('type')!r}")
if "instructions" not in question:
    raise ValueError("question is missing instructions")
criteria = question.get("criteria")
if question["type"] == "choice":
    if isinstance(criteria, list):
        criteria = dict.fromkeys(criteria)
    if not isinstance(criteria, dict) or len(criteria) < 2:
        raise ValueError("choice criteria must name at least two options")
if question["type"] == "score" and (not isinstance(criteria, list) or len(criteria) < 2):
    raise ValueError("score criteria must list at least two levels")
```

**The field is `criteria`, NOT `options`.** Sending `options` produces
`{"error": "choice criteria must name at least two options"}` — and that 400 was, historically,
recorded as "the judge does not support choice". It supports choice; the field name was wrong.

**Measured, both forms:**

```
criteria as a LIST   -> {"choice":"FALSE_GREEN","probabilities":{5 labels}}           139 ms
criteria as an OBJECT-> {"choice":"STUB_OR_MOCK_AS_PROOF","probabilities":{5 labels}} 111 ms
```

**The `noul` shape:**
```json
{"state": {...}, "model": "jev-latest",
 "questions": {"my_q": {"type":"noul",
   "instructions": "<ONE specific claim>",
   "criteria": {"true": "...", "false": "..."}}}}
```
Returns `{"answers":{"my_q":{"type":"noul","noul":0.87}}}`.

## 3.4 Hooks that do NOT exist

- No streaming. The adapter answers whole.
- No `choice`-with-`options` alias. `options` is silently ignored → a 400 you will misread.
- No batch endpoint beyond `/v1/systemone`. `POST /anything-else` does not answer a decision; the
  handler checks `self.path.rstrip('/') != '/v1/systemone'`.
- No truncation. An oversized `state` is REFUSED, never silently cut.
- No offline mode beyond the local endpoints.

## 3.5 The environment variables

| var | meaning | default |
|---|---|---|
| `JM_JUDGE_URL` | the judge endpoint | **the HOSTED api** (→ HTTP 402, terminal!) |
| `JM_HOME` | the store root | `~/.jm` |
| `JM_JUDGE_MAX_BODY` | outbound byte cap | 262144 (256 KB) |
| `JM_JUDGE_RETRIES` | attempts | 3 |
| `JM_JUDGE_RETRY_BASE_MS` | backoff base | 250 |
| `JM_JUDGE_RATE` / `JM_JUDGE_BURST` | token bucket | 10 / 20 |
| `JM_CANON_SAMPLES` | canon-path samples | 1 |
| `JM_MOCK_DIR` | the mock transport | unset |

**DEFECT #2 OF THE SESSION:** `judgeUrl()` is `process.env.JM_JUDGE_URL ?? TYPESAFE_URL`, and
`TYPESAFE_URL` is the PUBLIC api. With the var unset, every judged verb returns
`HTTP 402 billing_error`, which is TERMINAL by design (not retried). Fixed for shells by appending
the export to `~/.bashrc`. **Any new surface — a hook, a service, a container — must set it.**

---

# 4 · SOURCE ANALOGS

## 4.1 `jevgrep` / `jg` — TAKE the semantic layer, REFUSE the temptation to widen scope

```
binary   /home/leviathan/.npm-global/bin/jg   (v0.7.0, npm @dzhng/jevgrep)
skill    ~/.omp/agent/managed-skills/jevgrep-local-jev-wiring/SKILL.md
wire     printf 'local' | jg auth --provider custom \
           --base-url http://127.0.0.1:8090/v1 --model jevk5-4b --stdin
verify   jg doctor   -> "Jev connection verified through Custom endpoint (127.0.0.1:8090)."
         jg files <root>       (inventory, NO provider calls)
         jg "<question>" <root> (a real search)
```

**THE PATH-APPEND RULE:** jevgrep appends `/systemone` to the base URL. Pass
`--base-url http://127.0.0.1:8090/v1` and it produces `POST /v1/systemone`. Do NOT pass
`/v1/systemone` in the base URL — the suffix would consume the appended path.

**THE MEASURED LIMITS — believe these:**
- ~0.5–0.9 s per **cache-miss** judge call. A repeated identical state returns in ~3 ms (cache) —
  a "fast" result on a repeated probe is NOT evidence the GPU is fast.
- **15,000 ms per-request timeout.** 32 unique calls with a realistic 5.7 KB state blow past it.
- **The lever is SCOPE, not the timeout.** `jg "<q>" <narrow/subdir>` + `--exclude 'src/generated/'`,
  and pass the SAME root to `jg files` and the search.
- **Partial failure is normal and reported:** a non-zero `"provider": N` means N timed-out calls.
  Treat it as a DEGRADED run, never a clean one.

**REFUSE:** treating `jg` as a grep replacement, or as a code generator. It judges RELEVANCE of
candidates. Exact strings → `grep`. Call graphs → `ripwire`.

## 4.2 The warheads / the doctrine — TAKE the laws, REFUSE the ceremony

The operator's warheads live in `~/.omp/agent/APPEND_SYSTEM.md` and are already in your system
prompt. The ones this session actually needed and used, with the incidents that proved them:

| law | the incident that proved it |
|---|---|
| **The artifact hash** | the dead zero-drift gate — a stated hash vs a computed hash that could never agree |
| **Loud fail or clear pass** | `JM_RECIPE_INVALID` naming the field AND the remedy; `JM_JUDGE_PAYLOAD_TOO_LARGE` naming the byte count and the cap |
| **Measure before diagnosing** | four "defects" that were MY probe errors (`2>&1` merging streams; `tail -n +2` stripping `[`) |
| **The instrument-validity law** | publishing "the judge is noul-only" from a client guard without probing the endpoint |
| **Density is the data** | this document |

**REFUSE:** citing a warhead instead of running the check it demands.

## 4.3 The ship docs (BUILD_REPORT / DEBUG_LOG / FAILURE_LOG / TESTING_LOG / THEATRICALITY_LOG)

**TAKE:** their FORMAT — every entry carries finding → root cause → fix → verification → lesson.
This session's EN-112/113/114 follow it.

**REFUSE:** their VOLUME as a proxy for health. Measured this session, 5-day window:

```
  fix 607 · PASS 587 · "no evidence" 532 · verified 517 · FAIL 502
  BLOCKED 440 · "root cause" 438 · drift 392 · bug 386 · defect 360
  claimed 286 · theatrical 264 · REFUTED 245 · slop 196 · mock 92
```

`"no evidence"` in 532 of 666 files. The docs are a record of the disease, not a cure.

---

# 5 · WHAT ALREADY EXISTS ON DISK

## 5.1 The JevManager tree

```
/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/JevManager/
  src/cli.ts                    21 verbs + flag coverage
  src/mcp.ts                    the 4 MCP tools
  src/judge/client.ts           ask() + askManyBatch(); USD_PER_INPUT_TOKEN at :13
  src/judge/transport.ts        judgeUrl() :23 · the canon fork :71 · retry :168
  src/judge/canon-gguf.ts       the llama.cpp adapter (per-item /completion)
  src/judge/policy.ts           fatalJudgeError :56 · answerFrom/noulFrom (D-042)
  src/judge/limiter.ts          the token bucket
  src/verbs/                     index query scan cluster extract filter find
                                 decision-tree route evaluate push-gate st-detect
                                 spec-audit report target watch serve calibrate
  src/store/db.ts               the SQLite layer
  jm-gate-install.sh            install the pre-commit gate
  jm-triage.sh                  narrow a dir before an agent reads it
```

## 5.2 The exact commits this session added

```
ff2f490  fix(decision-tree): THE CORE BLOCKER — criteria dropped, classification impossible
bf99c64  feat(tools): jm-triage.sh + the QUESTION-SHAPE LAW
66d0356  feat(hooks): jm-gate-install.sh — the pre-commit gate for any repo
c0c5f52  fix(push-gate): repair the ZERO-DRIFT item — a check that could never pass
8f87ed3  fix(config): mcp.json :8008 -> :8090 + the CLI default endpoint
e24b6c8  fix(docs): the structural audit — section 5, 7 unfilled anchors
6002568  docs: THE BIBLE + THE OPERATOR'S MANUAL + THE MASTER BLUEPRINT
```

Tree sha (src+tests): **`07c96789730595377891934f34152610`**

## 5.3 The test suite

```
bun test          253 tests · 44 files · concurrency = 1 (bunfig.toml)
ST-DETECT         44 files · 253 tests · legit=41 suspect=3 shitty=0
```

`concurrency = 1` is LOAD-BEARING: `process.env` is per-process, 22 test files mutate `JM_*`
vars, and the race produced a 10% flake that vanished in isolation (EN-111).

## 5.4 THE ONE THING THAT IS MISSING

**A byte-budgeted batch accumulator.** The claim loop's chunk is `CHUNK = 200` **ROWS**, not
bytes. The payload is `rows x (row + criteria)` and `criteria` repeats on EVERY question, so a
realistic payload overflows the 256 KB cap on exactly the workload the verb exists for (EN-114).
Worked around by chunking the invocation; the real fix is open. See §8.

---

# 6 · WHAT WAS REJECTED

| Plan | Why dead | How it appears in a transcript |
|---|---|---|
| **Point `JM_JUDGE_URL` at `:8008/v1/systemone`** | that path returns **HTTP 404**. It "works" only via `detectCanon()`'s rewrite to `/completion`, which costs N requests for N items and bypasses the purpose-built prompt | `"JM_JUDGE_URL": "http://127.0.0.1:8008/v1/systemone"` · `requests=100` for 100 items |
| **The noul-only guard** | measured against **api.typesafe.ai** — the HOSTED api — while the tool calls the LOCAL adapter, which accepts noul, choice AND score | `JM_RECIPE_INVALID: … the live judge accepts "noul" ONLY (measured: choice/mcq -> HTTP 400)` |
| **Express a choice as one noul per candidate** | the workaround the dead guard recommended. It multiplies the request count by the label count and loses the distribution | a recipe with 10 `noul` questions per class |
| **Send `options` to describe a choice** | the adapter reads **`criteria`**. `options` is ignored, and the resulting 400 was recorded as a missing capability | `{"error": "choice criteria must name at least two options"}` |
| **Raise the judge timeout to fix the cold start** | the cold start is the MODEL LOADING (54,284 ms measured). The fix is a WARM-UP CALL, not a larger timeout | `JM_JUDGE_RETRY_EXHAUSTED: 3 attempts all failed — last: The operation was aborted.` |
| **`--limit 10000` to count matches** | the CLI has a 10000 cap and the JSON is clean; the failure was a PARSING error in the probe | `PARSE_FAIL: Expecting value: line 1 column 1` on a probe that merged stdout+stderr |
| **`tail -n +2` to strip the cost line** | the cost line is on **stderr**; stdout is clean JSON already. Stripping line 1 removes the opening `[` | `json.decoder.JSONDecodeError: Extra data: line 9 column 4` |
| **Ten classification classes over a 600-byte excerpt** | too many labels for a 4B model. Mean top-class probability measured **0.29–0.46** — WEAK | a distribution with 0.398 / 0.396 on two labels |
| **Touching the ship docs to bump their mtime past the src edit** | the gate compares mtimes for a reason; a `touch` is a theatrical fix of a real signal | `docs updated?` passing with no content change |
| **A `write` to append to a log** | `write` OVERWRITES. It replaced 311 lines with 166 | file line count DROPPING after an "append" |
| **Chunking at 200 rows regardless of bytes** | the payload is `rows x (row + criteria)`; 200 rows with 10 rubrics = 278 KB over a 256 KB cap | `JM_JUDGE_PAYLOAD_TOO_LARGE: 302567 bytes exceeds the 262144-byte cap` |

## 6.1 The transcript signatures — how to spot a builder back on a dead path

| If you see this | They are on | The correction |
|---|---|---|
| `:8008/v1/systemone` in any config | the 404 endpoint | `:8090/v1/systemone` |
| `requests=100` for ~100 items | the canon fallback | check `JM_JUDGE_URL`; it must be the adapter |
| "the judge only supports noul" | the deleted guard's belief | probe the endpoint; it supports choice + score |
| `options:` in a question | the wrong field name | `criteria:` |
| `min-p 0.8` with no sweep behind it | a picked threshold | derive it: sweep, read max/spread |
| "0 kept, so nothing exists" | a compound question | rewrite as ONE sharp claim; re-run |
| `cost=$0.0…` quoted as a price | the savings figure misread | it is `tokens x the HOSTED rate`; nothing is billed |
| a `touch` in a fix commit | a theatrical doc fix | write the real entry |

---

# 7 · THE DRIVE / PATCH CONTRACT

## 7.1 The MCP surface — the 4 tools an agent calls

```
jev_index   {"in":"all"|"a,b", "index":"name"}          keyless, incremental by sha
jev_query   {"index":"n", "fts":"...", "where":"...", "tag":"k=v", "limit":N}
jev_decide  {"state":{...}, "questions":{...}, "schema":"label"}
jev_find    {"phrase":"...", "common":N, "structure":"json", "index":"n"}
```

**THE CRITERIA POLARITY LAW.** The `criteria` map sets the SIGN of the probability. If you ask
"is this theatrical?" but write `true = "the claim names real evidence"`, then a HIGH noul means
NOT theatrical. **Write the criteria so high = the thing you asked about.** Getting this backwards
builds a gate that does the opposite of what you intend, silently.

## 7.2 The recipe contract (the classification shape)

```json
{
  "recipe": "failure-classes",
  "version": 1,
  "questions": {
    "class": {
      "type": "choice",
      "instructions": "Classify this build-failure record into exactly ONE category.",
      "criteria": {
        "LABEL_A": "one-line rubric",
        "LABEL_B": "one-line rubric"
      }
    }
  },
  "policy": {"act": 0.5, "flag": 0.3, "fail": "closed"}
}
```

**Validated rules (now enforced at LOAD, by the fixed `validateQuestions`):**

| rule | the refusal |
|---|---|
| `questions` must be a NON-EMPTY object | `JM_RECIPE_INVALID: must be a NON-EMPTY object` |
| every question needs `instructions` | `JM_RECIPE_INVALID: is missing \`instructions\`` |
| type ∈ {noul, choice, score} | `JM_RECIPE_INVALID: has type "mcq" — accepts noul, choice or score` |
| `choice` → `criteria` names ≥ 2 options | `JM_RECIPE_INVALID: must name at least TWO options` |
| `score` → `criteria` is a LIST of ≥ 2 levels | `JM_RECIPE_INVALID: must be a LIST of at least two levels` |
| `policy.fail` ∈ {"open","closed"} exactly | `JM_RECIPE_INVALID: policy.fail must be exactly "open" or "closed"` |
| `policy.flag <= policy.act` | `JM_RECIPE_INVALID: policy.flag must not exceed policy.act` |

## 7.3 The decision-tree output contract

`--out <file>` writes a PRETTY-PRINTED JSON **ARRAY** (not JSONL), one record per row:

```json
{
  "i": 0,
  "route": "escalate",
  "reason": "agg=0.40 in [flag=0.3, act=0.5)",
  "answers": {
    "class": {
      "type": "choice",
      "confidence": 0.3981,
      "choice": "OTHER",
      "probabilities": {"LABEL_A": 0.0528, "…": 0.0}
    }
  },
  "model": "jev-latest"
}
```

**READ `answers.<qname>.choice` for the label, `.probabilities` for the distribution, and
`.route` for the policy verdict.** `route` is computed from the MAX probability against
`policy.act`/`policy.flag` — it is a POLICY verdict, not the classification.

## 7.4 The files to touch and not to touch

| touch | why |
|---|---|
| `src/verbs/*.ts` | the verb layer |
| `src/judge/*.ts` | the client, only with a measurement in hand |
| `context_management/*.md` | the canon — always after a src edit, or the gate refuses |
| `~/.omp/agent/mcp.json` | only for the endpoint |

| do NOT touch | why |
|---|---|
| `~/.jm/index/*.sqlite` by hand | the store is the runtime's; corrupt it and you lose the ledger |
| `~/jevk5-runtime/systemone-server.py` | the adapter is the contract. Patch it only with a probe proving the need |
| `~/.bashrc` beyond the JM export | the operator's shell |

## 7.5 The pre-commit gate contract

`jm-gate-install.sh` writes `.git/hooks/pre-commit`. The six items and their semantics:

```
spec component?     mechanical  the named spec component exists   (SKIP when no --spec given)
built correctly?    mechanical  tsconfig present + src file count
tested correctly?   JUDGED      st-detect over the test tree
not theatrical?     JUDGED      the theatricality score, >=0.5 = genuine
Docs updated?       mechanical  the ship docs are newer than the newest src file
Zero drift?         mechanical  the tree sha == the TREE SHA the canon docs state
```

**Two traps baked into the hook, both measured:**
1. `set -o pipefail` — without it, `jm push-gate | tee log` returns **0 even when the gate
   REFUSED**, because `$?` reflects the last command in the pipeline.
2. `JM_JUDGE_URL` is pinned INSIDE the hook — a hook's env is not the author's, and an unset
   endpoint sends every judged call to the public api (402, terminal).

**A hook that cannot run must SKIP with a named message, not refuse.** Refusing on a missing
binary converts one missing tool into a dead repository.

---

# 8 · IMPLEMENTATION ORDER

**Deletes first. The first agent reply is EVIDENCE, not a redesign.**

## 8.1 Delete / correct before building

| # | action | file | the check |
|---|---|---|---|
| D-1 | confirm the noul-only guard is GONE | `src/verbs/decision-tree.ts` `validateQuestions` | `grep -n 'noul" ONLY' src/verbs/decision-tree.ts` → 0 hits |
| D-2 | confirm `criteria` is forwarded | `src/verbs/decision-tree.ts` `qForRow` | `grep -n 'criteria: q.criteria' src/verbs/decision-tree.ts` → 1 hit |
| D-3 | confirm the endpoint | `~/.omp/agent/mcp.json` | `grep -n '8090' ~/.omp/agent/mcp.json` → 1 hit |
| D-4 | confirm the hook pins the endpoint | `.git/hooks/pre-commit` | `grep -n 'JM_JUDGE_URL' .git/hooks/pre-commit` |
| D-5 | confirm no price language in the docs | `reports/JM_CRASH_COURSE.md` | `grep -n 'it costs\|costs \*\*' reports/JM_CRASH_COURSE.md` → 0 hits |

## 8.2 Build, in order

**B-1 · THE BYTE-BUDGETED CHUNK (the open defect, EN-114).**
`decision-tree.ts`'s claim loop uses `CHUNK = 200` rows. Replace the row count with a
serialized-bytes accumulator:

```
target = 0.7 * JM_JUDGE_MAX_BODY          # headroom for the envelope
accumulate rows until JSON.stringify(items).length + criteriaBytes > target
send; repeat
```

The check: a run with 10 rubrics and 1 KB excerpts must succeed at 658 rows without external
chunking. Today it fails at 200.

**B-2 · CRITERIA HOISTING.**
`criteria` is repeated on EVERY question in a chunk. 200 questions x a 10-label map ≈ 180 KB of
identical bytes. If the adapter accepts a per-REQUEST criteria block, hoist it; if not, document
that it is per-question and let B-1's byte budget absorb it.

**B-3 · THE WARM-UP.**
The first call after idle costs 54,284 ms and can trip `JM_JUDGE_RETRY_EXHAUSTED`. Add a
`/health` probe with a bounded wait before the first batch of a run. The check: a cold judge
followed immediately by a 150-row batch must succeed.

**B-4 · THE CASCADE.**
Ten classes over a 600-byte excerpt gave mean p 0.29–0.46. Build a two-pass cascade:
PASS 1 = 3 classes (CODE_DEFECT / PROCESS_DEFECT / CLAIM_DEFECT); PASS 2 runs the fine
taxonomy ONLY on rows that landed in the code class. The check: mean top-class p must exceed
0.6 on the same corpus.

**B-5 · `jm claim-audit` (the verb the corpus asks for).**
`"no evidence"` appears in 532 of 666 files. The verb: regex-extract every sentence carrying a
completion verb; ask a `noul` per sentence — "does THIS SENTENCE carry a tool result?"; emit a
finding for every sentence above 0.7 with no adjacent command block. The check: run it on
`reports/JM_CRASH_COURSE.md` and on `BUILD_REPORT.md`; it must flag prose-only claims in both.

**B-6 · `jm forensics` (the codebase pass).**
The pattern is proven (this session's 666-doc run). Wrap it: index → extract → cluster → find →
decision-tree, with the byte-budgeted chunk from B-1. The check: run it on `src/` and produce a
module-class map in under 60 s.

---

# 9 · PROOF / ACCEPTANCE

**Tool-result evidence only. Prose is not proof.**

| # | scenario | the evidence | pass condition |
|---|---|---|---|
| P-1 | a cold judge, then a 150-row batch | the run's own output | `rows=150 decided=150 requests=1`, no RETRY_EXHAUSTED |
| P-2 | a 10-class choice recipe at 658 rows, NO external chunking | the run's own output | completes; no PAYLOAD_TOO_LARGE |
| P-3 | the cascade on the same 658 rows | the decisions file | mean top-class p > 0.6 |
| P-4 | a correct tree + a mutated sha | two gate runs | PASS then FAIL |
| P-5 | a malformed recipe (1 option; type mcq; no instructions) | three refusals | all named, zero judge calls |
| P-6 | `jm claim-audit` on a report with a prose-only claim | the findings list | the claim is flagged |
| P-7 | the full battery | `bun test` | 253 pass, 0 fail |
| P-8 | the gate on a clean tree | `jm push-gate` | `PUSH_GATE ALLOW exit=0`, 6 items |

## 9.1 The controls every measurement must carry

This session produced FOUR false findings by running probes without controls. Every numeric claim
you publish carries its conditions:

- **A performance number without its conditions is not a measurement.** "22 s" means nothing
  without "100 candidates, one request, warm judge".
- **A repeated identical state hitting ~3 ms is the CACHE, not the model.** The cache-miss cost is
  0.5–0.9 s. Verify with two DIFFERENT states.
- **A judge verdict needs a positive AND a negative control.** Measured: positive 0.915,
  negative 0.146 — a gap of 0.77. Without both, a constant 0.5 would look like a working judge.
- **A "0 results" answer needs the instrument proven.** `--limit 5` and `--limit 10000` must give
  the same answer.

---

# 10 · ZIP MAP + READ ORDER

**This is the ACTUAL packed tree — verified with `unzip -l` after packing. 25 files.**

```
JEVMANAGER_CONTEXT_HANDOVER.zip
├── JEVMANAGER_CONTEXT_HANDOVER.md     THIS FILE — at root for a lazy paste
├── README.md                          the binding spec — at root for a lazy paste
├── README.txt                         the conflict rule + the paste order
│
├── 00_HANDOVER/
│   ├── JEVMANAGER_CONTEXT_HANDOVER.md
│   ├── JM_CRASH_COURSE.md             the stack + the 4 MCP tools + the question-shape law
│   ├── jm-gate-install.sh             the pre-commit gate installer
│   └── jm-triage.sh                   narrow a dir before an agent reads it
│
├── 01_BINDING_SPEC/
│   └── README.md                      THE spec that wins on conflict (804 lines)
│
├── 02_SUPERSEDED_READ_ONLY/
│   ├── JM_OPERATORS_MANUAL.md         20 use cases — useful history
│   ├── Engineering_Report_v1.md       pre-fix engineering report
│   └── Engineering_Report_v2.md       pre-fix engineering report
│
├── 03_HOST_BIBLES/
│   ├── systemone-server.py            THE ADAPTER — read this before touching anything judge-facing
│   ├── JM_BIBLE.md                    the engineering reference (769 lines)
│   ├── JM_MASTER_BLUEPRINT.md         the intelligence architecture (220 lines)
│   └── SKILL.md                       the jevgrep wiring skill + its measured limits
│
└── 04_ADJACENT/
    ├── RUNNING_DEBUG_LOG.md           EN-112/113/114 — the three defects, verbatim
    ├── BUILD_REPORT.md                the ship record
    ├── TESTING_LOG.md                 the test record
    └── DEBUG_LOG.md                   the long-form bug chain
```

**ONE BINDING BY DESIGN.** The packer takes a SINGLE `--binding`: the document that WINS on
conflict. Here that is `README.md` — the operational contract. `JM_BIBLE.md` and
`JM_MASTER_BLUEPRINT.md` are DEPTH, not competing law: the bible explains mechanisms and the
blueprint explains the shape, and neither overrides the README on an implementation detail.
They live in `03_HOST_BIBLES/` ("later depth") deliberately. **Do not promote them to binding:
three binding specs is no binding spec.**

## READ ORDER — do not reorder

1. **`README.txt`** (at root) — the conflict rule and the paste order. Ten seconds.
2. **THIS FILE.** It carries the rulings (§1.2), the dead paths (§6), and the open work (§8).
3. **`01_BINDING_SPEC/README.md`** — the operational contract. It wins on implementation detail.
4. **`03_HOST_BIBLES/systemone-server.py`** — 120 lines, and it is the AUTHORITY on what the
   judge accepts. Read it before you write anything judge-facing.
5. **`00_HANDOVER/JM_CRASH_COURSE.md`** — when you need to USE the tool rather than change it.
6. **`03_HOST_BIBLES/JM_BIBLE.md`** — when you need a mechanism's detail.
7. Everything else is reference or negative example.
   `04_ADJACENT/RUNNING_DEBUG_LOG.md` carries the three defects verbatim — read EN-112/113/114
   before you "fix" anything that looks similar.

**WHAT TO SKIP:** `02_SUPERSEDED_READ_ONLY/`. It is APIs and history. Do not implement anything
described there.

---

# 11 · KICK PROMPT

**Paste this verbatim. It is written to produce evidence on the first reply, not a plan.**

```
You have just ingested the JevManager handover. Confirm three things from DISK, with the
command and its output — not from memory:

  1. The judge is reachable and is the ADAPTER, not the raw llama.cpp:
       curl -s http://127.0.0.1:8090/health
     Expect: {"ok": true, "model": "jevk5-4b-v0.2-Q8_0", "runtime": "gguf"}
     Then:   POST a `choice` question with THREE criteria to /v1/systemone and paste the
     distribution. If it 400s, the field name or the count is wrong — the type is supported.

  2. Classification runs end to end. Build a 10-row file and a 3-class `choice` recipe, then:
       jm decision-tree --rows /tmp/rows.json --recipe /tmp/recipe.json
     Expect a JM_DECISIONS line with requests=1 and a written --out file. Paste both.

  3. The gate can pass AND can fail:
       jm push-gate                       (expect ALLOW or a NAMED refusal)
       flip one digit of the TREE SHA in context_management/EVIDENCE_STATE.md
       jm push-gate                       (expect FAIL on Zero drift?)
       restore the digit

Then state, in one line each, WHICH of B-1..B-6 in the handover's §8 is already done and which
are not. Do not build anything yet. Do not propose an architecture. Evidence first.

After the evidence, take B-1 (the byte-budgeted chunk) unless I redirect you.
```

---

# 12 · GREP CONTRACTS

Run these against the tree. Each is a contract; a miss is a finding.

```bash
# THE DEAD GUARD MUST BE GONE
grep -n 'noul" ONLY' src/verbs/decision-tree.ts
#   expect: 0 hits

# CRITERIA MUST BE FORWARDED
grep -n 'q.criteria' src/verbs/decision-tree.ts
#   expect: >= 1 hit (the qForRow spread)

# THE ENDPOINT MUST BE THE ADAPTER
grep -n 'JM_JUDGE_URL' ~/.omp/agent/mcp.json .git/hooks/pre-commit
#   expect: both carry 8090

# THE HOOK MUST NOT BE MASKED BY A PIPE
grep -n 'pipefail' .git/hooks/pre-commit
#   expect: 1 hit

# THE OLD HASH-SCOPE DEFECT MUST BE GONE
grep -n "cut -c1-16" src/verbs/push-gate.ts
#   expect: 0 hits  (it must be -c1-32 over `src tests`)

# THE SALT: confirm the seal and the gate still agree on the expression
grep -n "find src tests -name" scripts-seal.sh src/verbs/push-gate.ts
#   expect: BOTH lines byte-identical. They are ONE contract.

# NO PRICE LANGUAGE IN THE DOCS
grep -rn 'it costs\|Cost: \*\*\$' reports/ Bibles/
#   expect: 0 hits

# THE BATCH UNIT IS STILL WRONG
grep -n 'CHUNK = 200' src/verbs/decision-tree.ts
#   expect: 1 hit — this is OPEN (B-1). Its presence is the defect.

# THE STORE IS THE RUNTIME'S
ls -la ~/.jm/index/*.sqlite
#   expect: one file per index; never edit by hand
```

---

# 13 · FALSE CEILINGS ALREADY POPPED

Six beliefs this session PROVED false. Do not re-adopt any of them.

| # | The belief | The measurement that killed it |
|---|---|---|
| 1 | "The judge is noul-only." | `normalized()` accepts `("noul","choice","score")`; a choice with 5 criteria returned a full distribution in 139 ms |
| 2 | "`jm query --fts` returns 0 — the FTS is broken." | it was MY probe: `2>&1` merged the stderr cost line into the stdout JSON. The streams are correctly separated |
| 3 | "0 kept means nothing in the corpus matches." | a COMPOUND question's max never crosses 0.5. The SAME corpus with a SHARP question gave max 0.949, spread 0.902 |
| 4 | "`decision-tree` cannot classify." | it could — it dropped `criteria` and the error blamed the judge. Fixed; 150 rows in ONE request |
| 5 | "A bigger timeout fixes the cold start." | the cold start is the MODEL loading: 54,284 ms measured on the first call after idle. Warm calls are ~92–140 ms. The fix is a probe, not a timeout |
| 6 | "The 256 KB cap is too small / raise it." | the cap is correct; the CHUNK's unit is wrong (200 ROWS, not bytes) and `criteria` repeats per question. Fix the unit, not the cap |

**THE PATTERN ACROSS ALL SIX: a capability, a threshold, or an endpoint was judged from ONE
observation taken in conditions nobody wrote down.** Before you declare anything impossible,
state the conditions and re-measure with a control.

---

# 14 · QUESTIONS YOU MAY ASK THE OPERATOR

Only items this session did NOT rule on. Everything else is in §1.2.

**Q-1 · The cascade's class set.** §8 B-4 proposes PASS 1 = CODE_DEFECT / PROCESS_DEFECT /
CLAIM_DEFECT. Is that the right three, or should the first pass separate by PROJECT rather than
by defect kind?

**Q-2 · Which repos get the gate first.** `jm-gate-install.sh` is proven. The candidates are
JARVIS, PLUTUS/LIVE/agent, Graph_Intelligence, JARVIS_DISCORD, JevManager. Which order, and does
any of them already have a pre-commit hook that must be preserved?

**Q-3 · Thanatos.** This session located `Thanatos-wt` in the failure corpus (n=30 records,
PROCESS=15, OTHER=6, FALSE_GREEN=3) but did NOT open the project. The forensics recipe in §8 B-6
is generic. Should the next pass run it on Thanatos specifically, and what is Thanatos's binding
spec path?

**Q-4 · `jm claim-audit`'s threshold.** §8 B-5 proposes flagging sentences above 0.7 with no
adjacent command block. Is 0.7 the right bar, or should it be derived from a labelled set first?

**Q-5 · The `:8091` socat bridge.** `socat TCP-LISTEN:8091 → 127.0.0.1:8090` exposes the judge to
other hosts. Is that intentional and should it be documented, firewalled, or removed?

---

# 15 · SELF-CHECK

**Seven bullets the ingesting agent must be able to say without looking anything up.**

1. **The judge is `:8090/v1/systemone`, it is LOCAL, and it is FREE.** `:8008/v1/systemone` is a
   404. `:8008/completion` is the raw backend the canon adapter falls back to. A `cost_usd` field
   is a SAVINGS figure computed from the hosted api's rate — nothing is billed.

2. **The judge answers `noul`, `choice`, and `score`.** The field is `criteria` (never `options`).
   A `choice` needs ≥ 2 criteria; a `score` needs a list of ≥ 2 levels. Every question needs
   `instructions`.

3. **A gate must be driven through BOTH outcomes before it is trusted.** Correct input → PASS;
   one mutated input → FAIL. A check that cannot pass is a refusal generator, and every failure it
   prints is noise — including the ones that look like findings.

4. **`0 kept` is an alarm, not an answer.** Check `calls=` and `requests=` first, then the QUESTION
   SHAPE: a compound "X or Y" caps the score below 0.5, so it can never clear any real threshold.

5. **`requests=1` for N items is the health check.** `requests=N` means the config is pointing at
   the llama.cpp backend and the canon fallback is silently carrying the run.

6. **The canon docs are stamped by `scripts-seal.sh` and checked by `push-gate.ts` — ONE contract.**
   They must carry the byte-identical hash expression. If you change one, change both in the same
   commit. The current tree sha is `07c96789730595377891934f34152610`.

7. **Run the tool before reasoning about it.** Reading found none of this session's four real
   defects; running found all four in minutes — the 404 endpoint, the missing CLI default, the
   dropped `criteria`, and the gate that could never pass.

---

# APPENDIX A · THE RUNTIME TEST, IN FULL

The acceptance evidence for the whole tool. 666 ship docs, 5 days, every project tree.

```
PHASE 1  DISCOVER     find over 2 roots x 7 doc classes x -mtime -5
                      -> 666 files, 349,396 lines, 31 MB

PHASE 2  INDEX        jm index /tmp/jm-failures --name failures
                      -> files=666 changed=666 ms=609   (0.6 s for 349k lines)

PHASE 3  CENSUS       jm query --fts x 21 terms
                      -> 1.1 s total
                         fix 607 . PASS 587 . "no evidence" 532 . verified 517
                         FAIL 502 . BLOCKED 440 . "root cause" 438 . drift 392
                         bug 386 . defect 360 . claimed 286 . theatrical 264
                         REFUTED 245 . theatricality 215 . slop 196 . stub 152
                         "cannot reproduce" 135 . unverified 110 . mock 92

PHASE 4  EXTRACT      jm extract --re x 8 patterns
                      -> F-NNN 389 . D-NNN 108 . R-NN 253 . C-NN 283 . M-X 372 . P-N 249

PHASE 5  CLASSIFY     jm decision-tree x 5 chunks x 150 rows, a 10-class choice
                      -> 658 records, requests=1 per chunk, 118.9 s

                      PROCESS              321   48.8%
                      OTHER                111   16.9%
                      FALSE_GREEN           69   10.5%
                      ARTIFACT_MISMATCH     67   10.2%
                      THEATRICAL_CLAIM      38    5.8%
                      TEST_THEATRE          21    3.2%
                      STUB_MOCK_PROOF       14    2.1%
                      UNWIRED               13    2.0%
                      SCOPE_SHRINK           4    0.6%

                      BY PROJECT: PLUTUS 258 . .omp-waves 128 . Graph_Intelligence 95
                      JWAM 38 . JARVIS-FACTORY 35 . Jev_Gates 30 . Thanatos-wt 30
                      ROBIN-TRADE 17 . JevManager 14 . gi-checkpoint-archive 13
```

**THE HEADLINE FINDING:** builds do not fail from bad code. The dominant class is PROCESS (48.8%)
— lost work, stale state, unlogged decisions, broken handoff — and it is in EVERY project's top
three. THEATRICAL_CLAIM (5.8%) and TEST_THEATRE (3.2%) are real but two orders of magnitude
smaller than the process debt.

**THE HONEST CAVEAT:** mean top-class probability is **0.29–0.46** — WEAK. Ten labels over a
600-byte excerpt is too many for a 4B model. The RANK ORDER is usable; the individual labels are
not evidence. §8 B-4 (the cascade) is the fix.

---

# APPENDIX B · THE QUESTION-SHAPE LAW

The single most valuable operational finding of the session. The same corpus, the same 30
candidates, four question shapes, threshold swept to 0.0 so the whole distribution is visible:

```
┌──────────────────────────────────────────────┬────────┬───────┬────────┐
│  QUESTION SHAPE                              │  max   │  min  │ spread │
├──────────────────────────────────────────────┼────────┼───────┼────────┤
│  COMPOUND  "...a shipping failure or a        │ 0.485  │ 0.128 │ 0.357  │
│             defect that reached production?"  │        │       │        │
│  SHARP     "a specific bug report with a      │ 0.949  │ 0.047 │ 0.902  │
│             root cause?"                      │        │       │        │
│  SHARP-2   "a test that passed without        │ 0.680  │ 0.195 │ 0.485  │
│             proving anything?"                │        │       │        │
│  BINARY    "contains a shell command?"        │ 0.918  │ 0.115 │ 0.803  │
└──────────────────────────────────────────────┴────────┴───────┴────────┘
```

**THE THREE RULES:**

1. **ASK ONE THING.** "X or Y" makes the judge score a blend; the blend lands mid-range; and a
   mid-range max can never clear a real threshold. This is the cause of every `0 kept`.
2. **SWEEP THE THRESHOLD AND READ `max` AND `spread` BEFORE TRUSTING A `--min-p`.** Spread > 0.25
   means the question discriminates. A max below 0.5 means the question is broken.
3. **A MAX BELOW 0.5 IS A QUESTION DEFECT, NOT A THRESHOLD PROBLEM.** Lowering `--min-p` to catch
   it admits the whole corpus and destroys the signal. REWRITE THE QUESTION.

**And: name the CLAIM, not the TOPIC.** "a bug report with a root cause" discriminates; "shipping
failure" does not, because every document about shipping is adjacent to it.

---

# APPENDIX C · THE THREE DEFECTS THIS SESSION FIXED

## C-1 · THE DEAD GATE (EN-112) — commit `c0c5f52`

The push gate's `Zero drift?` item compared two quantities that could never be equal, because the
WRITER and the CHECKER disagreed on both scope and width:

```
scripts-seal.sh:50   (writes)  find src tests -name '*.ts' -type f | … | cut -c1-32
push-gate.ts:185     (checked) find src -name '*.ts' | … | cut -c1-16
```

Measured on an unmodified tree:

```
  seal writes : b182214203c1357969f1fda4d0a46b04
  gate computed: bb9b6d2e5d6416f2
  doc stated  : b182214203c1357969f1fda4d0a46b04   <- THE DOC WAS RIGHT
```

`getStatedSha` also captured `([0-9a-f]{16})` — the FIRST HALF of the 32-char value — while
scanning the wrong doc. **The item could never pass.** Every FAIL it printed carried no
information. Fixed; verified PASS on a correct sha and FAIL on one flipped digit.

## C-2 · THE 404 ENDPOINT + THE MISSING CLI DEFAULT (commit `8f87ed3`)

`mcp.json` said `:8008/v1/systemone` → **HTTP 404**. It worked only via `detectCanon()`'s rewrite,
costing N requests for N items. And `judgeUrl()` defaults to the PUBLIC api → HTTP 402, terminal.
Fixed both. The same find: `0 kept / 100 requests` → `34 kept / 1 request`.

## C-3 · THE CORE BLOCKER (EN-113) — commit `ff2f490`

`decision-tree` copied only `{type, instructions}` into the batch question, so `criteria` never
reached the judge; and `validateQuestions` refused every non-`noul` type on the strength of a
measurement against the HOSTED api. **Classification was impossible.**

```
  BEFORE: JM_JUDGE_HTTP_400: choice criteria must name at least two options
  AFTER:  rows=150 decided=150 act=24 escalate=68 noop=58 requests=1
```

**THE INVARIANT, NOW IN THE CODE:** a field the recipe declares is either FORWARDED or REFUSED
AT LOAD. A transformer that silently narrows a validated shape turns a client defect into a
remote error with a misleading cause.

---

# APPENDIX D · THE INSTRUMENT FAILURES (recorded, not deleted)

An auditor who hides their misses has no credibility. This session produced four.

1. **"`jm query --fts` returns 0 for everything."** FALSE. My probe used `2>&1`, merging the
   stderr cost line into the stdout JSON. The streams are correctly separated; the probe was not.
2. **"The local judge is noul-only."** FALSE — **the operator corrected me.** That was the
   client-side guard's message, measured against a different endpoint.
3. **"0 kept means no matches."** FALSE. The compound question capped the score at 0.485.
4. **A `write` that overwrote `RUNNING_DEBUG_LOG.md`** — 166 lines replacing 311. Restored from
   git, re-appended via the append channel, and verified all 19 entries survived.

**THE LESSON:** three of the four were a MEASUREMENT taken in conditions nobody wrote down. State
the conditions, run the control, then believe the number.

---

# APPENDIX E · THE FILE INDEX

```
BINDING
  README.md                                    804 lines   the operational contract
  Bibles/JM_BIBLE.md                           769 lines   the engineering reference
  reports/JM_MASTER_BLUEPRINT.md               220 lines   the intelligence architecture

HANDOVER
  reports/JM_CRASH_COURSE.md                   516 lines   the stack + tools + the law
  reports/JM_OPERATORS_MANUAL.md               328 lines   20 use cases
  jm-gate-install.sh                            87 lines   install the gate anywhere
  jm-triage.sh                                  39 lines   narrow before reading

SOURCE (the verbs this session touched)
  src/verbs/decision-tree.ts                   the criteria forward + the guard
  src/verbs/push-gate.ts                       the zero-drift repair

CANON
  context_management/RUNNING_DEBUG_LOG.md      EN-112 · EN-113 · EN-114
  context_management/*.md (11 docs)            stamped to 07c96789…

THE HOST
  ~/jevk5-runtime/systemone-server.py          THE ADAPTER — the authority on the wire
  ~/.omp/agent/mcp.json                        the MCP registration (now :8090)

THE STORE
  ~/.jm/index/*.sqlite                         shadow 4.0 GB · failures 70 MB · …
  ~/.jm/ledger.jsonl                           every decision, appended

THE GATE
  .git/hooks/pre-commit                        installed by jm-gate-install.sh
```

---

# APPENDIX F · THE THANATOS + FORENSICS NOTE

This session did not open Thanatos. What it DID produce is the recipe, proven on a 349k-line
corpus, and Thanatos's own fingerprint from the failure census:

```
  Thanatos-wt   n=30 records   PROCESS=15 · OTHER=6 · FALSE_GREEN=3
```

**The forensics pipeline (§8 B-6), applied to any codebase:**

```
1 · jm index <tree> --name <n>             keyless, incremental by sha
     measured: 349,396 lines in 609 ms
2 · jm extract --re '<pattern>'            structure, do not read
     contracts · entry points · DDL · config keys · graph edges
3 · jm cluster --lex '<term>' --min N      group by signature
4 · jm find "<the shape>" --common 3       recurring structures, n + exemplars
5 · jm decision-tree --rows F --recipe F   classify every module / route
     NOW WORKING (was blocked until commit ff2f490)
```

**And the bug-hypothesis loop — "I suspect bugs X, Y, Z exist":**

```
STEP 1  STATE ONE SHARP CLAIM.   Not "there's a race condition somewhere" but
        "does this code write shared state without a lock?"  (THE QUESTION-SHAPE LAW)
STEP 2  jm find "<the claim>" --in <tree> --common 2      -> instances with n + exemplars
STEP 3  jg "<the claim>" <narrow/subdir>                  -> the SEMANTIC relevance layer
STEP 4  VERIFY EACH HIT BY READING THE CODE.  The judge says WHERE to look.
        Only the source says WHETHER. A judge hit is a HYPOTHESIS; a file:line with
        the mechanism is a FINDING
STEP 5  jm decision-tree --rows <candidates> --recipe <one bug>
        -> the policy ladder: act (>=0.8) / review (>=0.5) / dismiss
```

**The three bug classes, each with the probe this session actually used:**

| hypothesis | the probe | what it found |
|---|---|---|
| "a check can never fire" | `jm find "a check that can never fire"` | the dead zero-drift gate — `bb9b6d2e` vs `b1822142` |
| "built but not wired" | `jm query --fts "<symbol>"` + a call-site grep | 13 UNWIRED records in the 5-day corpus |
| "a failure returns a different artifact" | `jm find "a fallback that produces a different artifact"` | the loud-fail class |

**THE ONE RULE:** the judge narrows; the SOURCE proves. Never report a judge hit as a defect
without the file:line and the mechanism.

---

**END OF HANDOVER.** The next agent's first reply is evidence, not a plan. §11.
