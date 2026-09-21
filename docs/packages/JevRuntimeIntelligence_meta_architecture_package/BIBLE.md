# Jev Runtime Intelligence Bible

Status: DESIGN PACKAGE 2026-09-20. Paragon V2 substrate BUILT (IMPLEMENTED.md).
Jev splice PROPOSED. Not a CST2 3000-line dump — residual in PROVENANCE.md.

## 1. Status Banner

| Piece | State | Proof |
|-------|-------|-------|
| Paragon V2 7-stage spine | BUILT | OPERATING_MANUAL.md L7-63 |
| Battery 237/0/603 14 files | BUILT as of 2026-09-01 | IMPLEMENTED.md L5 — re-run before trust |
| Substrate sha fb695cc0235a0419 | BUILT | IMPLEMENTED.md L13 |
| Claim-gate non-blocking | BUILT | IMPLEMENTED.md L95 |
| TTSR host enabled, 0 behavioral rules | BUILT/GAP | ttsr-rule-authoring 2026-09-18 |
| JESL 37 kinds, 8 frozen tokens | BUILT | jesl-warhead-writing V2.1-V2.2 |
| Aether CHECK=command | BUILT (language) | aether-shell-scripting |
| TypeSafe Jev API | EXTERNAL | docs.typesafe.ai |
| jevGuard.ts dampen splice | PROPOSED | this package |
| JESL kind jev-noul | PROPOSED | not in ALL_KINDS |

## 2. What it is

A runtime behavior kernel is already Paragon: detect (lexicon) -> decide (ratio+lattice)
-> act (dispatch) -> prove (observeTool). Jev is the typed judge for closed questions
the regex banks cannot hold. It is not Foreman, not Discord, not GI, not TTSR.

## 3. Mechanisms (the ones that exist)

Role gate: assistant only. Classifier: 4 banks, conf=pos/(pos+neg+1), bands
ENFORCE >=0.5, DAMPEN >=0.3, else SUPPRESS. Synapse: lambda decay. Machine:
IDLE MONITORING PRIMED INTERVENING tier 0-4. Dispatch: t1 STEER t2 DEMAND
t3 MANDATE. Claim-gate TTL 8, tools never blocked. Throw-arms 4. Escape hatch
token-subsequence, one shared import. Profiles are DATA.

TTSR: regex/AST on isolated buffers; abort; discard partial; inject body;
continue. Load at session start.

JESL: card -> registry kind -> executor -> journal sha-chain. Unknown kind
UNKNOWN-NODE exit 2.

Aether: NL intent, structure enforcement, GATE+CHECK commands, SHIP iff green.

## 4. Jev insertion (the only new mechanism)

```
 if classifier.band == DAMPEN:
   noul = Jev(closed question, bounded state)
   if noul >= calibrated bar: treat as ENFORCE
 after tool batch:
   noul theatrical / looping -> block /done or steer
 on claim:
   noul evidence? -> pendingDemand, never block tool
```

Fail closed: no key, 401. Timeout: continue, log, do not invent 0.
Never in TTSR 50ms path. Never as Aether prose CHECK.

## 5. Invariants

See BLUEPRINT section 7. Short: code owns flow; tools never blocked by Jev;
escape hatch Jev-proof; new JESL kinds register.

## 6. Failure inventory (already burned, Paragon)

User-prompt contamination -> role gate. Weight-averaging stub -> ratio.
Always-same-message escalation -> tier templates. Stale evidence -> fresh-subset
gate-engine. Unbounded pool -> 600s TTL. Session lock -> structurally absent.
Prose done -> anti-mimicry (observeTool only). Single-signal block -> LAW23 fusion.

Jev-specific failures to expect: timeout fail-open if you skip D8; dump-context
jaggedness; STEER storm on Muse TE rate; 401 mid-goal.

## 7. Evidence standard

A claim that Jev "works" requires: log.jsonl rows (state, answers, later-truth)
AND a battery that fails when key is missing AND a dampen-band test where the
regex-ambiguous pair flips with Jev and not without. IMPLEMENTED.md LAW-14:
claims without test ids are mythology. This bible has no Jev test ids yet.

## 8. Operator surface

See OPERATOR_MANUAL.md. Four calls. Symptom table. Recovery. Never review-the-repo.

## 9. Host couplings

| Host | Coupling | Jev |
|------|----------|-----|
| OMP | hooks / observeText / observeTool | jevGuard after classify |
| Paragon profiles | DATA packs | questions{} in the pack |
| TTSR | .omp/rules | none |
| JESL | registry + card | jev-noul PROPOSED |
| Aether | CHECK cmd | optional bun jev:audit |
| GI | hunt output | rank noul PROPOSED |
| Discord/JAM | I/O | none (wrong layer) |

## 10. Anti-patterns

Jev as agent. Jev in TTSR. Jev CHECK paragraph. Tool dumps. Skip on missing key.
Replace lattice. Block tools. Unregistered JESL kind. Lower Paragon thresholds
because Jev exists. Pad this bible to 3000 lines.

## 11. Compaction recovery

Read this file + BLUEPRINT.md + GOLDEN_REASONING.md + OPERATOR_MANUAL.md.
Re-run `bun test` in Paragon_V2_Behavior_Algorithms. Confirm TYPESAFE_API_KEY
present without printing it. Do not resume as if jevGuard.ts exists — it does not.
If you need Paragon internals, read OPERATING_MANUAL.md and IMPLEMENTED.md in
the boilerplate tree, not this fusion bible.
