# JM — Jev Manager — Blueprint v0.1

**Name:** JM (Jev Manager). Not "JDM" — JDM is the live Jarvis Discord Manager.
**CLI:** `jm`. **Verb rename:** `decide` → **`decision-tree`**.
**Date:** 2026-09-20. **Status:** DESIGN v0.1 (v0 absorbed the jev-notes channel).
**Predecessor:** v0 design in-session; this supersedes it.

Absorbed this pass: the `#jev-notes` Discord channel (23 messages, 2026-09-19 →
09-20), the five linked articles in full, jevcache.sh, and the attached Jev
primitives cheatsheet (vision + OCR transcription). Source ledger in §13.

---

## §0 THE CORE (unchanged, now with more laws)

```
 THREE ASKS, ONE MACHINE:
   index mountains by criteria · find fuzzy X in N targets → Z patterns
   X decisions in Y scenarios from Z criteria + A context

 THE ONE MECHANISM:
   DETERMINISTIC LAYER does everything countable:
     walk · hash · filter · FTS · regex · sql · cluster · count
   JEV does only closed semantic judgments on slices ≤ K bytes:
     is-this-X? · which-class? · best-label? · which-action?
   CODE narrows before Jev; code routes after Jev; the CACHE makes repeats free.

 POINT-AT-ANYTHING = index + query + find + decision-tree + route + evaluate
```

THE LAWS (v0.1):

```
 L1  DETERMINISTIC-FIRST   code narrows; Jev judges; code routes.
 L2  BOUNDED STATE         ≤2KB/item; ≤64 items/request; ≤255 options.
 L3  BUDGET COST           every run prints calls + $; --budget-calls hard stop.
 L4  FAIL POLARITY         decision-tree fail-closed; find fail-open-marked;
                           index keyless.
 L5  ONE STORE PER INDEX   ~/.jm/index/<name>.sqlite; repos never indexed in place.
 L6  READ-ONLY SOURCES     sqlite attach read-only; zero writes to sources.
 L7  LEDGER OR IT DID NOT HAPPEN   runs + decisions rows, or it is a draft.
 L8  NO SECRETS            keys env-only; never argv; never logged.
 L9  COMPOSE               code queries → opengrok/ripwire; decisions →
                           Semantica; daemon → manager-machine; never re-implement.
 L10 Y-STRUCTURE OR NOTHING  find/decision-tree emit the requested structure or exit != 0.
 L11 CACHE-FIRST           every decision keyed (provider, model, schema, state);
                           hit = 0ms/$0; caches are exportable/shareable;
                           recall-style miss is a distinct exit (CI branches on it).
 L12 SHADOW-FIRST          a new recipe runs shadow (log-only) until calibrated;
                           kill switch = recipe enabled:false / bypass env.
 L13 SHORTLIST + FRESH MENU  code filters obvious mismatches → Jev scores the
                           rest → Jev picks among the shortlist; options are rebuilt
                           from CURRENT state, never yesterday's menu.
 L14 ESCALATION-LADDER     p ≥ act → act; flag ≤ p < act → escalate (LLM/human);
                           p < flag → no-op. Thresholds come from YOUR data.
 L15 NO-META-LABELS        ids are never sent; full meaning lives in the question
                           text and criteria. A field named safe_to_publish
                           contributes zero instructions.
 L16 PARALLEL-QUESTIONS    independent questions batch on one state; questions
                           cannot read each other; fetch evidence BEFORE asking.
 L17 INDEPENDENT-COMPLETION a Jev "done" never proves a side effect; code checks
                           the artifact (ties to the claim firewall's binder).
```

---

## §1 WHY NOTHING EXISTING IS THIS (updated differential)

