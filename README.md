# JM — JEV MANAGER

**The targetable decision engine.** Point it at anything; get structured
decisions, filtered data, extracted semantics, and a ledger that proves it.

```
 repo     /home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/JevManager
 origin   git (local, no remote yet)
 status   DESIGN COMPLETE → BUILD NOT STARTED (pre-Wave 1)
 docs     18 migrated artifacts under docs/
 package  packages/jm/ (00-MISSION → 07-GOALS + DPL1 spec)
 runtime  bun 1.4.2 · node v24.13.1 · sqlite via bun:sqlite (no system sqlite3)
```

---

## 1. What this is

A compute engine with four nouns — **targets · operations · recipes · results** —
scheduled over three pools (deterministic / judge / eval), persisted one store
per job, resumable from any crash, cached at the decision layer.

```
 POINT AT ANYTHING
        │
        ▼
   TARGETS (pointers)      fs · sqlite · jsonl · git · opengrok · discord · sessions
        │
        ▼
   OPERATIONS              index · scan · extract · filter · cluster · find ·
                           decision-tree · route · evaluate · learn · watch · serve
        │
        ▼
   RECIPES (versioned)     question packs + policy: noul · choice · score
        │
        ▼
   RESULTS                 files · rows · decisions · patterns — every one ledgered
```

The one law that shapes everything: **code narrows, Jev judges, code routes.**

---

## 2. Why it exists

Every system in this workspace needs the same primitive — a bounded, calibrated,
cacheable judgment that code can act on — and none of them should build it
separately. JM is that primitive, pointed at data instead of a single call site.

The three operator asks that defined it:

1. *"index all the raw shadow data from opencode workspace based on X criteria"*
2. *"find all instances of X fuzzy target in N database targets and output Z
   common patterns across everything w/ Y structure"*
3. *"make X decisions in Y scenarios based on Z criteria and A fuzzy context"*

Everything else in the catalog is a variation on those three shapes: narrow,
judge, emit.

---

## 3. The measured landing zone (this host, 2026-09-21)

| Target | Measured | Kind | Notes |
|--------|----------|------|-------|
| `@shadow` | 11,831 session_diff files | fs | `~/.local/share/opencode/storage` |
| `@ocdb` | 4 DB files (incl. archives) | sqlite | `~/.local/share/opencode/opencode*.db` |
| opencode data dir | 44G total | fs | storage 9.8G + hive-mind 650M + DBs |
| `@ocws` | 219G | fs | `OPENCODE_WORKSPACE` — needs skip-rules design first |
| `@jarvis` | 32G | fs | `JARVIS_WORKSPACE` |
| `@omp` | 133 session dirs | fs | `~/.omp/agent/sessions` |
| `@og` | UP on :18080 | opengrok | standing Lucene index |
| `@dc` | 2 guilds, 52 channels | discord | via `JARVIS/src/discord.ts` |

These are the anchors. Every wave gate is measured against them.

---

## 4. Read order

1. `docs/blueprints/JM_MASTER_BLUEPRINT_v1.md` — the runtime-kernel layer (the fire gate). **The v1 master blueprint.**
2. `docs/blueprints/JM_V1_TARGETABLE_DECISION_ENGINE_BLUEPRINT.md` — the engine + the 32-use-case catalog.
3. `docs/bibles/JEV_ENGINEERING_BIBLE.md` — the substrate (3,006L; the laws, recipes, registries).
4. `packages/jm/JM_DPL1_SPEC.md` — the build spec (DPL1 contract).
5. `packages/jm/06-WAVES.md` — the execution plan.
6. `packages/jm/07-GOALS.md` — the per-desk goal prompts.

---

## 5. Layout

```
 docs/blueprints/   the designs
   JM_MASTER_BLUEPRINT_v1.md              the fire gate (runtime kernel layer)
   JM_V1_TARGETABLE_DECISION_ENGINE_...   the engine + use-case catalog
   JM_JevManager_Blueprint_v0.1.md        the original v0.1 (Wave 0 scope)
   JevClaimFirewall_Blueprint.md          the close path (sibling surface)
   WarheadsAbide_Master_Blueprint_v1.md   the enforcement integration
   JevOmpCopilot_Master_Blueprint_v1.md   the desk-supervisor line
 docs/bibles/       the knowledge
   JEV_ENGINEERING_BIBLE.md               3,006L substrate
   JevSWE_Bible_ShowMe_v{1,2}.md          SWE bibles
   JevCopilot_ShowMe_v1.md                thin copilot show-me
 docs/packages/     the meta-architecture extraction (7 files)
 docs/handovers/    the behavior-policing handover + zip
 packages/jm/       00-MISSION · 01-DISCOVERY · DPL1 spec · 06-WAVES · 07-GOALS · 00-INDEX
 src/               implementation (empty — pre-Wave 1)
 reflexes/          reflex scripts (empty)
 tests/             the instrument battery (empty)
 ledger/            decision ledger (empty)
```

