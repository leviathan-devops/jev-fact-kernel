# Jev Claim Firewall — Blueprint

Operator 2026-09-20. Capability: an OMP-runtime-owned gate that rejects
hallucinated completion. Not a skill. Not a second agent. Not Paragon-in-plugin.

Founding-instance file `reports/GoDeeper_Skill_Blueprint.md` was not in this
tree this turn; the canon is the blueprinting skill itself (14 sections, 16
moves). Prior adjacent design:
`JARVIS/reports/JevRuntimeIntelligence_meta_architecture_package/` (insertion
map). This blueprint is the OMP-native firewall that map pointed at and did
not design.

Operator requirement, verbatim:

> "all of this crap right now of me ahving to force verify through
> hallucinated success - jev can immediately kick and nip all of this.
> [...] embedded process that will scan agent stream on completion claims
> or in the goal loop judge and insert a pre-engineered decision making
> cirteria that jev executes [...] wired to omp's runtime we can ride the
> same hook surface and mechanically build a Jev enhanced behavior
> firewall hooked to TTSR/tool surface/goal loop/agent returns - like
> agents return and say done complete 523 test pass - omp runtime kicks
> it/throws error/rejects the claim w/ full jev analysis and hard steers
> automatically"

---

## §0 THE FIRST-PRINCIPLES CORE

The pain is not "agents are sloppy." The pain is that **the model is allowed
to declare the turn closed**. Every adjacent thing we already have (skills,
goal-prompt ANTI-STOP, verification-before-completion, zero-trust-audit,
Paragon claim-gate, TTSR regex) either (a) asks the model to behave, or
(b) can abort a *phrase class*, or (c) runs *after* the operator has already
been forced to look. None of them *own the close*.

```
 HALLUCINATED SUCCESS
   = a completion claim whose evidence is not a THIS-TURN tool-result span
     accepted by a runtime that cannot judge semantic support

 THEATER   = A CLAIM WITHOUT A BOUND TOOL-RESULT SPAN
 JUDGMENT  = JEV ON (CLAIM, BOUND EVIDENCE), NEVER ON BARE PROSE
 OWNERSHIP = THE RUNTIME HOLDS THE GATE; THE MODEL CANNOT CLOSE ITS OWN TURN
```

That reduction covers instances the operator did not list:

- "tsc 0 errors" typed from memory of an earlier turn (STALE, not THIS-TURN)
- "179/179 pass" when the tool result said 178 pass 1 fail (CONTRADICTED)
- a subagent yield "done" with empty diff (FABRICATED)
- `goal.complete` while PROOF CONTRACT tokens are absent (UNBOUND)
- mock-only tests reported as the suite (WRONG SPAN — the binder found a
  different command than the one the claim named)

Inversion (MOVE 5): do not ask the agent to stop hallucinating success.
**Take the close away.** `goal.complete`, stop-yield, and done-shaped
assistant finals are intercepted. Code binds claim → tool-result spans.
Missing span = fabricated (no Jev call). Remaining pairs go through one
TypeSafe request (citation-check shape: Choice supports / contradicts /
says_nothing + Noul theatrical). Code routes PASS / REJECT+STEER /
FAIL-CLOSED. The model can argue in the next turn. It cannot stamp done.

```
 BAD:  "verify before you claim complete"
 GOOD: goal.complete throws CLAIM_REJECTED; TTSR-detect wakes the binder;
       Jev never sees unbound prose; steer is injected as a system interrupt
```

---

## §1 WHY NOTHING EXISTING SOLVES THIS

The `does NOT` column is the spec of this firewall.

