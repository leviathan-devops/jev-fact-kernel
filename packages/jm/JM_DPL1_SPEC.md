# JM_DPL1_SPEC — THE JEV MANAGER BUILD SPEC

**Version:** 1.0.0 · **Date:** 2026-09-21 · **Class:** system (DPL1)
**Repo:** `Shared_Workspace/JevManager` · **Package:** `packages/jm/`
**Authority:** this spec is the dispatchable contract. It cites
`docs/bibles/JEV_ENGINEERING_BIBLE.md` (v1.0.0, sha `dab371a0…`) for laws and
`docs/blueprints/JM_*` for design rationale. Where this spec and a design doc
disagree on an implementation detail, **this spec wins**; where this spec and
the bible disagree on a law, **the bible wins**.

---

## §1 HEADER + HOW TO USE THIS SPEC

A desk receiving this spec builds exactly what §7 lists, satisfies §8
mechanically, runs §11 (script tests) and §12 (container tests), and refuses the
§10 anti-patterns. The spec is dispatchable when §14 (the spec-manager gate) is
green.

```
 read order for a builder desk
   1. §3 problem statement   (what and why, verbatim)
   2. §6 core insight        (the one thesis everything derives from)
   3. §4 architecture        (the shape)
   4. §7 scope               (what to build, numbered)
   5. §8 success criteria    (the mechanical definition of done)
   6. §11/§12 tests          (the proof)
   7. §10 anti-patterns      (the traps)
```

**Floor note (host gate conflict, stated honestly).** The `build-package` skill
sets the DPL1 floor at 400–600 lines for a system. This host's live
doc-density gate classifies any `*SPEC*` file at a 3,000-line floor. The two
disagree. This artifact is authored to the *skill's* DPL1 floor and expanded
past it with real material; it is **not** yet at the host SPEC floor, and it is
not padded to reach it. Growth per milestone is legal (build-package Step 5);
this spec grows as waves land. Recorded as residual R1 in §15.

---

## §2 DISCOVERED INTELLIGENCE (summary; full in `01-DISCOVERY.md`)

| Fact | Value |
|------|-------|
| Runtime | bun 1.4.2, node v24.13.1, **no system sqlite3** → `bun:sqlite` |
| First corpus | `@shadow` = 11,831 files (`~/.local/share/opencode/storage`) |
| Second corpus | `@ocdb` = 4 SQLite DBs (`opencode*.db`) |
| Big corpora | `@ocws` 219G, `@jarvis` 32G, `@omp` 133 session dirs |
| Sibling tools | opengrok UP :18080 · ripwire present · semantica MCP mounted · manager-machine boilerplate present · discord client 253L |
| Existing JM code | **none** (greenfield in a new repo) |
| Design artifacts | v0.1 498L · engine 279L · fire gate 691L · bible 3,006L |
| Host gates | doc-density (README ≥300L, generic ≥200L, SPEC ≥3000L) — live |

---

## §3 PROBLEM STATEMENT (verbatim requirements)

**R1.** *"index all the raw shadow data from opencode workspace based on X criteria"*

**R2.** *"find all instances of X fuzzy target in N database targets and output Z
common patterns across everything w/ Y structure"*

**R3.** *"be able to make X decisions in Y scenarios based on Z criteria and A
fuzzy context"*

**R4.** *"a tool i can point at anything when i need data structuring or decision
making"*

**R5.** *"semantically and deterministically index massive mountains of data"*

**R6.** *"everything i could possibly need for Paragon/LASME/Aether/JESL systems"*

**R7.** *"CONTEXT AWARE and capable of actually making intelligent decisions based
on dynamic data"*

**R8.** *"targetable supercomputer for decision making, data filtering, semantic
extraction, systems engineering"*

**R9.** (runtime layer) *"shape trigger → jev algorithm → MPSE assisted jev score
→ decision point for fire → fire/ignore"*; *"each fire should be < 5000 tokens"*.

**Restated in one sentence:** the workspace has mountains of data and no single,
targetable, auditable way to narrow it, judge it, and act on the judgment —
every attempt so far re-implements one piece and leaves the rest to ad-hoc
scripts.

### 3.1 Requirement → wave → test traceability

