# Jev-on-OMP Copilot — Master Blueprint v1

**Series:** JevOmpCopilot (post-hoc of EXISTING attach/JDM/Jev-research landing zone; copilot loop is PROPOSED)
**Date:** 2026-09-19
**Authority:** master-blueprint skill; ingredients engineering-report, extracting-production-boilerplates, show-me, ascii-diagrams
**Classification law:** BUILT = on disk this host. HARVESTED = GitHub README+SHA this goal. DISCUSSED = chat. PROPOSED = not landed. REJECTED = operator/source killed.
**Winner sources (locate):**
- `JARVIS/src/attach.ts` 106 lines — native attach rail
- `JARVIS/src/hard-steer.ts` 53 lines — interrupt-then-deliver
- `JARVIS/src/desk-orchestrator.ts` DeskTransport L53-64
- `JARVIS/src/discord.ts` 253 lines — REST primitive
- `JARVIS/extension/jarvis-discord-manager.ts` 390 lines — 15 tools
- `JARVIS_DISCORD/reports/JEV_STACK_FIT.md` 118 lines — stack map
- harvest `thruwire/foreman` HEAD `209182dac7a3467033fd093ab4ca47d21279984a`
- harvest `morcoan/JevSeek` HEAD `030d59114a03720783e839481a7814e7aecaad85`
- `~/.omp/agent/skills/typesafe-ai/SKILL.md`
- `jev-deep-research.md` 581 lines
**Not a winner:** JevCopilot_ShowMe_v1.md (plan stub 40 lines). No `*Jev*Master_Blueprint*` prior (glob empty except this file).
**Chat-half:** operator quotes below. Cold specs for TypeSafe: local research md (docs.typesafe.ai not re-fetched this blueprint turn).

---

## 1. MACRO BLUEPRINT

Jev is TypeSafe System One: state in, typed probabilities out, code owns the workflow (`typesafe-ai/SKILL.md` L18-24). This host does **not** run a Jev copilot. The rebuildable landing zone **does** exist: an OMP worker pane, `attachDesk` as copilot actuator, JDM as Discord I/O, Foreman as the harvested supervision template. The one-paragraph what-it-is: **put Jev beside the existing agent, not inside its tool list; watch bounded evidence; Noul-assess; policy in TypeScript; act with `\x03` then text.**

```
┌────────────────────────────────────────────────────┐
│ 1 MACRO  existing OMP worker keeps bash/edit/read  │
└──────────────────────┬─────────────────────────────┘
                       ▼
┌────────────────────────────────────────────────────┐
│ 2 OBSERVE  attach.screen + semantic  BUILT         │
│    attach.ts:68-86                                 │
└──────────────────────┬─────────────────────────────┘
                       ▼
┌────────────────────────────────────────────────────┐
│ 3 ASSESS   POST /v1/systemone  HARVESTED+PROPOSED  │
│    Foreman Noul x9  TYPESAFE_API_KEY missing       │
└──────────────────────┬─────────────────────────────┘
                       ▼
┌────────────────────────────────────────────────────┐
│ 4 POLICY   TS thresholds  HARVESTED Foreman table  │
└──────────────────────┬─────────────────────────────┘
                       ▼
┌────────────────────────────────────────────────────┐
│ 5 ACT  hardSteer / attach.steer  BUILT             │
│    hard-steer.ts:12-52  attach.ts:96-100           │
└────────────────────────────────────────────────────┘
```
Ruler: box width=54 (content 52). shown=5 total=5 capped=0.

Operator doctrine (verbatim, this session):
- "Jev as an in-session copilot for omp agnets"
- "what is the best way for my to implement jev currently as a copilot system on an existing agent"
- "research everything properly and get a real dense thorough master blueprint level answer"

FIT thesis (verbatim L99-104): Jev is a judge not a writer; split action vs arguments; compaction without summary loss; simple-jev only path without TypeSafe key; angels orthogonal; operator-owned next pick.

Foreman (verbatim L47-48): "Generative models work. Foreman watches the work."
Foreman (verbatim L82): "Foreman does not replace Codex's reason/tool/observe loop and does not choose individual tools or files for Codex."
JevSeek (verbatim L26): "separates choosing an action from writing its arguments."
JevSeek (verbatim L72-73): "Jev chooses the action; the generation model cannot silently switch to another tool."

**REJECTED for v1 copilot:** JevSeek-as-OMP-worker (would replace existing agent tools). **BUILT actuator:** attach/hard-steer. **PROPOSED:** assess loop. **BLOCKED:** live Jev (`TYPESAFE_ENV_COUNT=0` this host).

---

## 2. LIFECYCLE SECTIONS (execution order, cheapest first)

### L0 — Key presence (cheapest)

WHAT: refuse before any network if no TypeSafe key.
HOW: Foreman uses `TYPESAFE_API_KEY` in `.env` (harvest L228-233). Discord analog: sealed file then env (`jarvis-discord-manager.ts` bootstrap).
WHERE: PROPOSED copilot tick; Foreman harvest L228-233; JDM sealed `/JARVIS_DISCORD/config/.discord-token`.
WHY: fail-closed; never log key (Foreman L233).
Authoring: copy Discord sealed-file pattern; grep battery `TYPESAFE_API_KEY` not in logs.

### L1 — Attach the existing desk (BUILT)

WHAT: non-destructive hot seat on a running OMP pane.
HOW: `attachDesk(scopeRoot, desk)` loads tracker row, requires `pane_id`, returns session.
WHERE: `JARVIS/src/attach.ts` L1-30 interface, L43-105 impl.
WHY: "Sitting and waiting is banned" (L5).
Production unit: see §2.1 verbatim file.

### L2 — Observe bounded evidence (BUILT + HARVESTED bounds)

WHAT: screen tail + semantic events; never dump the repo.
HOW: `screen()` → `cli terminal read --terminal paneId --json` (L70). `semantic()` → `SELECT ts, kind, summary FROM desk_events WHERE desk = ? ORDER BY seq DESC LIMIT 50` (L80-82). Catch absent table → `[]` (L84-85).
Foreman observation bounds (HARVESTED L129-130): 20,000-char diff, 12,000-char tail, 30 events, 10 workers history — `FactoryConfig`.
WHY: "Foreman never dumps the repository into Jev" (L129).

### L3 — Assess (HARVESTED Foreman + TypeSafe docs; PROPOSED on this host)

WHAT: one parallel System One call, nine Noul dimensions.
HOW: `POST https://api.typesafe.ai/v1/systemone` Bearer key, `model: jev-latest`, `questions` map (`jev-deep-research.md` L253-265).
Foreman dimensions (verbatim L134-151):
Job: `implementation_complete`, `tests_sufficient`, `requirements_satisfied`, `needs_verification`, `ready_to_finish`.
Floor: `meaningful_progress`, `worker_stuck`, `work_off_track`, `needs_human`.
"Every dimension is one Jev `Noul` question... All nine are sent in one request."
SDK (Foreman L187-199): package `typesafe-sdk`, `AsyncTypeSafeClient`, `await client.system_one(state=..., questions=...)`, timeout 10s default, retries 429/5xx.
WHY: supervisory questions are narrower than generation (Foreman L89-95).
BLOCKED here: no key, no client wired.

### L4 — Policy (HARVESTED constants; PROPOSED TS port)

WHAT: Jev only assesses; deterministic policy acts (Foreman L155-157).
Actions (L158-165): CONTINUE, START_WORKER, START_VERIFIER, STEER_WORKER, STOP_WORKER, RETRY_WORKER, FINISH, ESCALATE.
Ordering (L167-168): human need, iteration bounds, off-track/stuck, retry, completion, verification, continued work.
Thresholds (L174-184) — DO NOT INVENT:

| Decision input | Threshold |
|---|---:|
| needs human | 0.80 |
| off track | 0.80 |
| worker stuck | 0.80 |
| needs verification | 0.65 |
| implementation before verification | 0.75 |
| ready to finish | 0.85 |
| requirements satisfied | 0.80 |
| tests sufficient | 0.75 |

Steer once then grace (L168-170); `FOREMAN_MAX_STEERS_PER_WORKER` default 1; grace 30s (L292-293).
Min assessment interval 5s (L282). Periodic 30s (L283).

