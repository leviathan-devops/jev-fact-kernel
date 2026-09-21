# Warheads via Abide — Master Blueprint v1

**Series:** WarheadsAbide (OMP enforcement stack; parent: JevClaimFirewall_Blueprint + omp-warhead-enforcement-port)
**Date:** 2026-09-20
**Grade:** Abide = BUILT (cloned `/tmp/abide`, 17 commits, packages/schema + packages/cli). OMP host adapter = PROPOSED. Claim firewall = DESIGN. Warhead port Layer 1-2 = SKILL, not proven live this turn.

Using master-blueprint. Ingredient skills loaded: engineering-report (anchor law), extracting-production-boilerplates (locate/absorb), show-me spine bent to 9-section master anatomy.

Winner for Abide: github.com/coldteadotai/abide @ master (clone `/tmp/abide`). README measured claims: 93 sessions, 1256 edits, 147 turns, Jev $0.22, edit precision 26%, turn precision 73% (benchmarks/replay/README.md).

Winner for warhead port: `~/.omp/agent/managed-skills/omp-warhead-enforcement-port/SKILL.md` (three layers). Payload: `~/.omp/agent/skills/trident-warheads/SKILL.md` (~410L, 21 warheads). Authoring: `warhead-writing/SKILL.md`.

This is NOT a clone of Abide's internals as a product bible. It is the rebuildable integration of Abide's **already-built** judge into OMP warhead enforcement + the claim firewall.

---

## 1. MACRO BLUEPRINT

Abide's one-paragraph: coding agents break instruction-file rules no linter can catch; on every edit or turn Abide asks Jev one question per **model** rule against the **diff only** (never the conversation); band `act` (>=0.8) tells the agent to repair in the same turn; no key = edit goes through, miss logged (`README.md` "Cost, privacy, safety").

Warheads are behavior programs (imperative DO-bullets). Most of them are **conversation/process**, which Abide's own compile skill buckets as `unenforceable` (skills/abide-compile/SKILL.md Step 3.5). Pretending Abide enforces "should I continue?" on a hunk is a lie.

```
 +--------------------------------------------------------------+
 |                    OMP WARHEAD STACK                         |
 |                                                              |
 |  L0 TTSR     phrase-class, 50ms, thinking+text   KEEP        |
 |  L1 ABIDE    Jev vs DIFF, rubric from warheads   ADD         |
 |              that survive compile as `model`                 |
 |  L2 CLAIM FW bind claim to THIS-TURN tool span   ADD         |
 |              close ownership (prior blueprint)               |
 |  L3 PROMPT   SYSTEM.md / agent bodies            KEEP        |
 |              unenforceable remainder                         |
 +--------------------------------------------------------------+
           |              |              |
           v              v              v
      stream abort    hunk repair    goal.complete throw
      (regex/AST)     (Jev noul)     (binder then Jev)
```

One law across layers: **code owns route; Jev owns closed questions on bounded evidence; the model does not own the close.**

Abide fail-open on missing key (README). Claim firewall fail-closed on `goal.complete` (JevClaimFirewall L6). Do not unify those polarities.

---

## 2. LIFECYCLE SECTIONS

### 2.1 Compile (Abide session-start analog)

WHAT: instruction files -> `.abide/rubric.json`
HOW: agent follows `skills/abide-compile/SKILL.md` Steps 1-8; CLI `abide rubric validate` then `abide calibrate`
WHERE: sources = WARHEADS.md / trident-warheads SKILL + AGENTS.md + project AGENTS.md
WHY: Jev never sees the warhead file; it sees one rule + one diff (`checkWithModel` jev.ts:169 "One call carrying every rule. The state is only the rule set and the change.")

Buckets (compile Step 3, stop at first yes):

| Bucket | Meaning | Warhead examples |
|--------|---------|------------------|
| lint | linter can enforce exactly | W7 floor as `wc -l` is deferred not lint; `interface` vs `type` if present |
| deferred | needs script or whole repo | W7 line floors (judge cannot count); "reuse existing error codes" |
| model | judge can answer from a change | W3 "files changed is not verification" on a test-file weaken; W7 structure markers in a .md write; W13 theatrical claim **in code comments** |
| unenforceable | conversation/process | W1 "too big", W2 "should I continue?", W4 reasoning, W6 rate-limit switch, W15 cuck class in thought |

Authoring recipe for a warhead rule that Abide can fire:

