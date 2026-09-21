# 07 — GOALS + HYDRA ORGANIZATION

**Package:** `packages/jm/` · **Step:** 7 (goal prompts + the org chart)
**Rule:** every goal prompt carries the anchor file list, the laws, the battery,
the stop condition, and the forbidden list. A desk that finishes without its
stop condition is not done; a desk that violates a law fails the wave.

---

## 1. The hydra org chart

```
                        ┌──────────────────────────┐
                        │  ORCHESTRATOR (primary)  │
                        │  owns: wave order, gate  │
                        │  adjudication, the board │
                        └────────────┬─────────────┘
                                     │
        ┌───────────────┬────────────┼────────────┬───────────────┐
        ▼               ▼            ▼            ▼               ▼
  ┌───────────┐  ┌───────────┐ ┌──────────┐ ┌──────────┐  ┌────────────┐
  │ core-store│  │ core-verbs│ │  judge   │ │ runtime  │  │  adapters  │
  │   W0      │  │  W0, W3   │ │ W0, W5   │ │   W1     │  │    W2      │
  └───────────┘  └───────────┘ └──────────┘ └──────────┘  └────────────┘
        │               │            │            │               │
        └───────────────┴────────────┴────────────┴───────────────┘
                                     │
                          ┌──────────┴──────────┐
                          ▼                     ▼
                    ┌───────────┐        ┌────────────┐
                    │   find    │        │  surfaces  │
                    │   W4      │        │    W6      │
                    └───────────┘        └────────────┘
                                     │
                          ┌──────────┴──────────┐
                          ▼                     ▼
                    ┌───────────┐        ┌────────────┐
                    │  firegate │        │   audit    │
                    │   W8      │        │ every wave │
                    └───────────┘        └────────────┘
```

**Escalation paths.** A desk blocked on a cross-desk contract → the
orchestrator (never a sibling directly). A gate that fails twice → the
orchestrator re-scopes the wave. An operator ruling needed (F1/F6) → the
orchestrator surfaces it; the affected desk stays parked.

**Modes.** All desks run in `build` mode except `audit`, which runs `audit`
(read-only, produces verdicts). The `firegate` desk runs `build` but its reflex
ships in `OBSERVE` (log-only) — it never steers in W8.

---

## 2. THE SHARED LAW BLOCK (pasted into every goal prompt)

```
 LAWS (binding on every desk)
  L1  DETERMINISTIC-FIRST   code narrows ≥100× before any Jev call.
  L2  BOUNDED STATE         ≤2KB/item; ≤64 items/request; ≤5k tokens per firing.
  L3  LEDGER OR IT DID NOT HAPPEN   every run writes rows.
  L4  FAIL POLARITY         decision verbs fail closed; index/scan keyless.
  L5  CACHE-FIRST           fingerprint = sha256(model ⊕ schema ⊕ canonical(redact(state))).
  L6  TARGETS ARE POINTERS  read-only attach; never copy a corpus into the store.
  L7  SHADOW-FIRST          nothing steers before reviewed shadow rows.
  L8  NO SECRETS            keys env/file only; never argv, logs, rows, chat.
  L9  VERSION EVERYTHING    recipes, schemas, scripts carry versions.
  L10 COMPOSE               never re-implement opengrok/ripwire/semantica/manager-machine.
  L11 STRUCTURE CONTRACT    every op emits md|json|csv or exits non-zero.
  L12 EVIDENCE              every claim cites a command + exit code, or it is a wish.

 BATTERY (every desk runs, in this order)
  bun test tests/          → green
  bunx tsc --noEmit        → exit 0
  <the wave's gate commands> → pasted output

 FORBIDDEN (every desk)
  Jev in the 50ms stream path · counting via Jev · raw dumps as state ·
  blocking a tool on a verdict · unversioned recipe edits · keys in argv/logs ·
  re-implementing a sibling · padding a doc to a floor.
```

---

## 3. GOAL PROMPT — desk `core-store` (W0)

**Mission.** Build the CLI router, the store layer (`bun:sqlite` + FTS5), the
incremental `index` verb, and the append-only ledger writer, so that
`jm index @shadow` completes over 11,831 files and re-runs incrementally.

**Anchor files (read first).**
`docs/blueprints/JM_JevManager_Blueprint_v0.1.md` §9 (the file layout) ·
`packages/jm/01-DISCOVERY.md` §7 (the store schema) ·
`docs/bibles/JEV_ENGINEERING_BIBLE.md` §7.9 (the ledger row schema).