| Req | Wave | Test |
|-----|------|------|
| R1 | W0/W2 | C1, C2 (`index` full + incremental) |
| R2 | W4 | C5 (patterns with exemplar ids) |
| R3 | W5 | C6, C7 (batch + cache determinism) |
| R4 | W2 | C11 + adapter tests (3 kinds) |
| R5 | W0/W3 | C3, C4 (keyless query + FTS) + judge path |
| R6 | W3/W5 | lexicon-mine + card-eval recipe tests |
| R7 | W4 | fresh-state fixtures; dynamic menu test |
| R8 | W6 | C14 (MCP reachable from an agent) |
| R9 | W8 | C15–C18 (fire gate instruments) |

---

## §4 ARCHITECTURE

```
                     THE ENGINE
   ┌──────────────────────────────────────────────────────────────┐
   │  TARGETS (pointers, read-only)                               │
   │    fs · sqlite · jsonl · git · opengrok · discord · omp      │
   └───────────────────────┬──────────────────────────────────────┘
                           ▼
   ┌──────────────────────────────────────────────────────────────┐
   │  OPERATIONS                                                  │
   │    deterministic: index · scan · cluster · query             │
   │    judged:        filter · find · decision-tree · route ·    │
   │                   evaluate · learn · extract                 │
   │    service:       serve · mcp · watch                        │
   └───────────────────────┬──────────────────────────────────────┘
                           ▼
   ┌──────────────────────────────────────────────────────────────┐
   │  JOB RUNTIME                                                 │
   │    queue.sqlite (crash-first, ack, resume)                   │
   │    ├── deterministic pool (CPU×N, no key)                    │
   │    ├── judge pool (Jev ≤64/req, cache-first, rate-aware)     │
   │    └── eval pool (bench, replay, variance)                   │
   └───────────────────────┬──────────────────────────────────────┘
                           ▼
   ┌──────────────────────────────────────────────────────────────┐
   │  STORES                                                      │
   │    index.sqlite (+FTS5) · ledger.jsonl · cache table         │
   │    results/ (md|json|csv)                                    │
   └──────────────────────────────────────────────────────────────┘

                     THE RUNTIME LAYER (W8, subordinate)
   TRIGGER → ASSEMBLE(≤5k) → VETO? → GATE(Jev) → ROUTE → LEDGER
                                   FIRE ⟺ TRIGGER ∧ GATE ∧ LADDER
```

### 4.1 The judged-verb flow (shared by filter/find/decision-tree/route/evaluate)

```
 verb(args)
   ├─ resolve targets            (registry → adapters)
   ├─ build candidate states     (deterministic narrowing ≥100×)
   ├─ for each state:
   │     fingerprint = sha256(model ⊕ recipe-version ⊕ canonical(redact(state)))
   │     if cache hit  → reuse answer (0ms, $0)
   │     else          → batch (≤64) → judge call → store in cache
   ├─ route(answers, policy)     → act | escalate | noop | reject
   ├─ emit(structure)            → md | json | csv
   └─ ledger rows + cost line
```

### 4.2 The deterministic-verb flow (index/scan/cluster/query)

```
 verb(args)
   ├─ resolve targets
   ├─ walk/attach (read-only)
   ├─ transform (hash, parse, filter, group) — no network, no key
   ├─ write to index.sqlite / stdout
   └─ run row (verb, args, stats, cost=0)
```

---

## §5 DISCOVERY INTELLIGENCE (measured, this session)

All anchors in §2 came from commands; the log is in `01-DISCOVERY.md §6`. The
three load-bearing measurements:

1. **11,831 files / 9.8G in `storage`** — the incremental index is mandatory;
   a full re-hash per run is ~9.8G of I/O and unusable as a default.
2. **No `sqlite3` binary** — `bun:sqlite` is the only store path; FTS5
   availability must be verified in bun 1.4.2 before W0 (a pre-flight, not an
   assumption).
3. **opengrok UP + ripwire present** — code corpora are already indexed; JM must
   not duplicate them. `@ocws`/`@jarvis` code questions route to opengrok.

### 5.1 Pre-flight commands (run before W0)

```bash
bun -e 'const {Database}=require("bun:sqlite");const d=new Database(":memory:");
  d.run("CREATE VIRTUAL TABLE t USING fts5(x)");d.run("INSERT INTO t VALUES(?)",["ok"]);
  console.log("FTS5_OK", d.query("SELECT x FROM t WHERE t MATCH ?").get("ok"));'
# expect: FTS5_OK { x: "ok" }
```

