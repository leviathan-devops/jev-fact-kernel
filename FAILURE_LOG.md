# FAILURE_LOG — JM derailment ledger (append-only)

### F-01 — The silent zero (index ate the whole corpus) (2026-09-21)
- **What happened:** `jm index @shadow --include '*.json'` returned `files=0` with exit 0.
- **Found:** by running the probe and asserting counts (not by reading).
- **Root cause:** `[^/]*` cannot cross `/`; every nested path failed the include filter.
- **Impact:** the primary corpus appeared empty while the tool reported success.
- **Disposition:** FIXED+PROVEN (EN-001; full run `files=11831`).

### F-02 — The invisible byte (a security control silently dead) (2026-09-21)
- **What happened:** secret redaction did not fire on `sk-` shaped strings.
- **Found:** the adversarial sweep (P5), before any ship claim.
- **Root cause:** a backspace byte (0x08) in the regex, produced by an escape through a non-raw string layer.
- **Impact:** secrets could have entered the canonical state and the cache fingerprint pre-image.
- **Disposition:** FIXED+PROVEN (EN-007; control-char sweep 1->0; `test_adv_redaction` green).

### F-03 — The corpus that was the wrong corpus (2026-09-21)
- **What happened:** `find "theatrical claim"` over @shadow returned `kept=0` at p>=0.8.
- **Found:** by operating live and reading the excerpts (they are diff blobs, many literally `[]`).
- **Root cause:** not a defect — target selection: `session_diff` carries file diffs, not claim text.
- **Impact:** a naive reading would have called the chain broken; the truth is the corpus choice.
- **Disposition:** NOT-A-BUG (recorded; the same chain found the real document over @reports at p=0.80).

### F-04 — The plan named `WAVE PLAN` twice; the validator's head window is strict (2026-09-21)
- **What happened:** a draft pin failed G2 until the build-package reference sat inside WAVES/LAWS/PROOF.
- **Root cause:** the validator scans only the three slots for the package reference.
- **Impact:** one emit iteration.
- **Disposition:** FIXED (pin re-emitted; PASS 122 lines).

### F-05 — The audit gate FAILED on first run (30 high findings) (2026-09-21)
- **What happened:** `ocr review` over the build diff returned 174 comments; 91 canonical
  (30 high) — real defects: `filter`/`find` swallowed `JEV_NO_KEY` into an empty success (an L4
  violation), tombstones stayed searchable, `/decide` bound 0.0.0.0 unauthenticated, `claim(NaN)`
  became `LIMIT -1`, `runPool(NaN)` created zero lanes, budget caps accepted NaN, the cache
  fingerprint ignored the question set, and a per-file index error aborted the whole batch.
- **Found:** the P6 audit gate (the first time it ran).
- **Root cause (one mechanism):** the happy path was built and tested; the BOUNDARY arguments
  (NaN, negative, missing key, deleted files, hostile concurrency) were not.
- **Impact:** the gate blocks every ship-ready claim — correctly.
- **Disposition:** FIXED (the post-audit fix pass; battery 18/0, tsc 0) — **RE-AUDIT OWED**;
  the gate remains FAIL until it passes.

### F-06 — The audit scanned the checkpoint copies too (2026-09-21)
- **What happened:** 83 of the 174 comments were duplicates from `Checkpoints/**/src`.
- **Root cause:** the checkpoint snapshot is committed, so it appears in the diff.
- **Impact:** inflated the finding count ~2x (canonical 91, not 174).
- **Disposition:** FIXED (canonical-only analysis; the checkpoint is excluded from test discovery
  via `bunfig.toml [test] root = "tests"`). Future audits should diff the checkpoint out.

### F-07 — The re-audit lane failed (BLOCKED, not passed) (2026-09-21)
- **What happened:** the second `ocr review` run returned `status: failed` — 53/53 items failed,
  76/76 requests failed after 380 retries, 0 tokens, 2m49s. The provider lane (muse-free) is down.
- **Found:** by running it — the failure is loud in the artifact, not silent.
- **Root cause:** the provider lane, not the code under review (0 tokens means no review happened).
- **Impact:** the gate cannot be re-verified this session; the first run's FAIL remains authoritative.
- **Disposition:** **BLOCKED** with the retry condition: re-run when a lane returns non-zero tokens,
  or switch lanes (zen-free adapter :4098, or `--provider poolside --model laguna-s-2.1:high`).
  The blocked artifact is preserved at `artifacts/audit-2026-09-21-reaudit-BLOCKED.json`.

### F-08 — The re-audit ran on a working lane and found 6 new highs (2026-09-22)
- **What happened:** after the muse-free lane failed at 0 tokens, the run was re-executed on
  `poolside-laguna-s` (10,617 tokens on the lane test first): status `partial`, 45 comments,
  37 canonical (6 high / 18 medium / 13 low), 46m24s.
- **Found:** the lane works; the high set is SMALLER (30 -> 6) but non-empty.
- **Root cause classes:** a ledger that could mask a real error (H1); an unvalidated spend (H2);
  an un-awaited registry write (H3); Date/Map collapse in redaction (H4); an interpolated LIMIT
  (H5); a tombstone that never reactivates (H6).
- **Impact:** the gate stays FAIL — correctly: the fixes are claims until a THIRD audit passes.
- **Disposition:** FIXED in the second fix pass (all six + the medium frontier items); pinned in
  `tests/regression.test.ts`; battery 28/0.

### F-09 — The second re-audit found 1 high (the stale-ack race) (2026-09-22)
- **What happened:** the third audit run (second working-lane run) returned 131 comments, 52
  canonical (1 high / 24 medium / 27 low) in 1h37m. The 1 high: `complete()`/`fail()` without
  a state guard let a stale process overwrite a live process's re-claimed row.
- **Found:** the machine review, not the battery (the race needs two processes).
- **Root cause:** the ack wrote unconditionally on `id` alone; the sweep legitimately moves rows
  between claim and ack, so the stale ack landed on a row it no longer owned.
- **Impact:** double-processing with possible data loss under process overlap — a real race.
- **Disposition:** FIXED (conditional ack `AND state='running'` + a refused-ack error path) and
  PINNED (`test_queue_stale_ack_refused`); battery 29/0. The gate stays FAIL until a fourth audit.
