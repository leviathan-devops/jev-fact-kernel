# DECISION_CHAIN — JM (append-only; every ruling with its cost-if-wrong)

**TREE SHA: `a38ef7b5a9ce3d998cd8c89e7ce5f9a2` (git e23f0c1)** - every canon doc that carries this line carries THIS sha; a disagreement means one is stale. Re-derive with ./scripts-seal.sh
## PART 1 — OPERATOR RULINGS (verbatim intent, never re-litigated)

**R-01** *"i need to be able to semantically and deterministically index massive fucking mountains
of data on the device"* → the engine must do BOTH: deterministic narrowing AND semantic judgment.
Implemented as the first law: code narrows, Jev judges, code routes (`src/verbs/find.ts` stage 4
before stage 5; `src/verbs/filter.ts` FTS before the judge call).

**R-02** *"need a tool for this i can point at anything when i need data structuring or decision
making"* → the target registry + `@name` resolution (`src/store/db.ts:resolveTarget`); targets are
pointers, never copies (indexes live under `~/.jm/index/`).

**R-03** *"use JDM and look at the jev notes discord channel"* → the bible's 23-item source ledger;
the channel's TIPs became the recipes (routing, drift, retry, RSI).

**R-04** *"preserve this doc as the v1 master blueprint"* → `docs/blueprints/JM_MASTER_BLUEPRINT_v1.md`
carries a provenance header and is the design of record for the runtime layer (the fire gate).

**R-05** *"wire this mfer in"* (the runtime kernel) → the fire-gate design; blocked on F1/F6 below.

**R-06** *"all the most relevant use cases"* → the 32-case catalog in
`docs/blueprints/JM_V1_TARGETABLE_DECISION_ENGINE_BLUEPRINT.md` §5; five chosen as first builds.

**R-07 (owed)** — **F1**: fire-gate detectors in-extension (A) or TTSR rules + an external gate call
(B)? **F6**: enforcement steers post-fire (A) or blocks the edit until the verdict (B)? Both block
W8 only; the engine is unaffected.

## PART 2 — BUILD RULINGS (made while executing; each with its cost-if-wrong)

**B-01 — one state per request, not 64 items per request.** The bible's L2 wording said "≤64
items/request"; the real API takes ONE state + a question map. Ruled: batching = many questions per
state + CONCURRENT requests per item (the pool). *Cost if wrong:* the batch layer would need a
refactor; mitigated by the transport seam (`src/judge/transport.ts`).

**B-02 — the artifact is the decision, not the run.** `decisions.json` excludes cache/cost metadata
so replays are byte-identical (EN-006). *Cost if wrong:* replay comparisons would need a normaliser.

**B-03 — budgets clamp the CLAIM, not the batch.** `roomLeft()` before the call; the queue claims
only the remaining room (EN-003/EN-005). *Cost if wrong:* a cap that leaks up to one batch of spend.

**B-04 — `session_diff` is not the claim corpus.** The find chain's `kept=0` over @shadow was ruled
TRUTH (diff blobs, many literally `[]`), not a defect; the same chain over @reports found the real
document at p=0.80. *Cost if wrong:* mis-targeting the corpus for the historical completion audit.

**B-05 — doc floors are recorded, not padded.** When BUILD_REPORT/DEBUG_LOG sat below 500 and the
canon set below 200, the gap was written into the checkpoint's honest gaps; the floors were then
raised with REAL content (the run transcript, the test inventory, the audit table). *Cost if wrong:*
a reviewer expecting floors early finds them unmet — stated up front instead of papered over.

**B-06 — the audit's high findings are fixed, not argued.** 30 high findings were treated as
defects by default; three were declined/refuted ONLY with evidence (the raw-state egress is by
design because the provider must see the evidence; the DDL multi-statement claim is refuted by the
live tables; the mock-write await was a test-path fix). *Cost if wrong:* declining a real defect —
mitigated by recording each disposition in `AUDIT_SUMMARY.md` for the re-audit to challenge.

**B-07 — the checkpoint excludes itself from discovery.** `bunfig.toml [test] root = "tests"` and
the audit analysis filters `Checkpoints/` (EN-015). *Cost if wrong:* inflated counts that look like
progress or regression.

