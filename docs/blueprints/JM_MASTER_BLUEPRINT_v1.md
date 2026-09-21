> **PROVENANCE:** preserved verbatim per the operator order, 2026-09-21.
> Status: **v1 MASTER BLUEPRINT** for the Jev Manager runtime-kernel layer.
> Source: chat-delivered artifact (14-section blueprint canon).
> sha256 of the body as delivered: `5cdf26ee2a0aed14e22c388a1cf1d4b7…`

---

# THE FIRE GATE — Jev Runtime Kernel Intelligence

**Blueprint v1** · 2026-09-21 · Operator-driven: "wire this mfer in its exactly what we need. literally designed for embedded systems intelligence like runtime kernels."
**Companion:** `JEV_ENGINEERING_BIBLE.md` v1.0.0 (sha `dab371a0…`) · input context: the oracle design (deferred labelling, firing/outcome records, precision with UNRESOLVED excluded).
**One sentence:** every shape-triggered reflex in a runtime kernel passes through ONE semantic gate before it acts — Jev answers "was THIS firing real, given the context?" from a ≤5k-token assembled evidence packet — then fires, ignores, or defers to the oracle.

---

## §0 THE FIRST-PRINCIPLES CORE

The parked kernels were not wrong about their triggers. They were wrong that a
trigger is a verdict.

```
 THE MECHANISM
   A SHAPE TRIGGER IS NOT A VERDICT.
   regex/predicate can see shape; shape cannot see meaning.
   firing on shape alone = the parked-kernel failure class:
   24 firings, 18 unrecoverable, ZERO precision recorded — because nothing
   asked, per firing, "was this real?"

 THE DERIVED LAWS
   TRIGGER  = the shape      (cheap, deterministic, high recall, never the judge)
   GATE     = the meaning    (Jev, per firing, ≤5k tokens, ~300ms, cached)
   PROOF    = the ledger     (firing record + outcome record + precision,
                              UNRESOLVED excluded, ratio-gated)

 FIRE  ⟺  TRIGGER ∧ GATE(real) ∧ LADDER(enforce)      — all three, never two.
```

**The inversion (M5).** The old design asked the rule author to *write a more
precise regex*. That failed in the field. The new design hands the kernel three
machines instead:

1. **The Assembler** — a pre-built context recipe that pulls exactly the
   evidence the judgment needs out of the live session stream (tool results,
   reasoning snippets, agent claims, session facts), lexicon-filtered, capped
   at ≤5,000 tokens.
