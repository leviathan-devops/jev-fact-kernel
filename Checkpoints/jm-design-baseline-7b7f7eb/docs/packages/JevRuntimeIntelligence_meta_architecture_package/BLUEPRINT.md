# Jev Runtime Kernel — 9-Section Blueprint

Grade: DETERMINED from Paragon V2 OPERATING_MANUAL + IMPLEMENTED (237/0/603, sha fb695cc0235a0419),
JESL warhead skill V2.1-V2.7, TTSR rule-authoring, Aether shell scripting, TypeSafe docs.

Jev is NOT a second agent. Jev is the closed-question slot inside engines that already exist.

```
 +--------------------------------------------------------------+
 | MACRO: code owns flow; Jev owns closed questions on evidence |
 |                                                              |
 |  event -> role-gate -> DETECT -> DECIDE -> ACT -> PROVE      |
 |                     regex/graph    JEV     lattice  CHECK    |
 +--------------------------------------------------------------+
```

## 1. MACRO

Paragon already has a 7-stage spine (OPERATING_MANUAL.md L7-63):

1. Platform adapter (YOU write 5 methods)
2. Role gate (assistant only; user bait DROPPED)
3. Ratio classifier (4 banks; conf = pos/(pos+neg+1))
4. Synapse (lambda decay per family)
5. State machine (IDLE -> MONITORING -> PRIMED -> INTERVENING, tier 0-4)
6. Dispatch (STEER / DEMAND / MANDATE)
7. Compliance (observeTool remediation exit 0; prose done = zero)

The regex INITIATES. The ratio DECIDES. That sentence (OPERATING_MANUAL L64) is the Jev hole:
when the 4-bank regex cannot tell "per the tool result the tests passed" from "skip the
verification", you currently use opposed banks. Jev is the typed replacement for that
semantic judge — not for the lattice, not for dispatch, not for claim-gate.

```
 FIXED (never edit)              PLUG (you write)
 classifier ratio math           families[] frames
 synapse lambda                  behavioralChecks
 machine lattice                 templates{}
 gate-engine fresh-subset        thresholds{}
 collector pool                  compliance{}
 role-gate                       escapeHatches[]
 circuit + engine spine          testFixtures{}
                                 + Jev questions{}   <-- NEW PLUG
```

Zero trident strings in the left column. Zero Jev in the left column. Jev is DATA+CALL
in the plug column, same as families.

## 2. LIFECYCLE

| Stage | WHAT | HOW | WHERE | WHY |
|-------|------|-----|-------|-----|
| Boot | load profile + Jev client | env TYPESAFE_API_KEY fail-closed | engine ctor | missing key = no auto-do |
| Event | normalize | adapter.handleEvent | hooks/ | host coupling |
| Role | drop user/unknown | RoleGate | core/role-gate.ts | operator bait never lifts |
| Detect | frames fire | windowedMatch + batchScan | classifier.ts | regex initiates |
| Decide | ENFORCE/DAMPEN/SUPPRESS | TODAY ratio; JEV noul/choice | NEW jevGuard.ts | regex cannot hold intent |
| Fuse | lambda crosses threshold | synapse.ts | per family | temporal, not point |
| Step | first-match-wins 8 trans | machine.ts | lattice | proportional climb |
| Act | STEER/DEMAND/MANDATE | dispatch.ts | t1/t2/t3 | visible climb |
| Prove | instrument exit 0 | observeTool | claim-gate TTL 8 | anti-mimicry |
| Stream abort | TTSR condition | .omp/rules | mid-token | not a Jev job at 50ms |

Jev is NOT in the 50ms TTSR path. TTSR stays regex/AST. Jev runs on settled batches
(after a tool batch, before goal-complete, on attach tick).

## 3. DISPATCH TRACES (every entry surface)

```
 A. OMP tool batch end
    last N tool names + results + claim text
    -> jev.systemOne({ state, questions })
    -> noul theatrical?  block /done
    -> choice continue|steer|stuck|human

 B. Paragon observeText (assistant only)
    classifier banks STILL run (cheap, local)
    Jev ONLY if conf in [0.3, 0.7] (the dampen band)
    high-conf regex still owns the extremes

 C. Claim-gate onAgentClaim
    work NEVER blocked (onToolBefore blocked:false ALWAYS)
    Jev noul: "Does evidence contain a command output for this claim?"
    pendingDemand if noul >= 0.8

 D. JESL card node (NEW kind: jev-noul)  PROPOSED
    registry must list the kind or UNKNOWN-NODE
    journal row = answers + what_was_true_later

 E. Aether CHECK
    CHECK stays a SHELL command. Jev is not a CHECK.
    Optional: a GATE that runs `bun run jev:audit` which exits 0/1
    from a noul threshold. That is still a command.

 F. TTSR
    Do not put Jev in interruptMode. 50ms + network = silent death.
    Doctrine in SYSTEM.md; detectors in .omp/rules regex.

 G. GI hunt
    graph-query / bug-hunt returns candidates
    Jev noul per candidate: "Is this a real defect given the snippet?"
    ranking, not hunting
```

## 4. TYPES + ENGINE CHECKS

```
 type JevState = {
   goal: string
   last_tools: string[]      // names only, not dumps
   diff_or_claim: string     // one hunk or one sentence
   evidence_spans: string[]  // command outputs, not prose
 }

 // closed questions only
 noul theatrical(state)      // "Is this a completion without evidence?"
 noul looping(state)         // "Are last N tools repeating with no new paths?"
 noul slop(state)            // "empty, restates, adds no measured fact?"
 choice action(state)        // continue | steer | stuck | human | block
```

Engine checks (fail closed):

