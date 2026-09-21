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

## [2026-09-21] SESSION ENTRIES — append-only, written at the moment each was noticed

### T-01 — a probe that would have been a green light over unexercised work (CAUGHT, fixed)
The container rig's T5 (crash-resume) first slept 320 ms and killed the child process. The child was
still starting, so it had claimed ZERO rows: the scenario would have reported `orphaned=0` — a pass
over a run that proved nothing. CAUGHT BY the rig's own guard (`assert orphaned > 0`), which refused
to call the angle passed. FIXED: the rig now polls the job store until a row is `running` and kills
exactly there. This is the class the file exists for, caught on itself.

### T-02 — an error path declared fixed without ever being executed (CAUGHT, fixed)
An audit flagged `watch.ts`'s empty catch as a silent swallow. The first fix recorded the failure on
the tick — but the journal was written BEFORE the state attempt (so the two records disagreed:
`errors=2` on stdout, `errors: []` in the journal) and the same array was pushed twice (`errors` IS
`res.errors`). CAUGHT BY running the failure path with a directory planted at `state.json`. A fix
for an error path that never ran is not a fix.

### T-03 — a doc claim written first and verified second (CAUGHT, fixed)
README §18's 25 claims were written from intent and then EXECUTED. Five failed: two were the
verifier's own stale expectations, three were real defects (the cost line corrupted piped output;
per-verb exit codes; `target add` accepted a phantom root). The section now says "if a line here
disagrees with the engine, the engine wins" and carries the sweep.

### T-04 — a "simplification" recommended by an audit and refuted by six inputs (REFUTED, recorded)
The audit called the LIMIT guard "unnecessarily complex" and proposed
`Math.min(Math.floor(raw), 10_000)`. Probed: that yields `LIMIT NaN` for NaN and `LIMIT -1`
(UNLIMITED in SQLite) for a negative. The shipped guard exists for exactly those cases. No change;
the refutation is pinned so the "fix" cannot land later.

### T-05 — a test the contract named and the code never had (CAUGHT, fixed)
The proof contract names `test_find_patterns`. It did not exist. Writing it found three defects
(a raw SQLiteError leaking from malformed FTS input, a budget cap that overshot 3x under
concurrency, and `--common` accepted-and-never-read). A named-but-absent test is a hole in the
evidence. A systematic sweep then found three MORE absent (`test_filter_bands`, `test_serve_decide`,
`test_calibrate_row`); all are now declared and passing.

### T-06 — my own encoding write truncated a source file (CAUGHT, restored)
A Python edit wrote `src/verbs/query.ts` with `encoding="ascii"` and hit a non-ASCII character,
leaving the file at 0 bytes. CAUGHT immediately by `wc -c` and restored from git; the FTS fix was
re-applied through the file API instead. Recorded because the tool that broke it was mine, and the
next session should know that a failing write can leave a TRUNCATED file, not just an error.

### WHAT THIS LOG DOES NOT CONTAIN
No fabricated PASS, no unrun command presented as evidence, no gate skipped. The count is small
because the session's theatricality was caught in-flight — which is the point of the guard, not an
absence of material. The metric to drive is OPERATOR-CAUGHT, and this session's operator-caught
count is ZERO: every entry above was caught by the build's own instruments.

### T-07 — a commit landed with L0 RED (CAUGHT by the next command, fixed immediately)
The D-044 commit was made in a chain that used `;` between `bunx tsc --noEmit && echo TSC=0` and
`git add -A && git commit`. tsc FAILED (a cast in the new pin needed an `unknown` hop), the
`&&`-guarded echo was skipped — and the `;` let git run anyway. The commit landed on a tree whose
type boundary was broken, while the BATTERY was green (Bun does not typecheck).

- **CAUGHT BY:** the very next command reading `TSC_EXIT=$?` — one line later.
- **FIXED:** the casts corrected, `tsc exit=0` re-verified, a fix commit recorded with the reason.
- **THE CLASS:** L0 is a gate, and I treated it as a step. A chain that runs the commit even when
  the gate fails is the same defect as an `|| true` on a test.
- **THE RULE THIS SESSION NOW FOLLOWS:** `bunx tsc --noEmit && bun test && git commit` — one `&&`
  chain, so a red type boundary cannot reach a commit.