- One idea, about the DIFF: "Does this change add a .md whose body is under the named floor without the required sections?"
- `when: edit` if the hunk is enough; `when: turn` if the whole change is needed (scope creep, single-use abstraction)
- `criteria.true/false` from the warhead's NEVER bullet
- NEVER put "ask the operator" into a model question

### 2.2 Snapshot (turn start)

WHAT: git snapshot of working tree
HOW: Abide `hooks/turnStart.ts` (TURN_START_TIMEOUT_MS=5000, constants.ts:27-28)
WHERE: session dir under Abide's turnDir
WHY: stop-hook diffs the whole turn

OMP analog PROPOSED: on first write/edit of a turn, record tree or file hashes. Owner: OMP adapter.

### 2.3 Edit check (post tool)

WHAT: after Write/Edit/apply_patch, run `when:edit` model rules on that hunk
HOW: `handlePostToolUse` postToolUse.ts:35-171
  - parse hook input; silent if fail (L37)
  - no rules -> silent (L51)
  - no API key -> skip event, silent (L73-82 pattern; README fail-open)
  - `runCheck` with EDIT_CHECK_TIMEOUT_MS=8000 (constants.ts:10)
  - band act -> repairReason, incrementBlock, MAX_BLOCKS_PER_RULE_PER_TURN=2 (constants.ts:18-19)
  - band flag -> notice, agent not forced
  - return kind silent | notice
WHERE: Claude PostToolUse / Codex hooks / OpenCode plugin tool-result append
WHY: 300ms Jev, ~0.00004-0.00007 USD per 13-rule check (README 2026-09-18)

OMP analog PROPOSED: wrap `write`/`edit` tool results. Append repair text to tool result like OpenCode (README Agents table). Do not abort the write (Abide never blocks the filesystem; it asks for repair). Aligns with claim-firewall L8 tools-never-blocked.

### 2.4 Turn check (stop)

WHAT: whole-turn diff vs snapshot; `when:turn` rules + leftover shell writes
HOW: Stop hook; MAX_STOP_CHECKS_PER_TURN=2 (constants.ts:20-21) — first plus one re-check after repair
WHERE: agent stop
WHY: "Did this add more than was asked" has no answer after edit 1 of 12 (README rubric)

OMP analog: settled assistant message + `goal.complete` is the claim firewall. Do not double-judge "done" in Abide turn rules AND claim firewall. **Precedence:** Abide turn rules = code-quality vs warhead-derived model rules. Claim firewall = numeric/completion claims vs tool-result spans.

### 2.5 Claim close (this session's firewall)

WHAT: detect done-shaped text / goal.complete / child yield
HOW: bind atoms to THIS-TURN tool results; missing span = FABRICATED no Jev; else Jev Choice supports/contradicts
WHERE: JARVIS/extension/jev-claim-firewall (DESIGN, not built)
WHY: Abide never sees tool-result JSON; it sees diffs. "523 tests pass" is not a diff. Different evidence.

### 2.6 TTSR detect (warhead port Layer 1)

WHAT: phrase-class abort mid-token
HOW: `.omp/rules/*.md` condition regex, interruptMode always, thinking in scope
WHERE: omp-warhead-enforcement-port Layer 1
WHY: Abide compile marks these unenforceable. TTSR is the only 50ms path. Jev not here (claim-firewall L4, Abide timeout 8s anyway).

---

## 3. DISPATCH TRACES

### Trace A — Abide as shipped (Claude)

```
 sessionStart -> hash instruction files -> compile-needed event
 turnStart    -> git snapshot
 Write/Edit   -> postToolUse -> loadRules -> checkWithModel(jev.ts)
              -> bandFor(band.ts:48) act|flag|clear
              -> act: repair message in hook output
 Stop         -> turn diff -> turn rules -> optional second check
```

### Trace B — OpenCode (closest to OMP)

README: no hook processes; plugin. Edit break -> repair request **appended to tool result**. Turn break -> follow-up message.
Code: `opencodePlugin.ts` installs shim `abide-opencode-plugin` pointing at package `opencode/abide.mjs`.

### Trace C — OMP (PROPOSED)

```
 write/edit execute
   -> evidence-ring records excerpt (claim firewall)
   -> abide adapter: build EditHunk from before/after
   -> checkWithModel OR spawn `abide` CLI check
   -> act: append repairReason to tool result content
   -> do not throw the write
 assistant settled / goal.complete
   -> claim firewall detect/bind/judge/route
   -> REJECT throws CLAIM_REJECTED
 TTSR checkMessageUpdate
   -> regex only, zero Jev calls (I3)
```

