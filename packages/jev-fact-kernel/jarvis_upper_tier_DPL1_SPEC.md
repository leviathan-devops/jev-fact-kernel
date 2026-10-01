# JARVIS UPPER TIER — DPL1 SPEC
**Slug:** jarvis-upper-tier · **Version:** 1.0 · **Date:** 2026-09-19
**Author:** build-package pipeline (mission verbatim in 00-MISSION.md)
**Status:** DRAFT → gate at §14 · **Predecessors:** JARVIS_ORCHESTRATOR_L2,
AO_FOREMAN_INTEGRATION_V2 (both fulfilled; factory era CLOSED)

---

## §1 HEADER / DISCOVERED INTELLIGENCE SUMMARY

Target host: leviathan (Ubuntu 24.04, GNOME Wayland, x64). AO v0.13.0
fresh-install, daemon :3001 loopback, healthz ok. Integration surface
measured this session (01-DISCOVERY.md): **144-route OpenAPI-spec'd REST
API + SSE `/api/v1/events` with `after`-cursor replay + `ao` CLI thin
client**. NO webhooks, NO notifier config, NO external plugin attach, NO
auto-merge, NO cross-PR dependency tracking — all confirmed absent in
contract layer and docs. Local parts bin: Thanatos (auditor, fix-routing
precedent at HEAD 2860a00), Jarvis_Git_Manager (git-plane lineage),
JARVIS kernel (desk-orchestrator/completion-gate/git-plane/fleet),
foreman (supervisor, omp patch intact), fence2 (verdict gate),
Omp_Context_Manager (librarian substrate). OMP global = yolo
permissions; both AO projects = bypass-permissions ×3 levels.

## §2 PROBLEM STATEMENT (verbatim requirements, from 00-MISSION.md)

1. "Integrating AO into the TOOLS and SYSTEMS for the upper jarvis
   levels… see EXACTLY what is the SDK/config ability for us to be able
   to wire AO into tool systems properly. we cannot attach into it like
   an orca terminal - need to find another solution"
2. "JAM + orca is now promoted to a production hardening factory…
   Foreman'd OMP agents are going to receive a full set of v1 functional
   PRs w/ full git history, testing data, context that they need to
   first assemble into a v1 ship package… then HARDEN into legit runtime
   grade production infrastructure that is at S-tier quality. 0
   compromises… This is where Thanatos can be wired in, much heavier/
   deeper code review — multiple parallel pipelines for: reverse
   engineering the build package from first principles directly from the
   minted ship package… rigorous thorough spec/build package alignment +
   runtime functionality. Any bugs immediately flag and kick down to the
   factory" and "DEEP RESEARCH + librarian/context synthesis/data
   retrieval… not just a summary, but here are problems X Y Z + proposed
   solutions A B C ~ deep research 1 2 3 and validate/invalidate"
3. "WE NEED TO BUILD A PRODUCTION GRADE LIFECYCLE CONTROLS THAT WORKS AS A
   GRAPH, COMMS SYSTEM, FILEPATHS, AND BUILD GUARDRAILS SIMULTANEOUSLY."
4. "UNDERSTAND HOW DOES AO MANAGE GIT — IT AUTO FIXES REJECTED PRS/ETC"
   (answered in 01-DISCOVERY §2)
5. "HOW CAN WE KICK A BUG DOWN TO THE FACTORY DIRECTLY TO THE WORKER
   THAT CAUSED IT? … MAP EVERY SINGLE BUG DIRECTLY TO ITS ORIGIN COMMIT
   … Git-bug-graph … extremely valuable for debugging + data analysis on
   bug root causes" + "We can decide whether to kick the worker or fix
   directly — but the rails for this should 100% be setup."

## §3 ARCHITECTURE

### §3.1 The four subsystems