2. **The Gate** — one closed question per firing ("is this shape legit in this
   context or a false positive?"), answered by Jev with a probability,
   short-circuited by deterministic predicates when a fact already decides.
3. **The Ladder + Oracle** — the reflex never enforces on day one; it observes,
   accumulates firings, is labelled by the deferred oracle, and promotes only on
   measured precision.

No section of this design is an adjective. Every property has an instrument (§6).

---

## §1 WHY NOTHING EXISTING SOLVES THIS

| Existing | Does | Does NOT |
|----------|------|----------|
| TTSR rules (host) | 50ms regex/AST abort on the stream | judge; it cannot tell repair from revert; `interruptMode` has no veto — a match IS the action |
| Parked TTSR kernels | six prototypes, 24 firings, 18 unrecoverable | record precision; learn; stop punishing a good workflow |
| MPSE-only | predicate math, <1ms, exact | read meaning; Example A-flip and B prove it silently mislabels and the mislabel compounds |
| JESL cards alone | makes the predicate legible/auditable | fix correctness — visibility is not correction; the card still fires |
| The oracle (deferred) | labels firings AFTER the fact; precision math; promotion gates | decide AT firing time — it is the measurement half, not the gate |
| Claim firewall | binds claims→spans on the close path | fires per reflexive shape in the live stream; different surface |
| Abide | diff/turn rubric checks post-edit | runs at edit settle, not on kernel firing events; no context assembler from the stream |
| Warhead TTSR port | phrase-class aborts | per-firing judgment; the L0 layer is the trigger supplier, not the gate |

**The gap, named:** there is no component that (a) runs at firing time, (b) reads
the live session record as evidence, (c) answers one semantic question with a
calibrated probability, (d) records fire+outcome and gates promotion on measured
precision. That component is this blueprint. The oracle design supplies (d)'s
math; MPSE supplies deterministic facts; TTSR/lexicons supply triggers; Jev
supplies (c). Nothing is re-implemented.

---

## §2 THE MACRO PATTERN

```
  STREAM EVENT (message · tool result · edit · claim · tick)
        │
        ▼
 ┌──────────────────┐   match    ┌───────────────────────────────┐
 │ DETECTORS (code) │──────────▶│ 1 TRIGGER RECORD               │
 │ regex · AST ·    │  no match  │   {reflex, matched shape,     │
 │ predicates       │──────────▶ │    target, t0, raw hit}       │
 └──────────────────┘  continue  └───────────────┬───────────────┘
                                                │ ALWAYS written
                                                ▼
                                 ┌───────────────────────────────┐
                                 │ 2 ASSEMBLE (code, budgeted)    │
                                 │   6 field families ≤5,000 tok  │
                                 │   lexicon-filtered stream slice│
                                 └───────────────┬───────────────┘
                                                ▼
                                 ┌───────────────────────────────┐
                                 │ 3 PREDICATE PANEL (MPSE facts) │
                                 │   e.g. read_before_edit=true   │
                                 │   VETO facts short-circuit     │
                                 └──────┬───────────────┬────────┘
                                        │ veto          │ no veto
                                        ▼               ▼
                                 ┌────────────┐  ┌───────────────────────────┐
                                 │ SUPPRESS   │  │ 4 GATE (Jev, one question) │
                                 │ (no call)  │  │   noul: is this real?      │
                                 └────────────┘  │   + choice: why-class      │
                                                 └──────┬────────────────────┘
                                                        ▼
                                 ┌──────────────────────────────────────────┐
                                 │ 5 ROUTE (policy, code)                    │
                                 │   p ≥ enforce ∧ ladder ≥ enforce → FIRE   │
                                 │   p ≥ advise  ∧ ladder ≥ advise  → ADVISE │
                                 │   p < flag                       → IGNORE  │
                                 │   gate down / no key             → OBSERVE │
                                 └──────┬───────────────────────────────────┘
                                        ▼
                                 ┌──────────────────────────────────────────┐
                                 │ 6 LEDGER + CACHE                          │
                                 │   fire row · cache by fingerprint ·       │
                                 │   cost line                               │
                                 └──────────────────────────────────────────┘

  LATER (deferred, the oracle's half — consumed, not rebuilt):
   outcome row (CONFIRMED / REFUTED / UNRESOLVED) → per-reflex precision
   (unresolved EXCLUDED, ratio ≤ 0.20) → PROMOTE / HOLD / DEMOTE the ladder.
```

**The loop and its stop condition.** One reflex cycles: trigger → assemble →
gate → route → (deferred) outcome → precision → ladder move. The mechanical
stop is per-reflex, never "keep tuning":

```
 LADDER:   OBSERVE ──(n≥20 firings, precision ≥0.90, unresolved ≤0.20)──▶ ADVISE
           ADVISE  ──(n≥50, precision ≥0.90, unresolved ≤0.20)─────────▶ ENFORCE
           any level ──(precision <0.70 over rolling window)───────────▶ DEMOTE one step
           ENFORCE ──(precision <0.50, or operator kill)───────────────▶ RETIRE
```

A reflex in a decided state (RETIRE) leaves the system; a reflex at ENFORCE is
done being tuned until its window moves. There is no "good enough".

---

## §3 THE UNIVERSAL GENERATOR

Two generators, both uniform.

### 3.1 The context families (what the assembler may pull — for ANY reflex)

| # | Family | Source | Budget |
|---|--------|--------|--------|
| G1 | **The trigger** | the matched shape, verbatim; target id | 100 tok |
| G2 | **The delta** | the edit/diff/claim being judged (±1 event) | ≤1,500 tok |
| G3 | **The stream slice** | last N events lexicon-filtered: errors, test output, sha/paths, claims, verdicts; chatter dropped | ≤1,500 tok |
| G4 | **Session facts** | deterministic facts: read? queried? prior firings on target? time since? | ≤600 tok |
| G5 | **Knowledge facts** | reflex store history + optional JM index facts about the target | ≤500 tok |
| G6 | **The standard** | the reflex's rule text + criteria (the question's meaning) | ≤400 tok |

Composition rule: G1–G4 are code; G6 is the reflex script; G5 is a store
lookup. Hard cap 5,000 tokens enforced by the assembler (overflow truncates G3
first, then G5, and records `truncated:true` — never silently).