```
 +------------------+----------------------------+-----------------------+
 | Existing         | Does                       | Does NOT              |
 +------------------+----------------------------+-----------------------+
 | opengrok (UP)    | Lucene xref over code      | DBs, jsonl, artifacts |
 | ripwire          | structural code graph      | non-code corpora      |
 | mnemopi          | agent memory banks         | a queryable corpus    |
 | Semantica KG     | decision store + precedent | index/find; JUDGE     |
 | manager-machine  | supervisor + WAL + tick    | data verbs            |
 | jq/grep/du       | one-shot, no memory        | semantics, ledger     |
 +------------------+----------------------------+-----------------------+
 | NEW (jev-notes): |                            |                       |
 | jevcache.sh      | memoizes Jev decisions     | no index, no corpus,  |
 |                  | (0ms repeats, shareable)   | no find, no recipes   |
 | jev.s1.dev       | picks search sources +     | product demo; not     |
 | (Jev Search)     | ranks results, no answers  | your data; no local   |
 |                  |                            | index, no decisions   |
 | SimpleJev        | open-weights + vision;     | a model host, not a   |
 | (featherless)    | jev-ify OSS models         | data/decision manager |
 | openJev-2.0      | local 151M decision engine | unvetted; review owed |
 | laya (HF)        | alternative decision model | same                  |
 | jev-align        | GEPA alignment of Jev to   | a training system,    |
 |                  | your judgement             | not a runtime         |
 | stanley-code     | bounded Jev workflows for  | a coding harness, not |
 |                  | coding agents              | a data machine        |
 | LangChain jev    | classifier middleware +    | no corpus, no cache-  |
 | integration      | AutoMode pre-exec block    | first law, no index   |
 | json-render      | generative UI from JSON    | an emitter target,    |
 |                  |                            | not a judge           |
 +------------------+----------------------------+-----------------------+
```

JM owns: the corpus index, the fuzzy find with pattern synthesis, the decision
batch with recipes, routing, evaluation, the RSI learn loop — over YOUR disk,
with a cache-first judge. It composes the ecosystem above rather than
re-implementing any of it.

---

## §2 VERBS (v0.1)

```
 jm index   <target...>   [--include G --exclude G --kind fs|jsonl|sqlite]
                          [--tables t1,t2] [--max-file MB] [--follow]
 jm query   <index>       [--where SQLish] [--fts "phrase"] [--tag k=v]
                          [--limit N] [--json]
 jm find    "<X fuzzy>"   --in <target...> [--common Z] [--structure md|json]
                          [--pick-sources] [--rerank] [--min-p 0.8]
                          [--budget-calls N] [--json]
 jm decision-tree --rows F --criteria C --context A [--recipe R | --question SPEC]
                          [--min-conf 0.5] [--out F] [--json]
 jm route   --task "..."  [--among skills|tools|models|FILE] [--k 3] [--json]
 jm evaluate --runs F --rubric R [--replay] [--providers a,b] [--min-p 0.8]
 jm learn   --incident F --skill F --criteria C [--out F]      (RSI; v0.2)
 jm bench   --providers a,b,c --set F                          (v0.2)
 jm cache   stats | export | import F | purge
 jm report  [--run ID] [--cost] [--calibrate]
 jm status
```

Every verb takes `--json`. Every run prints its cost line. `decision-tree` is
the renamed `decide` — the name comes from the operator; use it everywhere.

---

## §3 RECIPES — the question packs (data, not code)

A recipe = a versioned JSON: primitives + criteria + thresholds + phase +
fail rule. Recipes are the "pre-engineered decision criteria" the operator
asked for. Status: `shadow` | `active`.

```
 +--------------------+---------+--------------------------------------+---------+
 | recipe             | phase   | the closed question                  | source  |
 +--------------------+---------+--------------------------------------+---------+
 | skill-select       | pre     | which skill/tool fits this task?     | TIP-001 |
 | model-route        | pre     | which model class handles this?      | LangCh. |
 | drift-fuse         | tick    | has the work drifted from contract?  | TIP-002 |
 | retry-gate         | on-fail | is the proposed retry legitimate?    | TIP-003 |
 | nudge              | idle    | would a gentle nudge advance useful  | willcb  |
 |                    |         | work within the existing request?    |         |
 | completion-check   | on-done | does evidence exist for the claim?   | 0xcodila|
 | screening-escalate | on-item | is p ≥ act? else escalate            | Nutlope |
 | field-match        | ingest  | which existing field = this label?   | Yongfook|
 | incident-gap       | on-fail | does this incident reveal a skill    | TIP-004 |
 |                    |         | gap against criteria?                |         |
 | lexicon-mine       | scan    | is this text an instance of family F?| Paragon |
 | card-eval          | run     | does output satisfy rubric level L?  | JESL    |
 | structure-check    | write   | does the doc carry required sections?| Aether  |
 +--------------------+---------+--------------------------------------+---------+
```

