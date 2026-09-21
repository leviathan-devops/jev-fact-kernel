# 00 — MISSION

**Package:** `packages/jm/` · **Slug:** `jm` · **Class:** system
**Date:** 2026-09-21 · **Repo:** `Shared_Workspace/JevManager`

---

## 1. The mission, verbatim (operator)

> "i need to be able to semantically and deterministically index massive fucking
> mountains of data on the device. Specific use cases this tool needs to be able
> to handle immediately WITH JEV:
> - index all the raw shadow data from opencode workspace based on X criteria
> - find all instances of X fuzzy target in N database targets and output Z common
>   patterns across everything w/ Y structure
> - be able to make X decisions in Y scenarios based on Z criteria and A fuzzy context
> etc etc everything i could possible need for Paragon/LASME/Aether/JESL/etc etc
> systems with real algorithmic machine intelligence that is CONTEXT AWARE and
> capable of actually making intelligent decisions based on dynamic data ~ JEV
> need a tool for this i can point at anything when i need data structuring or
> decision making"

> "how can we build a PROPER JM that i can use as a targetable supercomputer for
> decision making, data filtering, semantic extraction, systems engineering, etc etc
> all the most relevant use cases"

> "preserve this doc as the v1 master blueprint. Do we have a repo in the shared
> workspace for Jev Manager already? if not create it, migrate all docs into it,
> mint the build-package and the full spec and show-me exactly what is the plan to
> build this"

> (runtime layer, separate session context) "shape trigger → jev algorithm → MPSE
> assisted jev score → decision point for fire → fire/ignore … each fire should be
> < 5000 tokens … these are high frequency micro decisions … wire this mfer in"

---

## 2. Restated understanding

Build **JM** — a targetable decision engine — in `Shared_Workspace/JevManager`.

It accepts named **targets** (fs trees, SQLite DBs, JSONL, git repos, Discord
channels, OMP session stores, opengrok), runs named **operations** (index, scan,
extract, filter, cluster, find, decision-tree, route, evaluate, learn, watch,
serve), judges through versioned **recipes** over one shared Jev client, and
writes **results** to per-job stores plus an append-only ledger. It is reachable
from a CLI, an HTTP surface, an MCP surface, and a daemon.

A second, subordinate surface — the **runtime fire gate** — makes it a *runtime*
system: every shape-triggered reflex in a live session passes through one
semantic gate before it acts, with a ladder that promotes only on measured
precision.

JM is the substrate the workspace's other systems consume: Paragon/LASME lexicon
mining, JESL card evals, Aether structure checks, warhead enforcement evidence,
and the claim firewall's recipes.

---

## 3. Scale class

**system.** Multi-component: engine core (adapters, store, pools, surfaces) plus
one subsystem (the fire gate), plus the integration surfaces (HTTP/MCP/daemon).

Classification test applied: does the flow already exist to read? **No** — there
is no JM code on disk (verified: no `JevManager` repo; `tools/` holds only
`foreman`). Therefore not bounded; architectural/system. Full package warranted.

---

## 4. Non-negotiables

1. **Deterministic-first.** Code narrows ≥100× before any Jev call; the judge
   never sees a mountain. Shape predicates stay in code.
2. **Bounded state.** ≤5,000 tokens per fire-gate firing; ≤2KB/item and ≤64
   items/request for batch verbs; overflow truncates in a declared order and sets
   `truncated:true`.
3. **Cache-first.** Fingerprint `sha256(model ⊕ schema ⊕ canonical(redact(state)))`;
   a hit is 0ms/$0 and deterministic. 60–80% of decisions recur.
4. **Ledger or it did not happen.** Every run writes rows (deterministic ops
   included): state hash, answers, thresholds, route, cost, later-truth slot.
5. **Targets are pointers.** Read-only attach; never copy a corpus into the job
   store; indexes live under `~/.jm/`.
6. **Shadow-first.** No recipe or reflex steers before reviewed shadow rows; the
   kill switch is tested at deploy, not discovered in an incident.