**Deliverables.** `src/cli.ts` · `src/store/{schema,db,fts}.ts` ·
`src/verbs/index.ts` · `src/ledger.ts` · `tests/{store,index,ledger}.test.ts`.

**Stop condition (mechanical).**
```
 time jm index @shadow            → exit 0; files row count == 11831
 time jm index @shadow            → second run <10% of the first's wall
 jm query @shadow --where "size>2000" → ≥1 row with ids
 bun test tests/                  → green
```

**Forbidden.** A full re-hash as the default path; any network call in `index`;
writing the index anywhere but `~/.jm/`.

---

## 4. GOAL PROMPT — desk `judge` (W0, W5)

**Mission.** Build the shared judge client, the cache, the policy loader, and
the `decision-tree` + `evaluate` verbs, so that a 100-scenario batch produces
decisions with an escalation band, fails closed without a key, and reproduces
identically on the second run.

**Anchor files.** `docs/bibles/JEV_ENGINEERING_BIBLE.md` §6.19 (transport
shapes) + §7.9 (ledger) + §6.4 (thresholds) + §6.7 (cache) ·
`docs/blueprints/JM_V1_TARGETABLE_DECISION_ENGINE_BLUEPRINT.md` §4 (surfaces).

**Deliverables.** `src/judge/{client,providers,cache,chunk,policy}.ts` ·
`src/verbs/{decision-tree,evaluate}.ts` · `src/recipes/*.json` ·
`tests/{cache,decision-tree,budget}.test.ts`.

**Stop condition.**
```
 jm decision-tree --rows scenarios100.jsonl --criteria policy.md --recipe screening-escalate
   → 100 rows; escalation file non-empty; cost line printed
 <re-run> → JM_CACHE_HITS=100 JM_JUDGE_CALLS=0; identical decisions.json
 unset the key; jm decision-tree → exit 2; zero decisions written
 bun test tests/ → green
```

**Forbidden.** Thresholds inline (they live in `policy.ts`); a judge call
without a cache lookup; prose output where a structure was requested.

---

## 5. GOAL PROMPT — desk `runtime` (W1)

**Mission.** Build the job store, the crash-safe queue, the resume sweep, and
the pool scheduler with hard budgets, so that a `kill -9` mid-index leaves no
duplicates and a budget cap provably stops a runaway.

**Anchor files.** `KNOWLEDGE_LIBRARY/agent_plugin_boilerplates/manager-machine`
(the frame to copy) · `docs/blueprints/JM_V1_..._BLUEPRINT.md` §3 (the compute
model).

**Deliverables.** `src/job/{store,queue,resume}.ts` · `src/pools/{det,judge,eval}.ts` ·
`tests/{resume,budget}.test.ts`.

**Stop condition.**
```
 jm index @shadow & ; kill -9 <pid> ; jm index @shadow → completes; JM_RESUME_OK dup=0
 jm decision-tree --rows big.jsonl --budget-calls 5   → exit non-zero; cap named
 bun test tests/resume.test.ts tests/budget.test.ts    → green
```

**Forbidden.** Losing a partial run's progress; a bare terminate without a
checkpoint+resume row; sizing the judge pool to CPU instead of rate limits.

---

## 6. GOAL PROMPT — desk `adapters` (W2)

**Mission.** Build the target registry and the fs/jsonl/sqlite adapters, so a
single query can span `@shadow` and `@ocdb`.

**Anchor files.** `01-DISCOVERY.md` §1.2 (the corpora) · the JARVIS discord
client (the adapter pattern reference) · bible §6.2 (state engineering).

**Deliverables.** `src/targets.ts` · `src/adapters/{fs,jsonl,sqlite}.ts` ·
`tests/adapters.test.ts`.

**Stop condition.**
```
 jm target add shadow fs … ; jm target add ocdb sqlite …
 jm target ls → 2 rows
 jm query --in @shadow,@ocdb --limit 5 → rows from both
 bun test tests/adapters.test.ts → green
```

**Forbidden.** Copying target content into the store; writing to a source DB;
silently skipping an unreadable target (log it).

---

## 7. GOAL PROMPT — desk `find` (W4)

**Mission.** Build the 9-stage find chain (pick → seed → fetch → narrow → judge
→ rerank → cluster → label → emit) so a fuzzy target returns patterns in the
requested structure with exemplar ids.

**Anchor files.** bible §6.18.3 (the chain, verbatim) · §6.11.3 (the fresh-menu
law) · `docs/blueprints/JM_V1_..._BLUEPRINT.md` §5 B/C.

**Deliverables.** `src/verbs/find.ts` · `tests/find.test.ts`.

