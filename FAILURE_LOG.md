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