### Trace D — Warhead port as specified (other session)

Layer 1 TTSR rules (~12 phrase classes).
Layer 2 APPEND_SYSTEM.md + agent bodies (trimmed warheads).
Layer 3 trident-omp extension: DISABLED 2026-09-15/17 (skill L36-37).

Abide does not replace Layer 1 or 2. It **is** what Layer 3 wanted to be for **code** rules, without Poseidon.

---

## 4. TYPES + ENGINE CHECKS

From `/tmp/abide/packages/schema/src/rubric.ts`:

- RUBRIC_VERSION = 1 (L5)
- RuleWhen = edit | turn (L6)
- RuleStatus = active | weak | noisy | disabled (L9)
- Check discriminated: lint | model | deferred | unenforceable (L110)
- DEFAULT_THRESHOLDS = { act: 0.8, flag: 0.5 } (L179)
- flag < act refine (L176)

From verdict.ts:

- Band = act | flag | clear (L4)
- Event kinds: check | skip | error | compile-needed (L27-68)
- check.blocked: boolean (L42)

From band.ts:

```
 violationProbability(question, answer) -> 0..1
 bandFor(p, thresholds) -> p>=act ? act : p>=flag ? flag : clear
```

From constants.ts:

- TYPESAFE_MODEL_ID = "jev-latest" (L2)
- TYPESAFE_KEY_ENV = "TYPESAFE_AI_API_KEY" (L4) — **not** TYPESAFE_API_KEY from TypeSafe docs; adapter must accept both or we fail closed on the wrong name
- EDIT 8s, TURN 15s, MAX_STATE_CHARS 24000, MAX_BLOCKS 2

Engine checks in order (postToolUse):

1. schema parse fail -> silent
2. no edits / excluded paths -> silent
3. no rules -> silent
4. no API key -> skip logged, silent (fail-open)
5. timeout/error -> error event, silent (hooks cannot break session — README)
6. act band + block count < MAX -> repair
7. act but cap hit -> flag only

Claim-firewall checks (DESIGN) are the opposite on close: no key -> FAIL_CLOSED.

Key-name collision: Abide `TYPESAFE_AI_API_KEY` vs TypeSafe SDK `TYPESAFE_API_KEY`. PROPOSED: adapter reads either.

---

## 5. INVOKE PSEUDOCODE

```
 compileWarheads(sources):
   for each sentence that instructs:
     if linter-exact: check.type = lint
     else if needs count/repo: deferred
     else if conversation/process: unenforceable
     else model + when edit|turn + question
   validate; calibrate once; stop

 onOmpWrite(path, before, after):
   ring.record(tool_id, excerpt)
   if no rubric.model.edit rules: return
   if no key: events.skip; return          // Abide polarity
   r = checkWithModel(editRules, {diff, task})
   if timeout: events.error; return        // never throw write
   for v in r.verdicts:
     if bandFor(v) == act and blocks < 2:
       append repairReason to tool result

 onSettledText(text) or goal.complete:
   if not claim-shaped and not complete-tool: return
   atoms = parse(text or proof contract)
   spans = bind(atoms, ring this-turn)
   if no spans: verdict FABRICATED; reject close; jev_called=false
   else:
     if no key: FAIL_CLOSED                 // firewall polarity
     j = jev.choice(claim, spans)
     route(j)

 onStreamDelta(buf):
   NEVER call Jev
   TTSR regex only
```

Battery pins (must exist before "wired"):

- compile of trident-warheads produces a rubric whose unenforceable count is high and model count is nonzero
- I3: zero Jev in TTSR path
- write of a thin ARCHITECTURE.md (W7) -> act repair if compiled as model/deferred-script
- "523 tests pass" with empty ring -> claim FABRICATED, Abide not invoked
- missing key: write succeeds; goal.complete fails

---

## 6. TREES

Call (edit path), shown=12:

```
 handlePostToolUse                         postToolUse.ts:35
   editsFromPostToolUse                    diff.ts
   loadRules                               loadRules.ts
   hasApiKey                               credentials.ts
   runCheck                                checkRunner.ts
     checkWithModel                        jev.ts:169
       experimental_evaluate               ai SDK
     violationProbability                  band.ts:11
     bandFor                               band.ts:48
   repairReason / flagNotice               reason.ts
   incrementBlock                          session.ts
```

File tree winner `/tmp/abide` shown=N:

