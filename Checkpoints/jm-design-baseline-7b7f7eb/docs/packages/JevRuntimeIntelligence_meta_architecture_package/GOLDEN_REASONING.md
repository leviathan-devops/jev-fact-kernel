# Golden Reasoning — Jev in the Paragon / JESL / TTSR / Aether loop

GOLDEN TEST applied: only decisions where the other branch changes the artifact.

## D1. Jev is a decision layer, not an auditor agent

- CHOSEN: noul/choice called from YOUR code on bounded evidence.
- REJECTED: spawn Jev as a reviewer persona that "looks at the repo".
- WHY LOST: TypeSafe cookbooks (llm_guardrails, citation_check) are filters on a hunk,
  not second agents. An agent-Jev becomes another LLM with extra latency.
- COUNTERFACTUAL: you'd ship `jev-mcp` as a desk and never wire `if (noul)`.
- ARTIFACT DELTA: `jevGuard.ts` vs a Discord/JAM agent named Jev.

## D2. Keep Paragon lattice; splice Jev only in the dampen band

- CHOSEN: banks still run; Jev only when conf in [0.3, 0.7].
- REJECTED: replace classifier.ts with Jev on every token.
- WHY LOST: OPERATING_MANUAL L64 — regex initiates, ratio decides. Extremes
  ("skip the verification" vs "per the tool result") are already pinned by
  opposed banks + battery 237/0. Network on every token would miss TTSR-speed
  and fail-open on timeout.
- COUNTERFACTUAL: classifier.ts deleted; every observeText is an HTTP call.
- ARTIFACT DELTA: 4-bank files stay; one new plug `questions{}`.

## D3. Claim-gate stays non-blocking

- CHOSEN: `onToolBefore` always `{blocked:false}` (IMPLEMENTED.md L95).
  Jev may open pendingDemand, never deny a write.
- REJECTED: Jev noul blocks the tool.
- WHY LOST: work-is-never-blocked is the Phase-B law. Blocking tools recreates
  the session-lock they structurally removed.
- COUNTERFACTUAL: agents freeze waiting on Jev 401.
- ARTIFACT DELTA: ClaimGate API unchanged; extra noul before consumeDemand.

## D4. TTSR stays regex; Jev stays batch

- CHOSEN: TTSR condition = regex/AST; interrupt 50ms deferred inject.
- REJECTED: TTSR condition = Jev noul on thinking delta.
- WHY LOST: ttsr-rule-authoring — silent-death if condition invalid;
  thinking off by default; network in the stream path = hang or skip.
- COUNTERFACTUAL: every token waits on inference.poolside / typesafe.
- ARTIFACT DELTA: `.omp/rules/*.md` stay regex; Jev in engine after tool batch.

## D5. Aether CHECK is a shell command, never a Jev paragraph

- CHOSEN: CHECK `cmd` EXPECT output. Optional wrapper `bun jev:audit`.
- REJECTED: CHECK "Jev thinks it's done".
- WHY LOST: aether-shell-scripting L32-33 — halt releases on CHECK lines,
  never on prose. A noul in markdown is prose.
- COUNTERFACTUAL: SHIP on a paragraph. Same as anti-mimicry failure.
- ARTIFACT DELTA: GATE may call a binary that itself calls Jev.

## D6. JESL jev-noul kind is PROPOSED, not smuggled

- CHOSEN: if Jev is a card node, register the kind or UNKNOWN-NODE.
- REJECTED: reuse `oracle` / `claim-gate` with a prompt stuffed in config.
- WHY LOST: jesl V2.1 registry ALL_KINDS 37; unregistered = UNKNOWN-NODE exit 2.
  Kernel-shape mismatch is anti-pattern J5.
- COUNTERFACTUAL: cards that "work" in docs and fail at cast.
- ARTIFACT DELTA: registry.ts append + negative test + card fixture.

## D7. Evidence in, not context dumps (omp-jev-compaction)

- CHOSEN: state = {goal, last_tools names, one hunk, evidence_spans}.
- REJECTED: send the tool dump / session JSONL to Jev.
- WHY LOST: community hook omp-jev-compaction exists to KILL dumps.
  Jaggedness: huge state kills accuracy (confidence.md).
- COUNTERFACTUAL: Jev as summarizer. That's an LLM. You already have one.
- ARTIFACT DELTA: log.ts records compact state only.

## D8. Fail closed on missing key

- CHOSEN: no TYPESAFE_API_KEY => throw; no auto-do; no /done.
- REJECTED: skip Jev and continue as if noul=0.
- WHY LOST: skip = fail-open = the theatrical path you bought Jev to close.
- COUNTERFACTUAL: "Jev optional" and nobody sets the key.
- ARTIFACT DELTA: ctor throws JEV_NO_KEY.

## D9. GI hunt stays graph; Jev ranks

- CHOSEN: GI / ripwire / grep find; Jev noul "is this a real defect?"
- REJECTED: Jev as the hunter.
- WHY LOST: Jev has no index. Graph Intelligence is structure.
- COUNTERFACTUAL: you pay noul per file in the repo.
- ARTIFACT DELTA: post-hunt filter only.

## D10. Recalibrate on YOUR derailments

- CHOSEN: log (state, answers, later-truth); raise bar on your misses.
- REJECTED: copy cookbook 0.8 thresholds forever.
- WHY LOST: TypeSafe confidence.md — calibration is group frequency, not one noul.
- COUNTERFACTUAL: false STEER storms on this model's TE rate (D-matrix:
  Muse 4-6 TE/turn, MiMo 5-8).
- ARTIFACT DELTA: log.jsonl required before shipping thresholds.

## Iron laws (would change the artifact if dropped)

1. Code owns flow.
2. Jev = closed question on bounded evidence.
3. Regex initiates; Jev optional in the dampen band.
4. Tools never blocked by Jev.
5. TTSR is not Jev.
6. CHECK is a command.
7. New JESL kinds register or refuse.
8. No key, no complete.

## Incidental (skipped)

- Jev model version string
- Whether the file is named jevGuard.ts vs jev-guard.ts
- Discord vs OMP as the host (host is adapter; Jev is host-agnostic)