---

## 6. The engine in one page

```
 job = { op, targets[], recipe?, policy, budget }
                        │
    target adapters ──▶ QUEUE (sqlite WAL, crash-safe, resume-by-ack)
                        │
         ┌──────────────┼──────────────────────────────┐
         ▼              ▼                              ▼
   DETERMINISTIC     JUDGE POOL                    EVAL POOL
   POOL (CPU×N)      (Jev, ≤64/request,            (bench, replay,
   walk·hash·fts·    rate-limit aware,             variance runs)
   regex·sql·cluster cache-first)
         │              │                              │
         └──────────────┴──────────▶ results/ + ledger.jsonl + cache
```

Cost shape on the real corpus: 11,831 files → index locally ($0, no key) →
scan to ~1–2k candidates → judge at 64/request ≈ 30 requests ≈ **$0.02–0.05,
cached forever**. Heavy local work, light judgment, free repeats.

---

## 7. The runtime-kernel layer (the fire gate) — DESIGNED, NOT BUILT (W8, parked)

**STATUS: no code.** `src/firegate/` does not exist and `jef` is not installed. W8 is parked on
two operator-owned rulings (F1: the embedding/vector question; F6: the pi wrap points), and the
pin's own guidance is to state such a stop and keep building the independent fronts — which is
what happened: everything else in this README is built and measured, and this section describes a
DESIGN. It is kept because the shape is load-bearing for the surface above it.

When built, the sibling surface makes JM a *runtime* system rather than a batch tool:
every shape-triggered reflex will pass through ONE semantic gate before it acts.

```
 TRIGGER (shape, code) → ASSEMBLE (≤5k tok) → PREDICATE VETO? → GATE (Jev) → ROUTE
                                                                     │
                        FIRE ⟺ TRIGGER ∧ GATE(real) ∧ LADDER(enforce)
```

Full design: `docs/blueprints/JM_MASTER_BLUEPRINT_v1.md` (691 lines, 14-section canon).

---

## 8. Laws (the short list; the full 24 are in the bible §10)

```
 IL-03  evidence in state, standard in instructions
 IL-05  bounded state, always (narrow ≥100× first)
 IL-07  thresholds are policy, derived from your data
 IL-10  code owns every branch and every side effect
 IL-11  cache-first — the same decision never runs twice
 IL-15  ledger or it did not happen
 IL-16  completion is a fact about the world
 IL-17  never ask a decision model to count/compute/generate
 IL-19  bench before you swap
 IL-24  no secrets in prompts, logs, ledgers, or chat
```

Plus the engine laws T1–T10 (target=pointer, job=resumable, budgets are hard,
shadow-first, one store per job, schemas versioned, fail polarity, deterministic
first, structure contract).

---

## 9. Status board (MEASURED, 958fcca)

Every row carries its evidence. If a row disagrees with the tree, the tree wins.

| Component | State | Evidence |
|-----------|-------|----------|
| Design (engine + use cases) | **COMPLETE** | 2 blueprints, 16.5K + 24.9K bytes |
| Design (fire gate) | **COMPLETE** | `JM_MASTER_BLUEPRINT_v1.md` 691L |
| Substrate bible | **COMPLETE** | 3,006L |
| Build spec (DPL1) | **IN THIS PACKAGE** | `packages/jm/JM_DPL1_SPEC.md` |
| `src/` implementation | **33 files · 2911 lines** | `find src -name '*.ts'` |
| CLI verbs | **17** | `grep -c 'if (verb ===' src/cli.ts` |
| Tests | **19 .ts under `tests/`** (17 carrying suites + `helpers.ts` + the container harness) | `bun test` -> 89 pass / 0 fail / 343 expects across 17 files |
| Type boundary | **CLEAN** | `bunx tsc --noEmit` -> exit 0 |
| Surfaces | **CLI · HTTP · MCP · daemon — all four LIVE** | see §13 and §18.8/§18.9 |
| Container rig (spec §9 T1–T7) | **PASS 7/7 in a container AND on the host** | `artifacts/container-rig-2026-09-21.json` |
| Fire gate (W8) | **NOT BUILT — PARKED** | operator-owned F1/F6 rulings are owed |
| Audit gate | **BLOCKED — never PASS** | `AUDIT_SUMMARY.md` §5; retry condition is mechanical |

