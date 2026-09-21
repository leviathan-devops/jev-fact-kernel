# 06 — WAVES

**Package:** `packages/jm/` · **Step:** 6 (wave structure)
**Rule:** no wave starts with its predecessor's gate unmet. Every gate is a
measured artifact — a command output, a row count, a test result — never a claim.

---

## 0. The wave map

```
 W0  CORE CLI        index · query · find · decision-tree · route · cache · ledger
      gate: index @shadow twice; second run <10% wall; C1–C5 green
        │
 W1  JOB RUNTIME     store layout · queue · resume · pools · budgets
      gate: kill -9 mid-index → re-run completes with dup=0 (C13)
        │
 W2  TARGETS         registry · adapters fs/jsonl/sqlite · --in all
      gate: --in @shadow,@ocdb end-to-end; C11 green
        │
 W3  RETRIEVE        scan · filter · extract · cluster + first recipes
      gate: B1 triage on @shadow returns reviewable rows with ids
        │
 W4  FIND            the 9-stage chain + pattern synthesis (C4)
      gate: patterns.md with n + exemplar ids on a known X (C5)
        │
 W5  DECIDE          decision-tree at scale · evaluate · bench
      gate: 100-scenario batch + bench table; C6–C10 green
        │
 W6  SURFACES        serve :7777 · mcp tools · watch daemon
      gate: an OMP session calls jm_find and receives rows (C14)
        │
 W7  CALIBRATE       later-truth fill · threshold tuning · RSI (manual)
      gate: a threshold moves on recorded evidence
        │
 W8  FIRE GATE       script schema · assembler · ONE reflex in OBSERVE
      gate: I1 twin fixtures → opposite verdicts (C16)
```

Dependency rule: W1 enables W2–W6 (the job runtime is the substrate); W3 enables
W4; W4 enables W5's find-based eval; W6 requires W5 (the surfaces expose the
verbs); W8 requires W3 (the assembler reuses the retrieval layer) and F1.

Parallelism: W2 and W3 can run concurrently once W1 lands (different files:
`src/targets.ts`+adapters vs `src/verbs/scan|filter|extract|cluster.ts`).

---

## 1. W0 — CORE CLI

**Desk roster:** one builder desk (or two: `store+index` and `verbs+judge`).
**File ownership:** `src/cli.ts`, `src/store/*`, `src/judge/*`, `src/ledger.ts`,
`src/verbs/{index,query}.ts`, `tests/{store,index,query,cache,ledger}.test.ts`.

**Entry criteria:** the pre-flight FTS5 check passes (§5.1 of the spec).
**Deliverables:** S1–S6 (CLI router, index, query, store, judge, ledger).
**Exit gate:**

```
 bun test tests/            → green
 time jm index @shadow      → exit 0; files=11831
 time jm index @shadow      → <10% of the first run's wall
 jm query @shadow --where "size>2000"  → ≥1 row with ids
 jm query @shadow --fts "<known phrase>" → the known file
```

**Acceptance evidence:** the four command outputs pasted into the wave report.

---

## 2. W1 — JOB RUNTIME

**Desk roster:** one builder desk.
**File ownership:** `src/job/*`, `src/pools/*`, `tests/budget.test.ts`,
`tests/resume.test.ts`.

**Entry criteria:** W0 green.
**Deliverables:** S15–S16 (job store + queue + resume; pools + budgets).
**Exit gate:**

```
 jm index @shadow &  ; kill -9 <pid> ; jm index @shadow   → completes; dup=0
 jm decision-tree --rows big.jsonl --budget-calls 5       → exit non-zero; cap named
 bun test tests/budget.test.ts tests/resume.test.ts        → green
```

**Acceptance evidence:** the resume run's row-count comparison (dup=0) and the
budget run's stderr.

---

## 3. W2 — TARGETS

**Desk roster:** one builder desk.
**File ownership:** `src/targets.ts`, `src/adapters/*`, `tests/adapters.test.ts`.

