# JM v1 — The Targetable Decision Engine

**Status:** DESIGN v1 (supersedes JM blueprint v0.1's scope — v0.1 is Wave 0 of this).
**Name:** JM (Jev Manager). **CLI:** `jm`. **Companion:** `JEV_ENGINEERING_BIBLE.md` (v1.0.0, sha `dab371a0…`).
**One sentence:** JM is a decision compute engine — point it at a named **target**, run named **operations** with versioned **recipes**, get structured **results**; everything cached, ledgered, resumable, parallel.

---

## §0 THE IDEA

Not a script pile. A machine with four nouns:

```
 TARGET      what you point at      a named pointer: path · db · sessions · channel · repo
 OPERATION   what you run           index · scan · extract · filter · cluster · find ·
                                    decision-tree · route · evaluate · learn · watch · ask · report
 RECIPE      how it judges          versioned question packs + policy (the bible §7.10)
 RESULT      what lands             files · rows · decisions · patterns — every one ledgered
```

The mental model: **compute = targets × operations × recipes**, scheduled over
pools (deterministic workers · judge workers · eval workers), persisted in one
store per job, resumable from any crash, cached at the decision layer.

Why "targetable supercomputer", stated honestly: the box is an i9 + 4080 —
useful but not exotic. The throughput comes from three multipliers working
together: deterministic engines do everything countable **locally at full
speed** (no key, no network); Jev does the **judgment at ~300ms, batched, for
fractions of a cent**; and the **cache makes every repeat free** (60–80% of
decisions recur). The "supercomputer" is the schedule, not the silicon.

---

## §1 TARGETS — point at anything

```
 $ jm target add shadow  fs     ~/.local/share/opencode/storage --include '*.json,*.jsonl,*.md'
 $ jm target add ocdb    sqlite ~/.local/share/opencode/opencode.db --tables session,part,message
 $ jm target add ocws    fs     /home/leviathan/OPENCODE_WORKSPACE --exclude 'node_modules,.git'
 $ jm target add jarvis  fs     /home/leviathan/JARVIS_WORKSPACE
 $ jm target add omp     fs     ~/.omp/agent/sessions
 $ jm target add repos   git    --roots ~/JARVIS_WORKSPACE --depth 3
 $ jm target add dc      discord --guild api
 $ jm target add og      opengrok            (wraps the standing Lucene index on :18080)
 $ jm target ls
```

Target kinds (v1): `fs` · `sqlite` · `jsonl` · `git` · `opengrok` · `discord` ·
`omp-sessions` · `url`. Each adapter answers two questions: how to enumerate
items, and how to produce each item's indexable text + metadata.

**Measured today (real, this host):** shadow = 11,831 session_diff files ·
opencode data dir = 44G · OPENCODE_WORKSPACE = 219G · JARVIS = 32G · omp
sessions = 133 dirs · opengrok UP · 4 opencode DBs.

Rules: a target is a **pointer, never a copy**; indexes live in `~/.jm/`, never
inside the target; read-only attached (L6 of the bible); every operation names
its targets explicitly (`--in shadow,ocdb` or `--in all`).

---

## §2 OPERATIONS — the verb surface v1

```
 jm index   <target...>                    deterministic index build/refresh (keyless)
 jm scan    <target...> --seeds F          regex/FTS candidate retrieval
 jm extract <target...> --kind ner|relations|fields|patterns   structured extraction
 jm filter  <target...> --where P [--recipe R]   deterministic predicates + Jev judgments
 jm cluster <target...> --by signature            deterministic grouping
 jm find    "<X>" --in <target...> --common Z --structure Y     the fuzzy find
 jm decision-tree --rows F --criteria C --context A --recipe R  batch decisions
 jm route   --task "..." --among skills|tools|models|FILE      menu selection
 jm evaluate --runs F --rubric R [--replay]      judging + bench
 jm learn   --incident F --skill F --criteria C  RSI
 jm watch   <target...> --recipe R                daemon: reconcile tick
 jm ask     --state F --question F                the one-off escape hatch
 jm report  [--job J] [--cost] [--calibrate]      ledger queries
 jm serve   [--port 7777]                         HTTP surface
 jm mcp                                           MCP server surface
```

Composition: every verb takes `--json`, emits `--out F`, and accepts stdin —
so `jm scan @shadow --seeds x | jm filter --recipe rel | jm cluster | jm report`
chains like unix. The decision verbs are the only ones that need a key.

---

## §3 THE COMPUTE MODEL

```
 job = { op, targets[], recipe?, policy, budget }
                       │
   target adapters ──▶ QUEUE (sqlite WAL, crash-safe rows, resume-by-ack)
                       │
        ┌──────────────┼──────────────────────────────┐
        ▼              ▼                              ▼
  DETERMINISTIC     JUDGE POOL                    EVAL POOL
  POOL (CPU×N)      (Jev, ≤64/request,            (bench/replay,
  walk·hash·fts·    rate-limit aware,             rubric scoring,
  regex·sql·cluster cache-first)                  variance runs)
        │              │                              │
        └──────────────┴──────────► results/ + ledger.jsonl + cache
```

Per-job store: `~/.jm/jobs/<job-id>/` = `index.sqlite` (FTS5) · `queue.sqlite`
(manager-machine pattern: crash-first rows, reconcile tick, resume plan) ·
`ledger.jsonl` · `results/`.

Parallelism laws: per-target fan-out × per-item batching; the judge pool sizes
to the provider's rate limits, not the CPU; backpressure = queue depth; every
job has `--budget-calls` and `--budget-usd` hard caps; a killed worker's batch
returns to the queue unacked (idempotent by fingerprint).

Cost math on the real corpus: 11,831 files → index locally ($0, no key) →
scan to ~1–2k candidates → judge at 64/request ≈ 30 requests ≈ **$0.02–$0.05,
cached forever**. That is the shape of every v1 run: heavy local work, light
judgment, free repeats.

---

## §4 THE SURFACES — targetable from everywhere

| Surface | What | Who uses it |
|---------|------|-------------|
| CLI `jm` | the primary; composition via pipes | the operator, scripts |
| `jm serve` (HTTP :7777) | `POST /decide {schema, state}` → `{answers, cached}`; `POST /find`; `GET /jobs` | any process on the host; the daemon-less "point at it" path |
| `jm mcp` | tools: `jm_find`, `jm_decide`, `jm_extract`, `jm_index_status` | agents mid-turn

> **SUPERSEDED (2026-09-21, build-time):** the shipped tool set is `jm_query`, `jm_find`,
> `jm_decide`, `jm_index` — the implementation chose the CLI names verb-for-verb so an agent's
> answer and a curl answer cannot drift. `jm_extract` and `jm_index_status` were never built.
> This blueprint is a DESIGN RECORD and is annotated rather than rewritten (README §17). ("Jev manager, filter these 500 rows") |
| `jm watch` | daemon (manager-machine frame): Desireds = index-watch, judge-drain, cache-gc, calibration-tick | standing services, reconcile loop |

The MCP surface is what makes it *targetable by agents* — an OMP session says
"jm, find me X across @shadow and @ocdb" and gets structured results back as a
tool call. The HTTP surface is what makes it targetable by *anything else*.

---

## §5 THE USE-CASE CATALOG (the point of the whole machine)

Six families. Each: name — chain — what lands. These are the "most relevant"
for this workspace, ordered by value-per-hour-of-build.

### A. DECISION MAKING AT SCALE

| # | Use case | Chain | What lands |
|---|----------|-------|------------|
| A1 | **Policy application over scenario batches** — "make N decisions in M scenarios from criteria Z + context A" | `decision-tree` | decisions.json + ledger rows + escalation file |
| A2 | **Screening + escalation** — triage 500 items; auto the confident, queue the uncertain | `filter --recipe screening-escalate` | act/escalate/no-op band counts + queue |
| A3 | **Routing** — which skill/tool/model for this task | `route --among skills` | choice + confidence, injected pre-model |
| A4 | **Agent-loop watchdogs** — drift, retry legitimacy, nudge, completion | `watch --recipe drift-fuse` etc. | steers + fuse trips + rejections |
| A5 | **Historical completion audit** — backfill the claim firewall over old sessions | `scan @omp --seeds done-claim | decision-tree --recipe completion-check` | a table of unverifiable completions, by session |

### B. DATA FILTERING & TRIAGE

| # | Use case | Chain | What lands |
|---|----------|-------|------------|
| B1 | **Fuzzy corpus triage** — "find the theatrical docs / pre-migration files / dead experiments" | `scan | filter --recipe is-x` | tagged rows + exemplars |
| B2 | **Near-dup collapse with verdicts** — clusters of near-identical artifacts | `cluster | filter --recipe dup-pair` | dedupe list + rationale |
| B3 | **Relevance filtering** — cut a research bundle to what matters | `scan | filter --recipe relevance` | filtered bundle + per-item scores |
| B4 | **Quarantine detection** — junk dirs, ghost files, empty writes, dead symlinks | `index | filter --where shape` | quarantine manifest |
| B5 | **Channel/log triage** — Discord + agent logs → actionable items | `scan @dc | filter | cluster` | action queue by channel |

### C. SEMANTIC EXTRACTION & STRUCTURING

| # | Use case | Chain | What lands |
|---|----------|-------|------------|
| C1 | **NER + relations over documents** | `extract --kind ner,relations` (semantica extractors) | KG-ready rows (entities, triples) |
| C2 | **Field matching across schemas** | `extract --kind fields` | field map (photo→avatar style) |
| C3 | **Tagging at volume** — 20k records into classes | `index | decision-tree` | tagged records table |
| C4 | **Pattern synthesis** — "Z common patterns across everything, Y structure" | `find --common Z --structure md` | patterns.md with n/counts/exemplars |
| C5 | **Report → verdict tables** — unstructured findings into rows | `extract --kind findings | decision-tree` | structured verdict table |
| C6 | **Corpus Q&A by evidence** — retrieve, judge groundedness, assemble answer from spans | `scan | filter --recipe grounded | emit` | cited answers (no generation) |

### D. SYSTEMS ENGINEERING

| # | Use case | Chain | What lands |
|---|----------|-------|------------|
| D1 | **Repo recon** — convention violations across repos | `scan @repos --seeds | filter --recipe abide-<rule>` | violation list per repo |
| D2 | **Lexicon mining** — Paragon/LASME phrase families from real corpus text | `scan | decision-tree --recipe lexicon-mine` | pattern-family candidate lists |
| D3 | **Warhead support** — drift + phrase-class verification over sessions | `scan @omp | filter --recipe warhead-<n>` | enforcement evidence |
| D4 | **Incident mining → skill candidates** | `scan @omp --seeds failure | cluster | learn` | incident corpus + gap verdicts + revisions |
| D5 | **Test-gap triage** — classify untested files by risk | `index @repos | decision-tree --recipe risk-score` | prioritized test queue |
| D6 | **Refactor/migration planning** — classify files by pattern class | `cluster | decision-tree` | work packages + per-file class |
| D7 | **Doc-system audit** — structure + density over doc corpora | `index | filter --recipe structure-check` | nonconforming doc list |

### E. WORKSPACE-SPECIFIC

| # | Use case | Chain | What lands |
|---|----------|-------|------------|
| E1 | **Bible maintenance** — new sources → digest rows → gap finder | `scan | extract --kind digest` | Appendix R appends + open-question updates |
| E2 | **JESL card evals at batch** | `evaluate --rubric card-rubric` | per-card verdicts |
| E3 | **Aether structure checks** | `scan --seeds 'SHELL|NL:|GATE' | filter` | script conformance list |
| E4 | **Memory/knowledge curation** — classify sessions/threads → pin/archive | `index @omp | decision-tree --recipe curate` | curation plan |
| E5 | **Handover packing support** — classify every candidate file binding/superseded | `index | decision-tree --recipe classify-doc-role` | zip tree plan |

### F. RESEARCH & COMMS

| # | Use case | Chain | What lands |
|---|----------|-------|------------|
| F1 | **Source selection + result ranking** (the jev.s1.dev pattern, local) | `find --pick-sources --rerank` | ranked source list + spans |
| F2 | **Research-bundle scoring** — which of 40 fetched pages matter | `scan | evaluate --rubric quality` | ranked bundle + drop list |
| F3 | **Discord ops triage** — mentions/reports → actionability class | `scan @dc | decision-tree --recipe actionability` | routed queue per channel |
| F4 | **Interrupt prioritization** — rank incoming operator messages | `ask --recipe priority` | priority score + suggested order |

### The five used literally every day

If only five get built first: **B1** (fuzzy corpus triage — it answers "where is
X in the mountains"), **C4** (pattern synthesis — the Z-patterns ask), **A1**
(batch decisions — the X→Y→Z→A ask), **A5** (completion audit — kills the
hallucinated-success class), **D2/E1** (lexicon mining + bible maintenance —
the compounding knowledge work).

---

## §6 WHAT "PROPER" MEANS — the delta from v0.1

v0.1 proved the loop (index → judge → cache → ledger) as a CLI. v1 adds the
four things that make it a machine you can *target* from anywhere, *point* at
anything, and *leave running*:

1. **The target registry** — named pointers, adapters per kind, `--in all`.
2. **The job store + queue** — every run is a job: crash-safe rows, resume,
   per-job index/ledger/results, inspectable after the fact.
3. **The pool scheduler** — deterministic/judge/eval pools with budgets,
   backpressure, and rate-limit-aware sizing.
4. **The serving surfaces** — `serve` (HTTP), `mcp` (agents), `watch` (daemon)
   over the same engine.

Everything else (recipes, cache, ledger, laws) comes from the v0.1 blueprint
unchanged — v1 is the same machine with a scheduler and doors.

---

## §7 BUILD WAVES

```
 W0 (already designed)   v0.1 CLI: index/query/find/decision-tree/route/cache  ── build per JM v0.1 §9
 W1  STORE + QUEUE       job store, queue.sqlite, resume, per-job layout      ── manager-machine boilerplate
 W2  TARGETS + ADAPTERS  fs/sqlite/jsonl first; registry; --in all            ── index @shadow end-to-end
 W3  SCAN/FILTER/EXTRACT deterministic retrieval + first Jev filter recipes   ── B1 triage live on @shadow
 W4  FIND + PATTERNS     the full find chain (pick→seed→fetch→judge→rerank→   ── C4 on a real question
                         cluster→label→emit)
 W5  DECISION + EVAL     decision-tree at batch scale; evaluate/bench;        ── A1 + the bench table
                         escalation file
 W6  SERVE + MCP + WATCH HTTP :7777, MCP tools, daemon with reconcile tick    ── an agent calls jm mid-turn
 W7  CALIBRATION + RSI   later-truth fill; threshold tuning; learn loop        ── first calibration row
```

Gates: W1 green = a killed job resumes and completes. W2 = `jm index @shadow`
completes twice, second run incremental <10% wall. W3 = B1 triage returns
reviewable rows. W4 = C4 produces patterns.md with exemplars. W5 = 100-scenario
decision batch + the bench table. W6 = an OMP session calls `jm_find` as a tool
and gets rows. W7 = a threshold moves on recorded evidence.

---

## §8 LAWS (v1 delta on the bible's §10/IL set)

```
 T1  TARGET = POINTER    never copy a corpus into the job store; index only.
 T2  JOB = RESUMABLE     queue rows ack on completion; kill -9 loses nothing.
 T3  EVERY RUN LEDGERED  ops write rows (deterministic ops too); no row, no run.
 T4  BUDGETS ARE HARD    calls/usd caps stop the job; partial progress checkpoints.
 T5  SHADOW FIRST        new recipes log-only until reviewed (bible D015).
 T6  ONE STORE PER JOB   ~/.jm/jobs/<id>/; never a repo, never shared mutable state.
 T7  SCHEMAS VERSIONED   recipes, targets, and index schemas carry versions.
 T8  FAIL POLARITY       decision verbs fail closed; filter/scan keyless or open+marked.
 T9  DETERMINISTIC FIRST code narrows ≥100× before Jev; the judge never sees a mountain.
 T10 STRUCTURE CONTRACT  every op's output is a declared structure (md|json|csv) or exit ≠ 0.
```

---

## §9 RESIDUAL

- Semantica MCP adapters (NER/relations) — read the tool docs before wiring C1.
- Embeddings deferred (F1 choice in v0.1: Jev tags first).
- opengrok/ripwire fanout inside `scan` — v2 (compose, don't duplicate).
- 219G OPENCODE_WORKSPACE indexing — needs the skip-rules design reviewed before touching (honest scale warning).
- Vision states — after the provider bench (bible Q-C).
- The F2 ruling (claim-firewall close set) still open; unrelated here but carried.
