# 00 — PACKAGE INDEX

**Package:** `packages/jm/` · **Repo:** `Shared_Workspace/JevManager`
**Built:** 2026-09-21 · **Step:** 8 (package + handoff)
**Status:** package COMPLETE for waves W0–W7; W8 blocked on two operator rulings.

---

## 1. The package contents (every file, its role, its gate)

| File | Role | Gate |
|------|------|------|
| `00-MISSION.md` | the mission verbatim, constraints, forbidden list, open questions, risk register | read by every desk first |
| `01-DISCOVERY.md` | the measured landing zone, the variant table, the command log, interface sketches | anchors every claim in the spec |
| `JM_DPL1_SPEC.md` | the 14-section dispatchable build spec | §14 spec-manager gate = PASS |
| `06-WAVES.md` | W0–W8 with per-wave gates, desk roster, traps | no wave starts unmet |
| `07-GOALS.md` | 9 goal prompts (one per desk) + the hydra org chart + the stop-condition contract | each prompt ends in a mechanical stop |
| `00-INDEX.md` | this file | the package's own map |

**Package completion test (build-package Step 8):** every spec gate green ✓ ·
every document at its floor (see §4) — partial · a fresh agent could build from
the package alone ✓.

---

## 2. The repo map (the package inside its home)

```
 Shared_Workspace/JevManager/
 ├── README.md                          the repo front door
 ├── .gitignore                         (added with W0)
 ├── docs/
 │   ├── blueprints/
 │   │   ├── JM_MASTER_BLUEPRINT_v1.md               the fire gate (v1 MASTER)
 │   │   ├── JM_V1_TARGETABLE_DECISION_ENGINE_...md  the engine + catalog
 │   │   ├── JM_JevManager_Blueprint_v0.1.md         the v0.1 (Wave 0 scope)
 │   │   ├── JevClaimFirewall_Blueprint.md           sibling: the close path
 │   │   ├── WarheadsAbide_Master_Blueprint_v1.md    sibling: enforcement
 │   │   └── JevOmpCopilot_Master_Blueprint_v1.md    sibling: copilot line
 │   ├── bibles/
 │   │   ├── JEV_ENGINEERING_BIBLE.md                3,006L substrate
 │   │   ├── JevSWE_Bible_ShowMe_v1.md               v1
 │   │   ├── JevSWE_Bible_ShowMe_v2.md               v2
 │   │   └── JevCopilot_ShowMe_v1.md                 thin
 │   ├── packages/
 │   │   └── JevRuntimeIntelligence_meta_architecture_package/  (7 files)
 │   └── handovers/
 │       ├── JEV_ABIDE_BEHAVIOR_POLICING_CONTEXT_HANDOVER.md
 │       └── JEV_ABIDE_CONTEXT_HANDOVER.zip
 ├── packages/jm/
 │   ├── 00-MISSION.md
 │   ├── 01-DISCOVERY.md
 │   ├── JM_DPL1_SPEC.md
 │   ├── 06-WAVES.md
 │   ├── 07-GOALS.md
 │   └── 00-INDEX.md                     this file
 ├── src/                                (empty — W0 writes the first file)
 ├── reflexes/                           (empty — W8)
 ├── tests/                              (empty — W0)
 └── ledger/                             (empty — first run)
```

---

## 3. The read order for each consumer