If FTS5 is absent, the store falls back to a token table + LIKE (declared, not
silent) and the spec's C4 criterion changes to a LIKE-based assertion.

---

## §6 CORE INSIGHT

> **The decision is the product; everything else is plumbing that must be
> bounded, cached, and recorded.**

Three consequences, each shaping the build:

1. **Code narrows, Jev judges, code routes.** No verb sends a corpus to the
   judge; every judged verb reduces candidates ≥100× in code first (IL-05, T9).
2. **A judgment without a ledger row did not happen.** Deterministic ops write
   rows too; the ledger is the system's memory and its audit (IL-15).
3. **The same decision never runs twice.** The fingerprint makes repeats free
   and CI deterministic; 60–80% of decisions recur (IL-11).

Everything else is a corollary: the target registry exists because pointers
avoid copying mountains; the job store exists because runs must survive crashes;
the pools exist because deterministic and judged work have different
bottlenecks; the surfaces exist because other systems must reach the same engine.

---

## §7 SCOPE (≤20 items; each wave-mapped)

| # | Item | Wave | Files |
|---|------|------|-------|
| S1 | CLI router + `--json` + cost line | W0 | `src/cli.ts` |
| S2 | `index` verb (walk, hash, incremental, tombstones) | W0 | `src/verbs/index.ts` |
| S3 | `query` verb (SQL-ish where + FTS + tags) | W0 | `src/verbs/query.ts` |
| S4 | Store layer (`bun:sqlite` + FTS5 + schema) | W0 | `src/store/*` |
| S5 | Judge client + cache + policy | W0 | `src/judge/*` |
| S6 | Ledger writer (append-only, schema-validated) | W0 | `src/ledger.ts` |
| S7 | Adapters: fs, jsonl, sqlite | W0/W2 | `src/adapters/*` |
| S8 | Target registry + `--in all` resolution | W2 | `src/targets.ts` |
| S9 | `scan` + `filter` + `extract` | W3 | `src/verbs/*` |
| S10 | `cluster` (deterministic grouping) | W3 | `src/verbs/cluster.ts` |
| S11 | `find` chain (pick→seed→fetch→narrow→judge→rerank→cluster→label→emit) | W4 | `src/verbs/find.ts` |
| S12 | `decision-tree` (batch states × recipe) | W5 | `src/verbs/decision-tree.ts` |
| S13 | `route` (catalogue Choice + inject) | W5 | `src/verbs/route.ts` |
| S14 | `evaluate` + bench protocol | W5 | `src/verbs/evaluate.ts` |
| S15 | Job store + queue + resume | W1 | `src/job/*` |
| S16 | Pool scheduler + budgets + backpressure | W1 | `src/pools/*` |
| S17 | `serve` HTTP (:7777) | W6 | `src/serve.ts` |
| S18 | `mcp` tool surface | W6 | `src/mcp.ts` |
| S19 | `watch` daemon (manager-machine frame) | W6 | `src/watch.ts` |
| S20 | Fire gate: script schema + assembler + one reflex | W8 | `src/firegate/*` |

**Out of scope for v1 (explicit):** embeddings/vector search (F1 default: Jev
tags first); vision states; `@ocws` full indexing; cross-machine cache sharing;
`learn`/RSI automation (W7 is manual feedback only); a web UI.

### 7.1 Scope item detail (the build contract per item)

**S1 CLI.** `jm <verb> [flags]`; global `--json`; every run prints
`cost=$X calls=N cached=M`; exit codes: 0 ok, 2 refused/fail-closed, 1 error.

**S2 index.** Walk with include/exclude globs; per file: size+mtime fast path →
sha256 → parse → insert `files`/`docs`; unchanged files skipped; missing files
tombstoned (`state='gone'`); emits `JM_INDEX_OK files=N changed=C gone=G`.

**S3 query.** `--where` (a restricted SQL-ish predicate over the `files`/`docs`
columns), `--fts` (FTS5 MATCH), `--tag k=v` (join `tags`), `--limit`, `--json`.

**S4 store.** One `index.sqlite` per job; tables per `01-DISCOVERY.md §7`;
FTS5 virtual table `docs_fts(text)`; schema version row; migration function.

**S5 judge.** One client; providers (typesafe default); key resolution
(`TYPESAFE_API_KEY` → `~/.config/typesafe/key`); cache table; policy loader;
fail polarity per verb.

