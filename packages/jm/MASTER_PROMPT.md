# MASTER_PROMPT — JM BUILD (the depth behind the /goal pin)

**Pin:** the ≤200-line `/goal` block points here for depth. **Repo:**
`Shared_Workspace/JevManager` @ `7b7f7eb`. **Package:** `packages/jm/`.
**Date:** 2026-09-21.

This document is the field manual for the run. The pin is the contract; this is
how each clause is executed, wave by wave, with the exact files, gates, and
evidence.

---

## 1. THE MISSION (one paragraph)

Build **JM** — a targetable decision engine — in `Shared_Workspace/JevManager`:
named targets (fs/sqlite/jsonl/git/opengrok/discord/sessions), named operations
(index/scan/filter/cluster/find/decision-tree/route/evaluate), one shared Jev
judge client with cache + ledger, and four surfaces (CLI, HTTP, MCP, daemon).
Then make it RUNTIME-GRADE: occupy the driver's seat on the live host, operate
it first-person, find and fix the real bugs, and seal a checkpoint. Nothing
ships on a green battery alone.

---

## 2. THE LANDING ZONE (measured 2026-09-21)

```
 repo        Shared_Workspace/JevManager @ 7b7f7eb (27 files, 25 md)
 package     packages/jm/ (2,355 lines across 6 docs)
 blueprint   docs/blueprints/JM_MASTER_BLUEPRINT_v1.md  sha 8e8502e773862578
 dpl1 spec   packages/jm/JM_DPL1_SPEC.md                sha 0183506c3977246e
 wave plan   packages/jm/06-WAVES.md                    sha 6bc93bd1af728856
 src/        EMPTY (0 files)     tests/  EMPTY (0 files)
 runtime     bun 1.4.2 · node v24.13.1 · NO system sqlite3 (bun:sqlite)
 targets     @shadow 11,831 files · @ocdb 4 DBs · @jarvis 32G · @omp 133 dirs
 siblings    opengrok UP :18080 · ripwire present · semantica MCP mounted
```

---

## 3. WAVE DETAIL (the depth the pin abbreviates)

### W0 — CORE CLI
**Files:** `src/cli.ts`, `src/store/{schema,db,fts}.ts`, `src/verbs/index.ts`,
`src/verbs/query.ts`, `src/ledger.ts`, `tests/{store,index,query,cache,ledger}.test.ts`.
**Build order:** schema → db wrapper → FTS5 virtual table → index walk (hash +
mtime fast path + tombstone) → query (where/fts/tag) → ledger writer → CLI router.
**Pre-flight:** the FTS5 check (spec §5.1). If red: declare the LIKE fallback.
**Gate:** `time jm index @shadow` exit 0 / files=11831; second run <10% wall;
`jm query` returns known rows; tests green.
**Test ids:** `test_index_incremental`, `test_store_roundtrip`,
`test_query_known_rows`, `test_ledger_rows_match_calls`.

### W1 — JOB RUNTIME
**Files:** `src/job/{store,queue,resume}.ts`, `src/pools/{det,judge,eval}.ts`.
**Build order:** job dir layout → queue table (crash-first, ack) → resume sweep →
deterministic pool → judge pool (rate-aware) → budget caps.
**Gate:** `kill -9` mid-index then re-run → `test_resume_no_dup` green; budget cap
stops a runaway with the cap named.

### W2 — TARGETS
**Files:** `src/targets.ts`, `src/adapters/{fs,jsonl,sqlite}.ts`.
**Gate:** `jm target add` → `jm query --in @shadow,@ocdb` returns rows from both;
`test_adapter_delta` green; no corpus copy under `~/.jm/jobs`.

### W3 — RETRIEVE
**Files:** `src/verbs/{scan,filter,extract,cluster}.ts`, `src/recipes/*.json`.
**Recipes shipped:** screening-escalate, is-x, relevance, dup-pair.
**Gate:** B1 triage on `@shadow` returns reviewable rows with ids + band counts.