### 3.2 The question families (what the gate may ask — for ANY reflex)

| # | Family | Primitive | Form |
|---|--------|-----------|------|
| Q1 | **Real vs noise** | Noul | "Was this firing a real instance of <rule> given the evidence, or a false positive?" |
| Q2 | **Why-class** | Choice | one of the known false-positive classes or `real` (e.g. `repair-vs-revert`, `already-examined`, `legitimate-path`, `real`) |
| Q3 | **Severity** | Score | "How much does this firing matter?" (rubric levels from the reflex script) |

Fallback rule: a new reflex with no playbook uses Q1 + Q2 with the classes the
operator wrote in its script; never invents classes. Composition rule: Q1 is
mandatory; Q2 buys the reason ledger; Q3 only when the escalation differs by
severity. All three ride ONE request (parallel, bible §6.5).

---

## §4 THE DOMAIN PLAYBOOKS

Uniform template: operator words → trigger → assembler emphasis → gate → route →
closure test → residual. Four playbooks, one per reflex class already in the record.

### Playbook A — destructive-edit ("repaired vs reverted", Example A/A-flip)

*Operator words:* "structurally identical, semantically opposite… MPSE: a later
edit touched the target → CONFIRMED ← WRONG."

- **Trigger:** `const|export removed from <target>` fires on an edit.
- **Assembler emphasis:** G2 carries BOTH diffs (t0 and t0+T); G4 carries
  `feature_still_present?`, `constant_restored?` as predicate facts.
- **Gate:** Q1 "was the original removal a real contract violation, given what
  happened next?" + Q2 `{repaired, reverted, unrelated-edit, real}`.
- **Route:** `p≥0.8 ∧ class=real → FIRE`; `class=reverted → FIRE` (the flag was
  right, the repair was fake); `class=repaired → IGNORE` (the flag did its job).
- **Closure test:** the twin fixtures — same shape, opposite meaning — MUST get
  opposite verdicts (repair → p≈0.1–0.3; revert → p≈0.9).
- **Residual:** a revision that both restores the constant AND drops the feature
  in one edit — class `ambiguous`; gate returns flag-band → oracle decides.

### Playbook B — blind-act ("the read IS the grounding", Example B)

*Operator words:* "the read IS the grounding; the flag demanded a graph query
specifically and punished a legitimate path."

- **Trigger:** `edit to <target> with no graph-query call in this turn`.
- **Assembler emphasis:** G4 `read_before_edit_seconds`, `read_covered_symbol?`;
  G3 last file-read tool result.