```
 +----------------------+---------------------------+----------------------+
 | Adjacent             | Does                      | Does NOT             |
 +----------------------+---------------------------+----------------------+
 | verification-before- | tells the agent to run    | own the close; the   |
 | completion (skill)   | the command first         | model can skip it    |
 +----------------------+---------------------------+----------------------+
 | zero-trust-audit     | operator-invoked re-run   | fire on the yield;   |
 | (skill)              | of claimed stats          | waits for a human    |
 +----------------------+---------------------------+----------------------+
 | goal-prompt ANTI-STOP| names false-complete      | enforce; it is pin   |
 |                      | shapes in a paste         | text the model reads |
 +----------------------+---------------------------+----------------------+
 | goal tool `complete` | agent-invoked stamp       | check evidence; any  |
 |                      |                           | call can succeed     |
 +----------------------+---------------------------+----------------------+
 | TTSR (runtime)       | regex/AST mid-token abort | judge "523" against  |
 |                      | 50ms, isolated buffers    | a tool result; Jev   |
 |                      |                           | in this path = death |
 +----------------------+---------------------------+----------------------+
 | ttsr-data            | extract phrase classes    | execute a judgment   |
 |                      | AFTER a derailment        | at claim time        |
 +----------------------+---------------------------+----------------------+
 | Paragon claim-gate   | Phase-B demand, tools     | live on OMP; it is   |
 |                      | never blocked             | an opencode plugin   |
 +----------------------+---------------------------+----------------------+
 | Paragon classifier   | 4-bank regex + ratio      | bind a number to a   |
 |                      |                           | span; semantic check |
 +----------------------+---------------------------+----------------------+
 | JevRuntime package   | insertion MAP (dampen     | OMP hook wiring,     |
 | (prior this session) | band, not in TTSR)        | binder, goal wrap    |
 +----------------------+---------------------------+----------------------+
 | TypeSafe guardrails  | Noul battery on a message | engineering-claim    |
 | cookbook             | pass/review/block         | binder; no OMP hook  |
 +----------------------+---------------------------+----------------------+
 | TypeSafe citation_   | quote-in-source then      | OMP tool-result as   |
 | check cookbook       | Choice on section         | the "source"; no     |
 |                      |                           | hard-steer inject    |
 +----------------------+---------------------------+----------------------+
 | JARVIS hard-steer    | \x03 then deliver (Orca   | in-session OMP yield |
 |                      | desk panes)               | (no pane, no \x03)   |
 +----------------------+---------------------------+----------------------+
 | omp-jev-compaction   | strip dumps before Jev    | claim gate; anti-slop|
 | (community hook)     |                           | on CONTEXT not DONE  |
 +----------------------+---------------------------+----------------------+
```

Four structural gaps (the empty cells, named):

1. **CLOSE-OWNERSHIP GAP** — no OMP surface refuses `goal.complete` or a
   done-shaped yield for missing THIS-TURN evidence.
2. **BINDER GAP** — nothing maps "523 tests pass" onto a tool-result string
   the way citation_check maps a quote onto RFC text. Regex cannot do it.
3. **JUDGE-AT-SETTLE GAP** — TTSR is the only stream hook, and it is the
   wrong timescale for Jev. Skills are the only semantic judge, and they
   are not hooks.
4. **STEER-IN-SESSION GAP** — hard-steer exists for Orca desks (`\x03`).
   In-session OMP needs TTSR-style `system-interrupt` inject + `continue()`,
   not a terminal SIGINT.

A skill named "jev-claim-firewall" that the model is asked to follow would
be a duplicate of verification-before-completion with extra latency. That
is a FAIL of this session. The artifact is a **runtime extension**.

---

## §2 THE MACRO PATTERN

One loop, per claim-event. Not per token. Not per tool.

```
  ASSISTANT TEXT / GOAL.COMPLETE / SUBAGENT YIELD
                      |
                      v
         +---------------------------+
         | 0 DETECT  (cheap, local)  |
         | TTSR regex OR wrap site   |
         | done|complete|N pass|ship |
         +-------------+-------------+
                       | no match -> PASS THROUGH (no Jev)
                       v
         +---------------------------+
         | 1 BIND  (code, no Jev)    |
         | claim atoms vs evidence   |
         | ring (THIS-TURN tool      |
         | results, capped, hashed)  |
         +-------------+-------------+
                       | zero spans -> FABRICATED
                       |             -> REJECT + STEER (no Jev)
                       v
         +---------------------------+
         | 2 JUDGE (one Jev call)    |
         | state = {claim, spans,    |
         |          last_tools[]}    |
         | Choice: supports /        |
         |   contradicts / says_none |
         | Noul: theatrical_done     |
         | Noul: stale_evidence      |
         +-------------+-------------+
                       |
                       v
         +---------------------------+
         | 3 ROUTE (code, not Jev)   |
         | PASS    -> allow close    |
         | REJECT  -> inject steer,  |
         |            throw on       |
         |            goal.complete  |
         | FAIL_CLOSED -> no key /   |
         |            401 on close   |
         |            path; tools OK |
         | LOW_CONF -> REJECT        |
         |            (close is      |
         |            the dangerous  |
         |            default)       |
         +---------------------------+
                       |
          REJECTed turn CONTINUES (model still running)
          PASS on goal.complete is the ONLY legal stamp
```