### W4 — FIND
**Files:** `src/verbs/find.ts`.
**Chain:** pick-sources → seeds → fetch(BM25) → narrow → judge(Noul) → rerank
(Score) → cluster → label(Choice) → emit(Y).
**Gate:** `test_find_patterns` green; patterns.md carries n + exemplar ids; the
yield trend prints.

### W5 — DECIDE
**Files:** `src/verbs/{decision-tree,route,evaluate}.ts`.
**Gate:** 100-scenario batch → 100 rows + escalation file; second run
`test_cache_zero_calls` (JM_CACHE_HITS=100 JM_JUDGE_CALLS=0); key off →
`test_decision_fail_closed` (exit 2, zero written); bench table exists.

### W6 — SURFACES
**Files:** `src/serve.ts`, `src/mcp.ts`, `src/watch.ts`.
**Gate:** `curl :7777/decide` returns answers; an OMP session calls `jm_find` and
receives rows; the watch daemon ticks with a recorded kill path.

### W7 — CALIBRATE
**Files:** `src/verbs/report.ts`, `src/calibrate.ts`.
**Gate:** ≥100 rows with later_truth; a threshold move recorded as a row.

### W8 — FIRE GATE (blocked on F1/F6 rulings)
**Files:** `src/firegate/*`, `reflexes/destructive-edit.reflex.yaml`.
**Gate:** `jef validate` refuses a gateless script; `test_firegate_twin` green
(opposite verdicts on the same-shape pair); I4 token cap ≤5,000.

---

## 4. THE RUNTIME SEAT PLAN (the hot seat, planned before it is taken)

**The instance:** the live JM CLI + `jm serve` on this host, operated against the
real `@shadow` corpus and the real TypeSafe endpoint. Name: `jm-live-01`;
identity: the built `src/` tree at the deployed commit + the `~/.jm/` store.

**The operation script (pre-registered expectations, numbered):**
```
 OP-01  jm target add shadow fs …                 expect: registry row
 OP-02  jm index @shadow                          expect: files=11831, cost=$0
 OP-03  jm index @shadow (again)                  expect: <10% wall, delta=0
 OP-04  jm query @shadow --where "size>2000"      expect: ≥1 row, ids
 OP-05  jm query @shadow --fts "<known phrase>"   expect: the known file
 OP-06  jm find "<X>" --in @shadow --common 5     expect: patterns.md w/ ids
 OP-07  jm decision-tree --rows 100 --recipe …    expect: 100 rows + bands
 OP-08  (rerun OP-07)                             expect: 0 judge calls
 OP-09  unset key; decision-tree                  expect: exit 2, zero written
 OP-10  kill -9 during index; rerun               expect: dup=0
 OP-11  curl :7777/decide                         expect: answers JSON
 OP-12  N=4 concurrent queries                    expect: each completes, no clobber
```
**The push set:** double-apply, concurrent N, kill mid-operation, missing key,
locked sqlite, corrupt jsonl, 0-byte include, oversized slice.
**Zero bugs found is a red flag** — the seat report must contain the surprises.

---

## 5. THE ADVERSARIAL CORPUS PLAN

**Surface map (before probes):** every exported decision function in
`src/verbs/*`, `src/judge/*`, `src/store/*`, `src/firegate/*` — each gets a probe.
**Corpus per function:** positive (must fire) + negative (must not) + edge
(empty/null/unicode/huge/repeat) + evasion family (path tricks, encoding, glob
traps, partial matches).
**Runtime binding:** probes run against the DEPLOYED CLI + live store, each
naming the bundle/commit sha — never a source import.
**Adjudication:** every probe failure goes both ways (my expectation wrong? /
real defect?) before any fix; probe errors are recorded as probe errors.
**Termination:** a full pass with ZERO confirmed defects + a clean docs sweep +
the unswept frontier explicitly named.

---

## 6. THE DOC PLAN