```
 packages/schema/src/  rubric.ts verdict.ts hooks.ts host.ts
 packages/cli/src/
   bin.ts abide-hook.ts
   hooks/ sessionStart.ts turnStart.ts postToolUse.ts stop.ts
   lib/ jev.ts band.ts checkRunner.ts opencodePlugin.ts
        credentials.ts events.ts diff.ts
   commands/ init.ts compile.ts calibrate.ts audit.ts replay.ts
 skills/abide-compile/SKILL.md
 benchmarks/replay/README.md
```

OMP stack files (this workspace):

```
 JARVIS/reports/JevClaimFirewall_Blueprint.md
 JARVIS/reports/JevRuntimeIntelligence_meta_architecture_package/
 ~/.omp/agent/managed-skills/omp-warhead-enforcement-port/SKILL.md
 ~/.omp/agent/skills/trident-warheads/SKILL.md
 JARVIS/extension/jev-claim-firewall/     PROPOSED
 JARVIS/extension/abide-omp/              PROPOSED
 .abide/rubric.json                       PROPOSED compile output
 .omp/rules/*.md                          warhead port Layer 1
```

---

## 7. LAWS + INVARIANTS

**A1 DIFF-ONLY** ALWAYS send Jev the rule + the change. NEVER the conversation. (jev.ts:169 comment; compile skill "checker sees only one rule and one diff")

**A2 NO-INVENTED-RULES** NEVER add a rule the user did not write. (compile Step 1)

**A3 BUCKET-HONESTY** Conversation warheads MUST land `unenforceable`. NEVER force them into `model`.

**A4 FAIL-OPEN-ON-EDIT** Abide hooks exit 0 always; no key = unchecked + logged. (README)

**A5 FAIL-CLOSED-ON-CLOSE** Claim firewall does not stamp done without key. (JevClaimFirewall L6)

**A6 NO-JEV-IN-TTSR** (L4) EDIT_CHECK_TIMEOUT_MS=8000 already proves Jev cannot live at 50ms.

**A7 TOOLS-NEVER-BLOCKED** Abide asks repair; it does not roll back the write. Claim firewall does not deny writes.

**A8 BLOCK-CAP** MAX_BLOCKS_PER_RULE_PER_TURN=2 then flag only — prevents repair loops.

**A9 CALIBRATE-ONCE** weak/noisy switched off; rewrite once; do not loop. (compile Step 7)

**A10 KEY-NAMES** Accept TYPESAFE_AI_API_KEY (Abide) and TYPESAFE_API_KEY (TypeSafe). Never log keys. (credentials.ts + README lookup order)

**A11 PRECISION-HONESTY** Edit-level 26% confirmed in replay; turn-level 73%. Do not sell edit-act as truth. Prefer turn rules for warhead "whole change" laws; keep edit rules narrow with criteria examples.

**A12 NO-SKILL-SUBSTITUTE** Wiring Abide is an adapter + rubric, not a SKILL.md that tells the model to run abide.

**A13 LAYER-3-DEAD** trident-omp tool blocks remain disabled until operator re-enables; Abide is the replacement for code-side Layer 3, not a silent re-enable of Poseidon.

---

## 8. ERROR VOCABULARY + SCHEMA + SHELL

Abide events: check | skip | error | compile-needed (verdict.ts).
Gateway: CHECK_TIMEOUT | CHECK_FAILED (jev.ts:81).
Bands: act | flag | clear.
Claim firewall: PASS | REJECT | FAIL_CLOSED | FABRICATED | WRONG_SPAN.

Minimal shell to start:

```
 npx @coldtea/abide login     # ~/.abide/.env owner-only
 npx @coldtea/abide init      # claude|codex|opencode — NOT omp
 # OMP: PROPOSED adapter, do not claim init omp exists
```

Forkable rubric seed: compile trident-warheads + AGENTS.md into `.abide/rubric.json` version 1, then delete or disable every `unenforceable` from the act path (they stay in the file for report honesty).

---

## 9. BACKWARDS MAP + PROVENANCE + WIRING

### 9.1 Variant table

| variant | what | verdict |
|---------|------|---------|
| /tmp/abide clone | schema+cli+compile skill+replay | WINNER for Abide |
| npm @coldtea/abide | same product, not opened this turn | use clone for anchors |
| omp-warhead-enforcement-port | 3-layer port skill | WINNER for warhead OMP intent |
| trident-omp extension | Layer 3 castrated | do not re-enable blindly |
| JevClaimFirewall_Blueprint | close-ownership DESIGN | WINNER for done-claims |
| JevRuntimeIntelligence package | insertion map | superseded for close; still Paragon dampen |