```
┌─────────────────────────────────────────────────────────────────────┐
│ JARVIS UPPER TIER (this spec) — sits ON TOP of AO (= Jarvis Core)   │
│                                                                     │
│  ┌───────────────┐   typed calls    ┌────────────────────────────┐ │
│  │ 3.1 AO ADAPTER │ ───────────────► │ AO daemon :3001 (REST+SSE) │ │
│  │ (REST+SSE,     │ ◄─────────────── │ 144 routes, OpenAPI        │ │
│  │  cursor-kept)  │   SSE after=cur  │ sessions/prs/events/…      │ │
│  └──────┬────────┘                   └────────────────────────────┘ │
│         │ events + facts                                             │
│  ┌──────▼───────────────────────────────────────────────────────┐  │
│  │ 3.2 LIFECYCLE CONTROLS (SQLite graph store + engine)                 │  │
│  │  pr_node(pr, session, sha, state, deps[])                     │  │
│  │  edge(dep: pr→pr | bug→commit | kick→worker)                  │  │
│  │  merge scheduler (orders explicit ao pr merge)                │  │
│  │  guardrail gates (gate_pass rows; merge-eligibility inputs)   │  │
│  │  bug_record(bug, origin_commit, session, worker, confidence)  │  │
│  └──────┬────────────────────────────────────────────────────────┘  │
│         │ ready PRs / bug flags                                     │
│  ┌──────▼────────────────────────────────────────────────────────┐  │
│  │ 3.3 HARDENING FACTORY (foreman'd OMP macro agents, orca seats) │  │
│  │  wave A ASSEMBLE: PR set + git history + tests + context       │  │
│  │        → v1 ship package (saved, versioned)                    │  │
│  │  wave B HARDEN: S-tier runtime-grade (0 compromises)           │  │
│  │  wave C AUDIT: Thanatos deep review + REVERSE-ENGINEER         │  │
│  │        pipeline (disassemble minted package ↔ spec align)      │  │
│  │  wave D RESEARCH: deep-research/librarian pipeline             │  │
│  │        (problems X/Y/Z → solutions A/B/C → validate/invalidate)│  │
│  │  bug flags ──► upper bug_record ──► kick rails               │  │
│  └──────┬────────────────────────────────────────────────────────┘  │
│         │ kick decision (worker | fix-direct)                       │
│  ┌──────▼────────────────────────────────────────────────────────┐  │
│  │ 3.4 BUG-KICK RAILS (git-bug-graph edges made executable)       │  │
│  │  kick_live: steer-or-send → owning session w/ bug dossier      │  │
│  │  kick_spawn: ao spawn fix-worker citing origin commit+data     │  │
│  │  fix_direct: macro fixes on a phase-2 branch (never factory's) │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### §3.2 Subsystem contracts

**3.1 AO Adapter (`ao-client/`, TS)**
- Generated typed client from `openapi.yaml` (their `npm run api:ts`
  pattern; we generate OUR bindings from the fetched spec, pinned by
  sha256 — regenerate = explicit step, never silent)
- `AoClient`: spawn/send/steerOrSend/kill/restore/prClaim/reviews*/
  prMerge/resolveComments/projects*/workspaceFiles/Diffs/Events
- `EventRail`: SSE `/api/v1/events?after=<cursor>`; cursor persisted to
  upper store; reconnect with Last-Event-ID; at-least-once + idempotent
  reducers (event `seq` is the dedupe key)
- Law: REST-first; SQLite direct reads FORBIDDEN in adapter code
  (agents.md contract); SQLite only in offline forensic tools

**3.2 Lifecycle Controls (`jarvis-upper/`, TS + SQLite)**
Tables:
```
pr_node(id PK, project, pr_number, session_id, worker_hint,
        head_sha, base_sha, source_branch, target_branch,
        state,            -- open|ready_to_merge|merge_ordered|merged|rejected|kicked
        minted_at, merged_at, metadata_json)
pr_edge(id PK, from_pr, to_pr, kind, created_at)   -- kind: depends_on|blocks|rebased_on
gate_pass(id PK, pr_node, gate, verdict, evidence, at)  -- gate: audit|hardened|fence2|ci_green
bug_record(id PK, found_by, category, severity, dossier_path,
           origin_commit, origin_session, origin_worker,
           attribution_confidence,     -- 0..1
           status,                     -- open|triage|kicked_live|kicked_spawn|fixing_direct|fixed|wontfix
           created_at, closed_at)
kick(id PK, bug_record, mode,          -- live|spawn|direct
     target_session, spawned_session, dossier_path, sent_at, outcome)
