# DECISION_CHAIN — JM (append-only; operator rulings + build rulings verbatim)

## RULINGS (operator)
- **R-01 (2026-09-21, verbatim intent):** "i need to be able to semantically and deterministically
  index massive fucking mountains of data on the device" — the engine must do BOTH: deterministic
  narrowing AND semantic judgment. → implemented as L1/T9 (code narrows, Jev judges).
- **R-02:** "need a tool for this i can point at anything when i need data structuring or decision
  making" → the target registry + `--in` (pointers, never copies).
- **R-03:** "use JDM and look at the jev notes discord channel" → the bible's source ledger (23 items).
- **R-04:** "preserve this doc as the v1 master blueprint" → `docs/blueprints/JM_MASTER_BLUEPRINT_v1.md`
  carries the provenance header and is the design of record for the runtime layer.
- **R-05 (owed):** F1 (fire-gate detectors: in-extension vs TTSR+external) and F6 (steer post-fire vs
  block-until-verdict) — both block W8 only.

## BUILD RULINGS (made while executing; each with its cost-if-wrong)
- **B-01 — one state per request, not 64 items per request.** The bible's L2 wording said
  "≤64 items/request"; the real API takes ONE state + a question map. Ruled: batching = many
  questions per state + CONCURRENT requests per item (the pool). Cost if wrong: a wasted
  refactor of the batch layer; mitigated by the transport seam.
- **B-02 — the artifact is the decision, not the run.** `decisions.json` excludes cache/cost
  metadata so replays are byte-identical (EN-006). Cost if wrong: replay comparisons would need
  a normaliser.
- **B-03 — budgets clamp the CLAIM, not the batch.** `roomLeft()` before the call; overshoot
  removed (EN-005). Cost if wrong: a cap that leaks up to one batch of spend.
- **B-04 — `session_diff` is not the claim corpus.** The find chain's `kept=0` over @shadow was
  ruled TRUTH (diff blobs), not a defect; the same chain over @reports found the real document.
  Cost if wrong: mis-targeting the corpus for the historical completion audit (A5).
- **B-05 — doc floors are recorded, not padded.** BUILD_REPORT/DEBUG_LOG sit below 500 lines and
  the canon set is partial; the gap is in the checkpoint's honest gaps. Cost if wrong: a reviewer
  expecting floors finds them unmet — stated up front instead.