### What RUNS today (each line demonstrable in one command)

```
bun test                                 89 pass / 0 fail / 343 expects / 17 files
bun run tests/container/harness.ts       JM_CONTAINER_RIG PASS — 7/7 angles
bun run src/cli.ts index --in all         multi-target ingest, keyless, incremental
bun run src/cli.ts query <idx> --fts P    pointer rows back in ms
bun run src/cli.ts decision-tree …        live judging, cached replay, fail-closed without a key
bun run src/cli.ts serve --port 7777      the HTTP surface
bun run src/cli.ts mcp                    the MCP surface (stdio JSON-RPC)
bun run src/cli.ts watch --once           the daemon's reconcile tick
```

### What does NOT run (stated, not implied)

- **The fire gate / `jef`** — designed, not written (W8, parked).
- **`@ocws` (219G)** — never walked.
- **The escalation band** — no live row.
- **Embeddings / vector search** — explicitly out of scope for v1.

## 10. Quickstart (MEASURED — every line below was run on this host 2026-09-21)

```bash
# index a target (no key needed)
jm target add shadow fs ~/.local/share/opencode/storage --include '*.json,*.jsonl'
jm index @shadow

# the three operator asks
jm query @shadow --where "size>2000"
jm find "split-brain session bug" --in @ocdb,@shadow --common 12 --structure md
jm decision-tree --rows scenarios.jsonl --criteria policy.md --recipe recipe.json   # --recipe takes a FILE

# a judgment for an agent mid-turn
jm serve --port 7777            # POST /decide
jm mcp                          # tools: jm_query, jm_find, jm_decide, jm_index (stdio JSON-RPC)

# the runtime layer -- NOT BUILT. W8 is PARKED on the operator-owned F1/F6 rulings, so `jef`
# does not exist on this host (`which jef` -> not found) and neither does `src/firegate/`.
# These two lines are the CONTRACT W8 must satisfy, kept here so the shape is not lost:
#   jef validate reflexes/*.reflex.yaml
#   jef shadow-report --reflex destructive-edit
```

---

## 11. Glossary (the four nouns)

**Target** — a named pointer to a corpus. Kinds: fs, sqlite, jsonl, git,
opengrok, discord, omp-sessions, url. Never copied into the store.

**Operation** — a verb. Deterministic ops (index, scan, cluster, query) need no
key; decision ops (filter, decision-tree, route, evaluate) use the judge.

**Recipe** — a versioned JSON question pack: primitives, criteria, thresholds,
phase, fail rule, status (`shadow` | `active`). The unit of judgment.