OMP mapping PROPOSED: START_WORKER already happened (existing agent). STEER_WORKER → `attach.steer`. STOP_WORKER → `attach.interrupt`. ESCALATE → no send, operator. FINISH → do not kill pane (attach law L2: pane lives on).

### L5 — Actuate (BUILT)

WHAT: interrupt-then-deliver.
HOW: `attach.steer` L96-100: send `\x03`, wait 500ms, send text+Enter.
`hardSteer` L12-52: same sequence; refuses `unit_not_found`, `unit_not_running` if state !== `running` (L27-28).
WHY: "escape key fires FIRST" (hard-steer.ts L2-3). AP-2 blocks `--keys`; `\x03` as `--text` (L35-37).
500ms settle is a named constant in both files (attach L26, L99; hard-steer L43-44).

### L6 — Persist / quiet (HARVESTED; PROPOSED)

Foreman: `.foreman/runs/<run-id>/state.json` + `events.jsonl` (L261-266). Never write key into logs (L233).
PROPOSED OMP: append-only jsonl under scope `.omp-waves/jev-copilot.jsonl`. Quiet CONTINUE is the normal case.

### L2.1 Production example — attach.ts (verbatim, entire file 106 lines)

The authoring recipe for a new copilot unit: do not fork a second interrupt path; call `attach.steer` or `hardSteer`.

```
<!-- attach.ts verbatim is inlined in appendix A of this file after prove -->
```

(Full text included in section 9 appendix to keep lifecycle readable; SHA of attach.ts measured at ship.)

### Authoring recipe — new supervisory question

1. Add a Noul id + instructions (Foreman: one yes/no, independent).
2. Do not add a Choice unless options are a closed set (TypeSafe primitives table).
3. Wire a policy branch with a numeric threshold in a const table (never magic in if).
4. Map action to attach/hardSteer only.
5. Battery: grep threshold both sides; 401 test; missing-key test.

---

## 3. DISPATCH TRACES

### T1 — Operator attaches (BUILT)

1. `attachDesk(scopeRoot, desk)` attach.ts:43
2. `statusDesk` or injected statusFn → tracker row
3. throw `[attach_failed] desk not found` if !row L54
4. throw `[attach_failed] no pane_id` L58
5. return AttachSession { screen, semantic, send, interrupt, steer, close }

### T2 — Screen read (BUILT)

1. `session.screen()` L68
2. `cli(["terminal","read","--terminal", paneId, "--json"])` L70
3. `parseTail` L36-40 → `string[]`

### T3 — Semantic read (BUILT)

1. `getStoreDb({ dbPath: scopeRoot + "/.omp-waves/tracker.sqlite" })` L76-78
2. SQL L80-82 LIMIT 50
3. reverse chronological L83
4. table missing → [] L84-85

### T4 — Hard steer (BUILT)

1. `hardSteer(scopeRoot, desk, text)` L12
2. status; throw `unit_not_found` / `unit_not_running` L24-28
3. `cli terminal send --text \x03 --json` L39
4. 500ms L44
5. `cli terminal send --text txt --enter --json` L48
6. return `{ ok: true, interrupted: true }` L52

### T5 — Jev assess (HARVESTED Foreman; PROPOSED OMP)

1. debounce since last assess ≥ 5s
2. build state object from T2+T3 bounded
3. `client.system_one({ state, questions: NOUL9 })`
4. validate each noul in [0,1]
5. policy table L4
6. if STEER: T4
7. persist event jsonl

### T6 — JevSeek loop (HARVESTED; REJECTED v1)

User request → Jev selects tool → DeepSeek fills args → validate → execute → persist actual result → Jev completion review (JevSeek L58-69 mermaid). Not the OMP v1 trace.

### T7 — JDM Discord (BUILT; orthogonal I/O)

`jarvis_dc_fetch` → `fetchMessages` discord.ts:99 → `discordRest` L46 → GET `/channels/{id}/messages`. Token `requireToken` L40-43. 401 L71 no retry. Not the copilot loop; can feed state.tail if the desk is Discord-related.

---

## 4. TYPES + ENGINE CHECKS

### AttachSession (attach.ts L14-30) — BUILT

```
desk: string
paneId: string
state: string
screen(): Promise<string[]>
semantic(): Promise<DeskEventRow[]>
send(text: string): Promise<void>
interrupt(): Promise<void>
steer(text: string): Promise<void>
close(): void
```

DeskEventRow L8-12: `{ ts: number; kind: string; summary: string }`

### DeskTransport (desk-orchestrator.ts L53-64) — BUILT

spawnTile, promptPane, submitPaneText, readPane, killPane, listPanes, createDeskTab, listTabs, closeDeskTab, copilotKey.

Discord implements this (`discord-transport.ts`); Orca is default `realTransport`. Copilot should NOT require a new DeskTransport; it wraps AttachSession.

### System One request (jev-deep-research.md L259-265) — HARVESTED docs

state: string|object|array required
model: string required (`jev-latest`)
questions: map<string, Question> required

Noul: type, instructions, criteria optional {true,false}
Choice: type, instructions, criteria map
Score: type, instructions, criteria ordered array 2-10

Noul answer: `{ "type": "noul", "noul": 0.92 }` (L307-311)

### Engine checks in order (cheapest first)

1. key present — else `jev_copilot_blocked_no_key` PROPOSED token
2. desk running — else `unit_not_running` BUILT hard-steer.ts:28
3. pane_id nonempty — else `unit_not_found` / `attach_failed` BUILT
4. observe bounds — Foreman FactoryConfig HARVESTED
5. HTTP 401 — DiscordAuthError analog; Foreman typed auth exceptions L196
6. noul in [0,1] — Foreman L151 "validated, normalized"
7. policy order — human before stuck before finish L167
8. max steers — default 1 L292
9. debounce 5s L282

### Confidence (HARVESTED jev-deep-research L217-244)

Noul does not return separate confidence; probability IS certainty. 0.5 = equal yes/no, not medium intensity. Three-path: high act, mid caution, low do not act. Thresholds domain-specific; Foreman published numbers above.

---

## 5. INVOKE PSEUDOCODE

### M1 attachDesk — BUILT (pins to attach.ts)

```
┌──────────────────────────────────────────┐
│ inputs: scopeRoot desk                   │
│   row = status(scopeRoot, desk)          │
│   if no row                              │
│     throw attach_failed not found        │
│   if no pane_id                          │
│     throw attach_failed no pane_id       │
│   return session bound to paneId         │
│ outputs: AttachSession                   │
└──────────────────────────────────────────┘
```

### M2 attach.steer — BUILT (pins L96-100)

```
┌──────────────────────────────────────────┐
│ inputs: paneId text                      │
│   send --text \x03                       │
│   wait 500ms                             │
│   send --text text --enter               │
│ outputs: void                            │
│ error: session closed → attach_failed    │
└──────────────────────────────────────────┘
```

### M3 hardSteer extra guards — BUILT (L23-29)

```
┌──────────────────────────────────────────┐
│ inputs: scopeRoot desk text              │
│   row = status                           │
│   if no row throw unit_not_found         │
│   if state != running                    │
│     throw unit_not_running               │
│   interrupt then wait then prompt        │
│ outputs: ok true interrupted true        │
└──────────────────────────────────────────┘
```

### M4 discordRest — BUILT (discord.ts L46-89)

```
┌──────────────────────────────────────────┐
│ inputs: method path body                 │
│   tok = env DISCORD_BOT_TOKEN            │
│   if no tok throw jarvis_dc_auth_error   │
│   fetch Bot tok                          │
│   if 401 throw DiscordAuthError          │
│   if 403 throw DiscordForbiddenError     │
│   if 429 backoff 1s-5s x3 then throw     │
│   if 204 return undefined                │
│   return json                            │
│ outputs: T                               │
└──────────────────────────────────────────┘
```

### M5 copilot tick — PROPOSED (Foreman-shaped)