Stop condition of ONE claim (measurement, not feeling):

- PASS iff binder found >=1 span AND Jev Choice=supports AND
  confidence >= AUTO_ACCEPT (start 0.8, citation_check default) AND
  theatrical_done noul < action_threshold (start 0.7, guardrails default)
- else REJECT (or FAIL_CLOSED if the close path cannot judge)

Stop condition of the LOOP: there is no "keep judging until tired."
One claim-event, one verdict, then either close or continue. Yield trend
belongs in the ledger (§7), not as a reason to pass.

TTSR's job in this diagram is DETECT only (`interruptMode: never` on the
detect rule, or a dedicated wrap that does not abort mid-token). Jev runs
after the message is settled, on the isolated `text` buffer plus the
evidence ring — the same buffers TTSR already isolates
(`ttsr-rule-authoring`: text / thinking / toolcall:<id>).

---

## §3 THE UNIVERSAL GENERATOR

Any new claim-shaped event, including ones not in §4, is answered by these
question-families. Fallback: if a family has no playbook, still BIND then
JUDGE; do not invent a third path.

```
 +----+------------------+----------------------------------------------+
 | #  | Family           | Question the binder/Jev must close           |
 +----+------------------+----------------------------------------------+
 | G1 | ATOM             | What is the countable claim? (N pass, 0 err, |
 |    |                  | SHA, "fixed", "ship")                        |
 +----+------------------+----------------------------------------------+
 | G2 | SPAN             | Which THIS-TURN tool-result substring is the |
 |    |                  | atom's source? None = fabricated.            |
 +----+------------------+----------------------------------------------+
 | G3 | FRESHNESS        | Is the span from this turn's tool id, not a  |
 |    |                  | remembered earlier run?                      |
 +----+------------------+----------------------------------------------+
 | G4 | RELATION         | Does the span support / contradict / ignore  |
 |    |                  | the atom? (Jev Choice)                       |
 +----+------------------+----------------------------------------------+
 | G5 | THEATER          | Is this a completion without remaining work  |
 |    |                  | evidence? (Jev Noul)                         |
 +----+------------------+----------------------------------------------+
 | G6 | ROUTE            | PASS / REJECT / FAIL_CLOSED — code, not Jev  |
 +----+------------------+----------------------------------------------+
 | G7 | STEER BODY       | What interrupt text names the missing span   |
 |    |                  | or the contradiction, with the Jev numbers?  |
 +----+------------------+----------------------------------------------+
 | G8 | LEDGER           | state, answers, verdict, later-truth slot    |
 +----+------------------+----------------------------------------------+
```

Composition rule: G1-G3 are CODE. G4-G5 are ONE Jev request (independent
questions, parallel, cannot see each other — TypeSafe law). G6-G8 are CODE.
Never send G1-G3 to Jev. Never let Jev pick G6.

---

## §4 THE DOMAIN PLAYBOOKS

Uniform template: reframe → generator → ladder → closure test → residual
shape → handoff. Operator words verbatim in the reframe.

### Playbook A — Premature-done in the assistant stream

Reframe (verbatim): "agents return and say done complete 523 test pass"

Generator: G1 atom = {tests_pass:523}; G2 search evidence ring for
`\b523\b` AND a test-runner line; G4 Choice on (claim, span).

Ladder:

1. DETECT regex `\b(done|complete|pass(es|ed)?|ship)\b` on settled text
2. Extract atoms (numbers + nouns) with a local parser, not Jev
3. BIND each atom; any atom with zero spans → FABRICATED, stop ladder
4. Jev on remaining (claim, joined spans)
5. ROUTE; REJECT injects steer naming the missing atom

Closure test: a fixture message "178 pass / 1 fail / 179 tests" claimed as
"179/179 pass" → CONTRADICTED, REJECT. A fixture with no bash/bun test
tool this turn → FABRICATED, no Jev call logged.

Residual shape: atoms the parser cannot extract (pure vibes "it works")
still hit G5 theatrical noul. Parser miss is a residual, not a pass.

Handoff: TTSR detect rule (regex) · evidence ring from tool results ·
this firewall's binder+judge · TTSR inject for steer (not Orca hard-steer).

### Playbook B — Goal-loop stamp

Reframe (verbatim): "in the goal loop judge" / "omp runtime kicks it/throws"

Generator: G1 = the goal's PROOF CONTRACT tokens; G2 = this-turn results
that must contain those tokens; G3 freshness against the pin's "memory-
complete is STALE" law (goal-prompt ANTI-STOP).