**Result** — the declared-structure output (md/json/csv, `--structure` or inferred from `--out`'s extension) plus the ledger rows
that prove how it was produced.

**Fingerprint** — `sha256(model ⊕ schema ⊕ canonical(redact(state)))`. The
identity of a decision; the cache key.

**Ledger row** — the append-only record: `{ts, kind, verb, args, started, ended, status,
stats, cost_usd, calls, cached}`. A KEYLESS run carries no state hash/route/truth (it judged
nothing); a JUDGED run's `stats` carries them. `args` records the flags the verb consumed, so a
row can reconstruct the run it proves. No row, no run.

**Ladder** — a reflex's promotion state: observe → advise → enforce → retired,
moved only on measured precision with unresolved excluded.

---

## 12. The use-case catalog (32 cases, six families)

The engine's justification is that these all share one machine. Full detail in
`docs/blueprints/JM_V1_TARGETABLE_DECISION_ENGINE_BLUEPRINT.md` §5.

**A — Decision making at scale.** A1 policy application over scenario batches ·
A2 screening + escalation · A3 routing (skill/tool/model) · A4 agent-loop
watchdogs (drift, retry, nudge, completion) · A5 historical completion audit.

**B — Data filtering & triage.** B1 fuzzy corpus triage · B2 near-dup collapse
with verdicts · B3 relevance filtering of bundles · B4 quarantine detection ·
B5 channel/log triage.

**C — Semantic extraction & structuring.** C1 NER + relations · C2 field
matching across schemas · C3 tagging at volume · C4 pattern synthesis (the
Z-patterns ask) · C5 report → verdict tables · C6 corpus Q&A by evidence.

**D — Systems engineering.** D1 repo recon (conventions) · D2 lexicon mining
(Paragon/LASME) · D3 warhead support · D4 incident mining → skill candidates ·
D5 test-gap triage · D6 refactor/migration planning · D7 doc-system audit.

**E — Workspace-specific.** E1 bible maintenance · E2 JESL card evals ·
E3 Aether structure checks · E4 memory/knowledge curation · E5 handover packing.

**F — Research & comms.** F1 source selection + ranking · F2 research-bundle
scoring · F3 Discord ops triage · F4 interrupt prioritization.

**Build these five first:** B1 (where is X in the mountains) · C4 (the Z-patterns
ask) · A1 (the X→Y→Z→A ask) · A5 (kills hallucinated success on history) ·
D2/E1 (compounding knowledge work).

---

## 13. The surfaces (how anything reaches it)

| Surface | What | Who |
|---------|------|-----|
| `jm` CLI | the primary; pipes for composition | operator, scripts |
| `jm serve` (:7777, `--port`) | `POST /decide`, `POST /find`, `GET /jobs`, `GET /health` | any host process |
| `jm mcp` (stdio) | tools `jm_query` `jm_find` `jm_decide` `jm_index` | agents mid-turn |
| `jm watch` | daemon: index-watch, judge-drain, cache-gc, calibration-tick | standing services |
| `jef` CLI | reflex scripts (validate, lint, shadow-report, bench) | the runtime layer |

---

## 14. What JM explicitly refuses

Standing refusals, each with its reason. The full anti-registry is bible §7.11.

| Not done | Because |
|----------|---------|
| Jev as an agent/supervisor | it judges; code acts |
| Jev in the 50ms token-stream path | timescale mismatch (fire gate L6) |
| Counting / math / dates via Jev | jaggedness; code's job |
| Generated text via Jev | out of contract |
| Raw transcripts or dumps as state | cost + accuracy collapse |
| Thresholds copied from demos | borrowed risk |
| Raw-state hashing or sharing | privacy incident via distribution |
| Keys in argv/logs/ledgers/chat | key hygiene |
| Unversioned recipe edits | makes ledgers incomparable |
| Activating without shadow rows | unvetted steering |
| Unbenched provider swaps | silently redefines thresholds |
| Per-rule questions in the fire gate | the unit is the firing |
| Counting unresolved as confirmed | promotion on nothing |

---

## 15. The build plan in one table

| Wave | Delivers | Gate (measured) |
|------|----------|-----------------|
| W0 | v0.1 CLI: index/query/find/decision-tree/route/cache | `jm index @shadow` twice; second <10% wall |
| W1 | job store + queue + resume | a `kill -9`'d job resumes and completes |
| W2 | targets + adapters (fs/sqlite/jsonl) | `--in @shadow,@ocdb` end-to-end |
| W3 | scan/filter/extract + first recipes | B1 triage returns reviewable rows |
| W4 | find chain + pattern synthesis | C4 produces patterns.md with exemplars |
| W5 | decision-tree at batch scale + evaluate/bench | 100-scenario batch + bench table |
| W6 | serve + mcp + watch | an OMP session calls `jm_find` and gets rows |
| W7 | calibration + RSI | a threshold moves on recorded evidence |
| W8 | fire gate: script schema + assembler + `destructive-edit` in OBSERVE | I1 twin fixtures get opposite verdicts |

---

## 16. FAQ (the questions this repo's first readers will ask)

**Q: Why a separate repo and not a folder under reports/?** Because it will hold
source, tests, reflex scripts, and a ledger — it is a product, not a document.
The reports stay as the design-of-record; this repo is the build.

**Q: Is this the same as Abide?** No. Abide checks diffs against instruction-file
rules at edit/turn settle. JM indexes corpora, runs judgments at volume, and
serves decisions to other systems. They share the judge client and the cache
key discipline; they do not share a job model.

**Q: Is this the same as the claim firewall?** No. The firewall owns the close
path (`goal.complete`, done-claims). JM owns corpus work and the runtime fire
gate. The firewall's recipes are among the ones JM can run; that is composition,
not overlap.

**Q: Why sqlite and not Postgres/Supabase?** Single-host, single-operator,
zero-daemon. `bun:sqlite` + FTS5 covers enumerate/search/aggregate at the
measured scale. If the corpus outgrows it, the store interface is the seam.

**Q: What does it cost to run?** Indexing is free (no key). Judgment is
~$0.00004–$0.00035 per decision; a full shadow sweep lands around $0.02–$0.05;
repeats are free after the first run.

**Q: Where does the intelligence live?** In the recipes (versioned, editable
questions) and the thresholds (policy objects derived from ledger data) — never
in a prompt hidden in a call site.

**Q: How do I know it's working?** The ledger: act-band rates, cache hit rate,
cost per completed task, later-truth fill rate. A run without rows did not happen.

**Q: What if the key is missing?** Index/scan/cluster/query still work (keyless).
Decision verbs fail closed. The fire gate goes to OBSERVE (never fires blind).

**Q: Does it touch my data?** Targets are attached read-only and never copied.
Indexes live under `~/.jm/`. Redaction runs before any state is hashed or cached.

---

## 17. Operating conventions

- Every new decision goes to the bible's §7.1 registry; every new recipe to
  §7.10; every incident to §8.3 — **in the same commit as the code**.
- Every doc in this repo obeys `trident-bible-writing` conventions where it is a
  knowledge artifact, and names its floor class where it is a build artifact.
- Every reflex script carries a gate (fire gate L1) or it cannot leave OBSERVE.
- Every run prints its cost line; every job has `--budget-calls` available.
- Nothing in `docs/` is edited in place after publication; supersede with a new
  versioned file and note the supersession in the file header.
- The doc-density gate is live on this host: README ≥300 lines, generic docs
  ≥200, bibles 3,000–5,000. Write to the floor or the write is refused.

---

## 18. The operating contract (everything the second-operator drill found missing)

A zero-context operator ran the engine from §10/§13 alone and reported 14 gaps. This section is
the answer to each one, written from MEASURED behaviour, not intent. If a line here disagrees with
the engine, the engine wins and this file is the bug — re-run the command and fix the line.

### 18.1 The verbs and their exit codes (G12)

There are **17 CLI verbs**. Do not guess one: **run `jm` with no verb and it prints the usage
dump**. A usage dump is also what you get for an unknown verb — with **exit 2**.

```
index   query   target(add|ls|rm)   scan   cluster   extract   report
find    filter  decision-tree       route  evaluate
serve   mcp     watch               journal  calibrate
```

| exit | means | example |
|------|-------|---------|
| `0` | the verb did its job | `jm query idx --fts x` with matches |
| `1` | a RUNTIME failure, the environment is at fault | `JM_ERROR: ENOENT` on a deleted file |
| `2` | a CLIENT error — your arguments are wrong, or the key is absent | `JM_ARGS`, `JM_SCAN_RE_INVALID`, `JM_INDEX_MISSING`, `JEV_NO_KEY` |

Two conventions worth memorising: **`--json` exists on every read verb** (never required, always
available), and **a write verb creates its index while a read verb refuses a missing one** — see
18.3.

### 18.2 Targets, the registry, and `--in` (G4)

A target is `{name, kind, root}` and lives in `$JM_HOME/targets.json`. Names are a NAMESPACE:
they are sanitised for storage, so `../../evil` becomes `_evil`.

```
jm target add <name> <kind> <root>      # kind = fs | jsonl | sqlite
jm target ls                            # TSV: name, kind, root
jm target rm <name>                     # exit 2 + JM_TARGET_UNKNOWN if it was not there
```

The kinds and what `root` means for each:

| kind | root points at | the rows are |
|------|----------------|--------------|
| `fs` | a DIRECTORY (or a single file) | one row per file; `path` = `<target>/<rel>` |
| `jsonl` | a `.jsonl` (or `.json`) FILE | one row per line/element; `path` = `<file>#L<n>` |
| `sqlite` | a `.sqlite` FILE | one row per table row; `path` = `<file>#<table>/<pk>` |

`sqlite` needs no table list: **every table is read** (a schema-less DB yields zero rows and is
not an error). A `sqlite` source is opened **READ-ONLY** — the engine cannot write to your DB,
and the drill verifies this by comparing the file's size+mtime before and after.

The **multi-target forms** are how you index several sources into ONE index:

```bash
jm index  --in all --name corpus        # every registered target
jm index  --in shadow,ocdb --name pair  # just these two
jm query  --in pair --fts "tombstone"   # the same name resolution on the read side
jm index  @shadow                       # a SINGLE target; dispatches by its KIND
```

`--in` **auto-names** the index when `--name` is absent: `all` -> `all`, `a,b` -> `a+b`. A name
that is not in the registry is **loud** (`JM_TARGET_UNKNOWN`) and names the ones you do have —
never a silent subset. `@target` and `--in target` are equivalent for every kind; `@` exists so a
one-target command stays short.

### 18.3 Reads refuse a missing index (G1 — the drill's most severe find)

```bash
$ jm query corpus --fts tombstone
$ jm query corups  --fts tombstone        # the typo
JM_ERROR: JM_INDEX_MISSING: no index "corups" at …/index/corups.sqlite — build it first
exit 2
```

Read verbs (`query`, `scan`, `cluster`, `extract`, `report`) **require the index to exist**.
Write verbs (`index`, `decision-tree`, `calibrate`, …) create it. This asymmetry is the fix for
a silent failure: before it, a typo produced an EMPTY result at exit 0 **and a phantom index
file**, so "no matches" and "no such index" were indistinguishable. Never trust an empty answer
from a verb that did not tell you the index existed.

### 18.4 Query returns POINTERS; the body comes from scan/extract (G11, G16)

```bash
$ jm query corpus --fts zanzibar
62      new     /tmp/op2/src.sqlite#t/1
 ^size  ^state  ^the row id
```

`query` answers "WHICH rows match", and its columns are `size`, `state`, `path`. It does **not**
print the text. To see or pull content:

```bash
jm scan    corpus --lex zanzibar              # rows + a 140-char EXCERPT + a hit count
jm scan    corpus --lex zanzibar --re 'tomb\w+'   # a regex GATE over the row text
jm extract corpus --lex zanzibar --re 'id: ([0-9]+)'   # capture group 1 (or group 0) per hit
```

`scan`'s leading integer is the **hit count** (0 when no `--re` was given), then size, then path,
then the excerpt. Only rows that were indexed WITH text can be text-searched; `text=0` in an
index line means the file was hashed but not text-extracted (too large, or a binary kind).

### 18.5 cluster groups; it does not judge (G11)

```bash
$ jm cluster corpus --lex zanzibar
n=2   sqlite:op2db   /tmp/op2   [body,drift,nothing,observed]   1, 2
 ^group size        ^source     ^the token SIGNATURE          ^exemplar ids
```

Clusters partition by **`(source, kind)` first**, then by the token signature within each bucket.
The signature is the top-N most frequent non-stop words ≥4 chars, **ties broken
alphabetically** — so a tie between `service` and `tombstone` puts `service` first. There is no
model here: the same input gives the same clusters in the same order. `n` counts the members;
`small` counts clusters below `--min`; `grouped + ungrouped = candidates`.

### 18.6 The structure contract: `md` · `json` · `csv` (G9)

`--structure` accepts exactly those three, and **`--out`'s extension selects it** when
`--structure` is absent:

```bash
jm extract corpus --re 'x' --out /tmp/x.csv      # writes REAL csv (header + RFC4180 quoting)
jm extract corpus --re 'x' --structure tsv       # JM_EXTRACT_STRUCTURE: tsv (have: md, json, csv)
```

`find`'s structures are `md` and `json` only. (Before the fix, a `.csv` path received JSON and
`--structure csv` silently rendered markdown — a declared structure the code did not honour is
worse than a missing feature.)