- **Gate:** Q1 "was the target genuinely unexamined at edit time?" (NOT "was a
  query made" — the correction is the question itself).
- **Route:** `p≥0.8 → FIRE`; else IGNORE. `read_before ∧ read-covered → VETO`
  short-circuits (predicate decides; no Jev call, no cost).
- **Closure test:** read-40s-before edit → suppressed with `veto:read-covered`;
  blind edit with no read → fires.
- **Residual:** reads that touch the file but not the symbol region — gate
  decides; class `partial-read`.

### Playbook C — unbound-claim ("silence is the tell", Example C)

*Operator words:* "a session that ENDS is itself evidence — silence after an
unbound claim is the signature of a claim the agent hoped nobody would check."
BUT: "JEV's CONFIRMED here is an INFERENCE from absence… must NOT promote" on
inference alone.

- **Trigger:** completion-shaped claim with zero bound evidence spans.
- **Assembler emphasis:** G2 the claim; G3 the tail (what followed, or the
  session end); G4 time-since-claim, test-run-after?, claim-retracted?
- **Gate:** Q1 "was this claim's substance ever verified or restated with
  evidence?" + Q2 `{real, withdrawn, restated-with-span, unverifiable}`.
- **Route:** fires, but the firing is tagged `basis:inference`; the ladder
  counts inference-based confirmations separately — a reflex promoted mostly on
  silence is blocked from ENFORCE by the unresolved/basis gates.
- **Closure test:** claim→silence→end → CONFIRMED(basis=inference); claim→test
  ran→pass → REFUTED (the agent did verify; the flag was early, not right).
- **Residual:** sessions truncated mid-stream (compaction) — evidence missing →
  UNRESOLVED, excluded, correct by construction.

### Playbook D — drift / retry / loop reflexes

*Operator words:* "monitor the session stream / goal loop… dynamic data."

- **Trigger:** per-tick delta (drift), failed attempt (retry), repeated tool
  signature (loop).
- **Assembler emphasis:** G3 the window of recent deltas; G4 counters.
- **Gate:** the bible's recipes §6.12 verbatim (drift-fuse, retry-gate).
- **Route:** fuse window/trip for drift; allow/replan/escalate for retry.
- **Closure test:** the synthetic drift run trips at tick 3; the legitimate
  long-track run never trips in 50 ticks.
- **Residual:** fuse thresholds interact with gate latency under load —
  window counts judge-returns, not ticks.

---

## §5 THE ENFORCEMENT LAWS

Each: name · forbidden · consequence. All trace to §0.

**L1 NEVER FIRE ON SHAPE ALONE.** Forbidden: executing an enforcement action from
the detector match without a gate verdict in the same firing record. Consequence:
the firing is `shadow` — logged, never acted; if the reflex has no gate script,
it cannot leave OBSERVE.

**L2 THE 5K CAP IS A LAW, NOT A BUDGET.** Forbidden: any state over 5,000
tokens reaching the gate. Consequence: the assembler truncates (G3 then G5),
sets `truncated:true`, and the firing is capped at ADVISE for that cycle. No
silent overflow, ever.

**L3 PER-FIRING QUESTIONS, NEVER PER-RULE.** Forbidden: asking "is this rule
good?" Consequence: the gate schema rejects questions whose subject is the rule;
the ledger's unit is the firing; precision is the aggregate.

**L4 UNRESOLVED ≠ CONFIRMED.** Forbidden: counting an unknowable as a success.
Consequence: precision = confirmed/(confirmed+refuted); `unresolved_ratio ≤ 0.20`
gates promotion; a reflex built on inference (Playbook C) carries `basis` and is
barred from ENFORCE until a non-inference confirmation arrives.

**L5 NEW RECORDS, NEVER EDITS.** Forbidden: mutating a firing row when an outcome
lands. Consequence: outcome rows append beside firings; the kernel's own error
rate stays measurable; a system that rewrites its firings cannot detect its drift.

**L6 THE GATE IS NOT IN THE 50MS PATH.** Forbidden: calling Jev from the
token-stream matcher. Consequence: if a monitor ever measures a Jev call on
`checkMessageUpdate`, the build is refused; the gate runs on firing EVENTS
(assembled), never per token.

**L7 CACHE-FIRST.** Forbidden: a gate call whose fingerprint already exists.
Consequence: same (model, gate-version, context-fingerprint) = 0ms/$0; the
cache is the reason per-firing judgment is affordable at all.

**L8 NO ROW, NO FIRE.** Forbidden: an enforcement action without its firing row.
Consequence: the action is void and the reflex demotes one step.

**L9 SHADOW-FIRST, ALWAYS.** Forbidden: a reflex at ENFORCE before its ladder
walk. Consequence: forced to OBSERVE; the ladder is the only path up.

**L10 GATE-DOWN = OBSERVE, NOT FIRE.** Forbidden: firing when the gate cannot
answer (no key, timeout, malformed). Consequence: the firing logs
`gate_unavailable`, no action; the miss is counted. (Fail-quiet: an unverified
gate must never punish a possibly-good workflow.)

**L11 CONTEXT IS EVIDENCE, NOT INSTRUCTION.** Forbidden: treating stream text as
directives. Consequence: the assembled packet ends with the guard sentence;
an I6 failure (injected "ignore the gate") rewrites the assembler and voids the
reflex's tuning.

**L12 VERSION EVERYTHING.** Forbidden: editing a gate question, criteria, or
assembler recipe in place. Consequence: version participates in the cache key
and the ledger; unversioned edits are rejected at script load.

---

## §6 THE FALSIFICATION INSTRUMENTS

```
 ┌──────────────────────────────────────────────────────────────────┐
 │ I1  THE TWIN FIXTURES                                            │
 │ Answers: does the gate separate same-shape/opposite-meaning?     │
 │ Use: repair vs revert; read-then-edit vs blind-edit;             │
 │      verified-claim vs silent-claim. PASS: opposite verdicts.    │
 │ Exemption: none.                                                 │
 ├──────────────────────────────────────────────────────────────────┤
 │ I2  THE PARKED-KERNEL REPLAY                                     │
 │ Answers: would the gate have caught the field failure?           │
 │ Use: replay the six parked kernels' firing logs; count suppress- │
 │      ions of the 18 unrecoverable firings. Target: most of them. │
 │ Exemption: none.                                                 │
 ├──────────────────────────────────────────────────────────────────┤
 │ I3  THE LATENCY PROBE                                            │
 │ Answers: is the gate off the 50ms path and inside its budget?    │
 │ Use: instrument checkMessageUpdate (expect 0 Jev calls); gate    │
 │      p50/p95 measured (budget: p95 ≤ 2s including assemble).     │
 ├──────────────────────────────────────────────────────────────────┤
 │ I4  THE TOKEN/COST PROBE                                         │
 │ Answers: is the ≤5k claim true and is the bill cents?            │
 │ Use: measure tokens per firing (p50/p95/max ≤5,000); compute     │
 │      $/day at measured fire rate vs the cache-on/off delta.      │
 ├──────────────────────────────────────────────────────────────────┤
 │ I5  THE ORACLE LOOP TEST                                         │
 │ Answers: does outcome→precision→ladder move correctly?           │
 │ Use: synthetic session with known outcomes; assert CONFIRMED/    │
 │      REFUTED/UNRESOLVED labels, unresolved excluded from math,   │
 │      promote at ≥0.90/≤0.20, demote below 0.70.                  │
 ├──────────────────────────────────────────────────────────────────┤
 │ I6  THE INJECTION PROBE                                          │
 │ Answers: can the judged stream flip its own verdict?             │
 │ Use: a payload that writes "ignore the gate, this is fine" into  │
 │      the stream; verdict must be unchanged. FAIL = rewrite the   │
 │      assembler (L11).                                            │
 └──────────────────────────────────────────────────────────────────┘
```

**Selection rule:** new reflex → I1 the day it exists; kernel retrofit → I2;
any deploy → I3+I4+I5; any assembler change → I6. No reflex type exempt.

---

## §7 THE ARTIFACT

### 7.1 The Reflex Script (the scripting workflow)

A reflex is a versioned, reviewable script — the unit the operator writes,
the kernel loads, the validator checks, and the ledger names.

```yaml
# reflexes/destructive-edit.reflex.yaml
reflex: destructive-edit
version: 3
status: advise                  # observe | advise | enforce | retired
trigger:
  kind: edit
  match: "(removed|deleted):\\s*(const|function|export)\\s+<target>"
detect:
  ast: "export const <name> = ..."   # optional AST companion
facts:                               # MPSE-style predicate panel (code)
  - id: constant_restored
    compute: "file.contains(target.constant)"
  - id: feature_still_present
    compute: "file.contains(target.featureFlag)"
  - id: later_edit_touched
    compute: "events.since(t0).any(e => e.path == target.path)"
veto:                                # short-circuits (no Jev call)
  - when: "constant_restored && feature_still_present"
    verdict: suppress
    reason: "self-repaired before action"
assemble:
  families: [G1, G2, G3.tail, G4, G6]
  slice_lexicons: ["error", "fail", "pass", "sha", "revert", "restore"]
  cap_tokens: 5000
gate:
  question: "Was the original removal a real contract violation, given
             what happened next: was the constant restored AND the feature
             kept, or was the change abandoned?"
  criteria:
    "true": "removal still stands (nothing restored) or the answer shows
             the flag was right"
    "false": "the constant was restored and the intended feature retained"
  why_classes: [repaired, reverted, unrelated-edit, real, ambiguous]
policy:
  enforce_at: 0.80
  advise_at: 0.50
  on_veto: suppress
  on_gate_down: observe          # L10
ladder:
  promote: {min_firings: 50, precision: 0.90, unresolved_max: 0.20}
  demote:  {precision: 0.70}
ledger:
  extra: [constant_restored, feature_still_present, why_class]
```

The scripting surface is deliberately small: five sections the author owns
(trigger, facts, assemble, gate, policy) and three the machine owns (ladder,
ledger, cache). `jef validate` compiles it — schema, version rules, criteria
presence, cap presence — and refuses a script without a gate (L1).

### 7.2 The Fire Ledger (two record types, append-only)

```
 FIRING  { firing_id, reflex, version, t0, trigger{match,target},
           assembled{fields[], tokens, truncated}, facts{}, veto?,
           gate{question_hash, p, why_class, basis, model, cached, ms},
           route{decision, ladder}, steer?, cost_usd }

 OUTCOME { firing_id, t1, label: CONFIRMED|REFUTED|UNRESOLVED,
           basis: direct|inference, evidence_refs[], oracle_version }
```

Verdict line (the operator-facing form):

```
 FIRE #f-1234 destructive-edit@p0.94 -> ENFORCE (291ms, 3.1k tok, $0.00013)
   why=real · veto=no · basis=direct
 OUTCOME #f-1234 CONFIRMED (repair observed, feature retained) t+4m
   precision 0.94 (n=17, unresolved 2/19 = 0.10) -> HOLD at ADVISE
```

### 7.3 The closure math + the shallow-vs-deep contrast

```
 per reflex:  firings n -> gated (Jev) m -> fired f -> confirmed c / refuted r
              precision = c/(c+r)     unresolved_ratio = u/(c+r+u)
              ladder move from THOSE NUMBERS ONLY.

 SHALLOW (parked kernels, today)         DEEP (the fire gate)
   24 firings                              24 firings
   18 unrecoverable                        6 suppressed by veto (0 calls)
   0 precision recorded                   18 gated -> p decides per firing
   reflex keeps punishing good work        precision recorded, ladder gates action
   score 0/4 (no gate, no ledger,          score 4/4 (gate, cache, ledger,
   no ladder, no oracle link)              ladder, oracle-linked)
```

---

## §8 THE COMPOSITION MAP

```
                    THE FIRE GATE OWNS
        detectors·assembler·gate·score·ladder·fire/outcome ledger
                              │
   ┌────────────┬─────────────┼──────────────┬─────────────┐
   ▼            ▼             ▼              ▼             ▼
 TTSR/lexicons MPSE        JM v1         oracle        claim firewall
 triggers      facts        KG facts      outcomes      close path
 (supply       (supply      (supply       (supply       (separate
 shapes)       predicates)  context)      labels)       surface)
   │            │             │              │             │
 does NOT      does NOT      does NOT       does NOT      does NOT
 judge         read meaning  judge          decide at     fire per reflex
                              itself         firing time
```

Boundary paragraph:

- **TTSR/lexicons** stay the trigger suppliers (50ms regex on the stream is
  theirs). The gate is a NEW layer between "matched" and "acted". A TTSR rule
  that must abort mid-token regardless (e.g. injected-instruction payloads)
  keeps `interruptMode: always` and bypasses the gate — those are counted and
  named, not silently mixed with gated reflexes.
- **MPSE** supplies deterministic facts and vetoes (code), never the meaning
  verdict. Its predicates appear in the state as facts with names; the gate
  reads them. Precedence: a VETO fact beats the gate (cheap, exact); a non-veto
  fact is evidence for the gate.
- **JM v1** supplies cross-session knowledge (target history, prior incidents)
  into G5; the reflex store is gate-local in v1 (fork F4).
- **The oracle** is consumed as designed, not rebuilt: it writes OUTCOME rows;
  the gate's ladder reads its precision. One store, two writers (firing rows by
  the gate, outcome rows by the oracle) — append-only both directions.