**Canon (11)** in `context_management/`: create at W0, maintain after EVERY wave;
the 2 logs (RUNNING_BUILD_LOG, RUNNING_DEBUG_LOG) update at the moment of work.
**Ship (6)** at the repo root: BUILD_REPORT, DEBUG_LOG, FAILURE_LOG,
SPEC_VIOLATION_LOG, TESTING_LOG, THEATRICALITY_LOG — append-only; DEBUG/FAILURE
first; the AUDIT GATE line wired into all of them.
**Floors:** canon docs 200+ lines with ≥3 file:line refs; BUILD_REPORT + DEBUG_LOG
500+; the log docs 100+; README 300+; generic 200+.

---

## 7. THE CHECKPOINT PLAN

**Round-zero:** BEFORE W1 dispatch, save `Checkpoints/jm-design-baseline-7b7f7eb/`
(this repo's current state: docs + package; src is empty and that is recorded).
**Seal mode:** Mode B (no lock) — the build will receive follow-up fixes.
**Final checkpoint at P7:** `Checkpoints/jm-v0-<sha16>-waves-green/` carrying the
full `src/` tree, the built artifact + sha, the 11 canon docs, all 6 ship docs
(absences recorded), the spec + artifacts, CHECKPOINT_MANIFEST with honest gaps.

---

## 8. THE PARALLEL DISCIPLINE (how the waves actually run)

```
 T0  W0 lands the shared contracts: the store schema, the judge client
     signature, the ledger row shape, the CLI router. INTERFACES FIRST.
 T1  once W0's interfaces compile: W1 (runtime), W2 (adapters), W3 (retrieve)
     dispatch CONCURRENTLY — disjoint files, no shared mutations.
 T2  W4 (find) consumes W3's retrieval API; W5 (decide) consumes W0's judge
     client. Both start the moment their dependency's TYPES land, not its body.
 T3  W6 (surfaces) wraps the verb functions; the only serialization point is
     the integration wave where MCP/HTTP call the real verbs.
 T4  W7 (calibrate) needs rows; it runs after W5's first real batch.
 T5  W8 (fire gate) is PARKED until F1/F6 and the pi wrap points are opened.
```
**Cross-wave contracts (frozen before dispatch):** the judge signature
`judge(state, recipe, opts) -> {answers, route, row}`, the ledger row schema,
the store tables, the target schema, the recipe schema, the pass-token convention
`JM_<VERB>_<FIELD>=<value>`.

---

## 9. WHAT FAILS THE RUN ON SIGHT

1. A wave marked complete on a subagent's word (audit or it is not done).
2. A fabricated PASS — a token asserted in prose rather than a tool result.
3. A full re-hash as the default index path (C2 exists to catch it).
4. A judge call without a cache lookup; a decision without a ledger row.
5. Thresholds inline; recipes unversioned; keys in argv/logs/rows.
6. Scope shrink under pressure; approval-gating required work.
7. A green battery presented as capability (the 30% failure class).

---

## 10. THE HONEST GAPS CARRIED INTO THE RUN

1. FTS5 availability in bun 1.4.2 is unverified (the W0 pre-flight decides).
2. `@ocdb`'s table list (`session,part,message`) is assumed, not read.
3. The oracle store schema (for W8) is an interface assumption.
4. F1/F6 rulings are owed; W8 is blocked until they land.
5. The host doc-gate's SPEC class wants 3,000 lines; the DPL1 honors the skill's
   400–600 floor and records the conflict (residual R1 in the package index).

---

## 11. RESUME POINTERS (disk, not memory)

```
 repo         Shared_Workspace/JevManager
 package      packages/jm/{00-MISSION,01-DISCOVERY,JM_DPL1_SPEC,06-WAVES,07-GOALS,00-INDEX}.md
 designs      docs/blueprints/ (master blueprint, engine, v0.1, siblings)
 substrate    docs/bibles/JEV_ENGINEERING_BIBLE.md
 gates        packages/jm/JM_DPL1_SPEC.md §8 (C1–C20) + §9 (T1–T9)
 waves        packages/jm/06-WAVES.md §0 map + per-wave sections
 seats        packages/jm/07-GOALS.md (9 goal prompts)
```

A fresh session resumes from DISK, never from the pin's frozen numbers.
