# CHANGELOG — JM (append-only; dated session entries)

## [2026-09-21] Build session 1 — W0 through W7 (partial)
- **Accomplished:** the store + FTS5 substrate; incremental indexing over 11,831 files (2.5%
  re-run); query (where/fts/tag); the append-only ledger with the cost line; the crash-safe job
  queue with the resume sweep (SIGKILL -> dup=0); pools + exact budgets; the judge client
  (key/transport/cache/policy) verified LIVE against the real API; the decision-tree verb with
  deterministic artifacts; the find chain (live 44->30->1->1); the HTTP surface (`/decide` live);
  calibration (bands + truth + the calibration row).
- **Evidence:** battery 18/0, tsc 0; the runs quoted in EVIDENCE_STATE E-01..E-09.
- **Decisions:** B-01..B-05 in DECISION_CHAIN (one-state-per-request; artifact-is-the-decision;
  budget clamps the claim; session_diff is not the claim corpus; floors recorded not padded).
- **Failures + root causes:** EN-001..EN-008 in DEBUG_LOG (the silent zero; the stdout pollution;
  two budget boundary bugs; a flaky probe; the artifact metadata; the invisible backspace byte
  that disabled secret redaction; the env-blocked inline execution).
- **Honest disclosures:** W2 adapters partial; W8 not started; the audit lane not run
  (AUDIT GATE: BLOCKED); doc floors unmet; the second-operator drill owed.