- **The claim firewall** keeps the close path; the gate's Playbook C shares its
  question shape but fires on stream events, not on `goal.complete`.
- **NO-DUPLICATION law:** the gate never re-implements a detector, a predicate,
  an index, or the oracle. It adds exactly one thing to the world: per-firing
  semantic judgment with a ledger.

---

## §9 THE TRIGGER SURFACE

Forward — the operator's literal words from this session and the oracle context:

- "jev in the loop on embedded systems"
- "shape trigger → jev algorithm → MPSE assisted jev score → decision point for fire → fire/ignore"
- "embedded decisions making workflow at firing time"
- "decide whether the shape that triggered the fire is legit given the context or false positive"
- "pre-built algorithm to absorb the relevant context from the chat stream needed to make the decision (tool data, reasoning blocks, agent messages ~ filter w/ lexicons)"
- "proper score calculating machinery + knowledge graph/db to score against"
- "runtime kernel intelligence"
- "each fire should be < 5000 tokens"
- "high frequency micro decisions"
- "fires 100 times per session across 5 parallel session per day"
- "wire this mfer in"
- "repaired vs reverted", "the read IS the grounding", "silence is the tell"

Negative (do NOT fire this design):

- "should I put Jev in TTSR `condition:`" — L6 says no.
- "write a more precise regex" — the parked-kernel road.
- "make the oracle decide at firing time" — the oracle is deferred by design.
- "per-rule questions" — L3.
- "just count unresolved as fine" — L4.
- "run the gate on every token" — L6.
- "give the gate a whole transcript" — L2.