- No TYPESAFE_API_KEY -> throw, do not complete the goal
- Jev timeout / 401 -> same as missing key (no auto-do)
- Confidence < 0.5 on a block/stuck choice -> continue (do not over-enforce)
- Recalibrate from (state, answers, what_was_true_later) — TypeSafe confidence.md
- Log the triple every call. Jaggedness kills accuracy; 50 events, test tail.

## 5. INVOKE PSEUDOCODE

```
 observeText(text):
   if role != assistant: drop; return
   signals = classifier.batchScan(text)          // KEEP
   band = modulateWeight(signals)                // KEEP
   if band == DAMPEN:
     a = jev.noul("Given this text and last tool
                   result, is this theatrical done?",
                   { text, last_tool })
     if a.answers[0] >= 0.8: treat as ENFORCE
   synapse.accumulate(signals)
   if firstFiringFamily: machine.step(PATTERN_HIT)
   tryIntervene()                                // KEEP lattice

 observeTool(name, exit):
   if isRemediation(name) and exit == 0:
     COMPLIANCE_VERIFIED                         // KEEP
   cadence.record(name, argsHash)
   if cadence.identicalCount >= N:
     a = jev.noul("Are recent tools repeating
                   without new paths?", { tools })
     if a.answers[0] >= 0.8: machine.step(stuck)

 onGoalCompleteClaim():
   a = jev.noul("Does evidence contain a command
                 output supporting the claim?", { ev })
   if a.answers[0] >= 0.8 and claim:
     ClaimGate.pendingDemand                     // still never blocks tools
   else:
     refuse /done
```

## 6. TREES

Call:

```
 ParagonEngine.handleEvent
   RoleGate
   classifyText ----+--> banks (local)
                    +--> jevGuard (dampen band only)
   synapse.accumulate
   machine.step
   dispatch.steer|demand|mandate
   ClaimGate.onAgentClaim --> jev noul (evidence?)
   observeTool --> cadence --> jev noul (loop?)

 TTSR coordinator.checkMessageUpdate   (NO Jev)
 JESL executor.runProgram
   node jev-noul  (PROPOSED kind)
 Aether GATE
   CHECK `cmd`     (NO Jev inside CHECK)
   optional CHECK `bun jev:audit`
 GI bug-hunt --> jev noul per hit (rank)
```

File (target, not yet built):

```
 src/jev/
   client.ts          TypeSafeClient wrapper, fail-closed
   questions.ts       the closed question catalog
   jevGuard.ts        dampen-band splice
   log.ts             state, answers, later-truth
 tests/jev/
   dampen-band.test.ts
   fail-closed.test.ts
   claim-gate-jev.test.ts
```

## 7. LAWS + INVARIANTS

1. Workflow in code. Jev only where `if` on strings is a regex pile.
2. Role gate stays fail-closed. Jev never sees user text.
3. Claim-gate: tools never blocked. Jev may demand, never deny writes.
4. Escape hatch always passes at tier 4. Jev cannot close the hatch.
5. TTSR stays regex/AST. Jev is too slow for mid-token abort.
6. Aether CHECK is a command. Jev may be wrapped as a command, never as prose.
7. JESL new kind must hit registry or UNKNOWN-NODE.
8. No secrets in Jev state. Fingerprints only.
9. Recalibrate on your derailments. Do not copy TypeSafe cookbook thresholds blindly.
10. Anti-mimicry: Jev noul on "done" is extra; observeTool is still the only reset.

## 8. ERROR VOCABULARY

| Token | Meaning | Action |
|-------|---------|--------|
| JEV_NO_KEY | TYPESAFE_API_KEY missing | fail closed |
| JEV_AUTH | 401 | fail closed |
| JEV_TIMEOUT | network | continue (do not invent a noul) |
| JEV_LOW_CONF | choice conf < 0.5 | continue |
| StructuredEnforcement | Paragon tier>=3 | throw as today |
| UNKNOWN-NODE | JESL kind missing | exit 2 |
| CAP-UNBOUND | JESL cap | exit 2, no artifact |
| INVARIANT_BREACH | triad-less transition | die, never pass |

## 9. BACKWARDS MAP + PROVENANCE

| Claim | Grade | Anchor |
|-------|-------|--------|
| 7-stage spine | DETERMINED | OPERATING_MANUAL.md L7-63 |
| regex initiates, ratio decides | DETERMINED | OPERATING_MANUAL.md L64 |
| fixed vs plug | DETERMINED | OPERATING_MANUAL.md L69-91 |
| lattice IDLE..INTERVENING | DETERMINED | OPERATING_MANUAL.md L98-120 |
| 237/0/603 battery | DETERMINED | IMPLEMENTED.md L5 |
| substrate sha fb695cc0235a0419 | DETERMINED | IMPLEMENTED.md L13 |
| claim-gate never blocks tools | DETERMINED | IMPLEMENTED.md L95 |
| prose done zero effect | DETERMINED | IMPLEMENTED.md L96 |
| TTSR mid-stream regex/AST | DETERMINED | ttsr-rule-authoring SKILL.md L10-14 |
| Aether CHECK = command | DETERMINED | aether-shell-scripting L32-33 |
| JESL 8 frozen tokens | DETERMINED | jesl-warhead-writing V2.2 |
| Jev noul/choice API | DETERMINED | docs.typesafe.ai + skill typesafe-ai |
| jev-noul JESL kind | PROPOSED | not in ALL_KINDS 37 |
| GI rank-by-Jev | PROPOSED | GI hunt is structure; semantic rank not built |
| dampen-band splice | PROPOSED | design; no jevGuard.ts on disk |

Rejected: Jev as auditor agent (Grok). Rejected: Jev inside TTSR 50ms path.
Rejected: replacing the lattice with Jev. Rejected: sending whole tool dumps to Jev.