### 18.7 Keys: two sources, one polarity (G8)

The judge resolves a key in this order, and **never logs or stores it**:

1. `TYPESAFE_API_KEY` (env), else
2. `~/.config/typesafe/key` (file), else
3. absent.

| class | verbs | with no key |
|-------|-------|-------------|
| **keyless** | `index`, `query`, `scan`, `cluster`, `extract`, `report`, `serve`, `mcp`, `watch` | work normally, `cost=$0` |
| **judged** | `find` (its judge stage), `filter`, `decision-tree`, `route`, `evaluate`, `calibrate` | **CLI exit 2** with `JEV_NO_KEY` · **HTTP 503** |

Fail-closed means the judged path writes **nothing** and decides **nothing** — zero decisions,
not a default. To test the starve path, redirect `HOME` (unsetting the env var alone is not
enough: the file is a legitimate second source):

```bash
env -u TYPESAFE_API_KEY HOME=/tmp/nokey jm route --task "…"    # exit 2, JEV_NO_KEY
```

### 18.8 The MCP surface: stdio, and how to drive it (G6, G13)

`jm mcp` speaks **JSON-RPC 2.0 over stdio**, one JSON object per line. No HTTP, no port. A
paste-ready session:

```bash
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{}}}' \
  '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
  '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"jm_query","arguments":{"fts":"x"}}}' \
  | jm mcp
```