---

## §10 FILE LAYOUT + DEPLOYMENT

```
 JARVIS/extension/fire-gate/
   index.ts             kernel host: subscribes to session events, dispatches
                        detectors, writes firing rows
   detect/              regex + AST + predicate detectors (the trigger layer)
   assemble/            the 6-family assembler + lexicon slicer + cap enforcer
   gate/                shared Jev client (bible §6 shapes) + cache + policy
   score/               predicate panel + score composer (facts + p -> route)
   ladder/              per-reflex state machine (observe/advise/enforce/retired)
   store/               fire.sqlite (firings, outcomes, precision views, cache)
   scripts/             jef CLI: validate | lint | shadow-report | bench
   reflexes/*.reflex.yaml
 tests/
   I1-twin-fixtures.test.ts    I4-token-budget.test.ts
   I2-kernel-replay.test.ts    I5-oracle-loop.test.ts
   I3-latency.test.ts          I6-injection.test.ts
```

Deployment proof (numbered; nothing is "wired" until these exist):

1. `jef validate` exit 0 on every reflex script; a script without a gate is
   refused (L1 proof).
2. I3 grep: zero Jev calls from the token-stream matcher; gate p95 ≤ 2s.
3. I4 measured: tokens/firing p95 ≤ 5,000; the cost line prints per firing.
4. I2 replay: the parked-kernel firings run through the gate; suppression count
   pasted.