rail_seq(source PK, last_seq)       -- SSE + poll offsets
```
Engine (deterministic, no LLM in the loop):
- `syncProject(project)`: adapter pulls sessions+PRs → upserts pr_node
- `orderMerges()`: topological over pr_edge(depends_on) ∩ state=
  ready_to_merge ∩ all gates green → emits ordered `[prMerge(pr)]` plan;
  a cycle refuses with CYCLE token (never auto-merges; plan execution is
  an explicit operator/macro confirmation)
- `attributeBug(dossier)`: `git log -S`/blame on flagged files → origin
  commit → AO session via pr/session_worktrees (adapter) → worker;
  confidence = f(single_author?, files_touched, commit-count since);
  <0.6 ⇒ status=triage (never silently assigned)
- `guardrail(pr)`: merge-eligibility = AO ready_to_merge ∧ gates green ∧
  deps merged. Any false ⇒ not orderable; reason recorded

**3.3 Hardening Factory (macro desks, existing JAM/foreman machinery)**
- Input: `PR set` (from the control layer: pr_node where gates pending) + dossier
  bundles (git history via `workspace/diffs`+`file/revision`, testing
  data from PR checks/metadata, context from the minted build package)
- Wave A ASSEMBLE desk: foreman-run OMP agent builds v1 ship package
  (existing ship-package canon: BUILD_REPORT/DEBUG_LOG/…), saves under
  SHIP_PACKAGES/<target>-v1/, upper gate `fence2` on package manifest
- Wave B HARDEN desks: per-module hardening to S-tier; done.mk + fence2
  per desk; gate `hardened`
- Wave C AUDIT: Thanatos deep review over the hardened tree +
  reverse-engineer pipeline (fresh-context agent rebuilds the spec from
  the minted package, diffs against the authored spec; runtime
  functionality verified by script-test battery) → bug_records (never
  silent fixes — flags with dossiers)
- Wave D RESEARCH: librarian pipeline — problem/solution research
  contracts (X/Y/Z → A/B/C → validate/invalidate/extend → report),
  wired to deep-research skills + Omp_Context_Manager corpus; output
  feeds audit decisions
- All desks ride existing: dispatchDesk (explicit cmd pins),
  foreman supervision, fence2 verdicts, tracker rows

**3.4 Bug-Kick Rails**
- `kick_live(bug)`: adapter `steer-or-send` to origin_session (if alive)
  with dossier: files+lines, failing evidence, origin commit, expected
  fix contract; kick row opened; outcome tracked via session events
- `kick_spawn(bug)`: adapter `POST /sessions` fix-worker on the SAME
  repo citing `origin_commit` + dossier; spawned_session recorded
- `fix_direct(bug)`: macro-side branch `fix/<bug-id>`; NEVER touches a
  factory session's worktree; merge flows back through the control layer as a
  normal pr_node
- Decision owner: macro orchestrator (default rule in spec §8; operator
  override at any time)

### §3.3 Non-goals (named)
No daemon source mods. No auto-merge execution without explicit confirm.
No factory-ptys re-parenting. No SQLite writes from outside the control layer
store itself. No LLM inside the control layer engine (deterministic only). No
new config surface inside AO (upper tier config lives in the control layer
store + desk prompts).

## §4 DISCOVERY INTELLIGENCE (measured — full detail 01-DISCOVERY.md)
Carried: 144-route API list, SSE cursor semantics, absent-surfaces list
(§1.3 there), AO git attribution primitives (sessions.branch,
session_worktrees, pr.head_sha/session_id), local parts inventory +
variant table (JGM wins git-plane lineage; orca protocol = shape donor
only). not-read list: Thanatos src, orchestrators/delegate body, OCM src,
JGM scopes (all scheduled into blueprint Step 4).

## §5 CORE INSIGHT
The upper tier is a **deterministic control loop around a probabilistic
factory**: AO mints PRs and auto-fixes known failures; everything AO
refuses to do — sequencing, attribution, deep verification, hardening —
is graph-shaped, not agent-shaped. So the rails are a deterministic
SQLite graph engine + SSE-fed facts, and the ONLY places intelligence
runs are (a) factory workers (AO-owned), (b) macro desks (foreman'd
OMP), (c) audit/research pipelines. The adapter is typed, cursor-fed,
REST-first. Attribution = git archaeology + AO's own session tables;
kicks are messages with dossiers, not process surgery.

## §6 SCOPE (≤20 items)
1. ao-client typed bindings (openapi-pinned) + EventRail (SSE+cursor)
2. upper store schema + migrations (SQLite WAL)
3. syncProject facts ingester
4. orderMerges planner + CYCLE refusal
5. guardrail eligibility engine + gate_pass rows
6. attributeBug (blame/log -S → commit → session → worker + confidence)
7. bug dossier format (files/evidence/commit/fix-contract)
8. kick_live via steer-or-send + outcome tracking
9. kick_spawn fix-worker + dossier citation
10. fix_direct branch protocol
11. hardening wave desks (A assemble / B harden) on existing machinery
12. Thanatos wave-C wiring: audit runs → bug_records
13. reverse-engineer pipeline (package→spec diff + runtime battery)
14. deep-research/librarian pipeline contract (problems/solutions/validate)
15. CLI: upper <sync|plan|order|kick|bug|gates|graph>` (operator surface)
16. `upper graph` render (adjacency + bug overlay) for operators
17. cursor/event idempotent reducers + replay tests
18. package docs: this spec + blueprint + canon + waves + goals + index
19. container test rig (§9)
20. integration smoke vs live daemon (happy path only; no factory PRs
    minted during tests — scratch repo only)