An `initialize`/`notifications/initialized` handshake is **the correct client behaviour**; a bare
`tools/list` line is also answered, so a one-line probe works. Two framing rules the client must
honour: a **notification produces NO response frame** (a responder that answers anyway
desynchronises the client), and a **tool failure arrives as a RESULT with `isError: true`**, not
as a JSON-RPC error — the agent must SEE the failure while the transport stays alive.

The four tools are `jm_query`, `jm_find`, `jm_decide`, `jm_index`. They are the CLI verbs with
the same names and the same semantics; an agent's answer and a curl answer cannot drift apart.

### 18.9 The daemon: what a tick IS (G10)

```bash
jm watch --once --in a,b        # one reconcile tick
jm watch --interval 30000       # the loop (ms)
jm journal --limit 20           # read the journal back
```

A tick **re-ingests the scoped targets through their adapters and journals the result**. It is
**idempotent**: a second tick on an unchanged corpus writes `changed=0` (it still appends a
journal line — every tick is journaled whether or not anything changed, so the journal grows by one
line per tick). The journal is real
JSONL at **`$JM_HOME/watch/journal.jsonl`**, one object per tick:

```json
{"at":"…","targets":2,"rows":4,"changed":4,"ms":17,
 "actions":[{"target":"a","kind":"fs","changed":2,"rows":2},…],"errors":[]}
```