**Entry criteria:** W1 green.
**Deliverables:** S7–S8 (adapters + registry + `--in all`).
**Exit gate:**

```
 jm target add shadow fs ~/.local/share/opencode/storage --include '*.json,*.jsonl'
 jm target add ocdb sqlite ~/.local/share/opencode/opencode.db --tables session,part,message
 jm target ls                                             → 2 rows
 jm query --in @shadow,@ocdb --limit 5                    → rows from both
 bun test tests/adapters.test.ts                           → green
```

**Acceptance evidence:** the `target ls` table + a mixed-target query result.

---

## 4. W3 — RETRIEVE

**Desk roster:** two desks (deterministic verbs; recipe layer).
**File ownership:** `src/verbs/{scan,filter,extract,cluster}.ts`,
`src/recipes/*.json`, `tests/{scan,filter,extract,cluster}.test.ts`.

**Entry criteria:** W2 green.
**Deliverables:** S9–S10 + the first recipe set (screening-escalate, is-x,
relevance, dup-pair).
**Exit gate:**

```
 jm scan @shadow --seeds '<a known token>' | jm filter --recipe is-x | jm cluster
   → reviewable rows with ids; act/escalate/noop counts printed
 bun test tests/scan.test.ts tests/filter.test.ts tests/extract.test.ts → green
```

**Acceptance evidence:** the B1 triage output (rows + band counts) + the recipe
JSON files listed.

---

## 5. W4 — FIND

**Desk roster:** one builder desk.
**File ownership:** `src/verbs/find.ts`, `tests/find.test.ts`.

**Entry criteria:** W3 green.
**Deliverables:** S11 (the 9-stage chain).
**Exit gate:**

```
 jm find "<known X>" --in @shadow --common 5 --structure md --pick-sources --rerank
   → patterns.md; each pattern: n, sources, ≥1 exemplar with an id
 bun test tests/find.test.ts → green
```

**Acceptance evidence:** the patterns.md head (first 40 lines) + the yield trend
line (fetched → judged → kept → clusters).

---

## 6. W5 — DECIDE

**Desk roster:** two desks (decision-tree; evaluate/bench).
**File ownership:** `src/verbs/{decision-tree,route,evaluate}.ts`,
`tests/{decision-tree,route,evaluate}.test.ts`.

**Entry criteria:** W4 green.
**Deliverables:** S12–S14.
**Exit gate:**

```
 jm decision-tree --rows scenarios100.jsonl --criteria policy.md \
   --context "…" --recipe screening-escalate --out decisions.json
   → 100 rows; escalation file non-empty; cost line printed
 <re-run>  → 0 judge calls; identical decisions.json
 jm evaluate --runs fixtures/ --rubric rubric.md → bench table
 bun test tests/decision-tree.test.ts tests/route.test.ts tests/evaluate.test.ts → green
```

**Acceptance evidence:** the decisions.json row count, the second run's
`calls=0 cached=100`, and the bench table.

---

## 7. W6 — SURFACES

**Desk roster:** two desks (serve+mcp; watch).
**File ownership:** `src/serve.ts`, `src/mcp.ts`, `src/watch.ts`,
`tests/{serve,mcp,watch}.test.ts`.

**Entry criteria:** W5 green.
**Deliverables:** S17–S19.
**Exit gate:**

```
 jm serve --port 7777 & ; curl -X POST :7777/decide -d '{schema,state}' → answers
 # in an OMP session: call jm_find("<X>") → rows returned to the agent
 jm watch &  → reconcile tick fires; journal row per action; kill path recorded
 bun test tests/serve.test.ts tests/mcp.test.ts → green
```

**Acceptance evidence:** the curl response, the agent's tool-call transcript,
the watch journal tail.

---

## 8. W7 — CALIBRATE

**Desk roster:** one desk + the operator (the later-truth filler).
**File ownership:** `src/verbs/report.ts`, `src/calibrate.ts`.

