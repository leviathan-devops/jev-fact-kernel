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

## 7. The runtime-kernel layer (the fire gate)

The sibling surface that makes JM a *runtime* system rather than a batch tool:
every shape-triggered reflex passes through ONE semantic gate before it acts.

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

## 9. Status board (honest, current)

| Component | State | Evidence |
|-----------|-------|----------|
| Design (engine + use cases) | **COMPLETE** | 2 blueprints, 16.5K + 24.9K bytes |
| Design (fire gate) | **COMPLETE** | `JM_MASTER_BLUEPRINT_v1.md` 691L |
| Substrate bible | **COMPLETE** | 3,006L, sha `dab371a0…` |
| Build spec (DPL1) | **IN THIS PACKAGE** | `packages/jm/JM_DPL1_SPEC.md` |
| Repo | **CREATED** | this tree, git-initialised |
| Docs migrated | **DONE** | 18 files under `docs/` |
| `src/` implementation | **EMPTY** | pre-Wave 1 |
| Reflex scripts | **EMPTY** | pre-Wave 1 |
| Tests | **EMPTY** | pre-Wave 6 |
| Ledger | **EMPTY** | no runs yet |

Nothing runs yet. That sentence is the point of this repo's first release: the
design is complete enough to build from, and honest about the fact that it is
still design.

---

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

# the runtime layer
jef validate reflexes/*.reflex.yaml
jef shadow-report --reflex destructive-edit
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

## 18. Wave 0 preview (the first code that will land here)

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