```
┌──────────────────────────────────────────┐
│ inputs: AttachSession                    │
│   if no TYPESAFE_API_KEY                 │
│     log jev_copilot_blocked_no_key       │
│     return                               │
│   if now - last_assess < 5s              │
│     return                               │
│   tail = session.screen()                │
│   ev = session.semantic()                │
│   state = bound(tail, ev)                │
│   ans = system_one noul x9               │
│   if ans.needs_human >= 0.80             │
│     escalate  no send                    │
│     return                               │
│   if ans.work_off_track >= 0.80          │
│     or ans.worker_stuck >= 0.80          │
│     if steers < 1                        │
│       session.steer(guidance)            │
│       steers += 1                        │
│     else                                 │
│       session.interrupt()                │
│     return                               │
│   if ans.ready_to_finish >= 0.85         │
│     and tests_sufficient >= 0.75         │
│     and requirements_satisfied >= 0.80   │
│     log finish_candidate  no kill pane   │
│     return                               │
│   continue quiet                         │
│ outputs: event jsonl                     │
└──────────────────────────────────────────┘
```

### M6 JevSeek (HARVESTED; not v1 invoke)

```
┌──────────────────────────────────────────┐
│ inputs: user request + actual history    │
│   jev selects tool                       │
│   llm fills arguments                    │
│   validate one native call               │
│   execute                                │
│   persist actual result                  │
│   jev completion review                  │
│   if complete factual summary            │
│   else loop                              │
└──────────────────────────────────────────┘
```
Quality bar: M1-M4 observed in source; M5 not observed on this host — PROPOSED. Battery cannot pin M5 until built.

---

## 6. TREES

### Call tree — steer hot path (BUILT)

```
┌────────────────────────────┐
│ hardSteer                  │
│ src/hard-steer.ts:12       │
└─────────────┬──────────────┘
              ▼
  statusDesk
  src/desk-orchestrator.ts
    cli terminal send \x03
    src/orca-transport.ts
    wait 500ms
    cli terminal send text enter
```
shown=5 total=5 capped=0. RIPWIRE_MISSING — edges from file reads this turn.

### Call tree — proposed copilot

```
┌────────────────────────────┐
│ copilotTick  PROPOSED      │
└─────────────┬──────────────┘
              ▼
  attachDesk  attach.ts:43
    screen  :68
    semantic :72
  system_one  HARVESTED SDK
  policy      HARVESTED table
  hardSteer   :12  or quiet
```
shown=7 total=7 capped=0.

### File tree — landing zone

```
┌──────────────────────────────────────────┐
│ JARVIS/src/                              │
├──────────────────────────────────────────┤
│ ├─ attach.ts         hot seat BUILT      │
│ ├─ hard-steer.ts     interrupt BUILT     │
│ ├─ desk-orchestrator.ts  DeskTransport   │
│ ├─ discord.ts        REST BUILT          │
│ ├─ discord-transport.ts  9 verbs BUILT   │
│ └─ orca-transport.ts cli envelope        │
└──────────────────────────────────────────┘
┌──────────────────────────────────────────┐
│ JARVIS/extension/                        │
├──────────────────────────────────────────┤
│ └─ jarvis-discord-manager.ts  15 tools   │
└──────────────────────────────────────────┘
┌──────────────────────────────────────────┐
│ JARVIS_DISCORD/reports/                  │
├──────────────────────────────────────────┤
│ └─ JEV_STACK_FIT.md  map HARVESTED       │
└──────────────────────────────────────────┘
```
shown=11 total=11 capped=0.

### Component tree — v1 copilot (PROPOSED modules)

```
┌──────────────────────────────┐
│ JevCopilot                   │
│ PROPOSED  not on disk        │
│ hooks: tick debounce         │
└──────────────┬───────────────┘
               │
       ┌───────┴────────┐
       ▼                ▼
┌─────────────┐  ┌─────────────┐
│ AttachSess  │  │ TypeSafe    │
│ attach.ts   │  │ SDK HARVEST │
└─────────────┘  └─────────────┘
```

---

## 7. LAWS + INVARIANTS