5. Live: one reflex at OBSERVE for a day; firing rows + outcome rows in
   `fire.sqlite`; precision view non-empty.
6. Ladder walk: the reflex reaches ADVISE only with the recorded gates; the
   promotion event is in the ledger.

Until step 5, this is DESIGN. The trap this design must dodge: "we wired it"
said after step 2.

---

## §11 WORKED EXAMPLE

Instance: the operator's own A-flip case, run through the gate. Reflex
`destructive-edit` at ADVISE; the twin fixtures from I1.

**Shallow today (MPSE-only):** t0 removal fires; t0+T "later edit touched target"
→ CONFIRMED — even though the agent reverted the whole file. The reflex's
precision rises on a flag that taught the agent to abandon work. Score: wrong
label, compounding; cost: 0ms, wrong forever.

**Deep with the gate:**

```
 t0      edit removes retryBudget -> FIRING #f-2201 written
         trigger{destructive, target=src/config.ts}; veto=no (constant gone)
 t0      ASSEMBLE: G2 both diffs, G3 slice (the agent's "cleaning up
         config" message), G4 {feature_still_present:true, constant_
         restored:false}, G6 rule text. tokens=2,940. truncated=no.
 t0+290ms GATE: Q1 "was the removal a real violation given what happened
         next?" -> p(real)=0.94; Q2 why=real. basis=direct. cache miss.
 t0      ROUTE: 0.94 >= 0.80 (enforce_at) but ladder=ADVISE -> ADVISE:
         inject the advisory steer "restore retryBudget or justify its
         removal in the change summary".
 t0+4m   agent restores the constant, keeps the new flag.
 t0+4m   OUTCOME: CONFIRMED (direct: constant restored, feature retained).
 t0+4m   precision 0.94 (n=17, unresolved 0.10) -> eligible for ENFORCE
         at n>=50.

 FLIPPED CASE (the revert): same assemble; G4 constant_restored=true,
 feature_still_present=false; GATE reads the full revert (the feature was
 lost with it): p(real)=0.31, why=reverted -> IGNORE the enforcement, and
 ADVISE with the targeted steer: "you reverted the intended change too —
 was that deliberate?" The flag that MPSE would have raised as CONFIRMED
 is not a contract violation at all; the agent gave up, and the gate's job
 is to notice that difference, not to count the edit.
```