Copy-verbatim seeds (kept in the repo as JSON, this doc quotes them):

- **nudge** (willcb, verbatim hook text): "would a gentle nudge help the agent
  advance useful work within the user's existing request right now? consider
  unfinished work, including requests carried forward from earlier turns.
  answering the latest message doesn't necessarily finish the request. if the
  work is complete, the user is still choosing a direction, or progress requires
  permission, information, or an external event, don't nudge. if there was a
  previous nudge, consider what happened afterward. further useful progress can
  justify another nudge; repeating the same promise or an already-explained
  blocker does not."
- **drift-fuse** (TIP-002, verbatim): "On each state transition, send the task
  contract + the delta + a checklist to classify drift. Wire the signal into a
  fuse to trip after a crossed threshold, and then it can redirect, escalate,
  or pause the agent."
- **retry-gate** (TIP-003, verbatim): send "task contract / failure report /
  failed strategy / proposed retry strategy / criteria for what counts as a
  legitimate retry. If the retry doesn't meet the criteria, force a replan,
  escalate, or stop."
- **incident-gap** (TIP-004, verbatim): "adding an incident field to your
  agent's completion report. Send the incident report and active skill to JEV
  against explicit gap criteria. If it qualifies, revise or create a skill and
  then replay incidents as evals before promotion."

---

## §4 DATA MODEL (additions in bold)

```
 sources(id, kind, root, opts, created_at)
 files(id, source_id, path, size, mtime, sha256, kind, state)
 docs(id, file_id, path, kind, text)          -- FTS5: docs_fts(text)
 rows(id, db_id, tbl, pk, row_json)
 extracts(id, doc_id, kind, value, start, end)
 tags(doc_id, row_id, name, value, prob, judged_at)
 runs(id, verb, args_json, started, ended, status, stats_json, cost_usd)
 decisions(id, scenario_ref, question, answer_json, conf, policy, context_ref, at)
 **recipes(id, version, spec_json, status shadow|active, calibrated_at)**
 **cache(fingerprint PK, provider, model, schema_hash, state_hash,
         answer_json, created_at, hits)**
 **evals(id, run_ref, rubric_ref, provider, answers_json, metrics_json, at)**
```

Cache key = `sha256(provider ⊕ model ⊕ schema ⊕ canonical(redact(state)))`.
Redaction before hashing (emails/phones/ids masked by default) — jevcache's
law; only the fingerprint and the answer leave the machine.

---

## §5 PROVIDERS + CACHE + BENCH

```
 providers: typesafe (default) · jevcache (cache layer, wraps any) ·
            openjev-verdict-2.0 (LOCAL, review owed) · laya (LOCAL, review owed) ·
            simplejev/open-weights (VISION + local) · openrouter typesafe/jev-1.13
```

Facts that shape defaults (all sourced §13):

- Jev 1.13: **$0.042 / M input tokens, no output-token charge**. 10,000
  decisions ≈ **$0.42** (1k tokens/decision).
- jevcache: **60–80% of an agent's decisions repeat**; a local hit is **0ms/$0**;
  deterministic replay; shareable caches; `recall` exits 3 on a miss.