## PART 3 — THE REJECTED ALTERNATIVES (each with the reason it lost)

| alternative | why it lost |
|-------------|-------------|
| Postgres/Supabase instead of sqlite | single-host, single-operator, zero-daemon; `bun:sqlite` + FTS5 covers the measured scale |
| Embeddings instead of Jev tags | a vector store adds infra + drift; the semantic layer here IS the calibrated judgment (bible F1 default) |
| A Jev "auditor agent" | R1 from the bible: Jev judges; an agent wrapper recreates the LLM cost the layer exists to avoid |
| Jev inside the TTSR 50ms path | the timescale mismatch; a measured judge call on the stream path refuses the build (bible L4) |
| Blocking a write on a Jev verdict | the tools-never-blocked law; the gate may demand, never deny (bible IL-10) |
| Counting UNRESOLVED as CONFIRMED | promotion on nothing (the fire gate's L4) |
| Padding docs to floors | the anti-theatrical law; the floors were met with the run transcript instead |
| Reviewing the checkpoint copies | they are byte-identical snapshots; counting them twice is noise (EN-015) |

## PART 4 — THE RULINGS THE AUDIT FORCED (the boundary family)

The audit produced ten classes the happy path never touched; each became a ruling:

1. **Errors collected must be READ** (EN-009) — a failure value nobody inspects is a swallowed exception.
2. **Deletion happens in every index that can find the row** (EN-010) — tombstones must filter everywhere.
3. **A log line must not describe an intent the platform does not honour** (EN-011) — explicit binds.
4. **Validate at the boundary; default on nonsense** (EN-012) — NaN must never reach a guard.
5. **If it changes the decision, it belongs in the key** (EN-013) — the questions hash.
6. **Batch operations need per-item failure containment** (EN-014) — one rock must not stop the river.
7. **A snapshot is data, not source** (EN-015) — keep it out of discovery and out of the counts.
8. **A gate FAIL blocks claims until a re-run passes** — the fix pass is a claim, the re-run is proof.

## PART 5 — THE DESIGN FORKS THAT WERE TAKEN ON A DEFAULT (overrulable)

| fork | the default taken | the alternative | what would change if overruled |
|------|-------------------|-----------------|-------------------------------|
| F2 (pilot target) | `@shadow` first (the real corpus) | `@ocdb` first (fast) | the first live gate would be minutes not hours |
| F3 (store) | `bun:sqlite` + FTS5 | an external DB | the store layer's seam (`src/store/db.ts`) is the swap point |
| F4 (knowledge surface) | the reflex store only | JM-indexed cross-session memory | the fire gate's G5 family would read JM |
| F5 (MPSE role) | predicate facts + vetoes | import MPSE scoring formulas | the score composer would grow a math layer |
| F7 (daemon frame) | manager-machine (copy) | bespoke | the watch verb's shape |
| F8 (embeddings) | defer (Jev tags first) | add now | a vector store + a second retrieval path |

Each default was chosen to serve the stated scope (a working decision engine this month), and each
is recorded here so the operator can overrule without re-deriving the reasoning.

## PART 6 — THE RULING DISCIPLINE (how rulings are made and recorded)

1. **A ruling is made in the moment, never deferred.** A blocked build is worse than a wrong ruling
   that can be seen and undone (the SDD law: rulings, not stalls).
2. **Every ruling names its cost-if-wrong.** B-01 through B-07 all carry one; a ruling without a
   cost is an opinion.
3. **The spec outranks the plan; the operator outranks both.** Conflicts resolve in that order
   (`packages/jm/JM_DPL1_SPEC.md` is the binding authority for what to build).
4. **A ruling that changes the architecture is escalated, not absorbed.** None occurred this session;
   the two that could (F1/F6) were parked with their blast radius named (W8 only).
5. **Rulings are append-only.** Corrections are new entries; nothing above is edited after the fact.

## PART 7 — THE RECORDED RULINGS, INDEXED (for fast lookup)

| # | ruling (one line) | part | cost-if-wrong |
|---|-------------------|------|---------------|
| R-01 | semantically AND deterministically | 1 | a filter-only tool or a judge-only tool — both wrong |
| R-02 | point at anything (pointers, not copies) | 1 | corpus copies chewing disk |
| R-03 | the jev-notes corpus is the design source | 1 | fabricated doctrine |
| R-04 | the fire gate doc is the v1 master blueprint | 1 | design-of-record ambiguity |
| R-05 | wire the runtime kernel | 1 | a batch-only tool where the operator wants runtime |
| R-06 | the 32-case catalog; five built first | 1 | building the wrong end |
| R-07 | F1/F6 owed (W8 blocked) | 1 | W8 built on an unruled premise |
| B-01 | one state per request; concurrency batches the items | 2 | a refactored batch layer |
| B-02 | the artifact is the decision | 2 | replay comparisons needing a normaliser |
| B-03 | budgets clamp the claim | 2 | up to one batch of unspent budget |
| B-04 | session_diff is not the claim corpus | 2 | mis-targeting the completion audit |
| B-05 | floors recorded then raised with material | 2 | a floors-first reviewer finding them unmet early |
| B-06 | audit highs fixed, not argued (3 declined with evidence) | 2 | declining a real defect |
| B-07 | the checkpoint is excluded from discovery | 2 | inflated counts |
| P4-1 | the seat is declared in writing (H0 + slide trigger) | 3 | author's-seat drift |
| P4-2 | every op pre-registers its expectation | 3 | demonstrations instead of experiments |
| P4-3 | zero bugs is a red flag, not success | 3 | a seat that never pushed |
| P5-1 | adjudicate both ways before any fix | 3 | fixing probe errors as code bugs |
| P5-2 | the corpus is evidence too (kept=0 was truth) | 3 | a "bug" that is a targeting choice |
| P6-1 | the audit runs before any ship claim | 3 | ship-ready theater |
| P6-2 | a FAIL blocks until a re-run passes | 3 | a fixed-but-unproven gate |

## PART 8 — THE DERAILMENTS RECOGNIZED AND AVOIDED (the anti-pattern ledger in practice)

| the pull | how it appeared | the counter |
|----------|-----------------|-------------|
| claim success on a green exit | `files=0` with exit 0 | assert COUNTS (EN-001) |
| treat a probe failure as a code bug | SQLite dynamic typing; the flaky crash test | adjudicate both ways first (EN-004) |
| let the happy path be the whole test | the boundary family (all 30 highs) | adversarial-first; the audit |
| skip the doc at the moment of work | the temptation to batch docs at session end | the fresh-capture rule (the 2 logs, live) |
| pad docs to the floor | the 500-line ship floors | real material or a recorded gap (B-05) |
| call the fix the proof | "fixes applied" after the audit | the re-audit is the gate (B-06) |
| report a blocked verification as passed | the audit lane initially unavailable | the gate line said BLOCKED, never PASS |
| shrink scope silently | W2's adapters unfinished | the WAVES table marks W2 PARTIAL, out loud |
| freeze numbers into living docs | the source sha | the sha lives only in the checkpoint manifest |
| over-claim the battery | 36/16 double-counted | rooted discovery; canonical 18/8 (EN-015) |

## PART 9 — THE RULING LOG FORMAT (how to append the next one)

```
## [DATE] — RULING: <one-line decision>
- CONTEXT: what forced the decision (the evidence, the failure, the ask)
- OPTIONS: the alternatives that were live
- CHOSEN: <the option> | REJECTED: <the others, one line each on why>
- COST IF WRONG: <the concrete rework>
- VERIFIED BY: <the run/test/artifact that shows the ruling landed>
```
Rules: append-only; the date is the session date; a ruling supersedes an earlier one ONLY by
stating it (`SUPERSEDES B-03`); and every ruling names its verification, because an unverified
ruling is the same class as an unevidenced claim.

## PART 10 — THE RULINGS THAT WOULD CHANGE THE SYSTEM (the sentinel forks)

If the operator later rules on these, the blast radius is named here so nobody discovers it late:

| fork | if overruled to... | the blast radius |
|------|--------------------|------------------|
| F1 -> TTSR + external gate call | the fire gate splits across the host's rules dir and the extension | W8's whole shape; the L0/L2 boundary moves |
| F6 -> block the edit until the verdict | enforcement becomes synchronous (~300ms per gated edit) | the interaction latency budget; the hold-the-write path |
| F3 -> an external DB | the store seam swaps | `src/store/db.ts` + every verb's connection assumption |
| F8 -> embeddings now | a second retrieval path | `find`/`filter` gain a vector candidate source |
| R-01 -> deterministic only | Jev leaves the hot path | the entire judged surface becomes code (and the product changes nature) |

None of these is a decision to make casually; each is recorded so the alternative is one edit to
this table away from being actionable.

## PART 11 — THE RULING COUNT (the chain's own statistics)

```
 operator rulings        7   (6 landed + F1/F6 owed)
 build rulings           7   (B-01..B-07)
 audit-forced rulings    8   (the boundary family + the gate discipline)
 design forks on default 6   (F2/F3/F4/F5/F7/F8 — all overrulable)
 rejected alternatives   8   (PART 3)
 sentinel forks          5   (PART 10 — with blast radius named)
```
Sixty-one recorded positions in one session, each with its cost-if-wrong or its blast radius. The
chain is append-only; corrections are new entries; and the next session's rulings start at the top
of PART 1's list.

### THE CHAIN'S CLOSING NOTE
The chain exists so that no decision has to be re-argued from scratch. If you disagree with a
ruling, the path is: state the ruling, state your alternative, state the cost — and append. That is
how this file grew seven operator positions, seven build rulings, eight audit-forced rulings and
six recorded defaults in one session, and it is how it will keep growing without losing any of them.

---

## CURRENT (appended 2026-09-21, git 8b42ff8)



**Battery: 89 pass / 0 fail / 343 expects / 17 files · `bunx tsc --noEmit` exit 0.**
**Container rig (spec §9 T1–T7): PASS 7/7 in a fresh Debian-12 container AND on the host.**

### What landed after the wave-1 foundation
- **W2 TARGETS** — fs · jsonl · sqlite adapters; `--in a,b|all`; row-level incrementality by
  content sha; the sqlite SOURCE proven read-only. Fixed D-008 (two targets' same-named files
  collapsed into ONE row — a silent row loss).
- **W3 RETRIEVE** — `scan` (regex gate + hit counts + excerpts) · `cluster` (signature groups, no
  model) · `extract` (capture-group pulls; md/json/csv).
- **W5 DECIDE** — `route` (the catalogue Choice, injection text on act, runner-up logged) ·
  `evaluate` (agreement/Brier/ECE/variance + `--replay`).
- **W6 SURFACES** — the **MCP** stdio surface (jm_query/jm_find/jm_decide/jm_index) and the
  **watch daemon** (idempotent tick, real JSONL journal). All four surfaces now live.
- **W7** — `report` (read-only status over the store + ledger).
- **README §18 — THE OPERATING CONTRACT**, written from a zero-context operator's 14 reported
  gaps and then EXECUTED: 25 claims verified against the live engine, which found three more
  defects (the cost line corrupted piped output; per-verb exit codes; `target add` accepted a
  phantom root).

### The defect ledger (all fixed, all pinned)
D-008 cross-target row collapse · D-009 unknown index returned empty+exit 0 (and created a phantom
index file) · D-010 `@sqlite-target` indexed the DB file, not its rows · D-011 `index <file>` was a
silent no-op · D-012 `--structure csv` rendered markdown · D-013 `find` ignored JM_HOME · D-014 the
ledger dropped the flags · D-015 a target NAME was a path fragment · D-016 `route` injected an
out-of-catalogue choice · D-017 the cost line corrupted piped stdout · D-018 per-verb exit codes ·
D-019 `target add` accepted a nonexistent root · D-020 a questions-less recipe "succeeded" as
noop=all · D-021 `--in` silently dropped `--queued`.

### The gates
- **P6 DOCUMENT: BLOCKED.** The audit's tests-chunk and root-chunk are COMPLETE with 0 findings;
  the src chunk (36 files) is PARTIAL in every attempt — upstream rate limits. Half a dozen runs,
  every finding adjudicated (9 confirmed+fixed, 6 REFUTED by probe). Method + ledger:
  `AUDIT_SUMMARY.md`. NEVER PASS while the largest chunk is unmeasured.
- **W8 FIRE GATE: NOT BUILT** — parked on the operator-owned F1/F6 rulings.
- Residual, named: the unswept frontier is the src chunk under a working lane; `@ocws` never
  walked; the escalation band has no live row.
