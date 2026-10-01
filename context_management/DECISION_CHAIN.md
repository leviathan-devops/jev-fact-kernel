# DECISION_CHAIN — the fact kernel

## RULED (by the spec, which is the authority)

- **D1 · REFUSE.** T4-CAP refuses LSP registration. Implemented as the DEFAULT, configurable via
  `FACT_FIREWALL_LSP=warn` so a WARN ruling is a one-line change. The spec's FR-15 states the
  default; the gate implements it.
- **The thresholds are DERIVED, never picked.** T2's `act` 0.683 came from pos_min 0.740 /
  neg_max 0.627. Q3 is NOT adopted at +0.047 because the bar is +0.10.

## OPEN

- D2 · T2's margin: more negatives, or a narrower surface. Default: widen the set.
- D3 · every tool call, or sample. Default: every call (T0/T1/T4 are $0).
- D4 · block the turn or the artifact. Default: the artifact; report the turn.
- D5 · the ledger location. Default: ~/.omp/run/.
- **NEW · the GitHub target.** `leviathan-devops` is the owner; the repo for THIS kernel does not
  exist. Creating it is an outward action.