1. ALWAYS treat Jev as judge not writer. Mechanism: no Jev tool on worker palette. Anchor: Foreman L82; FIT L99; typesafe-ai L23 "Code owns the workflow".
2. NEVER dump the repo into Jev. Mechanism: bounded tail/diff. Anchor: Foreman L129.
3. MUST interrupt before deliver. Mechanism: `\x03` then 500ms then text. Anchor: attach.ts L26, L96-100; hard-steer.ts L2-3, L35-50.
4. NEVER hard-steer a non-running desk. Mechanism: throw `unit_not_running`. Anchor: hard-steer.ts L27-28.
5. ALWAYS fail closed without TypeSafe key. Mechanism: no terminal send. Anchor: Foreman L213; this host env count 0.
6. NEVER log API keys. Mechanism: labels only. Anchor: Foreman L233; JDM token law.
7. MUST evaluate Nouls in one parallel request. Mechanism: questions map. Anchor: Foreman L151; typesafe skill L126-127.
8. NEVER invent thresholds. Mechanism: copy Foreman table or document a new measured table. Anchor: Foreman L174-184.
9. ALWAYS policy-in-code after Jev. Mechanism: TS ifs on noul floats. Anchor: Foreman L155-157.
10. NEVER kill the pane on FINISH. Mechanism: attach non-destructive L2-3.
11. MUST debounce assessments. Mechanism: 5s min interval. Anchor: Foreman L282.
12. NEVER use JevSeek tool-selection as OMP v1. Mechanism: worker keeps bash/edit. Anchor: operator "existing agent"; JevSeek L26 rejected for v1.
13. ALWAYS mark PROPOSED vs BUILT in this blueprint. Mechanism: classification law header.
14. NEVER merge angels with Jev. Mechanism: FIT L103.
15. MUST treat Qwen-RLCD as not-Jev. Mechanism: research_qwen_rlcd_vs_jev_analysis.md conclusion.
16. ALWAYS 401 no-retry on Discord REST. Mechanism: discord.ts L71. (Jev SDK has its own retry — do not copy Discord's 401 law onto 429.)
17. MUST keep Discord JDM orthogonal: copilot does not require JDM; JDM does not call Jev.
18. NEVER quote secrets in blueprint/chat. Fingerprints only.

---

## 8. ERROR VOCABULARY + SCHEMA + SHELL

### Frozen tokens BUILT

| token | where | meaning |
|---|---|---|
| `attach_failed` | attach.ts L54,L58,L62 | desk/pane/session missing or closed |
| `unit_not_found` | hard-steer.ts L25,L32 | no tracker row or pane |
| `unit_not_running` | hard-steer.ts L28 | state !== running |
| `jarvis_dc_auth_error` | discord.ts L11,L71 | Discord 401 / missing bot token |
| `jarvis_dc_forbidden` | discord.ts L14,L72 | Discord 403 |
| `jarvis_dc_rate_limit` | discord.ts L16 | Discord 429 x3 exhausted |

### Frozen tokens PROPOSED (copilot)

| token | meaning |
|---|---|
| `jev_copilot_blocked_no_key` | no TYPESAFE_API_KEY; no send |
| `jev_copilot_assess_401` | TypeSafe auth fail |
| `jev_copilot_assess_timeout` | SDK timeout (Foreman 10s) |
| `jev_copilot_noul_oob` | noul not in [0,1] |
| `jev_copilot_escalated` | needs_human fired |
| `jev_copilot_steered` | attach.steer executed |
| `jev_copilot_interrupted` | attach.interrupt executed |
| `jev_copilot_quiet` | CONTINUE |

### Schema PROPOSED event jsonl

```
{"ts": iso, "desk": str, "paneId": str, "noul": {id: float}, "action": token, "steers": int}
```
No key fields.

### Forkable shell (PROPOSED file, not on disk)

`JARVIS/src/jev-copilot.ts`: `tick(session: AttachSession): Promise<string /* token */>`
Deps: attach.ts, hard-steer.ts, typesafe-sdk (not installed — PROPOSED).
Do not add OMP tool `jev_ask` on the worker in v1.

### Config constants to copy (HARVESTED)

FOREMAN_ASSESSMENT_MIN_INTERVAL_SECONDS=5
FOREMAN_PERIODIC_ASSESSMENT_SECONDS=30
FOREMAN_JEV_TIMEOUT_SECONDS=10
FOREMAN_MAX_STEERS_PER_WORKER=1
FOREMAN_STEERING_GRACE_SECONDS=30
SETTLE_MS=500 (attach.ts / hard-steer.ts)

---

## 9. BACKWARDS MAP + PROVENANCE

### N/N map

| source | blueprint § |
|---|---|
| attach.ts 106L | L1, T1-T3, M1-M2, laws 3,10 |
| hard-steer.ts 53L | L5, T4, M3, law 3-4, errors |
| desk-orchestrator DeskTransport | §4 types |
| discord.ts 253L | T7, M4, law 16-17 |
| jarvis-discord-manager 390L | T7, file tree |
| JEV_STACK_FIT.md 118L | macro thesis, law 1,12,14 |
| Foreman README harvest SHA 209182dac7 | L3-L4, M5, laws 1-2,5-11, thresholds |
| JevSeek README harvest SHA 030d59114a | T6, M6, law 12 REJECTED v1 |
| typesafe-ai/SKILL.md | macro, law 1,7 |
| jev-deep-research.md API §6 | §4 System One types |
| research_qwen_rlcd_vs_jev_analysis.md | law 15 |
| JevCopilot_ShowMe_v1.md | thinner sibling — not winner |
| OpenFang | OUT (operator R-14; unused) |

Zero orphans among listed winners.

### Variant table

| variant | lines | deltas | verdict |
|---|---|---|---|
| attach.ts live | 106 | copilot hot seat | WINNER actuator |
| hard-steer.ts live | 53 | extra running guard | WINNER steer |
| Foreman harvested README | 338 harvest file | nine Noul + policy | WINNER assess template |
| JevSeek harvested README | harvest 232+ | tool-select loop | REJECTED v1 |
| JevCopilot_ShowMe_v1 | ~40 | stub | OUT thinner |
| simple-jev harvest | SHA 0dd5396ffce6 | local logits | optional fallback PROPOSED off |
| Discord JDM | 15 tools live | I/O not judge | orthogonal |

### Why-wired ledger

| law | mechanism | reason |
|---|---|---|
| judge not writer | no Jev on worker tools | Foreman L82; existing agent stays |
| interrupt first | \x03 + 500ms | in-flight tokens otherwise append |
| fail closed no key | no send | this host has 0 TypeSafe env |
| copy thresholds | Foreman table | law 8 never invent |
| debounce 5s | min interval | cost + 429; Foreman L282 |

### Re-host guide (true only with audit appendix)

1. Keep attach.ts/hard-steer.ts unchanged.
2. Add jev-copilot.ts tick as in M5.
3. Seal TYPESAFE_API_KEY (mode 600), never argv.
4. Install typesafe-sdk; model jev-latest.
5. Battery: missing key token; 401 token; unit_not_running; steer argv grep `\x03`.
6. Do not port JevSeek desktop.
7. Do not call OpenFang.
8. Optional later: fast-jev-compaction SHA e3f262a7f4d4.

### Left OUT and why

- Full Foreman Python runtime (host coupling Codex app-server; OMP is Orca pane).
- JevSeek React desktop / OpenHands.
- Live TypeSafe HTTP (no key).
- Full clones of 30 repos (README harvest only).
- Angel/Puffer merge (FIT).
- Guild rename live (JDM restraint).
- Gateway Discord (JDM REST-only).

---

## APPENDIX A — attach.ts verbatim (BUILT winner)

The following is the complete file as read this session (106 lines). Rebuild the actuator from this, not from memory.

```typescript
// attach.ts — THE NATIVE ATTACH RAIL (copilot in the hot seat).
// LAW: attach is non-destructive — the pane lives on after detach. The
// orchestrator drives a desk exactly like a container: read screen, read
// the semantic event stream, send input, interrupt in-flight generation,
// steer (interrupt + deliver). Sitting and waiting is banned.
import { cli } from "./orca-transport.js";

export interface DeskEventRow {
  ts: number;
  kind: string;
  summary: string;
}

export interface AttachSession {
  desk: string;
  paneId: string;
  state: string;
  /** The hot-seat view: the pane's rendered tail (what the operator sees). */
  screen(): Promise<string[]>;
  /** The meaning view: the actor's event rows for this desk (ground truth). */
  semantic(): Promise<DeskEventRow[]>;
  /** Deliver a line (Enter-submitted). */
  send(text: string): Promise<void>;
  /** Cancel the in-flight generation (\x03 — the interrupt that lands). */
  interrupt(): Promise<void>;
  /** interrupt + 500ms settle + deliver — the corrective sequence. */
  steer(text: string): Promise<void>;
  /** Detach. The pane keeps running; attach again any time. */
  close(): void;
}

interface StatusFn {
  (scopeRoot: string, desk: string): Promise<{ state: string; pane_id?: string } | null>;
}

function parseTail(raw: unknown): string[] {
  const doc = raw as { result?: { terminal?: { tail?: unknown } }; terminal?: { tail?: unknown } };
  const t = doc?.result?.terminal ?? doc?.terminal ?? {};
  const tail = (t as { tail?: unknown }).tail;
  return Array.isArray(tail) ? tail.map((l) => String(l)) : [];
}

export async function attachDesk(
  scopeRoot: string,
  desk: string,
  statusFn?: StatusFn,
): Promise<AttachSession> {
  const status = statusFn ?? (async (sr: string, d: string) => {
    const { statusDesk } = await import("./desk-orchestrator.js");
    return statusDesk(sr, d) as Promise<{ state: string; pane_id?: string } | null>;
  });
  const row = await status(scopeRoot, desk);
  if (!row) {
    throw new Error(`[attach_failed] desk '${desk}' not found in tracker`);
  }
  const paneId = String(row.pane_id ?? "");
  if (!paneId) {
    throw new Error(`[attach_failed] desk '${desk}' has no pane_id`);
  }
  let closed = false;
  const guard = () => {
    if (closed) throw new Error(`[attach_failed] session for '${desk}' is closed`);
  };
  return {
    desk,
    paneId,
    state: row.state,
    async screen() {
      guard();
      return parseTail(await cli(["terminal", "read", "--terminal", paneId, "--json"]));
    },
    async semantic() {
      guard();
      // The actor writes desk_events into the scope tracker (offset-tailed
      // from the desk's omp session JSONL). Read the newest 50 rows.
      const { getStoreDb } = await import("./scope/scoped-store.js");
      // same path law as desk-orchestrator's trackerDb: <scopeRoot>/.omp-waves/tracker.sqlite
      const db = getStoreDb({ dbPath: scopeRoot + "/.omp-waves/tracker.sqlite", schema: [], id: "omp-attach" });
      try {
        const rows = db
          .query("SELECT ts, kind, summary FROM desk_events WHERE desk = ? ORDER BY seq DESC LIMIT 50")
          .all(desk) as DeskEventRow[];
        return rows.reverse();
      } catch {
        return []; // table absent = actor not yet run for this scope
      }
    },
    async send(text: string) {
      guard();
      await cli(["terminal", "send", "--terminal", paneId, "--text", text, "--enter", "--json"]);
    },
    async interrupt() {
      guard();
      await cli(["terminal", "send", "--terminal", paneId, "--text", "\x03", "--json"]);
    },
    async steer(text: string) {
      guard();
      await cli(["terminal", "send", "--terminal", paneId, "--text", "\x03", "--json"]);
      await new Promise<void>((r) => setTimeout(r, 500));
      await cli(["terminal", "send", "--terminal", paneId, "--text", text, "--enter", "--json"]);
    },
    close() {
      closed = true;
    },
  };
}

```

---

## APPENDIX B — hard-steer.ts verbatim (BUILT winner)

```typescript
// hard-steer.ts — THE INTERRUPT-THEN-DELIVER VERB (fork of TWM hard steer).
// LAW: the escape key fires FIRST to cancel the in-flight generation, then
// the text is delivered after a 500ms settle. A desk that is not running
// refuses with unit_not_running.
import { cli } from "./orca-transport.js";
class MechaRefusal extends Error {
  constructor(readonly code: string, message: string) {
    super(`[${code}] ${message}`);
  }
}

export async function hardSteer(
  scopeRoot: string,
  desk: string,
  text: string,
  transport: { sendKeys?: (paneId: string) => Promise<void>; promptPane: (paneId: string, text: string) => Promise<void> } = {} as any,
  statusFn?: (sr: string, d: string) => Promise<{ state: string; pane_id?: string } | null>,
): Promise<{ ok: boolean; interrupted: boolean; reason?: string }> {
  const statusFnResolved = statusFn ?? (async (sr: string, d: string) => {
    const { statusDesk } = await import("./desk-orchestrator.js");
    return statusDesk(sr, d) as Promise<{ state: string; pane_id?: string } | null>;
  });
  const row = await statusFnResolved(scopeRoot, desk);
  if (!row) {
    throw new MechaRefusal("unit_not_found", `desk '${desk}' not found in tracker`);
  }
  if (row.state !== "running") {
    throw new MechaRefusal("unit_not_running", `desk '${desk}' is '${row.state}', not 'running' — cannot hard-steer`);
  }
  const paneId = String(row.pane_id ?? "");
  if (!paneId) {
    throw new MechaRefusal("unit_not_found", `desk '${desk}' has no pane_id`);
  }

  // STEP 1: send Ctrl+C as text content to interrupt the in-flight generation.
  // The AP-2 flag audit correctly blocks --keys (it's not a valid terminal send flag).
  // \x03 is the raw Ctrl+C character that terminals interpret as SIGINT.
  const interruptPane = transport.sendKeys ?? (async (pid: string) => {
    await cli(["terminal", "send", "--terminal", pid, "--text", "\x03", "--json"]);
  });
  await interruptPane(paneId);

  // STEP 2: wait 500ms for the generation to cancel
  await new Promise<void>((r) => setTimeout(r, 500));

  // STEP 3: deliver the text
  const promptPane = transport.promptPane ?? (async (pid: string, txt: string) => {
    await cli(["terminal", "send", "--terminal", pid, "--text", txt, "--enter", "--json"]);
  });
  await promptPane(paneId, text);

  return { ok: true, interrupted: true };
}

```

---

## APPENDIX C — JEV_STACK_FIT.md verbatim (118 lines HARVESTED)

```markdown
# JEV_STACK_FIT — cited use-case map (2026-09-19)

Harvest: 30/30 GitHub URLs from Discord REST (cutoff 2026-09-17).
Index: `JARVIS_DISCORD/state/logs/jev-repo-index.md`
READMEs: `JARVIS_DISCORD/state/downloads/jev-harvest/readmes/`
Digests: `JARVIS_DISCORD/state/downloads/jev-harvest/digests/`
W4 quotes: `…/digests/_W4_local_corpus.md`
RIPWIRE_MISSING (no ripwire tool this runtime). No JARVIS product-code edits.

Baseline re-measure: Shared_Workspace `bd98a72` · JARVIS `adb5766` · home `0fac6cb` tag `ship/Jarvis_Discord_Manager-v1` · bundle sha256 `4daec1a11f81734bf2e12323dc19e346c4058577a7369341a5ace56b30dde2c3` (20616 B) · OpenFang `:4200` returned `{"status":"ok","version":"0.6.9"}` (running; pin forbids starting/reviving — left untouched).

---

## What Jev actually is (W4, not Discord READMEs)

Cite: `jev-deep-research.md` + `typesafe-ai/SKILL.md` (quoted in `_W4_local_corpus.md`).

Jev is TypeSafe's System One model: **typed judgments + probabilities, not generated text**. Three primitives: **Choice / Score / Noul**. API `POST https://api.typesafe.ai/v1/systemone` with `state` + `questions`. RLCD-trained; ~70–500ms; $0.042/MTok input, output free. Code owns the loop.

Qwen-2.5-1B-RLCD is **not** Jev (cite `research_qwen_rlcd_vs_jev_analysis.md`): inference-time parallel decoding on stock Qwen, no RLCD training.

**Missing lever for live Jev on this host:** a TypeSafe API key in env (not present in this research pin). Until then every Jev-API cell is **BLOCKED: TYPESAFE_API_KEY**.

---

## 9 Jev-core repos (W2)

| slug | HEAD_SHA | purpose (README quote, truncated) | digest |
|---|---|---|---|
| achimala/jevinci | `ecf9c48d290e` | "turns Jev's pixel probability distributions into paintings" | `digests/achimala__jevinci.md` |
| browser-use/jev-ultrafast | `1231850a0bf1` | "A browser agent with a dynamic, indexed action space… Jev picks an operation and an element" | `digests/browser-use__jev-ultrafast.md` |
| dbreunig/building-with-jev-skill | `04fe3666c6b8` | "agent skill for writing and improving programs that call Jev… Choice, Score, Noul" | `digests/dbreunig__building-with-jev-skill.md` |
| featherless-ai/simple-jev | `0dd5396ffce6` | "open models from huggingface, for structured classification and scoring… logits… JSON" | `digests/featherless-ai__simple-jev.md` |
| jarrodwatts/jev-trader | `b587759e459e` | "One decision every Monad block… Jev watches the Kuru MON-USDC order book… buy or sell" | `digests/jarrodwatts__jev-trader.md` |
| jkudish/jev-browser | `8d90c51bedbe` | "Fast and very cheap browser use using TypeSafe's Jev… picks one action per step" | `digests/jkudish__jev-browser.md` |
| morcoan/JevSeek | `030d59114a03` | "separates choosing an action from writing its arguments… Jev selects the next tool" | `digests/morcoan__JevSeek.md` |
| realZachi/pg-jev | `afd11fa856d7` | "filter, rank and classify rows with plain-language… calibrated probabilities" | `digests/realZachi__pg-jev.md` |
| tamaratran/fast-jev-compaction | `e3f262a7f4d4` | "replaces the compaction summary with Jev decisions… never rewrites anything" | `digests/tamaratran__fast-jev-compaction.md` |

---

## Capability × stack-slot

Cite column = digest path + SHA. Tangible = runnable here **now** or **BLOCKED** with the missing lever.

Legend: **FIT** = maps cleanly; **BLOCKED** = missing lever named; **N/A** = no honest mapping.

| Capability | JDM (Discord attach/steer) | JARVIS desks | Aether Shell | JESL | angels (Puffer) | trading |
|---|---|---|---|---|---|---|
| **Choice/Score/Noul as code primitives** cite `_W4` + `dbreunig__building-with-jev-skill.md` `04fe3666c6b8` | FIT: score incoming Discord msgs (route/severity) before steer. BLOCKED: TYPESAFE_API_KEY | FIT: desk-dispatch router (which agent/wave). BLOCKED: key | FIT: Aether CHECK gates as Noul. BLOCKED: key | FIT: JESL warhead "did the card fire" as Noul. BLOCKED: key | N/A (angels are trained policies, not System One) | FIT: buy/sell Choice. BLOCKED: key |
| **Action-select then LLM-fill (JevSeek / jev-browser / ultrafast)** cite `morcoan__JevSeek.md` `030d59114a03`; `jkudish__jev-browser.md` `8d90c51bedbe`; `browser-use__jev-ultrafast.md` `1231850a0bf1` | FIT: Jev picks Discord tool (`jarvis_dc_*`) then LLM fills args. BLOCKED: key + glue | FIT: Foreman-shaped desk supervisor. BLOCKED: key | N/A (Aether is script grammar, not tool loop) | FIT: Jev chooses JESL card, LLM fills slots. BLOCKED: key | N/A | N/A |
| **Foreman: Jev above coding agents** cite `thruwire__foreman.md` `209182dac7a3` | FIT: Jev judges "is this Discord thread done". BLOCKED: key | **Primary FIT**: independent completeness/test-sufficiency judge over OMP desks. BLOCKED: key + wire | FIT: Foreman as Aether CHECK. BLOCKED: key | FIT: Foreman as JESL done-when. BLOCKED: key | N/A | N/A |
| **Lossless compaction (fast-jev-compaction)** cite `tamaratran__fast-jev-compaction.md` `e3f262a7f4d4` | FIT: score Discord history before download. BLOCKED: key | **Primary FIT**: OMP session compaction without LLM summary loss. BLOCKED: key + plugin port | N/A | N/A | N/A | N/A |
| **pg-jev SQL predicates** cite `realZachi__pg-jev.md` `afd11fa856d7` | N/A | FIT: score tracker SQLite rows. BLOCKED: key + Postgres ext | N/A | N/A | N/A | FIT: filter setups in SQL. BLOCKED: key |
| **jev-trader block-tick decisions** cite `jarrodwatts__jev-trader.md` `b587759e459e` | N/A | N/A | N/A | N/A | N/A | **Primary FIT**: 300ms buy/sell on book. BLOCKED: key + Monad/Kuru (not this host) |
| **simple-jev local logits** cite `featherless-ai__simple-jev.md` `0dd5396ffce6` | FIT: local stand-in for Discord classifiers **without TypeSafe key** | FIT: local desk router | FIT: local CHECK | FIT: local warhead judge | N/A | FIT: local buy/sell Choice |
| **jevinci viz** cite `achimala__jevinci.md` `ecf9c48d290e` | N/A | N/A | N/A | N/A | N/A | N/A (demo viz only) |
| **Abide rule-break judge** cite `coldteadotai__abide.md` `ec3352e87316` | N/A | FIT: AGENTS.md / warhead compliance on desk diffs. BLOCKED: key | N/A | **Primary FIT**: "did this edit violate a JESL law". BLOCKED: key | N/A | N/A |
| **OpenSpec / OpenHarness / 12-factor** cite `Fission-AI__OpenSpec.md` `bae58cf61479`; `autonomous-ai__openharness.md` `3cd4014a08da`; `humanlayer__12-factor-agents.md` `d20c728368bf` | N/A | FIT: spec+harness around desks (no Jev required) | FIT: OpenSpec as Aether /goal neighbor | N/A | N/A | N/A |
| **CUA / WebMCP / jev-browser** cite `trycua__cua.md` `83f142c4290a`; `webmachinelearning__webmcp.md` `f5645e9aea51` | N/A | FIT: computer-use desks | N/A | N/A | N/A | N/A |
| **harness-bridge** cite `0xSero__harness-bridge.md` `30d2e35bbe78` | N/A | **FIT now**: point OMP/Codex at any endpoint without editing configs | N/A | N/A | N/A | N/A |
| **tradingview-optimizer / ai-hedge-fund** cite `Roboquant-AI__tradingview-optimizer.md` `12fe450aff67`; `virattt__ai-hedge-fund.md` `154a8b2f46dc` | N/A | N/A | N/A | N/A | N/A | FIT as research code, not Jev |
| **Scrapling / ServerKit / skillbox / skillranker / spectrum-ui / tabfm / gliner2 / OpenWA / ai-cli / ocr / ai-engineering-hub** | N/A or weak | adjacent tooling only | N/A | N/A | N/A | N/A |

---

## Adjacent 21 (W3) — SHA roll

| slug | SHA | overlap_flags (from digest) |
|---|---|---|
| 0xSero/harness-bridge | `30d2e35bbe78` | agents, skills |
| D4Vinci/Scrapling | `2b160ee18bfe` | (scrape) |
| Dicklesworthstone/skillranker | `93423348dd09` | skills |
| Fission-AI/OpenSpec | `bae58cf61479` | agents |
| Roboquant-AI/tradingview-optimizer | `12fe450aff67` | trading |
| alibaba/open-code-review | `a003b9341a65` | (review) |
| arihantcodes/spectrum-ui | `cdb32064c2d9` | (UI) |
| autonomous-ai/openharness | `3cd4014a08da` | agents |
| coldteadotai/abide | `ec3352e87316` | TypeSafe/Jev, agents |
| google-research/tabfm | `fbb665569425` | (tabular FM) |
| humanlayer/12-factor-agents | `d20c728368bf` | agents |
| jhd3197/ServerKit | `824e2d79dfbe` | (MCP kit) |
| kitze/skillbox | `486c2a3caf36` | skills |
| patchy631/ai-engineering-hub | `7875e2c38855` | (tutorials) |
| rmyndharis/OpenWA | `bcd820d51b48` | (WhatsApp) |
| sahibzada-allahyar/gliner2-ultrafast | `90f2f8551065` | (NER) |
| thruwire/foreman | `209182dac7a3` | TypeSafe/Jev, Foreman, agents |
| trycua/cua | `83f142c4290a` | agents, browser |
| vercel-labs/ai-cli | `8f64f3255f0b` | README 25 B (thin) |
| virattt/ai-hedge-fund | `154a8b2f46dc` | trading, agents |
| webmachinelearning/webmcp | `f5645e9aea51` | browser, agents |

Full purpose quotes live in matching `digests/<owner>__<repo>.md`.

---

## Long-term stack thesis (cited, not a build order)

1. **Jev is a judge, not a writer.** (`_W4_local_corpus.md`, typesafe-ai skill). Put it above desks (Foreman SHA `209182dac7a3`), above Discord history (JDM 15 tools already live), above JESL done-when — never as the coding LLM.
2. **Split action vs arguments** (JevSeek `030d59114a03`, jev-browser `8d90c51bedbe`): Jev picks `jarvis_dc_*` / desk verb; Spark/Laguna fills args. Matches existing JDM surface.
3. **Compaction without summary loss** (`e3f262a7f4d4`) is the highest-leverage OMP-native port: sessions already drown in tool JSON.
4. **simple-jev** (`0dd5396ffce6`) is the only path that is **not** BLOCKED on TYPESAFE_API_KEY (local HF logits). Use as offline stand-in; do not confuse with RLCD-trained Jev (`research_qwen_rlcd_vs_jev_analysis.md`).
5. **Angels stay orthogonal.** Puffer policies are trained action maps; Jev is a calibrated classifier. Do not merge them.
6. **Operator-owned next pick** (pin HARD STOP). This file maps; it does not implement.

---

## Gate checklist

| Gate | Evidence this turn |
|---|---|
| W1 | index 30 rows; harvest dir 30 README files; Discord UNIQUE 30 |
| W2 | 9 `kind: jev-core` digest files with SHA + purpose quote |
| W3 | 21 adjacent digests + overlap flags in table above |
| W4 | `_W4_local_corpus.md` quotes skill + 3 local md files |
| W5 | this file; every FIT/BLOCKED cell cites digest path + SHA |

Legal stop: report on disk, 30/30 harvested, table cited.

```

---

## APPENDIX D — BATTERY + AUDIT

Battery commands (run at prove):
- `wc -l` attach.ts = 106
- grep `500` attach.ts hard-steer.ts
- grep `unit_not_running` hard-steer.ts
- grep `implementation_complete` Foreman harvest
- grep `0.80` Foreman harvest
- env TYPESAFE count
- ls harvest readmes count 30
- grep kind jev-core count 9

Audit: constants must match winner files. If blueprint says 500ms and source says 500, pass. If blueprint invents 0.7 stuck, fail.

---

## APPENDIX E — RESEARCH DEPTH (what "everything" meant)

| claim | evidence |
|---|---|
| 30 URLs | Discord REST this goal |
| 30 READMEs | jev-harvest/readmes wc |
| 9 jev-core | digest kind field |
| no live Jev | TYPESAFE_ENV_COUNT=0 |
| Foreman template | harvest SHA 209182dac7 |
| JevSeek not v1 | harvest L26 vs existing agent |
| attach is copilot rail | attach.ts L1 |

End of skeleton; appendices filled next with full source dumps.

## APPENDIX F — discordRest winner excerpt (discord.ts L1-90)

```typescript
// discord.ts — headless Discord bot REST client (W1).
// Direct to https://discord.com/api/v10. No OpenFang, no daemon.
// Token read from env DISCORD_BOT_TOKEN only — never logged, never on argv.
// Token fingerprint: sha256 prefix 7f2a9b4e…

const DISCORD_API = "https://discord.com/api/v10";
const DISCORD_MSG_LIMIT = 2000;

// ── Error sentinels (hard stops) ────────────────────────────────────────────
export class DiscordAuthError extends Error {
  constructor(msg: string) { super(msg); this.name = "jarvis_dc_auth_error"; }
}
export class DiscordForbiddenError extends Error {
  constructor(msg: string) { super(msg); this.name = "jarvis_dc_forbidden"; }
}
export class DiscordRateLimitError extends Error {
  constructor(msg: string, public retryAfterSec: number) {
    super(msg); this.name = "jarvis_dc_rate_limit";
  }
}

// ── Internal REST primitive ─────────────────────────────────────────────────
export interface DiscordMessage {
  id: string;
  channel_id: string;
  content: string;
  author: { id: string; username: string; bot?: boolean };
  timestamp: string;
  edited_timestamp: string | null;
  attachments: Array<{ id: string; filename: string; url: string; size: number; content_type?: string }>;
}

export interface DiscordChannelInfo {
  id: string;
  name: string;
  type: number;
  guild_id?: string;
}

function requireToken(): string {
  const tok = process.env.DISCORD_BOT_TOKEN;
  if (!tok) throw new DiscordAuthError("DISCORD_BOT_TOKEN env var is not set");
  return tok;
}

export async function discordRest<T>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
  init?: RequestInit,
): Promise<T> {
  const url = `${DISCORD_API}${path}`;
  const opts: RequestInit = {
    method,
    headers: {
      "Authorization": `Bot ${requireToken()}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
      "User-Agent": "jarvis-discord/1.0 (jarvis-core, HEAD)",
    },
    ...init,
  };
  if (body !== undefined && init?.body === undefined) {
    opts.body = JSON.stringify(body);
  }
  // 429 backoff: 1s → 5s exponential
  let attempt = 0;
  const maxAttempts = 3;
  while (true) {
    const res = await fetch(url, opts);
    if (res.status === 401) { throw new DiscordAuthError(`401 Unauthorized on ${method} ${path}`); }
    if (res.status === 403) { throw new DiscordForbiddenError(`403 Forbidden on ${method} ${path}: ${await res.text()}`); }
    if (res.status === 429) {
      const rl = await res.json() as { retry_after?: number };
      const backoff = Math.min(5, Math.max(1, (rl.retry_after ?? 1) * Math.pow(2, attempt)));
      attempt++;
      if (attempt >= maxAttempts) throw new DiscordRateLimitError(`429 after ${maxAttempts} attempts on ${method} ${path}`, backoff);
      const { promise: backoffP, resolve: backoffR } = Promise.withResolvers<void>();
      setTimeout(backoffR, backoff * 1000);
      await backoffP;
      continue;
    }
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Discord REST ${res.status} on ${method} ${path}: ${txt}`);
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }
}
```

## APPENDIX G — Foreman harvest (winner assess template, full README harvest)

```markdown
# HARVEST thruwire/foreman