A broken target is **journaled in `errors`**, never fatal: a daemon that dies on a bad config
cannot reconcile anything. **The tick writes to the index named by `--name`, or to `all` when you give none** — it is NOT
derived from the `--in` set. (An earlier version of this paragraph claimed `a,b` -> `a+b`; a
zero-context operator measured `index/all.sqlite` and the claim was corrected.) To share an index
with your manual runs, pass the same `--name` to both. Of §13's four named duties, **only
index-watch is implemented**; the other three are planned and are stated here so silence is not
read as proof.

### 18.10a report --job: the per-job reconciliation (C8)

```bash
$ jm report --job last --name myindex
job:          c8job
queue:        12 rows · 12 done · 0 pending · 0 running · 0 failed
fingerprints: 12 distinct · 0 duplicate
index files:  12 live
ledger:       1 rows total · 1 naming this job · 1 ok · 0 failed · $0.000000
reconciled:   YES — no duplicate fingerprints (the UNIQUE constraint enforces this structurally); 0 rows left running
```

`--job last` picks the most recently modified queue. The verb reconciles the two halves of a run:
the QUEUE (rows by state, and distinct fingerprints) and the LEDGER (every row, plus the rows that
NAME this job).

**Exit codes carry the verdict.** `0` = reconciled. `3` = NOT reconciled — a row left `running`
(exactly what a crash leaves) or a duplicate fingerprint. `2` = the job does not exist
(`JM_JOB_MISSING`), and no job directory is created for a typo.

The duplicate count is a defensive read: `queue.fingerprint` carries a **UNIQUE** constraint, so a
duplicate cannot be inserted at all. The crash-resume property holds STRUCTURALLY, which is a
stronger guarantee than an arithmetic check — stated here so the guarantee is not misattributed to
the wrong mechanism.

### 18.10 report: every field, defined (G5, G15)

```bash
$ jm report corpus
index:        corpus (72.0 KB)      # the index DB file's size, not the corpus size
files:        6 live · 0 gone · 6 with text     # live = state != 'gone'
docs/fts:     6 docs · 6 fts rows   # the text mirror; should track `with text`
tags:         0                     # judge-written tags (0 in a keyless index)
runs:         0 · decisions: 0      # rows the engine wrote INTO this index
cache:        0 rows · 0 hits       # the shared judge cache attached to this index
kinds:        text=2 sqlite:op2db=2 jsonl:rows=2
targets:      corpus(fs) other(sqlite)          # the GLOBAL registry
ledger:       23 rows · 23 ok · 0 failed · $0.000000   # the GLOBAL ledger
ledger verbs: index=12 query=5 scan=2 cluster=2 extract=2
```

Three things it will not tell you by itself: the report **appends a ledger row** (so the second
run counts one more than the first — self-accounting, not drift); `targets` and `ledger` are
**global**, not scoped to the index you named; and a malformed ledger line counts as `failed`
rather than being dropped.

### 18.11 The ledger row: what a run leaves behind (G14)

Every CLI run appends one line to `$JM_LEDGER` (`$JM_HOME/ledger.jsonl`):