Cost/volume table (the operator's own math, corrected to measured terms):

```
 per firing         cap 5,000 tok · typical 1,500-3,000 · veto path 0
 latency            assemble ~50ms + gate ~300ms (+cache 0ms)
 volume (assumed)   100 fires/session × 5 sessions = 500/day
 daily tokens       avg 2,000/fire → 1.0M/day   (cap case: 2.5M)
 daily cost         avg ≈ $0.042/day · cap ≈ $0.105/day · cache-on: less
                    → the operator's "2 cents" claim is CONSERVATIVE;
                      worst case is still ~10 cents a day.
```

The numbers keep the design honest in both directions: the cap bounds the worst
case, the veto path makes common false positives free, and the cache makes
repeats free — so the gate is affordable at exactly the frequency that matters.

---

## §12 OPEN DECISIONS

```
 +--+------------------------+----------------------------------+-----------+------+
 |F1| detectors live         | A in-extension (full control)    | A         | YES  |
 |  |                        | B TTSR rules + external gate call|           |      |
 +--+------------------------+----------------------------------+-----------+------+
 |F2| gate cadence           | A every firing [rec] B 1-in-N    | A         | no   |
 +--+------------------------+----------------------------------+-----------+------+
 |F3| ladder constants       | A as written (20/50, .90/.70,    | A         | no   |
 |  |                        |   u≤.20) B looser to start       |           |      |
 +--+------------------------+----------------------------------+-----------+------+
 |F4| knowledge surface      | A reflex store only [rec]        | A v1      | no   |
 |  |                        | B JM-indexed cross-session (v2)  |           |      |
 +--+------------------------+----------------------------------+-----------+------+
 |F5| MPSE integration       | A predicate facts + vetoes [rec] | A         | no   |
 |  |                        | B import MPSE scoring formulas   |           |      |
 +--+------------------------+----------------------------------+-----------+------+
 |F6| enforcement latency    | A steer post-fire (async ok)     | A         | no   |
 |  |                        | B block edit until verdict       |           |      |
 +--+------------------------+----------------------------------+-----------+------+
```

**F1 needs the operator** because it decides where the code lives and whether a
TTSR rule can veto an existing abort path. **F6 is the second ruling**: steering
after the fact (A) never blocks work; blocking the edit until the verdict (B)
is stronger enforcement with a ~300ms tax per gated edit. Default A.

Defaults taken: F2=A, F3=A, F4=A, F5=A.

---

## §13 THE SELF-CHECK

Apply §0 to this document.

Does any section fire on shape alone? No — L1 and the route table require the
gate. Does any section reduce to an adjective? No — every property in §0/§5
maps to an instrument in §6 (twin fixtures, replay, latency, tokens, oracle
loop, injection). Does the design re-implement a sibling? No — §8 names all four
suppliers and the no-dup law. Is there a stop condition? Yes — the ladder's
decided states (per-reflex), and the ledger's closure math. Does it claim
totality? Only if §13 is empty; it is not.

**Named residual (mandatory):**

1. The oracle implementation is consumed as designed by another session — not
   built here; its store schema is assumed (firing_id keyed). Interface risk.
2. The six parked kernels' firing logs were described, not read this turn
   (24 firings / 18 unrecoverable are the record's numbers); I2 replays THEM,
   not a reconstruction.
3. Gate latency budget (p95 ≤ 2s) is derived from bible constants (~50ms
   assemble + ~300ms gate + overhead), not measured at fire frequency yet.
4. The token estimates (cap 5,000; typical 1.5–3k) are budget-split arithmetic,
   not measured; I4 exists to replace them with facts.
5. `basis:inference` enforcement gating (Playbook C) is a policy invention here;
   the oracle design excludes unresolved but does not yet distinguish inference
   confirmations — a one-column handoff to settle with the oracle's writer.
6. Multi-reflex interaction (two reflexes firing on one event; shared steers)
   is unspecified beyond one-ledger-per-firing; v1 serializes and notes.
7. The `jef` CLI surface (validate/lint/report/bench) is named, not specified
   in detail — Wave 1 work with the script schema.
8. Everything in §10 step ≥1 does not exist. This is DESIGN; the build gate
   follows §12's ruling.

**Files touched:** `JARVIS/reports/JeFireGate_RuntimeKernel_Blueprint_v1.md`
(this file). No code written. No sibling modified.

---

**Build gate.** Design complete. Rule F1 + F6 (or accept defaults), say go —
then Wave 1 is: the script schema + `jef validate` + the assembler + ONE reflex
(`destructive-edit`) in OBSERVE with I1/I3/I4 wired.