- Jev-as-judge (LangChain's test): variance **92–913× lower** than LLM judges;
  **0.44s** and **$0.00035/call** ($0.34 vs Claude $28.17); matched the human
  oracle on all 500 repeated binary decisions.
- openJev-2.0 reports **77.10% acc / 0.0636 Brier / 0.0144 ECE** on
  LocalLLaMA/typed-decisions, claiming to beat Jev & Laya — **unvetted; the
  operator said "review"; bench before adoption**.
- Firstmate (agent dispatch): 25 evaluated tasks matched Fable with **71% lower
  dispatch cost, 90% less wall time** — routing works when the menu is fresh.
- Browser Use: **7 seconds, $0.0039** for flight search (90,558 Jev input
  tokens); their key trick — rebuild the action menu after every state change.
- Nutlope fraud screening: below **95% confidence → escalate to Kimi K3**;
  96/100 for ~$0.07. Pattern = screening + escalation, threshold on your data.

`jm bench` reports per provider: oracle agreement, **Brier**, **ECE**,
per-case variance, p50 latency, $/call — against your labeled set.

---

## §6 USE-CASE TRACES (v0.1)

### A — index the shadow mountains

```
 jm index ~/.local/share/opencode/storage --include '*.json,*.jsonl,*.md' \
          --kind fs --follow
 jm index ~/.local/share/opencode/opencode.db --kind sqlite \
          --tables 'session,part,message'
 jm query shadow --where "kind='session_diff' AND size>2000" --json
```

### B — fuzzy find → patterns with Y structure (now with Jev Search's two moves)

```
 jm find "split-brain session bug" --in opencode.db --in index:shadow \
        --common 12 --structure md --pick-sources --rerank
```

```
 1 plan+pick   Jev (choice): which sources are worth searching? (jev.s1.dev's
               "picks where to search") — code validates the picks exist
 2 seeds       code: tokens → FTS5 queries + regex skeletons
 3 fetch       BM25 top-K per seed per target; dedupe
 4 narrow      code: caps, boilerplate drop, near-dup collapse  (≥100× cut)
 5 judge       Jev noul "instance of <X>?" per candidate (batched ≤64)
 6 rerank      Jev score per survivor — "ranks what comes back" (jev.s1.dev)
 7 cluster     code: (source, kind, token signature, path)
 8 label       Jev choice among top-3 deterministic labels per cluster
 9 emit        Y-structure: {pattern, n, targets[], exemplars w/ ids, conf}
10 ledger      fetched/judged/kept/clusters/cost + cache stats
```

### C — decision-tree, batch scenario decisions

```
 jm decision-tree --rows scenarios.jsonl --criteria policy.md \
    --context "house style + risk posture" --recipe screening-escalate
```

Escalation ladder per row: `p ≥ act` → decision; `flag ≤ p < act` → escalate
row to LLM/human (never pretend); `< flag` → no-op. Key missing → exit 2,
nothing written. All decisions cached.

### D — route a task (skills / tools / models)

```
 jm route --task "index the shadow data" --among skills --k 3 --json
```

Declared options = names + short descriptions of available skills (or tool
catalog, or model classes). Output: `{choice, probs, conf}`; code injects the
selected skill into the prompt before the model sees it (TIP-001). Cached —
the same task routes free the second time.

### E — evaluate (Jev-as-judge over runs / incidents / replays)

```
 jm evaluate --runs wave-returns/ --rubric rubric.md --min-p 0.8
```

One state per run (the trace/diff), rubric as criteria, typed answers, ledger
row per evaluation. This is also the **replay gate** TIP-004 requires before
promoting a revised skill.

### F — learn (RSI; v0.2)

```
 jm learn --incident incidents/42.md --skill skills/x/SKILL.md \
          --criteria gap-criteria.md
```

`incident-gap` recipe → if it qualifies → draft skill revision → replay
incidents as evals (`jm evaluate --replay`) → promotion gate. This is the
"Use for Jarvis Agent RSI" item from the channel, mechanized.

---

## §7 QUESTION DISCIPLINE

Primitive selection (the channel's cheatsheet, transcribed):

```
 +-------------+----------------+---------------------+---------------------+
 | primitive   | ask when       | example             | returns             |
 +-------------+----------------+---------------------+---------------------+
 | Noul        | yes/no         | "Is this urgent?"   | one probability     |
 | Choice      | which one?     | "Which team should  | probabilities over  |
 |             |                |  handle this?"      | options             |
 | Score       | how much/level | "How risky is this?"| score + level dist  |
 +-------------+----------------+---------------------+---------------------+
```

Rules folded into the catalog (all sourced):

- One idea per question; split double-barrelled rules.
- Existence phrasing beats holistic phrasing ("is there at least one line
  that…" not "are the comments appropriate?").
- Volume rules need two questions: an existence case + a score.
- Criteria carry a worked example when one exists.
- `insufficient_information` is a first-class option where applicable.
- Thresholds start from cookbooks (0.8/0.5) and move only on your data;
  confidence ≠ accuracy; p≈0.5 = yes≈no, not "medium".

---

## §8 INTEGRATION WITH THE EXISTING STACK

```
 warhead/claim stack:  completion-check recipe = the claim firewall's question
                       pack; INDEPENDENT-COMPLETION = its binder law;
                       evaluate --replay = the eval gate for skill promotion.
 Abide (diffs):        doc-density/structure recipes can be consumed by the
                       Abide adapter as extra rubric rules (one judge, one cache).
 Paragon/LASME:        lexicon-mine recipe = per-family membership judgment for
                       expansion; drift-fuse = the drift classifier.
 JESL:                 card-eval recipe = typed rubric evaluation over card runs.
 Aether:               structure-check recipe = the CHECK gate's semantic half.
 Semantica:            decisions/evals mirror into record_decision +
                       find_precedents (adapter OFF until operator rules).
 manager-machine:      jm watch (v0.1.1) = its Desireds: indexer, judge pool,
                       cache-gc; reconcile tick; kill path recorded.
```

---

## §9 v0.1 SCOPE + ACCEPTANCE

Build (v0.1, CLI only):

```
 ~/JARVIS_WORKSPACE/tools/jm/
   src/cli.ts  verbs/{index,query,find,decision-tree,route,evaluate,cache,report,status}
   src/adapters/{fs,jsonl,sqlite}.ts
   src/store/{schema,db,fts}.ts            bun:sqlite + FTS5
   src/judge/{client,providers,cache,chunk,policy}.ts
   src/recipes/*.json                      6 shipped: skill-select, model-route,
                                           drift-fuse, retry-gate, nudge,
                                           completion-check
   src/emit/{md,json}.ts  src/ledger.ts  src/config.ts
   test/{adapters,store,find,decision-tree,route,cache,adversarial}.test.ts
```

Acceptance (measured, pasted):

```
 1 index the 11,831-file shadow dir; re-run incremental (<10% wall)
 2 find "<phrase known to exist>" returns the known rows with ids
 3 decision-tree 100 fixtures: decisions+conf; key off → exit 2
 4 route picks the labeled skill on ≥16/20 tasks; second identical call = 0 Jev
   calls (cache proof)
 5 cache stats: hits/misses/$, replay offline reproduces decisions
 6 shadow mode: recipe runs log-only; kill switch flips it off
 7 cost line on every run; --budget-calls provably stops a runaway
 8 adversarial: empty target, corrupt jsonl, locked sqlite, 0-byte include
```

Deferred to v0.2+: learn/RSI verb, bench across providers (after the
local-engine review), vision states (simplejev), json-render emit,
manager-machine daemon.

---

## §10 OPS — SHADOW-FIRST + KILL SWITCH

Per the channel's own 7-minute setup doctrine: run shadow first, read logs,
flip active when trusted; carry a kill switch (`recipe.enabled=false` or
`JM_BYPASS=1`). Shadow runs write `decisions` rows with `mode=shadow` and
never steer. Promotion per recipe: ≥50 shadow rows, reviewed, then active.

---

## §11 FORKS

```
 +--+----------------------+-----------------------------------+-----------+
 |F1| cache layer          | A typesafe direct (simplest)      | NO        |
 |  |                      | B typesafe + jevcache wrap [def]  |           |
 +--+----------------------+-----------------------------------+-----------+
 |F2| pilot target         | A opencode storage+db (44G) [def] | YES       |
 |  |                      | B OPENCODE_WORKSPACE (219G)       |           |
 +--+----------------------+-----------------------------------+-----------+
 |F3| v0.1 recipe set      | A the 6 listed [def]              | NO        |
 |  |                      | B add lexicon-mine + card-eval    |           |
 +--+----------------------+-----------------------------------+-----------+
 |F4| local engines        | A review later [def]              | NO        |
 |  | (openjev/laya)       | B bench them in v0.2              |           |
 +--+----------------------+-----------------------------------+-----------+
```

F2 still needs you. F1 default B: repeats are 60–80% of decisions, so the
cache is the cheapest single win; jevcache is local-binary, key stays yours.

---

## §12 RESIDUAL

```
 - jev-notes image: transcribed (vision + OCR; no residual)
 - tweets whose body is behind X's article view: extracted via fxtwitter (done)
 - openJev/laya: claims unverified by us — review owed before any use
 - jev.s1.dev: studied as a pattern; no API contract published — PROPOSED only
 - json-render: emit target PREVIEWED, not designed
 - Semantica mirror: adapter unread (device new); OFF until operator rules
 - "common patterns" clustering quality: unproven until first real run
 - v0.1 implementation: NOT BUILT (design only, by the approval gate)
```

---

## §13 THE ABSORBED LEDGER (every jev-notes item → what it changed)

```
 +----+---------------------------+--------------------------------------+
 | #  | source item               | integrated as                        |
 +----+---------------------------+--------------------------------------+
 | 01 | parcadei TIP-001 skill    | recipe skill-select; verb route;     |
 |    | routing                   | "inject before the model sees it"    |
 | 02 | jev.s1.dev (Jev Search)   | find --pick-sources + --rerank       |
 | 03 | parcadei TIP-002 drift    | recipe drift-fuse (fuse threshold)   |
 | 04 | parcadei TIP-003 retry    | recipe retry-gate                    |
 | 05 | parcadei TIP-004 incident | verb learn + evaluate --replay (RSI) |
 | 06 | SimpleJev / open weights  | provider simplejev; VISION states    |
 |    | + vision (1,697 events)   | (v0.2); "jev-ify any OSS model"      |
 | 07 | Vercel json-render        | emit target (v0.2 PREVIEW)           |
 | 08 | oviniciuslana skill/tool  | same as 01: JM route covers skills + |
 |    | loading w/o context       | tools, not just skills               |
 | 09 | LangChain harness article | multiple questions parallel (L16);   |
 |    | AutoModeMiddleware        | pre-execution risk recipe (v0.2);    |
 |    | model routing             | recipe model-route                   |
 | 10 | LangChain jev-as-judge    | verb evaluate; bench metrics; the    |
 |    | (variance 92-913x)        | 0.44s/$0.00035 numbers               |
 | 11 | openJev-verdict-2.0       | provider option (review owed)        |
 | 12 | jev-align (GEPA)          | align export path (v0.2)             |
 | 13 | stanley-code              | bounded-workflow reference           |
 | 14 | Jev-X-Sentiment           | example recipe (stream → sentiment)  |
 | 15 | GrokBot 7-min setup       | SHADOW-FIRST law + kill switch;      |
 |    | (shadow → active)         | route→execute loop = JM's slot       |
 | 16 | laya (HF)                 | provider option                      |
 | 17 | jevcache.sh               | L11 CACHE-FIRST; cache verb + table; |
 |    |                           | 60-80% repeat fact; shareable caches |
 | 18 | phuakuanyu "how to use"   | workflow: prepare→ask→validate→act→  |
 |    |                           | check; screening-escalate; shortlist;|
 |    |                           | fresh menu; independent completion   |
 | 19 | 0xcodila 10-step roadmap  | queue-per-destination; limits; 401/  |
 |    |                           | 422/429/529 error map; $ math        |
 | 20 | willcb nudge hook         | recipe nudge (verbatim text)         |
 | 21 | Jev primitives cheatsheet | §7 primitive table (vision + OCR)    |
 | 22 | Browser Use facts         | L13 fresh menu; $0.0039/7s evidence  |
 | 23 | Nutlope screening         | recipe screening-escalate; "don't    |
 |    |                           | copy thresholds"                     |
 +----+---------------------------+--------------------------------------+
```

---

END v0.1. Build gate: operator approval + F2 ruling. Nothing built yet.