### 9.2 Warhead -> layer map (the wiring)

| Warhead | Abide bucket | Layer |
|---------|--------------|-------|
| W1 scope / too big | unenforceable | L0 TTSR + L3 prompt |
| W2 execution / should I continue | unenforceable | L0 TTSR |
| W3 engineering standards (claims) | model on test-weaken diffs; unenforceable on prose claims | L1 Abide edit + L2 claim FW |
| W4 self-conditioning | unenforceable (reasoning) | L3 prompt; TTSR thinking if phrase |
| W5 firewall awareness | unenforceable | prompt |
| W6 rate-limit switch | unenforceable | prompt (OMP /model not Claude TUI) |
| W7 doc-density | deferred (count) + model (missing sections) | L1 turn/edit; optional script |
| W8 runtime-grade test | unenforceable in diff; L2 if they claim container pass | L2 claim FW |
| W13 verification-before-declaration | mix: code comments theatrical = model; "523 pass" = L2 | L1 + L2 |
| W15 cuck class | unenforceable (thought); some code shrinks = model turn | L0 + L1 turn |

### 9.3 How Abide wires into everything already designed

```
 DETECT (cheap)
   TTSR regex          -> L0 abort
   claim-shaped text   -> L2 binder
   write/edit hunk     -> L1 Abide
 JUDGE
   L0 none (regex)
   L1 Jev on (rule, diff)     Abide checkWithModel
   L2 Jev on (claim, spans)   citation_check shape
 ROUTE
   L0 inject warhead body
   L1 repairReason on tool result (OpenCode pattern)
   L2 CLAIM_REJECTED on complete
```

Shared Jev client: one TypeSafeClient, fail paths differ by **surface** (edit vs close). Shared ledger: Abide `.abide/events.jsonl` + claim firewall JSONL; do not merge schemas; `report` both.

Do not run Abide `when:turn` scope-creep and claim-firewall theatrical noul on the same stop event without dedupe. Default: Abide turn = code rules from rubric; claim firewall = completion atoms only.

OMP host: Abide `init` has no omp row (README Agents: Claude, Codex, OpenCode). Build `JARVIS/extension/abide-omp` modeled on `opencodePlugin.ts` + postToolUse.ts, wrapping OMP write/edit. Until that ships, `npx @coldtea/abide init opencode` does nothing for this OMP desk.

### 9.4 Re-host guide (numbered)

1. Clone or pin `@coldtea/abide`; do not fork Jev.
2. `abide login` with TypeSafe key; confirm env names.
3. Put warheads on disk as instruction files the compile skill will read (not only a skill description).
4. Run compile; **read the bucket table**; expect most warheads unenforceable.
5. Tighten surviving model questions (criteria examples); calibrate once.
6. Install OpenCode plugin only if this tree is OpenCode; else write OMP adapter.
7. Keep TTSR rules for unenforceable phrase classes.
8. Land claim firewall for close; do not ask Abide to judge "N tests pass".
9. Prove: I3 latency, thin-md repair, fake-done FABRICATED, key-off polarities.
10. `abide report` + claim ledger yield trend. Edit precision 26% means calibrate before trusting act-on-every-edit.

### 9.5 Left out and why

- Full Abide CLI command internals (audit/replay/tune) — product features, not OMP wiring
- Poseidon / STTGF / wave-manager warheads 16+ — OMP uses task/eval; port skill already trims them
- Discord / OpenFang — wrong layer
- Paragon lattice on OMP — out of scope; L8 shared only
- Live other-session transcript — not in this desk; the port **skill** is the durable record of that work

### 9.6 Residual

- OMP write/edit wrap file:line in pi-coding-agent: not opened this turn (same residual as claim firewall §13.2)
- Abide npm dist vs clone SHA: clone used, package version 0.0.0 private
- Compile of actual trident-warheads into a rubric: NOT RUN this turn (would be the first mechanical proof)
- Other session's live TTSR rule files: not globbed successfully at workspace scale; Layer 1 may or may not be installed
- Master-blueprint 1000-line floor: this is an integration subsystem (~this file). Padding Abide's README into the doc would cheat. Remaining density is `abide compile` output once run.

### 9.7 Files touched

- `JARVIS/reports/WarheadsAbide_Master_Blueprint_v1.md` (this file)
- clone `/tmp/abide` (read-only absorb)
- prior: JevClaimFirewall_Blueprint.md unchanged