## §7 SUCCESS CRITERIA (mechanical)

| # | Criterion | Token |
|---|---|---|
| SC1 | Adapter bindings generated from pinned openapi; `ao-client build` exit 0; route parity = 144/144 | `tsc 0` + parity line |
| SC2 | EventRail survives kill -9 + restart with zero dupes/losses over ≥500 synthetic events | `replay test: dupes=0 gaps=0` |
| SC3 | syncProject upserts a scratch-project PR set; pr_node rows == API pr count | `sync: rows=N matched` |
| SC4 | orderMerges on synthetic DAG (incl. cycle fixture) returns ordered plan; cycle case exits CYCLE | `plan: ok` / `CYCLE` |
| SC5 | guardrail blocks merge-order for gate-missing PR; allows all-green | `eligibility: blocked/allowed` |
| SC6 | attributeBug on a seeded repo (known bug commit by a known session) returns correct commit+session, confidence ≥0.9; ambiguous fixture lands status=triage | `attr: hit` / `triage` |
| SC7 | kick_live delivers dossier to a live scratch session (message visible in conversation); kick row outcome=delivered | `kick: delivered` |
| SC8 | kick_spawn creates fix-worker session citing origin commit (prompt contains commit sha) | `spawn: cited` |
| SC9 | Wave-A desk (offline fixture) produces saved v1 ship package with manifest; fence2 PASS row | `fence2 PASS spec_bound:true` |
| SC10 | Wave-C fixture: seeded defect → Thanatos/reverse pipeline emits bug_record + dossier; kick rail selectable | `bug: recorded` |
| SC11 | Full battery: `bun test` green incl. ≥30 new upper/adapter tests; tsc 0 | `X pass / 0 fail` |
| SC12 | `upper graph` renders the scratch fixture DAG + 1 bug overlay to terminal | render snapshot match |

## §8 OPEN DECISIONS (resolved defaults; operator may flip)
D1 kick default = live if origin_session alive else spawn (per mission
"we can decide"; default rule encoded, macro may override per-bug).
D2 upper store location = JARVIS_WORKSPACE/jarvis-upper/store.sqlite
(WAL). D3 bug dossier path = jarvis-upper/dossiers/<bug-id>/. D4 confidence
threshold 0.6. D5 merge-plan execution = explicit confirm (CLI flag or
macro decision record). D6 adapter runtime = bun/TS (kernel parity).

## §9 CONTAINER TEST PLAN (≥5 adversarial angles)
T1 EVENT-LOSS: kill -9 mid-SSE-stream ×20; replay must converge
dupes=0/gaps=0 (SC2). T2 CYCLE-JAIL: diamond+cycle graph; planner
refuses CYCLE, no partial merges emitted (SC4). T3 FORGED-READY: PR
marked ready but gate_pass missing/stale sha → guardrail blocks +
records reason (SC5). T4 MISATTRIBUTION: bug in merge-commit/files
touched by 2 sessions → confidence<0.6 → triage, never wrong kick
(SC6). T5 GHOST-KICK: origin session dead at kick time → falls to
kick_spawn citing commit (SC7/8). T6 REPLAY-DRIFT: same event seq
processed twice → pr_node state identical (idempotence hash equal).
T7 DOSSIER-TAMPER: dossier edited between record and kick → sha
mismatch → kick refuses (extends fence2 law to dossiers).
Tokens are tool-result-bound: each T prints its token; suite green =
all tokens present in captured output.