**S6 ledger.** `ledger.jsonl` append; row schema per bible §7.9; validator
rejects rows missing `policy`, `route`, `cost_usd`.

**S7 adapters.** `fs` (glob walk), `jsonl` (stream parse), `sqlite` (read-only
attach, table list, row extract). Each exposes `enumerate()` + `text(item)`.

**S8 targets.** Registry file `~/.jm/targets.json`; `jm target add|ls|rm`;
`--in a,b` / `--in all`; a target is `{name, kind, root, opts}`.

**S9 scan/filter/extract.** `scan` = seeds → candidates (BM25/regex).
`filter` = deterministic predicates then optional recipe judgments.
`extract` = structured pulls (fields, patterns, NER/relations via semantica).

**S10 cluster.** Group by (source, kind, token-signature, path); no model.

**S11 find.** The 9-stage chain (bible §6.18.3); emits the requested structure;
every pattern carries `n` + exemplar ids.

**S12 decision-tree.** Read a rows file; build states; batch ≤64; judge with one
recipe; route with the ladder; write decisions + escalation file; fail closed
without a key.

**S13 route.** Build the catalogue Choice from live skills/tools/models; judge;
on act, inject before the model sees the prompt; log runner-up probability.

**S14 evaluate.** Fixed cases + oracle labels; k repetitions; metrics
(agreement, Brier, ECE, variance, latency, $/call); `--replay` diffs routes.

**S15 job store.** `~/.jm/jobs/<id>/` with `index.sqlite`, `queue.sqlite`,
`ledger.jsonl`, `results/`; `queue` rows are crash-first and ack on completion.

**S16 pools.** Deterministic pool (N workers, no network); judge pool sized to
rate limits; budgets (`--budget-calls`, `--budget-usd`) are hard stops;
backpressure = queue depth.

**S17 serve.** `POST /decide {schema, state} → {answers, cached}`;
`POST /find`; `GET /jobs`; `GET /health`.

**S18 mcp.** Tools `jm_find`, `jm_decide`, `jm_extract`, `jm_index_status`.

**S19 watch.** manager-machine frame copied: `Supervisor`, `Desired`s
(index-watch, judge-drain, cache-gc, calibration-tick), reconcile tick, resume
plan, kill path recorded.

**S20 fire gate.** Script schema + validator (`jef validate`) + the assembler +
ONE reflex (`destructive-edit`) in OBSERVE, with I1/I3/I4 wired.

---

## §8 SUCCESS CRITERIA (mechanical)

Every row verifiable by a command, a ledger query, or the operator's eyes.

| # | Criterion | How verified | Pass |
|---|-----------|--------------|------|
| C1 | `index` completes over `@shadow` | `time jm index @shadow` | exit 0; files row count == 11,831 |
| C2 | Re-index incremental | run twice; compare wall | second run <10% of first |
| C3 | `query` returns known rows | `--where "size>2000"` | ≥1 row; ids present |
| C4 | FTS works | `--fts "<known phrase>"` | the known file in results |
| C5 | `find` returns patterns | `find "<known X>" --common 5 --structure md` | patterns.md; each pattern has n + ≥1 exemplar id |
| C6 | `decision-tree` batches | 100-scenario file | decisions.json 100 rows; escalation non-empty |
| C7 | Cache determinism | run C6 twice | second run 0 judge calls; identical output |
| C8 | Ledger completeness | `jm report --job last` | rows == decisions + runs |
| C9 | Cost line | any judged run | stdout has `cost=$…` |
| C10 | Budget cap stops | `--budget-calls 5` on 100 items | exit non-zero; cap named |
| C11 | Keyless ops | unset key; `index`/`query` | exit 0 |
| C12 | Fail-closed decisions | unset key; `decision-tree` | exit 2; zero decisions |
| C13 | Resume | `kill -9` mid-index; re-run | completes; dup=0 |
| C14 | MCP reachable | OMP session calls `jm_find` | rows returned |
| C15 | Fire gate shadow | one reflex OBSERVE for a day | firing rows; precision view non-empty |
| C16 | Twin fixtures | I1 | opposite verdicts on the pair |
| C17 | Token cap | I4 | every firing ≤5,000; `truncated` when cut |
| C18 | No Jev in stream path | I3 | zero judge calls from the matcher |
| C19 | Adversarial inputs | I6 + suite | neither throw nor silently pass |
| C20 | Docs at floor | `wc -l` | README ≥300; others ≥200 |