**Stop condition.**
```
 jm find "<known X>" --in @shadow --common 5 --structure md --pick-sources --rerank
   → patterns.md; each pattern: n, sources, ≥1 exemplar id
 bun test tests/find.test.ts → green
```

**Forbidden.** Sending all candidates to the judge; emitting prose when a
structure was requested; a pattern without an exemplar id.

---

## 8. GOAL PROMPT — desk `surfaces` (W6)

**Mission.** Expose the engine over HTTP, MCP, and a daemon, so any process and
any agent session can reach it.

**Anchor files.** `docs/bibles/JEV_ENGINEERING_BIBLE.md` §6.17 (the integration
stack) · manager-machine (the daemon frame) · the OMP extension envelope
(`JARVIS/extension/jarvis-manager.ts`).

**Deliverables.** `src/serve.ts` · `src/mcp.ts` · `src/watch.ts` ·
`tests/{serve,mcp,watch}.test.ts`.

**Stop condition.**
```
 curl -X POST :7777/decide -d '{schema,state}' → answers JSON
 an OMP session calls jm_find("<X>") → rows returned
 jm watch → reconcile tick fires; journal row per action; kill path recorded
 bun test tests/serve.test.ts tests/mcp.test.ts → green
```

**Forbidden.** A surface that bypasses the shared client (cache/ledger holes);
returning prose from an MCP tool; a daemon with no kill path.

---

## 9. GOAL PROMPT — desk `audit` (every wave)

**Mission.** Independently verify each wave's gate. You do not build; you
falsify.

**Method.** Re-run the wave's gate commands yourself. Check the ledger rows
against the claim. Grep for the anti-patterns (§10 of the spec). For every
claim in the wave report, demand the command and the exit code.

**Stop condition.** A written verdict per wave: PASS / REFUTED (with the
contradicting output) / UNVERIFIABLE (with the reason). A wave does not
advance on an unwritten verdict.

**Forbidden.** Accepting a desk's own report as evidence; fixing what you find
(report it; the owning desk fixes it); a verdict without pasted output.

---

## 10. GOAL PROMPT — desk `firegate` (W8, blocked on F1/F6)

**Mission.** Build the reflex script schema, the validator, the assembler, and
ONE reflex (`destructive-edit`) in OBSERVE.

**Anchor files.** `docs/blueprints/JM_MASTER_BLUEPRINT_v1.md` (the whole design,
691L) — specifically §7.1 (the script), §3 (the assembler families), §5 (the
laws), §6 (the instruments).

**Deliverables.** `src/firegate/{schema,validate,assemble,gate,route}.ts` ·
`reflexes/destructive-edit.reflex.yaml` · `tests/firegate-{i1,i3,i4}.test.ts`.

**Stop condition.**
```
 jef validate reflexes/*.reflex.yaml → exit 0; a gateless script is refused
 jef shadow-report --reflex destructive-edit → firing rows; zero steers
 bun test tests/firegate-i1.test.ts → JM_TWIN_OPPOSITE p1=0.9x p2=0.1x
 bun test tests/firegate-i4.test.ts → JM_TRUNCATED tokens=5000
```

**Forbidden.** Firing on shape alone (L1); a firing without a row (L8); the
gate in the 50ms path (L6); counting UNRESOLVED as CONFIRMED (L4).

---

## 11. The stop-condition contract (why every goal ends the same way)

Every goal prompt above ends with a mechanical stop. The reason is the failure
class this package exists to prevent: a desk that "finishes" by describing what
it would do. The contract:

```
 DONE ⟺ the gate commands were run THIS TURN
        AND their output is pasted
        AND the exit codes are stated
        AND the ledger/test artifacts exist on disk

 Anything else is PROGRESS, not DONE.
```

A desk that reports progress is not failed — it is not finished. The
orchestrator re-issues the goal with the missing evidence named.

---

## 12. Handoff points

| From | To | Handoff artifact |
|------|----|------------------|
| this package | the first desk | `JM_DPL1_SPEC.md` + `06-WAVES.md` + the anchor files |
| W0 desk | W1 desk | the green W0 gate output + the store schema in code |
| W1 desk | W2/W3 desks | the job store layout + the queue API |
| W3 desk | W4 desk | the retrieval layer API (`scan`/`filter`) |
| W5 desk | W6 desk | the verb surface (every verb callable as a function) |
| W6 desk | W7 desk | the ledger with rows + the calibration entry point |
| W3 desk | W8 desk | the assembler's retrieval primitives |
| every desk | `audit` | the wave report + the gate output |

Each handoff names a *code* artifact, not a document — a wave that hands off
only prose has not handed off.