## §10 ANTI-PATTERN LEDGER (mechanical detections)
A) Theatrical integration: adapter route that is typed but never
exercised → parity test requires each wrapped route to appear in a test
call (static check: route name in test corpus). B) Silent-state drift:
any write to ao.db from our code → grep gate in CI
(`grep -r "ao.db" jarvis-upper/ ao-client/` must only match forensic tools
marked offline). C) LLM-in-engine: any model call inside jarvis-upper/ →
import-lint: upper modules may not import desk/foreman/jev modules.
D) Merge-without-confirm: `prMerge` reachable only via
`executePlan(plan, {confirm:true})`; static check for direct call sites.
E) Dossier trust: kick payload must hash-match recorded dossier.

## §11 PRE-WRITTEN SCRIPT TESTS (names now, bodies in repo)
`replay_converges.test.ts` · `planner_cycle_refuses.test.ts` ·
`guardrail_blocks_stale_sha.test.ts` · `attribution_ambiguous_triage.test.ts`
· `kick_fallback_spawn.test.ts` · `idempotent_double_replay.test.ts` ·
`dossier_hash_refusal.test.ts` · `bindings_route_parity.test.ts` ·
`sync_matches_api_count.test.ts` · `graph_render_snapshot.test.ts`

## §12 PRE-WRITTEN DEEP CONTAINER TESTS
DT1 full-loop (scratch repo, live daemon): spawn→PR→sync→gate→plan→
(confirm)→merge→state=merged. DT2 bug-loop: seed defect commit via
scratch session → attribute → kick_live → observe fix → close bug.
DT3 loss-replay under kill -9 storm (T1 at scale). All three produce
JSON transcripts asserted by the suite.

## §13 SPEC-MANAGER GATE (this spec is dispatchable when)
☑ mission verbatim captured ☑ measured discovery (no invented surfaces)
☑ ≤20 scope ☑ mechanical success tokens ☑ adversarial tests ≥5 ☑
anti-patterns mechanically detectable ☑ open decisions defaulted ☑
floors: this file ≥400L ☐ (final count at commit) ☐ blueprint gate
(Step 4) ☐ canon/bible (Step 5, grows per milestone) ☐ waves (Step 6)
☐ goals (Step 7) ☐ index (Step 8).

## §14 CHANGE LAW
Spec changes = new versioned section, never silent edits. Binding order:
this spec > 00-MISSION > 01-DISCOVERY > prior-era specs (L2/V2 closed).

---

## APPENDIX A — ADAPTER ROUTE INVENTORY (operationIds, from pinned openapi.yaml)