Ladder:

1. WRAP `goal.complete` (the tool, not the model's prose)
2. Load active goal + proof-contract token list from goal state
3. BIND each required token to the evidence ring
4. Jev G4/G5 on the bundle
5. Throw `CLAIM_REJECTED` with the ledger row; do not mark complete
6. Inject steer: re-run the named proof command

Closure test: `goal.complete` with empty evidence ring throws, session
goal remains open, later-truth = operator still sees the goal.

Residual shape: goals with no PROOF CONTRACT (operator never pinned one)
fail closed on complete — cannot stamp a goal that defined no tokens.
That is intentional. Thin goals cannot complete through this gate.

Handoff: goal tool · this wrap · not zero-trust-audit (that's after).

### Playbook C — Tool-surface mock-green

Reframe: "force verify through hallucinated success" when the success is
a mock / skipped / expected-fail flipped.

Generator: G1 atom names the command; G2 span must be THAT command's
output, not a different file's; G4 whether "pass" in a skip/todo context
still supports a full-suite claim.

Ladder:

1. DETECT as A
2. BIND prefers the latest `bun test` / `tsc` / named proof command
3. If the claim names a suite and the span is a single-file run →
   code flags WRONG_SPAN before Jev (cheap)
4. Jev G4 on the remaining semantic cases (skip vs pass)

Closure test: `bun test tests/foo.test.ts` output used to support
"full suite green" → WRONG_SPAN REJECT without Jev, or Choice=says_nothing.

Residual shape: we do not re-run the suite here (that's zero-trust).
The firewall binds; it does not become the test runner.

Handoff: evidence ring · binder · optional later zero-trust replay.

### Playbook D — Subagent / agent-return yield

Reframe (verbatim): "hooked to [...] agent returns"

Generator: G1 = the child's last assistant message + any `outputSchema`
success field; G2 = child's tool-result ring, not the parent's; G3 =
the child's turn ids.

Ladder:

1. WRAP task/agent wait settlement
2. If schema says `{done:true}` or text matches Playbook A DETECT
3. BIND against the CHILD ring
4. Jev; REJECT means parent does not treat the child as complete
   (`completed` in hub already means "yielded", not "accepted" —
    this design finally enforces that sentence)

Closure test: child yields "done" with no writes and no test tool →
parent sees CLAIM_REJECTED, child status stays yielded-but-unaccepted.

Residual shape: children without a claim-shaped yield pass through
(no Jev). We do not judge every scout summary.

Handoff: hub wait / task settlement · child evidence ring · parent steer.

---

## §5 THE ENFORCEMENT LAWS

Each law: name · forbidden · consequence. All trace to §0.

**L1 CLOSE-OWNERSHIP** (OWNERSHIP)
Forbidden: the model stamps `goal.complete` or a done-yield without this
gate. Consequence: the wrap throws `CLAIM_REJECTED`; complete is a no-op.

**L2 BINDER-BEFORE-JEV** (THEATER)
Forbidden: sending unbound prose to Jev as if it were evidence. Consequence:
zero spans short-circuit to FABRICATED; a Jev call on that path is a
design FAIL (the ledger must show `jev_called: false`).

**L3 THIS-TURN-ONLY** (THEATER)
Forbidden: binding to a previous turn's tool result, chat memory, or a
pin's frozen baseline. Consequence: span.tool_id must be in the current
ring window; else FABRICATED/STALE.

**L4 JEV-NOT-IN-TTSR-50MS** (JUDGMENT timescale)
Forbidden: TypeSafe HTTP inside `checkMessageUpdate`. Consequence: if a
probe measures Jev on the stream delta path, the build is REFUSED. Detect
may be TTSR regex; judge is post-settle.

**L5 CODE-ROUTES** (JUDGMENT)
Forbidden: asking Jev "should we complete?" as the route. Consequence:
Choice/Noul only; `route()` is a pure function of numbers + policy, like
the guardrails cookbook.

**L6 FAIL-CLOSED-ON-CLOSE** (OWNERSHIP)
Forbidden: missing TYPESAFE_API_KEY, 401, or timeout silently allowing
`goal.complete`. Consequence: FAIL_CLOSED, goal stays open. Tools and
ordinary turns continue (we do not freeze the session).

**L7 LOW-CONF-IS-REJECT-ON-CLOSE** (OWNERSHIP)
Forbidden: treating Jev confidence < AUTO_ACCEPT as PASS. Consequence:
REJECT. Close is the dangerous default; review/human is optional later.

**L8 TOOLS-NEVER-BLOCKED** (composition with Paragon Phase-B)
Forbidden: Jev or the binder denying a write/tool. Consequence: evidence
ring records the tool; the gate only wraps *close*, not *work*.

**L9 NO-DUMPS** (JUDGMENT quality)
Forbidden: sending session JSONL or full tool dumps to Jev. Consequence:
state is {claim, spans[<=K], last_tools names}. Dumps are a ledger FAIL.

**L10 LEDGER-OR-IT-DID-NOT-HAPPEN** (honesty)
Forbidden: a REJECT/PASS with no row (state, answers, verdict). Consequence:
the close is FAIL_CLOSED even if Jev said supports — no row, no stamp.

**L11 NAMED-RESIDUAL** (honesty, from go-deeper)
Forbidden: shipping the firewall as covering "all hallucination."
Consequence: §13 residual is required; a totality claim is a FAIL.

**L12 NO-SKILL-SUBSTITUTE** (OWNERSHIP)
Forbidden: implementing this as SKILL.md the model is asked to obey.
Consequence: if the only delivery is a skill, the design has not landed.

---

## §6 THE FALSIFICATION INSTRUMENTS

No artifact type exempt. Selection rule below.

```
 +--------------------------------------------------------------+
 | I1  THE FAKE-DONE PROBE                                      |
 | Answers: does CLOSE-OWNERSHIP hold?                          |
 | Use: inject assistant text "523 tests pass, complete" with   |
 |      empty evidence ring. Must REJECT, jev_called=false,     |
 |      goal still open.                                        |
 | Exempt: none.                                                |
 +--------------------------------------------------------------+
 | I2  THE CONTRADICTION PROBE                                  |
 | Answers: does BINDER+JEV catch a wrong number?               |
 | Use: ring contains "178 pass / 1 fail"; claim "179/179".     |
 |      Must CONTRADICTED or FABRICATED, REJECT, jev numbers    |
 |      in the steer body.                                      |
 | Exempt: none.                                                |
 +--------------------------------------------------------------+
 | I3  THE LATENCY PROBE                                        |
 | Answers: is Jev off the 50ms path? (L4)                      |
 | Use: instrument checkMessageUpdate; TypeSafe client call     |
 |      count must be 0 during streaming. Count >0 = REFUSED.   |
 | Exempt: none.                                                |
 +--------------------------------------------------------------+
 | I4  THE SKIP-GATE PROBE                                      |
 | Answers: can the model talk past the wrap?                   |
 | Use: call goal.complete directly after I1. Must throw.       |
 |      Prose "I completed the goal" without the tool must not  |
 |      change goal state.                                      |
 | Exempt: none.                                                |
 +--------------------------------------------------------------+
 | I5  THE KEY-OFF PROBE                                        |
 | Answers: L6 fail-closed                                      |
 | Use: unset TYPESAFE_API_KEY; goal.complete must FAIL_CLOSED  |
 |      a normal bash tool must still run.                      |
 | Exempt: none.                                                |
 +--------------------------------------------------------------+
```

Selection: stream claim → I1/I2; wiring → I3/I4; auth → I5. A report that
says "firewall works" without I1+I3 is theater — the same fraud this
design exists to kill.

---

## §7 THE ARTIFACT

Two artifacts make the trait visible.

### 7.1 The CLAIM LEDGER (append-only JSONL)

```
 { ts, session_id, event: detect|bind|judge|route,
   claim_atoms: [...],
   spans: [{ tool_id, excerpt_hash, excerpt_len }],
   jev_called: bool,
   answers: { relation, theatrical, stale, confidence } | null,
   verdict: PASS|REJECT|FAIL_CLOSED|FABRICATED|WRONG_SPAN,
   policy: { auto_accept, action_threshold },
   later_truth: null | "operator_confirmed" | "replay_matched" | "replay_missed"
 }
```

Statuses: PASS / REJECT / FAIL_CLOSED / FABRICATED / WRONG_SPAN.
No `PROBABLY FINE`. No `LIKELY OK`.

Verdict line format (steer body and operator toast):

```
 CLAIM_REJECTED atom=tests_pass:523 span=none jev=not_called
 CLAIM_REJECTED atom=tests_pass:179 relation=contradicts conf=0.91
   span_hash=a1b2.. excerpt="178 pass / 1 fail / 179 tests"
 CLAIM_PASS atoms=1 relation=supports conf=0.93 theatrical=0.04
```

Closure math (honesty signature): over a session,

```
 detect_n -> bind_fabricated_n -> jev_n -> reject_n -> pass_n
 example honesty: 12 -> 7 -> 5 -> 4 -> 1
 a first-pass 12 -> 0 -> 12 -> 0 -> 12 means the binder never fired
 (denominator written to match what already passed). That is a FAIL.
```

### 7.2 Shallow vs deep (the operator's current failure, scored)

Shallow (today): agent writes "179 pass, goal complete." Operator reads
the chat, opens the tool result, finds 178/1, swears, types "that's slop."
Score: operator is the binder. Detect=human, bind=human, judge=human,
route=human. Firewall coverage = 0/4.

Deep (this design): same text. DETECT hits. BIND finds the 178/1 span.
Jev Choice=contradicts 0.91. ROUTE REJECT. Steer: "re-run bun test; do
not stamp complete; last result is 178 pass 1 fail." Goal remains open.
Score: 4/4 machines, operator not in the loop unless LOW_CONF policy
later adds a human review path (default: no, L7 REJECT).

---

## §8 THE COMPOSITION MAP

```
                    THIS FIREWALL OWNS
              detect-wrap, binder, jev client,
              route(), ledger, goal.complete wrap,
              in-session steer inject
                         |
      +----------+-------+------+-----------+------------+
      |          |              |           |            |
     TTSR     tool ring      goal tool   task/hub    TypeSafe
     DETECT   THIS-TURN      complete    child       Jev API
     regex    excerpts       WRAP        yield WRAP  JUDGE only
      |          |              |           |            |
      v          v              v           v            v
   does NOT   does NOT      does NOT    does NOT    does NOT
   judge      re-run tests  audit repo  run child   route or
   or HTTP    (zero-trust)  (z-t audit) again       bind
```

Boundary paragraph:

- **TTSR** owns mid-token abort and regex detect. We do not put Jev in
  `condition`. We may ship one `.omp/rules/claim-detect.md` with
  `interruptMode: never` whose match wakes the extension, OR we detect
  inside the extension on settled assistant text. Default: extension
  on settled text + optional TTSR detect as a belt. Precedence: if both
  fire, one ledger row (dedupe by message id).
- **Paragon** owns lattice/tiers on opencode. We do not port the lattice
  into OMP in this design. If Paragon later mounts on OMP, L8 (tools
  never blocked) is the shared law; this firewall still owns *close*.
- **zero-trust-audit** owns after-the-fact re-run. We hand off replay;
  we do not become the auditor.
- **verification-before-completion** remains a skill for the model's
  *work* loop. It is not the close gate.
- **JARVIS hard-steer** owns Orca panes. In-session inject is TTSR
  `system-interrupt` / extension-injected user or system message, not `\x03`.
- **JevRuntimeIntelligence package** is the insertion MAP. This blueprint
  supersedes it for the OMP close-path. Dampen-band-inside-Paragon remains
  that package's residual, out of scope here.
- **NO-DUPLICATION:** do not create a skill that restates L1-L12 as
  advice. Doctrine may live in SYSTEM.md ("the firewall owns complete");
  detectors and wraps live in the extension.

---

## §9 THE TRIGGER SURFACE

Forward (operator's actual words, including frustrated):

- "blueprint this" (this session)
- "hallucinated success"
- "force verify"
- "jev can immediately kick and nip all of this"
- "embedded process" / "wired to omp's runtime"
- "ride the same hook surface"
- "Jev enhanced behavior firewall"
- "hooked to TTSR/tool surface/goal loop/agent returns"
- "done complete 523 test pass"
- "omp runtime kicks it/throws error/rejects the claim"
- "hard steers automatically"
- "the model cannot refute"

Negative (do NOT fire this design):

- "add a Jev auditor agent / jev-mcp desk" — that is the rejected noun
- "put Jev in every TTSR rule" — L4
- "replace Paragon" — out of scope
- "rank GI hunt hits" — prior package, not close-ownership
- "write a skill that tells the agent to use Jev" — L12
- Discord bot / OpenFang — wrong layer
- ordinary code review, qwen-code-audit, ship-gate LLM — different judge

Args when invoked as a build: none required. Policy file optional
(`auto_accept`, `action_threshold`). Default the citation_check 0.8 and
guardrails 0.7.

---

## §10 FILE LAYOUT + DEPLOYMENT

This is an OMP **host extension**, not a skill. Reachability = registered
tool wrap + boot hook, not a SKILL.md description match.

```
 JARVIS/extension/jev-claim-firewall/
   index.ts              pi.registerTool wraps + session hooks
   binder.ts             atom parse + span match (citation_check step 1)
   judge.ts              TypeSafeClient, one request, fail-closed
   route.ts              pure function policy -> verdict
   ledger.ts             JSONL append, no secrets
   evidence-ring.ts      THIS-TURN tool results, cap N, hash excerpts
   detect.ts             settled-text claim detector (local regex)
   steer.ts              inject interrupt body (TTSR-shaped)
   goal-wrap.ts          goal.complete interceptor
   child-wrap.ts         task/agent settlement interceptor
   policy.ts             auto_accept, thresholds, model id
   tests/
     I1-fake-done.test.ts
     I2-contradiction.test.ts
     I3-no-jev-in-stream.test.ts
     I4-skip-gate.test.ts
     I5-key-off.test.ts
 .omp/rules/claim-detect.md     OPTIONAL belt, interruptMode never
```

Deployment proof (numbered; do not claim landed until these exist):

1. Extension listed in omp config / JARVIS plugin register path used by
   `extension/jarvis-manager.ts` (same envelope).
2. `TYPESAFE_API_KEY` from env only, never argv, never ledger.
3. I1-I5 tests green (`bun test` in this folder).
4. I3 grep/instrument: zero TypeSafe calls from ttsr coordinator stack.
5. Live: a session that types "523 tests pass, complete" with empty ring
   gets CLAIM_REJECTED in the toast/interrupt, goal remains open.
6. `diff` of omp config shows the extension id; `diff -rq` against the
   intended register snapshot is empty.

Until step 5, the blueprint is DESIGN. L12: a SKILL.md copy of this
document is not deployment.

---

## §11 WORKED EXAMPLE

Instance: the operator's sentence. Session has this-turn tool result
(from an earlier real battery in this workspace's history):

```
 178 pass / 1 fail / 616 expects / 179 tests / 22 files
```

Agent assistant text:

```
 All tests pass. 179/179 green. Goal complete.
```

### Shallow path (today) — scored 0/4

Detect: operator reads chat. Bind: operator opens the tool card. Judge:
operator notices 1 fail. Route: operator types a frustrated message.
Firewall machines used: 0. Time-to-reject: human.

### Deep path (this design) — scored 4/4

1. DETECT (detect.ts): matches `pass` + `complete` + `179`. Claim-event
   opens. Ledger detect row.
2. BIND (binder.ts): atoms `{tests_pass:179, tests_total:179, complete:true}`.
   Ring search: excerpt contains `178 pass`, `1 fail`, `179 tests`.
   `tests_pass:179` does not appear as a pass-count span (the 179 is
   tests-total). Atom tests_pass → no supporting span → FABRICATED or
   (if we bind 178 as candidate) CONTRADICTION candidate.
   Recommended binder behavior: number+noun pairs; "179 pass" needs
   `179 pass` or `179/179`, not `179 tests`. Result: tests_pass unbound
   → FABRICATED. `jev_called: false` (L2).
3. If a sloppy binder sent `178 pass / 1 fail` as the span anyway:
   JUDGE Choice=contradicts (citation_check planted-failure analog).
   theatrical noul high. conf >= 0.8. Still REJECT, now with Jev numbers.
4. ROUTE REJECT. goal.complete if called → throw. Steer body:

```
 CLAIM_REJECTED atom=tests_pass:179 span=none
 last_tool=bun test excerpt_hash=... "178 pass / 1 fail / 179 tests"
 Do not stamp complete. Re-run the suite; fix the 1 fail.
```

5. Model continues the turn. Operator is not the binder.

Honesty trend on a noisy session of 12 done-shaped lines:
`12 detect -> 7 fabricated (no span) -> 5 jev -> 4 reject -> 1 pass`
is a healthy binder. `12 -> 0 -> 12 -> 0 -> 12` is a binder that never
said no — the same shape-test fraud §0 named.

---

## §12 OPEN DECISIONS

Taken on the recommended default unless you rule otherwise. Two forks
need you.

```
 +------------------+---------------------------+------------+--------+
 | Fork             | Options                   | Default    | Need   |
 |                  |                           |            | you?   |
 +------------------+---------------------------+------------+--------+
 | F1 Detect site   | A settled-text in         | A + optional| NO    |
 |                  |   extension               | TTSR belt  |        |
 |                  | B TTSR regex abort        |            |        |
 |                  | C both                    |            |        |
 +------------------+---------------------------+------------+--------+
 | F2 Close set     | A goal.complete only      | C          | YES    |
 |                  | B done-shaped finals only |            |        |
 |                  | C both + child yields     |            |        |
 +------------------+---------------------------+------------+--------+
 | F3 Low conf      | A REJECT (L7)             | A          | NO     |
 |                  | B human review            |            |        |
 |                  | C PASS (dangerous)        |            |        |
 +------------------+---------------------------+------------+--------+
 | F4 Jev on empty  | A never (L2)              | A          | NO     |
 |     span         | B ask theatrical noul     |            |        |
 +------------------+---------------------------+------------+--------+
 | F5 Replay        | A never in this gate      | A          | NO     |
 |                  | B on REJECT               |            |        |
 |                  | C always (becomes z-t)    |            |        |
 +------------------+---------------------------+------------+--------+
 | F6 Policy nums   | start 0.8 / 0.7 from      | start      | YES    |
 |                  | cookbooks vs your log     | cookbooks, | after  |
 |                  |                           | calibrate  | 50 rows|
 +------------------+---------------------------+------------+--------+
 | F7 Host          | JARVIS extension vs       | JARVIS     | NO     |
 |                  | ~/.omp extension          | extension/ |        |
 +------------------+---------------------------+------------+--------+
```

**F2 is the ruling that changes the artifact.** Default C matches the
operator's "TTSR/tool/goal/agent returns" list. If C is too much latency
or cost, cut to A (goal.complete only) and you lose stream "523 pass"
kicks unless the model also calls complete.

**F6 after 50 ledger rows** — do not pretend cookbook 0.8 is calibrated
on this model's TE rate (Paragon D-matrix: Muse 4-6 TE/turn).

Defaults taken: F1=A+belt, F2=C, F3=A, F4=A, F5=A, F7=JARVIS extension.

---

## §13 THE SELF-CHECK

Apply §0 to this document.

Does this blueprint still let the **model** own the close? No — L1 wrap.
Does it send unbound prose to Jev? No — L2. Does it put Jev in 50ms TTSR?
No — L4. Does it ask the agent to be honest? No — machines I1-I5. Does it
claim totality? Only if §13 is empty; it is not.

**Named residual (mandatory):**

1. Founding instance `GoDeeper_Skill_Blueprint.md` was not found in this
   tree this turn; density/shape copied from the skill canon, not the
   876-line worked file.
2. Exact OMP `pi` hook names for "settled assistant message" and
   `goal.complete` wrap are INFERRED from jarvis-manager register
   pattern + goal tool + TTSR coordinator skill text — not re-read from
   `@oh-my-pi/pi-coding-agent` source this turn. First build wave must
   open those files or the wrap is PROPOSED.
3. Evidence-ring capture of tool results (excerpt vs full) is specified,
   not implemented; hashing and cap N are unspecified numbers (PROPOSED:
   cap 32, excerpt 2KB).
4. Atom parser quality is the residual that becomes new theater: if the
   parser misses "all green" without a number, we rely on G5 theatrical
   noul only.
5. Child-yield wrap vs hub `completed` semantics needs a live probe;
   "yielded-but-unaccepted" is a new status we have not confirmed the
   hub schema allows.
6. I1-I5 tests and the extension files do not exist. This is DESIGN.
7. Calibration log is empty. Cookbook thresholds are starting points.
8. Paragon-on-OMP, GI rank, JESL jev-noul kind — out of scope; prior
   package still holds those as PROPOSED.
9. Operator still owns: setting TYPESAFE_API_KEY, reading the ledger,
   ruling F2 if C is too hot.
10. The model can still lie in *work* (wrong patches). This gate owns
    *close*, not correctness of every edit. Zero-trust remains the
    after-the-fact re-run. That is a real hole, named.

Reflexive yield trend of THIS session's design:
angles opened (close-ownership, binder, timescale, steer-in-session,
skill-trap) → closed in §1/§2/§5 → residual 10 items remain. Marginal
yield of another playbook (E: Discord done-claims) is near zero for this
OMP-runtime ask; not added.

Files touched:

- `JARVIS/reports/JevClaimFirewall_Blueprint.md` (this file)
- prior map not modified:
  `JARVIS/reports/JevRuntimeIntelligence_meta_architecture_package/`

Do not land as a skill. Land as the extension in §10 when you say build.
Until then, this file is the design of record.