7. **Fail polarity per surface.** Decision verbs fail closed; index/scan keyless
   or open+marked; the fire gate goes to OBSERVE when the gate is unavailable.
8. **Compose, never duplicate.** opengrok/ripwire for code structure; Semantica
   for decision persistence; manager-machine for the daemon frame; the oracle for
   outcomes; Abide for diff checks.

---

## 5. Forbidden list

- Jev in the 50ms token-stream path (fire gate L6).
- Asking Jev to count, compute, compare dates, or generate text (IL-17).
- Raw transcripts / tool dumps / session JSONL as state (IL-05, F04).
- Blocking a tool, write, or edit on a Jev verdict (IL-10).
- Unversioned recipe, question, or reflex-script edits (IL-20, fire gate L12).
- Keys in argv, logs, ledger rows, chat, or prompts (IL-24).
- Re-implementing a sibling's job (opengrok, ripwire, Semantica, manager-machine,
  Abide, the claim firewall, the oracle).
- Counting UNRESOLVED as CONFIRMED (fire gate L4).
- Per-rule questions in the fire gate (fire gate L3).
- Padding a doc to a floor with whitespace or restated content.

---

## 6. Open questions (only unresolvable ones; max 5)

1. **F1 — fire gate detectors live in-extension (A) or TTSR rules + an external
   gate call (B)?** *Default A.* Blocks the runtime layer only; the engine
   proceeds regardless. **Needs the operator.**
2. **F2 — pilot target first: `@shadow` (11,831 files, hours) or `@ocdb`
   (SQLite, minutes)?** *Default: `@ocdb` first for the fast loop, then
   `@shadow` for the real gate.* Affects Wave 2 ordering, not architecture.
3. **F6 — fire gate enforcement: steer post-fire (A) or block the edit until the
   verdict (B, ~300ms per gated edit)?** *Default A.* **Needs the operator.**
4. **Semantica extractor availability** for use-case C1 (NER/relations): the MCP
   server is mounted; the extractor contracts are unread. *Assumption: available;
   verify in Wave 3.*
5. **`@ocws` (219G) skip-rules design** — indexing the whole tree needs an
   include/exclude policy reviewed before it runs. *Assumption: deferred to v2;
   Wave 2 covers `@shadow` + `@ocdb` + `@jarvis` only.*

Recorded assumptions (proceed, revisit): TypeSafe key present in the launching
env; opengrok stays up on :18080; bun 1.4.2 is the runtime; no system `sqlite3`
(use `bun:sqlite`).

---

## 7. Success definition (the mission's own acceptance)

The mission is met when, on this host, from a single CLI:

1. A target can be registered and indexed incrementally, and a re-index costs
   <10% of the first run's wall time.
2. A fuzzy target can be found across ≥2 targets and returned as patterns in a
   requested structure, with exemplars carrying row ids.
3. A batch of scenarios can be judged against criteria + context with an
   escalation band, and the decisions land in a ledger with cost.
4. Any of the above can be re-run for free (cache) and reproduces identically.
5. An OMP agent session can call JM as a tool mid-turn and receive rows.
6. A runtime reflex can be authored as a script, run in OBSERVE, and its
   precision measured from firing + outcome rows.

Each of those six has a wave gate and a test in the DPL1 spec.

---

## 8. What this package contains

| File | Role |
|------|------|
| `00-MISSION.md` | this file — mission, constraints, open questions |
| `01-DISCOVERY.md` | the measured landing zone + variant table |
| `JM_DPL1_SPEC.md` | the 14-section build spec (the dispatchable contract) |
| `06-WAVES.md` | the wave structure with per-wave gates |
| `07-GOALS.md` | the per-desk goal prompts + the hydra org chart |
| `00-INDEX.md` | the package index (every file, its role, its gate) |

Plus, from the repo: `docs/blueprints/` (the designs), `docs/bibles/` (the
substrate), `docs/handovers/` (the behavior-policing pack).

---

## 9. The one-sentence mission

> **Point JM at anything; get structured decisions, filtered data, extracted
> semantics, and a ledger that proves it — with code owning every branch and Jev
> owning only the bounded judgment.**