**Control family (the rails act through these):**
```
POST   spawnSession                    /api/v1/sessions
POST   sendSessionMessage              /sessions/{id}/send
POST   steerOrSendSessionConversationTurn  /sessions/{id}/conversation/steer-or-send
POST   steerSessionConversationTurn    /sessions/{id}/conversation/steer
POST   interruptSessionConversationTurn /sessions/{id}/conversation/interrupt
POST   killSession                     /sessions/{id}/kill
POST   restoreSession                  /sessions/{id}/restore
POST   resumeAgent / exitAgent         /sessions/{id}/resume-agent | exit-agent
POST   delegateTask                    /orchestrators/delegate        ← kick_spawn primitive
POST   spawnOrchestrator               /orchestrators
```
**Git/PR family (the control layer's fact + action surface):**
```
GET    listSessions                    /api/v1/sessions
GET    listSessionPRs                  /sessions/{id}/pr
POST   claimSessionPR                  /sessions/{id}/pr/claim
POST   mergePR                         /prs/{id}/merge               ← explicit-only
POST   resolveComments                 /prs/{id}/resolve-comments
POST   rollbackSession                 /sessions/{id}/rollback
PATCH  setSessionMergePolicy           /sessions/{id}/merge-policy
GET    getSessionWorkspaceDiffs        /sessions/{id}/workspace/diffs   (POST)
GET    streamSessionWorkspaceChanges   /sessions/{id}/workspace/events
GET    listSessionWorkspaceTree/Files  /sessions/{id}/workspace/tree|files
GET    getSessionWorkspaceFile(+Blob/Revision) /sessions/{id}/workspace/file*
GET    searchSessionWorkspaceFiles     /sessions/{id}/workspace/search
POST   updateSessionWorkspaceFile      /sessions/{id}/workspace/file (PUT)
```
**Review family (audit rails):**
```
POST   triggerReview / submitReview / cancelReview / killReviewSession
POST   requestRereview / restoreReviewSession / switchReviewSession
POST   resolveReviewComment            /sessions/{id}/reviews/*
PUT    setSessionReviewer              /sessions/{id}/reviewer
PUT    setSessionAutoReview            + PATCH auto-inject-ci / auto-inject-review
```
**Stream family (the comms-in rails):**
```
GET    streamEvents                    /api/v1/events            SSE, ?after=cursor, Last-Event-ID
GET    streamNotifications            /api/v1/notifications/stream
GET    listNotifications              /api/v1/notifications (+ read/mark-all)
GET    streamSessionWorkspaceChanges  per-workspace file-change stream
```
**Project family:** listProjects/addProject/getProject/setProjectConfig/
setProjectPermissions/updateProjectSettings/initializeProjectRepository/
prepareCloneProject/cloneProject/cleanupPreparedClone.

## APPENDIX B — DelegateTaskRequest (verbatim schema; the kick_spawn body)
```json
{ "projectId": "<required>",            // fix-worker lands in the SAME project
  "brief": "<required, ≤16384 chars>",  // the dossier citation lives here
  "agent": "omp",                       // enum includes omp (28 harnesses)
  "mode": "chat" | "tui",
  "model": "<≤256 chars>",
  "approvalMode": "default"|"accept-edits"|"auto"|"bypass-permissions",
  "attachments": [AttachmentInput],     // dossier files ride as attachments
  "effort": "<≤64 chars|null>" }
```
kick_spawn = delegateTask({projectId, brief: FIX_CONTRACT(bug), agent:
"omp", approvalMode: "bypass-permissions", attachments: [dossier.md]}).
FIX_CONTRACT names: origin commit sha, files+lines, failing evidence,
expected outcome, "do not touch unrelated code", report via PR.

## APPENDIX C — EVENT REDUCER TABLE (AO event → control-layer transition)
AO side emits (change_log event_type pool + notifications): session_
created/updated/deleted, pr_state_changed, ci_failed→ci_state_changed,
review_requested/decision, ready_to_merge notification, workspace file
changes (per-session stream). Railway reducers (idempotent by seq):
```
session_created       → nothing (facts arrive on sync)
pr_state_changed      → pr_node upsert(state from PR row)
ci fail→pass flip     → gate_pass upsert(gate=ci_green, verdict=pass)
review_decision       → gate_pass upsert(gate=audit) when approved
ready_to_merge        → orderMerges() recompute (guardrail re-eval)
workspace file event  → attribution hint cache (path→session)
notification          → macro desk inbox fan-out (phase-2 comms)
seq gap on replay     → NO state change; refetch facts via syncProject
```
Every reducer: `INSERT OR REPLACE` keyed by (source, seq); state
hash logged for T6 idempotence.

## APPENDIX D — BUG DOSSIER FORMAT (jarvis-upper/dossiers/<bug-id>/)
```
dossier.md        human+agent readable: symptom, evidence, repro,
                  expected-vs-actual, suspected area (files:lines)
evidence/         raw artifacts (logs, failing output, screenshots refs)
origin.json       {bug_id, found_by, category, severity,
                   origin_commit, origin_session, origin_worker,
                   attribution: {method, candidates[], confidence},
                   fix_contract: {files[], acceptance[], forbidden[]}}
manifest.sha16    sha16 over dossier.md+origin.json (kick payload must
                  hash-match; T7 tamper gate)
```
origin.json is the machine contract; dossier.md is the carrier.

## APPENDIX E — ATTRIBUTION ALGORITHM (attributeBug, deterministic)
1. Inputs: flagged files[:lines] from the audit record.
2. Candidate commits: `git log -L` / `-S` per flagged hunk, bounded to
   the pr_node's merge window; fall back `git blame -C -M`.
3. Candidate sessions: commits joined to AO via pr.head_sha /
   session_worktrees.branch (adapter reads; never ao.db direct).
4. Score: single-session commits 0.95; +0.05 if hunk-line exact-match
   single author; −0.2 per extra touching session; merge-commits score
   their FIRST-PARENT session at ≤0.6 (→ triage by rule).
5. confidence ≥0.6 → assign origin_*; else status=triage with
   candidates[] preserved (operator/macro resolves).
6. Every assignment writes attribution.method + inputs (auditable).