```json
{"ts":"…","kind":"run","verb":"extract",
 "args":{"index":"f5","re":"…","structure":"csv","out":"/tmp/op5.csv"},
 "started":"…","ended":"…","status":"ok",
 "stats":{"rows":1,"values":2,"empty":0,"structure":"csv"},
 "cost_usd":0,"calls":0,"cached":0}
```

`args` records **the flags the verb consumed**, so the row can reconstruct the run it proves —
this is a repair: the flags a caller passed used to be dropped, which made the row a weaker
witness than it claimed to be. A KEYLESS row carries no state hash, route or truth because it
judged nothing; a JUDGED row carries them in `stats`. A row with `status: "error"` still lands —
a failed run is evidence too.

### 18.12 The recipe file: the schema, and what a bad one does (G3)

`--recipe` takes a **FILE PATH**, never a recipe name (`--recipe screening-escalate` fails with
`ENOENT`). A recipe is the durable description of one judgment:

```json
{
  "recipe": "screening-escalate",
  "version": 1,
  "status": "shadow",
  "state_fields": ["title", "body"],
  "questions": {
    "flag": {
      "type": "noul",
      "instructions": "Is this item a REAL problem that needs a human, rather than noise? Answer with a probability in [0,1]."
    }
  },
  "policy": { "act": 0.8, "flag": 0.5, "fail": "closed" }
}
```

| field | required | meaning |
|-------|----------|---------|
| `recipe` | yes | the name the ledger and the report carry |
| `version` | yes | a number; bump it when the semantics change (the cache fingerprint includes it) |
| `questions` | yes | a **non-empty** map of question-name -> `{type, instructions}` |
| `state_fields` | no | which row fields the state handed to the judge is built from |
| `policy` | no | `act`/`flag`/`fail`; defaults to `{act: 0.8, flag: 0.5, fail: "closed"}` |
| `status` | no | `shadow` while a recipe is being watched, `live` once it is trusted |

Question `type` is one of **`noul`** (a probability in [0,1] — the workhorse), **`choice`** or
**`mcq`** (a pick from a set, with probabilities). The answered signal feeds the ladder:
`signal >= act` -> `act`, `signal >= flag` -> `escalate`, else `noop`. **The aggregate signal is
the MAX over all answered questions**, so a recipe with two questions routes on its strongest
answer.

A recipe is validated **before any work happens**, and a bad one is a **client error (exit 2)**:

```bash
$ jm decision-tree --rows r.jsonl --recipe recipe.json
JM_ERROR: JM_RECIPE_INVALID: `questions` must be a NON-EMPTY object …
exit 2
```

That validation exists because of a measured failure: a recipe with no `questions` used to run to
completion — no question to ask, so no judge call, so **every row `noop`, exit 0**. A run that
judged nothing reported a successful triage. The five shapes that now refuse: a missing
`recipe`/`version`, an empty `questions`, an unknown question `type`, and a `policy` whose `flag`
exceeds its `act`.

A real run of the recipe above, on three rows (live judge, `$0.000044`):

```
$ jm decision-tree --rows rows.jsonl --recipe recipes/screening-escalate.json --out out.md
JM_DECISIONS rows=3 decided=3 act=1 escalate=1 noop=1 calls=3 cached=0
$ jm decision-tree --rows rows.jsonl --recipe recipes/screening-escalate.json --out out2.md
JM_DECISIONS rows=3 decided=3 act=1 escalate=1 noop=1 calls=0 cached=3
```

`--out` receives the decision rows (route, reason, the raw answers, the model id); the same rows
land in the `decisions` table of the named index. Read them with `jm report` (the `decisions`
count) — `jm query` reads the FILES table and will not show them.

---

## 19. Wave 0 preview (the first code that will land here)

```
 src/cli.ts                      verb router + --json + cost line
 src/verbs/index.ts              walk · hash · sqlite-insert · fts5
 src/verbs/query.ts              SQL-ish where + fts + tag filters
 src/verbs/find.ts               seed → fetch → narrow → judge → cluster → emit
 src/verbs/decision-tree.ts      batch states × one recipe → decisions
 src/verbs/route.ts              catalogue Choice → inject/act
 src/adapters/{fs,jsonl,sqlite}.ts
 src/store/{schema,db,fts}.ts
 src/judge/{client,providers,cache,chunk,policy}.ts
 src/ledger.ts                   append-only rows
 tests/{adapters,store,find,decision-tree,cache,adversarial}.test.ts
```

Acceptance for W0 is in `packages/jm/JM_DPL1_SPEC.md` §11 (the success-criteria
table) and `06-WAVES.md` (the per-wave gates).
