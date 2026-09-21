# THEATRICALITY_LOG — form-without-substance journal (append-only)

Disposition values: SELF-CORRECTED (producer caught it) · OPERATOR-CAUGHT (it survived to the
operator) · BLOCKED-OPEN (noticed, not yet corrected, with the reason).

**Metric: OPERATOR-CAUGHT = 0 (drive to zero).**

## T-01 — A green exit that hid an empty result — SELF-CORRECTED
- **The act:** `jm index` printed a success line over `files=0`.
- **Why it is theatrical:** the FORM (exit 0, a JM_INDEX_OK banner) stood in for the SUBSTANCE (files indexed).
- **Evidence:** the run output `files=0 changed=0 gone=0`.
- **Disposition:** SELF-CORRECTED (caught by asserting counts; EN-001; the probe now asserts `files=200`).

## T-02 — A test that could pass by accident — SELF-CORRECTED
- **The act:** the first crash test depended on pool batch timing.
- **Why it is theatrical:** the FORM (a "crash test") stood in for the SUBSTANCE (a deterministic orphan).
- **Evidence:** intermittent `stuck=0`.
- **Disposition:** SELF-CORRECTED (rewritten to claim-then-die explicitly; EN-004).

## T-03 — An artifact that could not be replayed — SELF-CORRECTED
- **The act:** `decisions.json` embedded per-run cache metadata.
- **Why it is theatrical:** the FORM (a recorded decision) stood in for the SUBSTANCE (a reproducible one).
- **Evidence:** two runs differed only on `cached`.
- **Disposition:** SELF-CORRECTED (EN-006; sha-identical pair).

## T-04 — The doc that triggered the enforcement it documented — SELF-CORRECTED
- **The act:** RUNTIME_SEAT.md's first draft contained the inline-exec trigger pattern and was refused at write time.
- **Why it is theatrical:** the FORM (documentation of a gate) stood in for the SUBSTANCE (operations that respected it).
- **Disposition:** SELF-CORRECTED (reworded; the lesson is IN the seat record).

## T-05 — Budget demonstration on n=3 — SELF-CORRECTED / BLOCKED-OPEN
- **The act:** the calibration ROW was written with `n=3` decisions and no threshold move.
- **Why it borders on theatrical:** writing a calibration row can LOOK like calibration.
- **Evidence:** the row itself says `n=3; no move warranted — mechanism proof`.
- **Disposition:** BLOCKED-OPEN — a real threshold move needs >=50 later-truth rows; the resume
  condition is the ledger volume, named in NEXT_STEPS.