| Consumer | Order |
|----------|-------|
| The operator (deciding) | README §9 status → `00-MISSION.md` §6 open questions → `06-WAVES.md` §0 map |
| The first builder desk | `JM_DPL1_SPEC.md` §3/§6/§7 → `06-WAVES.md` W0 → `07-GOALS.md` §3 |
| A later wave's desk | `07-GOALS.md` (its section) → the anchor files it names → the spec's §10 anti-patterns |
| The audit desk | `JM_DPL1_SPEC.md` §8/§10 → `06-WAVES.md` (the wave's gate) → the wave report |
| A future session | README §4 read order → the bible → this package |
| An outside system (integrator) | `docs/blueprints/JM_V1_...` §4 surfaces → `docs/bibles/...` §6.19 transports |

---

## 4. Floor status (honest)

| Doc | Lines | Floor class | Status |
|-----|-------|-------------|--------|
| `README.md` | 333 | README (300) | **PASS** |
| `packages/jm/00-MISSION.md` | 227 | generic (200) | **PASS** |
| `packages/jm/01-DISCOVERY.md` | 213 | generic (200) | **PASS** |
| `packages/jm/JM_DPL1_SPEC.md` | 492 | SPEC (3,000 host / 400–600 skill) | **skill floor PASS; host floor OPEN (R1)** |
| `packages/jm/06-WAVES.md` | 250 | generic (200) | **PASS** |
| `packages/jm/07-GOALS.md` | 263 | generic (200) | **PASS** |
| `packages/jm/00-INDEX.md` | this file | README-class (300) | see `wc -l` |

The one conflict is stated plainly: the host gate wants 3,000 lines for any
file named `*SPEC*`; the build-package skill wants 400–600 for a DPL1. This
package honors the skill and records the conflict as residual R1 rather than
padding to satisfy a class label. If the operator rules that the host floor
wins, the spec grows with real per-wave detail until it reaches 3,000.

---

## 5. What a fresh agent can do from this package alone

1. Read the spec (492L), pick a wave, read its goal prompt, read its anchors.
2. Build the wave's files (the ownership map is in `06-WAVES.md` §10).
3. Run the wave's gate commands and paste the output.
4. Hand the gate output to the audit desk.
5. Advance only on a green gate.

No other context is required. That is the package's completion test, and it is
the only thing that makes a build package worth producing.

---

## 6. The package's provenance

| Input | Where it came from |
|-------|--------------------|
| The mission | the operator's messages, 2026-09-21 (quoted verbatim in `00-MISSION.md` §1) |
| The engine design | `docs/blueprints/JM_V1_TARGETABLE_DECISION_ENGINE_BLUEPRINT.md` |
| The runtime design | `docs/blueprints/JM_MASTER_BLUEPRINT_v1.md` |
| The v0.1 CLI scope | `docs/blueprints/JM_JevManager_Blueprint_v0.1.md` |
| The laws | `docs/bibles/JEV_ENGINEERING_BIBLE.md` (IL-01–24, T1–T10) |
| The measured anchors | commands run 2026-09-21 (`01-DISCOVERY.md` §6) |
| The daemon frame | `KNOWLEDGE_LIBRARY/agent_plugin_boilerplates/manager-machine` |

Nothing in this package is invented. Where a value is an assumption it is
labeled (the `@ocdb` table list, the oracle's store schema, semantica's
extractor availability), and every assumption appears again in the residual
ledger (`JM_DPL1_SPEC.md` §15).

---

## 7. The package's own gate

```
 [x] 00-MISSION     — mission verbatim, constraints, forbidden, open questions, risks
 [x] 01-DISCOVERY   — measured inventory, variant table, command log, not-read list
 [x] DPL1 SPEC      — 14 sections, 20 scope items, 20 criteria, 9 container angles,
                      3 anti-pattern categories, 12 script tests, 4 container suites
 [x] 06-WAVES       — W0–W8 with measured gates, desk roster, cross-desk contracts, traps
 [x] 07-GOALS       — 9 goal prompts, the org chart, the stop-condition contract, handoffs
 [x] 00-INDEX       — every file, its role, its gate; the floor table; the provenance
 [x] dispatchable   — a fresh desk can build from the package alone
 [x] residual named — 10 residuals, the host-floor conflict among them
```

---

## 8. Package glossary

**Package** — this directory: mission, discovery, spec, waves, goals, index.
**Wave** — a dependency-ordered build stage with one measured gate.
**Desk** — a build unit (an agent session) owning a disjoint file set.
**Gate** — the command set whose green output advances a wave.
**Anchor file** — a design/bible path a desk must read before writing code.
**Cross-desk contract** — a signature/schema fixed before waves start.
**Residual** — a known gap, named and carried, never hidden.
**Stop condition** — the mechanical definition of a desk's done.

---

## 9. The package's changelog

| Date | Change |
|------|--------|
| 2026-09-21 | v1.0.0 — package created: mission, discovery, DPL1 spec, waves, goals, index. Repo created; 18 docs migrated. |

---

## 10. What the next agent should do first

1. `cd Shared_Workspace/JevManager`
2. Read `README.md` (the front door) and `packages/jm/00-MISSION.md`.
3. Run the W0 pre-flight (the FTS5 check, `JM_DPL1_SPEC.md` §5.1).
4. If green: start W0 with the `core-store` goal prompt (`07-GOALS.md` §3).
5. If red: declare the store fallback (token table + LIKE) and update §5.1.

Nothing else. The package exists so that this list is five lines long.

---

## 11. The two rulings the operator owes

| Fork | Question | Why it blocks |
|------|----------|---------------|
| **F1** | Fire gate detectors: in-extension (A) or TTSR rules + external gate call (B)? | Decides where the runtime layer's code lives; blocks W8 only |
| **F6** | Fire gate enforcement: steer post-fire (A) or block the edit until the verdict (B, ~300ms/gated edit)? | Decides whether a reflex can stop work; blocks W8 only |

W0–W7 are unblocked either way. The engine can be built to completion without
these answers; only the runtime layer waits.

---

## 12. The one-line status

> **Design complete, package dispatchable, repo created, docs migrated, zero
> code written — W0 starts on the operator's word.**


---

## 13. Per-wave acceptance checklists

Each checklist is what the audit desk verifies before a wave advances. A tick
requires the pasted command output; an unverifiable tick is a FAIL.

### W0 — CORE CLI
```
 [ ] bun test tests/ green
 [ ] bunx tsc --noEmit exit 0
 [ ] jm index @shadow → exit 0; files=11831
 [ ] second jm index @shadow → <10% wall of the first
 [ ] jm query @shadow --where "size>2000" → ≥1 row with ids
 [ ] jm query @shadow --fts "<known phrase>" → the known file
 [ ] ledger.jsonl exists; rows == runs
 [ ] every judged run printed a cost line
```

### W1 — JOB RUNTIME
```
 [ ] kill -9 mid-index → re-run completes; dup=0
 [ ] --budget-calls 5 on 100 items → exit non-zero; cap named
 [ ] ~/.jm/jobs/<id>/{index.sqlite,queue.sqlite,ledger.jsonl,results/} present
 [ ] queue rows are ack-on-complete (no orphan running rows)
 [ ] bun test tests/{resume,budget}.test.ts green
```

### W2 — TARGETS
```
 [ ] jm target ls → the registered targets
 [ ] jm query --in @shadow,@ocdb --limit 5 → rows from both
 [ ] adapter test green; no corpus copy under ~/.jm/jobs
 [ ] an unreadable target logs + skips (never silent)
```

### W3 — RETRIEVE
```
 [ ] jm scan @shadow --seeds '<token>' → candidates with ids
 [ ] | jm filter --recipe is-x → band counts (act/escalate/noop)
 [ ] | jm cluster → deterministic groups
 [ ] recipe files carry version + status=shadow
 [ ] no float literals outside policy.ts
```

### W4 — FIND
```
 [ ] jm find "<X>" --common 5 --structure md → patterns.md
 [ ] every pattern carries n + ≥1 exemplar id
 [ ] the yield trend prints (fetched→judged→kept→clusters)
 [ ] judge saw ≤ the candidate cap (≥100× narrowing proven)
```

### W5 — DECIDE
```
 [ ] 100-scenario batch → decisions.json 100 rows
 [ ] escalation file non-empty
 [ ] re-run → JM_CACHE_HITS=100 JM_JUDGE_CALLS=0
 [ ] key off → exit 2; zero decisions written
 [ ] bench table exists (agreement/Brier/ECE/variance/latency/$)
```

### W6 — SURFACES
```
 [ ] curl :7777/decide → answers JSON
 [ ] an OMP session calls jm_find → rows returned
 [ ] jm watch → reconcile tick; journal rows; kill path recorded
 [ ] no surface bypasses the shared client (cache/ledger intact)
```

### W7 — CALIBRATE
```
 [ ] jm report --calibrate → per-recipe metrics
 [ ] ≥100 ledger rows with later_truth filled
 [ ] a threshold change recorded as a calibration row
 [ ] the monitoring table (act-band, cache hit, cost, fill rate) renders
```

### W8 — FIRE GATE
```
 [ ] jef validate refuses a gateless script (L1)
 [ ] jef shadow-report → firing rows; zero steers
 [ ] I1 twin fixtures → opposite verdicts
 [ ] I4 → tokens ≤5,000; truncated flag when cut
 [ ] I5 → ladder moves on synthetic outcomes
 [ ] I3 → zero judge calls from the stream matcher
```

---

## 14. Desk FAQ

**Q: The gate blocked my write. What now?** Write to the floor or split the
doc. The gate is live on this host (README 300, generic 200, SPEC 3000).
Padding is refused; real content is required.

**Q: I need to change a cross-desk contract.** Stop and escalate to the
orchestrator. Contracts are frozen before waves start; a mid-wave change
invalidates the sibling's tests.

**Q: My wave's gate command fails for an environmental reason.** Record it as
BLOCKED with the exact error, name the unblock lever, and escalate. Never
report a blocked gate as passed.

**Q: Can I skip the ledger row for a quick deterministic run?** No. L3 applies
to deterministic ops too — the ledger is how the system knows what ran.

**Q: The judge returned a low-confidence answer. What do I do?** Route it per
the policy's flag band (escalate), never act on it. The gate's job is to send it
to review, not to guess.

**Q: My recipe never fires.** Run the calibration view; the question is likely
vague (the silent middle). Rewrite with existence phrasing; re-shadow.

**Q: Can I add a use case not in the catalog?** Yes, if it maps to
targets × operations × recipes. If it does not, it is a different tool.

**Q: Where do new decisions/constants/recipes get recorded?** The bible's
registries (§7.1, §7.2, §7.10), in the same commit as the code.

**Q: What if I find a bug in a sibling (opengrok, ripwire, semantica)?** Report
it; do not patch it from here. JM composes, it does not own them.

**Q: How do I know a wave is really done?** The gate commands ran this turn,
their output is pasted, and the audit desk wrote a verdict.

---

## 15. The metrics to watch (the dashboard)

| Metric | Source | Healthy | Action if unhealthy |
|--------|--------|---------|---------------------|
| Act-band rate | ledger | >0 per live recipe | rewrite the question (silent middle) |
| Escalate rate | ledger | <30% | thresholds too high / state too thin |
| Cache hit rate | cache table | 50–85% at volume | check recipe versioning churn |
| Cost per completed task | ledger `cost_usd` | baseline ±20% | check batching + cache |
| Later-truth fill rate | ledger | >80% on consequential rows | rewire the feedback path |
| Index delta ratio | index runs | <10% on re-run | the incremental path regressed |
| Judge calls per item | ledger | ≈ items/64 | a loop degraded to one-item calls |
| Fire-gate precision | outcomes | ≥0.90 to promote | unresolved ratio too high; hold |

---

## 16. The package's own residual ledger

| # | Residual | Owner |
|---|----------|-------|
| R1 | Host SPEC-class floor (3,000L) not met by the DPL1 spec | operator ruling on which floor wins |
| R2 | F1/F6 unruled (Wave 8 blocked) | operator |
| R3 | `pi` wrap points unopened | W8 desk |
| R4 | FTS5 availability unverified in bun 1.4.2 | W0 pre-flight |
| R5 | `@ocdb` table list assumed | W2 desk |
| R6 | Semantica extractor contracts unread | W3 desk |
| R7 | Oracle store schema assumed | W8 desk + the oracle's writer |
| R8 | No code exists yet | W0 desk |
| R9 | `.gitignore` + the first commit pending | W0 desk |
| R10 | The `@ocws` (219G) skip-rules design deferred to v2 | operator + W2 desk |