---

## §9 CONTAINER TEST PLAN (tool-result-bound tokens)

| # | Angle | Scenario | passToken | failToken |
|---|-------|----------|-----------|-----------|
| T1 | Fresh index | index 500-file fixture | `JM_INDEX_OK files=500` | `JM_INDEX_PARTIAL` |
| T2 | Incremental | touch 3; re-index | `JM_INDEX_DELTA=3` | `JM_INDEX_DELTA=500` |
| T3 | Cache determinism | same batch twice | `JM_CACHE_HITS=100 JM_JUDGE_CALLS=0` | `JM_JUDGE_CALLS=100` |
| T4 | Fail-closed | batch, no key | `JM_EXIT=2 JM_DECISIONS_WRITTEN=0` | `JM_DECISIONS_WRITTEN=100` |
| T5 | Crash-resume | kill -9 mid-index | `JM_RESUME_OK dup=0` | `JM_RESUME_DUP>0` |
| T6 | Budget cap | 100 items, cap 5 | `JM_BUDGET_STOPPED calls=5` | `JM_BUDGET_IGNORED` |
| T7 | Adversarial | empty/corrupt/locked/0-byte | `JM_ADVERSARIAL_SURVIVED` | `JM_THREW` |
| T8 | Fire gate twin | repair/revert pair | `JM_TWIN_OPPOSITE p1=0.9x p2=0.1x` | `JM_TWIN_SAME` |
| T9 | Token cap | oversized slice | `JM_TRUNCATED tokens=5000` | `JM_OVER_CAP` |

Tokens are emitted by passing assertions inside the harness — they cannot be
typed into existence. Every scenario runs in the container; the host runs the
same suite for parity.

---

## §10 ANTI-PATTERN LEDGER (3 categories, mechanical detections)

### 10.1 Architecture

| Anti-pattern | Detection |
|--------------|-----------|
| Judge sees a corpus | assert every judge `state_bytes` ≤ cap; violation logs `JM_STATE_OVER` |
| Key in argv/logs | grep process args + logs for the key prefix; any hit fails CI |
| Unversioned recipe edit | recipe hash must appear in the ledger's `recipe.version` |
| Unledgered run | assert `runs` row count == verb invocations in the harness |
| Target copied into store | fixture check: no corpus copy under `~/.jm/jobs/*` |

### 10.2 Decision

| Anti-pattern | Detection |
|--------------|-----------|
| Silent middle | act-band rate > 0 over a 100-item labeled fixture |
| Threshold inline | grep float literals in `src/verbs/*`, `src/firegate/*`; 0.x only in `policy.ts` |
| Counting as a question | schema validator rejects questions containing "how many"/"count"/"sum" |
| Unresolved as confirmed | ladder test asserts `precision = c/(c+r)`, u excluded |
| Per-rule firing questions | script validator rejects a gate whose subject is the rule id |

### 10.3 Testing

| Anti-pattern | Detection |
|--------------|-----------|
| Agent-typeable token | harness asserts `toolResultContext:true` |
| Mocked judge in acceptance | acceptance runs the real client (or the recorded fixture cache) |
| Green without a run | every wave report claim cites a command + exit code |
| Test bent to pass | twin fixtures fail if the gate is disabled (mutation check) |

---

## §11 PRE-WRITTEN SCRIPT TESTS

```
 tests/adapters.test.ts        fs walk, jsonl stream, sqlite read-only attach
 tests/store.test.ts           schema create, FTS5 query, incremental delta, tombstones
 tests/index.test.ts           500-file fixture: full then incremental
 tests/query.test.ts           where/fts/tag filters
 tests/cache.test.ts           fingerprint stability; second run = 0 calls
 tests/decision-tree.test.ts   100 fixtures; escalation band; fail-closed
 tests/ledger.test.ts          row count == calls; schema validation; no secrets
 tests/budget.test.ts          cap stops; partial progress checkpointed
 tests/adversarial.test.ts     empty/corrupt/locked/0-byte
 tests/firegate-i1.test.ts     twin fixtures (repair vs revert)
 tests/firegate-i4.test.ts     token cap; truncated flag
 tests/firegate-i5.test.ts     oracle loop; precision math; ladder moves
```