**Entry criteria:** W6 green; ≥100 ledger rows with `later_truth` filled.
**Deliverables:** threshold tuning from recorded outcomes; the monitoring table.
**Exit gate:**

```
 jm report --calibrate → per-recipe agreement/Brier/ECE/variance
 a threshold change → recorded as a calibration row; the diff is in the ledger
```

**Acceptance evidence:** the calibration table + the threshold-change row.

---

## 9. W8 — FIRE GATE

**Desk roster:** one desk; **blocked on F1 + F6 rulings**.
**File ownership:** `src/firegate/*`, `reflexes/destructive-edit.reflex.yaml`,
`tests/firegate-*.test.ts`.

**Entry criteria:** W3 green + F1/F6 ruled + the `pi` wrap points opened.
**Deliverables:** S20 (schema + validator + assembler + one reflex in OBSERVE).
**Exit gate:**

```
 jef validate reflexes/*.reflex.yaml   → exit 0; a gateless script is refused (L1)
 jef shadow-report --reflex destructive-edit → firing rows; zero steers
 bun test tests/firegate-i1.test.ts    → twin fixtures opposite verdicts
 bun test tests/firegate-i4.test.ts    → tokens ≤5000; truncated flag
```

**Acceptance evidence:** the validator's refusal of a gateless script, the
shadow report, and the twin-fixture probabilities.

---

## 10. Desk roster summary

| Desk | Waves | Ownership | Mode |
|------|-------|-----------|------|
| `core-store` | W0 | store, index, ledger | build |
| `core-verbs` | W0, W3 | query, scan, filter, extract, cluster | build |
| `judge` | W0, W5 | judge client, cache, policy, decision-tree, evaluate | build |
| `runtime` | W1 | job store, queue, pools, budgets | build |
| `adapters` | W2 | targets registry, fs/jsonl/sqlite adapters | build |
| `find` | W4 | the 9-stage chain | build |
| `surfaces` | W6 | serve, mcp, watch | build |
| `firegate` | W8 | script schema, assembler, one reflex | build |
| `audit` | every wave | independent verification of each gate | audit |

**Cross-desk contract (decided up front, not negotiated mid-flight):**

```
 the judge client signature:  judge(state, recipe, opts) → {answers, route, row}
 the ledger row schema:       bible §7.9 (fixed field set)
 the store schema:            01-DISCOVERY.md §7 (fixed tables)
 the recipe schema:           {recipe, version, status, questions, policy}
 the target schema:           {name, kind, root, opts}
 the pass-token convention:   JM_<VERB>_<FIELD>=<value> in tool results
```

Any desk needing a change to one of these stops and escalates; changing a
contract mid-wave invalidates the sibling's tests.

---

## 11. What must NOT happen (per-wave traps)

| Wave | Trap | Guard |
|------|------|-------|
| W0 | full re-hash every run | the incremental test (C2) is the gate |
| W0 | judge called per file | assert judge calls == batches, not files |
| W1 | resume duplicates rows | the dup=0 assertion |
| W2 | adapter copies a corpus | the store-size fixture check |
| W3 | recipe thresholds inline | the float-literal grep (§10.2) |
| W4 | judge sees all candidates | the ≥100× narrowing assertion |
| W5 | decisions without a key succeed | the fail-closed test (C12) |
| W6 | MCP tool returns prose | the rows-only assertion |
| W7 | thresholds moved without data | the calibration-row requirement |
| W8 | reflex fires on shape alone | the gateless-script refusal (L1) |

---

## 12. Timeline (dependency-ordered, not calendar-committed)

```
 W0 ──▶ W1 ──▶ W2 ──▶ W3 ──▶ W4 ──▶ W5 ──▶ W6 ──▶ W7
                      └──────────────────────────────▶ W8 (needs W3 + F1/F6)
```

Estimated effort per wave is deliberately not stated as a date; each gate is a
measured artifact, and a wave is done when its gate is green, not when a
calendar says so. The first five gates (W0–W2) are the critical path to
something usable.
