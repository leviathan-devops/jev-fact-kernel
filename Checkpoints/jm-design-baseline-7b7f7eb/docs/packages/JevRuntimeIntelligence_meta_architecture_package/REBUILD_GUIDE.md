# REBUILD GUIDE — Jev runtime kernel from this package

A zero-context agent given only this folder should rebuild in kind, not byte-clone Paragon.

## 0. Do not start here if you need Paragon source

Copy the winner:

`OPENCODE_WORKSPACE/Shared Workspace Context/KNOWLEDGE_LIBRARY/agent_plugin_boilerplates/Paragon_V2_Behavior_Algorithms/`

Pin `vendor/paragon-substrate` sha fb695cc0235a0419. Run `bun test`. If not 237/0
as of IMPLEMENTED.md date, record the new number; do not pretend.

## 1. Keep the left column

Do not edit classifier.ts, synapse.ts, machine.ts, gate-engine.ts, collector.ts,
role-gate.ts, circuit.ts, engine.ts except a single call site in observeText
after modulateWeight.

## 2. Add the plug

`src/jev/client.ts` — TypeSafeClient, fail-closed on missing key.
`src/jev/questions.ts` — theatrical, looping, slop, evidence (closed only).
`src/jev/jevGuard.ts` — if band==DAMPEN then noul; map to ENFORCE.
`src/jev/log.ts` — state, answers, later-truth. No secrets.

## 3. Wire three call sites only

- observeText dampen band
- cadence identicalCount >= N
- ClaimGate onAgentClaim (pendingDemand only)

## 4. Tests that must exist before README

- missing key throws (fail closed)
- timeout does not invent noul 0 that blocks
- dampen-band pair: regex-ambiguous text ENFORCE iff Jev noul high
- onToolBefore still blocked:false with Jev high
- escape hatch still passes at tier 4 with Jev high
- role gate still drops user text (Jev never called)

## 5. Do not

- TTSR condition = Jev
- JESL kind without registry append + UNKNOWN-NODE negative test
- Aether CHECK as a paragraph
- GI hunt replacement

## 6. Calibrate

50 logged events with later-truth. Then set bars. Not before.

## 7. Done when

Those tests green, key fail-closed, Paragon battery still green, no key in git.
Until jevGuard.ts exists, this package is the DESIGN, not the kernel.