---

## 10. Consumers (who eats JM's output)

| Consumer | Consumes | Via |
|----------|----------|-----|
| The operator | triage lists, patterns, decisions, curation plans | `jm` CLI, `jm report` |
| OMP agent sessions | filtered rows, judgments mid-turn | `jm mcp` |
| Paragon / LASME | lexicon-mine candidate lists | `decision-tree --recipe lexicon-mine` |
| JESL | per-card verdicts | `evaluate --rubric card-rubric` |
| Aether | script conformance lists | `filter --recipe structure-check` |
| Warhead enforcement | drift/phrase evidence | `filter --recipe warhead-<n>` |
| The claim firewall | completion-audit backfill | `decision-tree --recipe completion-check` |
| The RSI loop | incident corpora + gap verdicts | `learn --incident …` |
| The bible | Appendix R digest rows, open-question updates | `extract --kind digest` |
| The fire gate | knowledge facts (G5) + reflex store | `query` / shared store (v2) |

---

## 11. Requirements traceability

Every requirement from the mission maps to a wave and a test.

| Req | From the mission | Wave | Test |
|-----|------------------|------|------|
| R1 | index shadow data by criteria | W2 | index @shadow twice; incremental <10% |
| R2 | find fuzzy X across N targets → Z patterns, Y structure | W4 | C4 patterns.md with exemplars |
| R3 | X decisions in Y scenarios from Z criteria + A context | W5 | 100-scenario batch + escalation file |
| R4 | point at anything | W2 | 3 adapters, `--in all` resolves |
| R5 | deterministic AND semantic | W3 | FTS/regex path (keyless) + judge path |
| R6 | Paragon/LASME/JESL/Aether consumers | W3/W5 | lexicon-mine + card-eval recipes |
| R7 | context aware, dynamic data | W4 | fresh-state fixtures |
| R8 | runtime kernel (fires per event, ≤5k tok) | W8 | I1/I4 instruments |
| R9 | cache + cost control | W1/W5 | repeat run = 0 calls; cost line |
| R10 | resumable, targetable, daemonized | W1/W6 | kill -9 resume; MCP call |

---

## 12. Risk register

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| K1 | 219G `@ocws` indexing chews disk/time | med | med | deferred to v2; skip-rules reviewed first |
| K2 | Provider latency/cost drift | med | med | bench protocol (bible §7.7); cache-first |
| K3 | Silent middle: recipes never fire | high | high | act-band monitoring (§8.4); I1 fixtures |
| K4 | Judge mislabel compounds (parked-kernel class) | high | high | fire gate L4/L5 + oracle precision |
| K5 | Scope creep into sibling systems | med | high | no-dup law (§8 composition); refuse list |
| K6 | Doc floors stall authoring | high | low | write dense or split; the gate is a feature |
| K7 | Key absent → decision verbs dead | med | med | fail polarity declared; keyless ops work |
| K8 | SQLite concurrency under pools | low | med | WAL + one writer per job store |

---

## 13. What success is NOT

- It is not "the CLI runs". Every verb existing without a ledger row is a demo.
- It is not "the find returned results". Results without exemplar ids are unverifiable.
- It is not "the judge answered". Answers without thresholds-in-force are unroutable.
- It is not "the reflex fired". A fire without a firing row and a later outcome is the parked-kernel failure again.
- It is not "the docs are written". Docs without wave gates are a wish.

---

## 14. Definitions used in this package

**Target** — a named pointer to a corpus; attached read-only.
**Operation** — a verb with a declared output structure.
**Recipe** — a versioned question pack + policy; the unit of judgment.
**Firing** — one reflex trigger instance, judged once.
**Outcome** — the deferred label on a firing (CONFIRMED/REFUTED/UNRESOLVED).
**Ladder** — the per-reflex promotion state (observe→advise→enforce→retired).
**Gate** — the single Jev call that turns a shape trigger into a verdict.
**Assembler** — the code that builds the ≤5k-token evidence packet.
**Shadow** — log-only mode; no steering.
**Ledger row** — the append-only record that makes a run real.
