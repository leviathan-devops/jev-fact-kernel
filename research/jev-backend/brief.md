# RESEARCH BRIEF — the permanent Jev backend

**Date:** 2026-09-24 · **Depth:** DEEP (5-8 scouts, 2 follow-up rounds, 25+ sources)

## THE QUESTION
Which of seven candidate models is the best PERMANENT backend for ALL Jev architecture
built across this workspace?

## THE CANDIDATES
1. openjev/openjev
2. alibiserikbay/JevK5
3. convaiinnovations/laya
4. Mapika/decider-2b
5. HopitAI/hopper
6. jaredpalmer/kev-4b
7. jaredpalmer/kev-0.8b

## THE DECISION CRITERIA (what "best backend" means here)
- **WIRE COMPATIBILITY** — does it serve `/v1/systemone` (TypeSafe Jev's format) natively, or
  does it need an adapter? (This session already built an adapter for a GGUF; adapters cost.)
- **CALIBRATION** — the product IS the probability. ECE matters more than raw accuracy.
- **ACCURACY** — in-task and HELD-OUT (held-out is the real number; our questions are arbitrary).
- **OPERATIONAL FIT** — size, VRAM on a 12 GB RTX 4080, latency, batching, the schema cache.
- **LICENSE + MAINTENANCE** — apache-2.0 vs restricted; who maintains it; version cadence.
- **THE ECOSYSTEM** — does the client (the SDK, the serving code, the tooling) come with it?
- **PROVENANCE** — is it a trained decision model or a repackaged base model?

## SCOPE
IN: the 7 candidates, the decision-model class, the wire format, calibration, ops fit.
OUT: general LLM serving, non-decision models, the workspace's other components.

## ASSUMPTIONS
- The host is a 12 GB RTX 4080 laptop with other models resident (~1.1 GB used by embeddings).
- "Permanently" means: a decision now should not need revisiting for the workspace's lifetime.
- The current system canon is `Mapika/decider-0.8b` (a GGUF on :8008), which this session adapted.