- url: https://github.com/thruwire/foreman
- HEAD_SHA: 209182dac7a3467033fd093ab4ca47d21279984a
- readme_status: OK
- bytes: 14439

---

# Foreman

Foreman watches the software factory floor with [TypeSafe AI's Jev](https://docs.typesafe.ai/introduction),
placing a fast decision model above slower coding agents.

Give it a ticket, specification, bug report, or any free-form software job. A
[Codex](https://learn.chatgpt.com/docs/developer-commands?surface=cli) worker does the software
engineering while Foreman independently assesses whether the implementation is complete,
requirements are satisfied, tests are sufficient, verification is needed, or human input is
required.

```text
                         SOFTWARE FACTORY
             Codex             Codex             Tests
            worker             worker               │
               │                  │                  │
               └──────────────────┼──────────────────┘
                                  │ factory evidence
                                  ▼
                              FOREMAN
                                Jev
                                  │
                                  ▼
                    implementation_complete  .91
                    tests_sufficient         .34
                    requirements_satisfied   .79
                    worker_stuck             .02
                    needs_verification       .82
                    work_off_track           .06
                    meaningful_progress      .94
                    ready_to_finish          .21
                                  │
                                  ▼
                    continue / steer / stop / retry
                         verify / finish
```

**Generative models work. Foreman watches the work.**

Foreman is an architectural experiment, not a claim that this design is already better than a
conventional coding-agent harness.

## Documentation

- [Theory: semantic supervision](docs/theory.md)
- [Why Jev fits the experiment](docs/why-jev.md)
- [What Foreman is proving](docs/what-foreman-proves.md)
- [Runtime and event flow](docs/runtime.md)
- [Live steering](docs/steering.md)

## What is Foreman?

Foreman is a native Python `asyncio` runtime with two concurrent loops:

```text
CODING AGENT LOOP                         FOREMAN LOOP
reason                                    watch
  │                                         │
  ▼                                         ▼
tool                                      assess
  │                                         │
  ▼                                         ▼
observe ───────── factory events ────────► Jev
  │                                         │
  ▼                                         ▼
edit                                      decide (Python policy)
  │                                         │
  ▼                                         ▼
test ◄──────────── intervention ────────── intervene
  │
  └── continue
```

Foreman does not replace Codex's reason/tool/observe loop and does not choose individual tools or
files for Codex. Missions stay broad. The important property is that the worker does not have to
stop working for the factory to think: worker output and lifecycle events flow into an independent,
debounced observation loop while the subprocess remains active.

## Why build this?

Coding agents are relatively slow, stateful generative systems. Supervisory questions such as
“is this worker stuck?” or “does this now need independent verification?” are narrower. Jev is
interesting here because TypeSafe describes it as accepting structured state and typed questions,
returning probabilistic decisions, and evaluating multiple questions independently in one parallel
request. Foreman explores whether that shape supports frequent semantic supervision without
rebuilding the coding agent itself.

## The factory floor

V1 runs one coding worker at a time. By default, a real worker is a Codex App Server thread and
turn launched over its JSONL protocol:

```text
codex app-server --listen stdio://
thread/start → turn/start → turn/steer or turn/interrupt
```

The App Server transport keeps the active Codex thread addressable, allowing Foreman to send a
supervisory update into an in-flight turn. App Server notifications and stderr are bounded in
memory, persisted as factory events, and made visible to Foreman before the worker exits. A verifier
is another Codex worker with an independent, deterministic verification mission. The prior stable
`codex exec` transport remains available through `FOREMAN_CODEX_BACKEND=exec`, but it cannot accept
live steering.

The worker implementation is replaceable; the runtime depends on a small worker protocol rather
than Codex-specific types.

## What Foreman watches

Each observation is compact and bounded. It contains:

- the original job and current factory status;
- active worker summaries, recent worker history, output tails, exit status, and elapsed time;
- `git status`, a bounded diff, and changed file names;
- verification results and recent persisted events;
- the prior assessment and intervention;
- attempt/failure counts and elapsed factory time.

Foreman never dumps the repository into Jev. Defaults are a 20,000-character diff, 12,000
characters per captured output tail, 30 recent events, and 10 workers of history. The limits live in
`FactoryConfig` and can be changed for experiments.

## What Foreman assesses

The first five dimensions describe the **overall job**:

- `implementation_complete`: probability that required implementation work is complete.
- `tests_sufficient`: probability that relevant coverage and passing verification are sufficient.
- `requirements_satisfied`: probability that the repository satisfies the free-form request as a
  whole, which is broader than code completion.
- `needs_verification`: probability that an independent verification pass is warranted.
- `ready_to_finish`: probability that the factory should consider the job complete.

The remaining four describe the **factory floor now**:

- `meaningful_progress`: probability that the current or latest worker is advancing the job.
- `worker_stuck`: probability that the worker is looping, repeatedly failing, or unable to advance.
- `work_off_track`: probability that work is drifting from the original job or is unrelated.
- `needs_human`: probability that judgment, credentials, clarification, or permission is needed.

Every dimension is one Jev `Noul` question, whose result is the probability of “yes.” All nine are
sent in one request. Values are validated, normalized to `[0, 1]`, stored in `state.json`, and
recorded in the event timeline.

## What Foreman can do

Jev only assesses. A deterministic Python policy decides which action is permitted:

- `CONTINUE`: let an active worker keep working.
- `START_WORKER`: begin a coding pass because work remains.
- `START_VERIFIER`: launch one independent verification pass.
- `STEER_WORKER`: send Jev-informed guidance into the active Codex turn.
- `STOP_WORKER`: gracefully terminate a stuck or off-track process.
- `RETRY_WORKER`: launch a fresh coding worker after a stopped attempt.
- `FINISH`: declare the job complete.
- `ESCALATE`: stop autonomous work and request human attention.

The ordering is safety-first: human need, iteration bounds, off-track/stuck workers, retry handling,
completion, verification, then continued work. A worker that crosses the stuck or off-track
threshold is steered once by default. It receives a grace period before a repeated high score causes
Foreman to stop it. State tracks steering and verification so policy does not oscillate.

Default policy thresholds are:

| Decision input | Threshold |
| --- | ---: |
| needs human | 0.80 |
| off track | 0.80 |
| worker stuck | 0.80 |
| needs verification | 0.65 |
| implementation before verification | 0.75 |
| ready to finish | 0.85 |
| requirements satisfied | 0.80 |
| tests sufficient | 0.75 |

## Why Jev?

The integration follows TypeSafe's current official Python SDK:

- package: [`typesafe-sdk`](https://docs.typesafe.ai/sdk/python);
- async client: `AsyncTypeSafeClient`;
- authentication: `TYPESAFE_API_KEY`;
- model: `jev-latest`;
- call: `await client.system_one(state=..., questions=...)`;
- question types: `Noul`, `Choice`, and `Score`;
- timeout: configurable per client/call (the SDK default is 10 seconds);
- errors: typed API, authentication, rate-limit, connection, timeout, and response-validation
  exceptions;
- retries: the SDK supports status-aware backoff and `Retry-After`; Foreman retries 429 and
  transient 5xx failures within its assessment timeout.

[TypeSafe's primitives documentation](https://docs.typesafe.ai/primitives) says questions in a
single call are evaluated independently and in parallel. Noul is the right primitive for these nine
yes/no probabilities; Choice and Score remain available for future experiments. The public docs
describe HTTP 429 handling but do not publish a single numeric rate limit, so Foreman does not
invent one. Its minimum assessment interval defaults to five seconds and is configurable.

## Requirements

- Python 3.11 or newer.
- The [Codex CLI](https://learn.chatgpt.com/docs/developer-commands?surface=cli) on `PATH`.
- A Codex CLI version that provides `codex app-server` for live steering.
- Codex authentication (`codex login`, then verify with `codex login status`).
- A TypeSafe API key for real runs. The deterministic demo and tests need neither service.

## Installation

From a fresh checkout:

```bash
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install '.[dev]'
cp .env.example .env
```

Put the key in `.env`:

```dotenv
TYPESAFE_API_KEY=your-key-here
```

`.env` is ignored by Git. Foreman never writes the key into logs, observations, state, or events.

## Running Foreman

```bash
foreman run \
  --repo ./my-project \
  --job "Add rate limiting to the API and make sure it is properly tested."
```

The terminal shows worker lifecycle messages and grouped job/factory-floor assessments. It makes
explicit when Codex is working and Foreman is independently watching, without animated noise.

## Deterministic demo

The simulation exercises the same runtime, policy, persistence, event stream, and UI with
deterministic model and worker implementations:

```bash
foreman demo --repo .
```

It needs no API key, network, Codex installation, or external repository. The sequence progresses
from continued implementation, through independent verification, to `FINISH`.

## Persistence and inspection

Each repository gets local, ignored state:

```text
.foreman/runs/<run-id>/
├── state.json
└── events.jsonl
```

`state.json` is atomically replaced and contains enough typed state to recover a run.
`events.jsonl` is an append-only timeline. Inspect either through the CLI:

```bash
foreman runs --repo ./my-project
foreman inspect <run-id> --repo ./my-project
```

## Runtime configuration

The most useful environment overrides are:

| Variable | Default | Meaning |
| --- | ---: | --- |
| `FOREMAN_ASSESSMENT_MIN_INTERVAL_SECONDS` | `5` | Debounce/coalescing floor |
| `FOREMAN_PERIODIC_ASSESSMENT_SECONDS` | `30` | Assessment during quiet work |
| `FOREMAN_JEV_TIMEOUT_SECONDS` | `10` | Semantic assessment timeout |
| `FOREMAN_WORKER_TIMEOUT_SECONDS` | `3600` | Per-worker timeout |
| `FOREMAN_OVERALL_TIMEOUT_SECONDS` | `7200` | Whole-run timeout |
| `FOREMAN_MAX_WORKERS` | `3` | Total workers, including verifier |
| `FOREMAN_MAX_RETRIES` | `1` | Fresh attempts after a stop |
| `FOREMAN_MAX_ITERATIONS` | `20` | Semantic decision ceiling |
| `FOREMAN_CODEX_BACKEND` | `app-server` | `app-server` for steering or `exec` fallback |
| `FOREMAN_STEERING_ENABLED` | `true` | Allow Jev-informed active-turn guidance |
| `FOREMAN_MAX_STEERS_PER_WORKER` | `1` | Steering attempts before stop/retry |
| `FOREMAN_STEERING_GRACE_SECONDS` | `30` | Time to recover before another intervention |

Policy thresholds and observation bounds are typed `FactoryConfig` fields and can be configured by
applications embedding Foreman.

## Tests

```bash
python -m pytest
```

The suite is offline: no credentials, network, Codex process, or external repository is required.
It covers models, serialization, persistence/recovery, Jev translation and failure handling, every
policy branch, subprocess streaming/termination, concurrent assessments, intervention delivery,
the complete simulated factory, and a stuck-worker recovery scenario.

## Process safety and security

Foreman enforces steering, worker, retry, iteration, worker-timeout, overall-timeout, and concurrency
limits. Workers receive only the supplied repository as their working root. Stop requests first
interrupt the active App Server turn, then terminate the process after a bounded grace period.
Ctrl-C cancels the run, terminates active workers, and persists a final cancelled state.

Codex still runs with the permissions of the local environment. `workspace-write` is requested, but
Foreman is not a security sandbox and does not make untrusted repositories safe. Review Codex's
configuration and the repository before running it.

## Limitations

- Jev assessment accuracy is unproven for this use case and the semantic scores need calibration.
- False positives can stop useful workers; false negatives can allow bad work to continue.
- Repository observations are necessarily incomplete and bounded.
- Codex remains responsible for software-engineering reasoning and tool use.
- Codex App Server is currently experimental and its protocol may change between CLI releases.
- V1 runs one coding worker at a time.
- Local execution is not isolated.
- Persistence is useful for inspection, not production-grade durable execution.
- A verifier reports evidence through the same observation channel; there is no formal proof of
  correctness.
- This is an architectural experiment, not a production software factory.

## Future experiments

Natural next steps include simultaneous workers, per-worker and factory-wide assessments, alternate
coding agents or fast decision models, dynamic assessment frequency, calibrated policies, durable
execution, and isolated worker environments. They are intentionally outside this small V1.

```

## APPENDIX H — BATTERY LOG (prove this turn)

Results (commands run 2026-09-19):
1. `wc -l` attach.ts = **106** PASS
2. grep 500 attach.ts:26,99 hard-steer.ts:3,43,44 PASS
3. grep unit_not_running hard-steer.ts:4,28 PASS
4. Foreman implementation_complete L33 and L136 PASS
5. Foreman `0.80` count = **4** PASS
6. jev-core digests = **9** PASS
7. harvest readmes = **30** PASS
8. this blueprint `wc -l` = **1410** (>=1000) PASS
9. TYPESAFE env = **0** PASS (live assess BLOCKED)
10. Audit: thresholds 0.80/0.85/0.75 copied not invented; 500ms copied.
Verdict: **BATTERY GREEN** on BUILT+HARVESTED. M5 copilotTick PROPOSED (unobserved).

## APPENDIX I — OPERATOR QUOTE BANK (verbatim, not paraphrased)

- "Jev as an in-session copilot for omp agnets"
- "what is the best way for my to implement jev currently as a copilot system on an existing agent"
- "what level of research ahve you done report"
- "how. what does it look like. show me"
- "research everything properly and get a real dense thorough master blueprint level answer"
- "OPENFANG IS IRRELEVANT" / "NOTHING SHOULD BE CONNECTED TO OPENFANG" (R-14, JDM)
- "CLEARLY BE NAMED JARVIS DISCORD MANAGER" (R-13, orthogonal)

## APPENDIX J — CLASSIFICATION LEDGER

| item | class | owner |
|---|---|---|
| attachDesk | BUILT | JARVIS/src/attach.ts |
| hardSteer | BUILT | JARVIS/src/hard-steer.ts |
| JDM 15 tools | BUILT | extension/jarvis-discord-manager.ts |
| Foreman 9 Noul + thresholds | HARVESTED | thruwire/foreman README SHA 209182dac7 |
| JevSeek tool loop | HARVESTED+REJECTED v1 | morcoan/JevSeek |
| copilotTick M5 | PROPOSED | operator to order build |
| typesafe-sdk on this host | PROPOSED | not installed |
| live system_one | BLOCKED | TYPESAFE_API_KEY |
| simple-jev fallback | PROPOSED off | FIT |
| angels as judge | REJECTED | FIT L103 |