Each test prints its own pass token (e.g. `JM_INDEX_DELTA=3`) so the container
rig asserts it without parsing prose.

---

## §12 PRE-WRITTEN DEEP CONTAINER TESTS

```
 rig: omp-ct container, engine deployed, fixture corpora mounted
 suite A — correctness
   A1  index fixture (500 files) → query → assert known rows
   A2  find on the fixture with a known X → assert the planted exemplar
   A3  decision-tree on 100 fixtures with oracle labels → agreement ≥0.9
 suite B — resilience
   B1  kill -9 mid-index → resume → dup=0
   B2  corrupt jsonl in the corpus → skip + log, exit 0
   B3  locked sqlite → typed error, exit non-zero, no partial rows
   B4  provider timeout → fail-closed on decisions; fail-open+marked on filter
 suite C — runtime layer
   C1  fire gate in OBSERVE → firing rows, zero steers
   C2  twin fixtures → opposite verdicts (I1)
   C3  oversized slice → truncated at 5,000, capped at ADVISE (I4/L2)
   C4  injection payload in the judged stream → verdict unchanged (I6)
   C5  ladder: synthetic outcomes → promote ≥0.90/≤0.20, demote <0.70 (I5)
 suite D — cost/latency
   D1  tokens/firing p50/p95/max (≤5,000)
   D2  judge p50/p95; stream path = 0 calls (I3)
   D3  cost line on every run; reconcile against ledger `cost_usd`
```

---

## §13 OPEN DECISIONS

| # | Fork | Options | Default | Needs operator |
|---|------|---------|---------|----------------|
| F1 | Fire gate detectors | A in-extension · B TTSR + external gate call | A | **YES** |
| F2 | Pilot target | A `@ocdb` (fast) · B `@shadow` (real) | A then B | no |
| F3 | Store | A `bun:sqlite`+FTS5 · B external DB | A | no |
| F4 | Knowledge surface | A reflex store only · B JM-indexed | A (v1) | no |
| F5 | MPSE role | A facts+vetoes · B import scoring | A | no |
| F6 | Fire gate enforcement | A steer post-fire · B block until verdict | A | **YES** |
| F7 | Daemon frame | A manager-machine copy · B bespoke | A | no |
| F8 | Embeddings | A defer (Jev tags) · B add now | A | no |

---

## §14 SPEC-MANAGER GATE

```
 [x] problem statement verbatim (§3, 8 requirements quoted)
 [x] core insight stated (§6, one thesis + 3 consequences)
 [x] scope ≤20 items, wave-mapped (§7, S1–S20 + out-of-scope + per-item detail)
 [x] success criteria mechanical, 20 rows (§8, C1–C20)
 [x] container test plan ≥5 angles, tool-result-bound tokens (§9, T1–T9)
 [x] anti-pattern ledger, 3 categories, mechanical detections (§10)
 [x] pre-written script tests (§11, 12 files)
 [x] pre-written deep container tests (§12, suites A–D)
 [x] open decisions with defaults (§13, F1–F8; F1/F6 flagged)
 [x] measured anchors for every claim (§2, §5)
 [x] no invented paths/numbers; unknowns marked PROPOSED
 [x] laws cited from the bible, not restated
 [x] dispatchable: a fresh desk can build from it alone
```

**Gate verdict: PASS — dispatchable.** Two operator rulings (F1, F6) block only
Wave 8 (the runtime layer); Waves 0–7 are unblocked.

---

## §15 RESIDUAL

| # | Residual |
|---|----------|
| R1 | Host SPEC-class floor (3,000L) not met; authored to the skill's DPL1 floor (400–600L) + expansion. Grows per milestone. |
| R2 | F1/F6 unruled — Wave 8 blocked; W0–W7 unblocked. |
| R3 | The `pi` wrap points for the fire gate are unopened (see `01-DISCOVERY.md §4`). |
| R4 | FTS5 availability in bun 1.4.2 is a pre-flight, not yet run. |
| R5 | The `@ocdb` table list (`session,part,message`) is assumed, not verified. |
| R6 | Semantica extractor contracts unread (use-case C1). |
| R7 | The oracle's store schema is an interface assumption (firing_id keyed). |
| R8 | No code exists yet — this spec is a contract, not an implementation. |
