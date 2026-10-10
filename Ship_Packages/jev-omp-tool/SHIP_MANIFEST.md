# SHIP_MANIFEST — jev-omp-tool v1.0 (2026-10-07)

**Project:** the jev OMP tool (the jev-manager host extension) for the JevManager engine.
**Source path:** ~/.omp/agent/extensions/jev-manager/ (the live install) ·
JevManager/Checkpoints/jm-jev-omp-tool-registration-hardened-verified-20261007/ (the sealed state).
**Version:** 1.0 — registration-hardened + audit-adjudicated.

## ARTIFACT SHA TABLE (the packaged files — the deployable fingerprints)
| Artifact | KB | SHA-256 |
|---|---|---|
| register/jev-manager/index.js | 22.4 | 64d69fa2938e5ec5feefbed2b9eed37dab63d19e67cecb238a52bfede117af4b |
| register/jev-manager/index.ts.source | 30.0 | 55a0c75e33e6d470b2bda42b4320522bc5d2b3ab52c38f4225cac581a009094d |

## SOURCE STATS
- The extension: 2 files (bundle + source), ~1,050 lines combined; 27 schema params; 16 verbs
  (8 keyless · 5 judged · 3 gates); 12 named refusals.
- The engine (the runtime dependency): the JevManager tree — 40 .ts source files (the checkpoint
  carries the full tree).

## TEST-RESULTS SUMMARY (2026-10-07)
- Parse: `bun build` 0 errors both files, every round (7 rounds).
- Runtime: the 5/5 guard battery + the happy path + the wire-schema read + the receipts (verbatim
  in the checkpoint's visual/runtime-state.png and TESTING_LOG RESULT-T9).
- Audit: BLOCKED-WITH-ADJUDICATION — 19/19 critical/high adjudicated (15 fixed · 3
  declined-with-evidence · 1 probe-error); 0 confirmed open (artifacts/AUDIT_LEDGER.md).

## PACKAGE CONTENTS
register/ (the contract + the verifier + the artifact) · DEPLOY.sh · README.md ·
BUILD_REPORT.md · DEBUG_LOG.md · FULL_BUILD_CONTEXT.md · SHIP_MANIFEST.md · MASTER_INDEX.md ·
PACKAGE_AUDIT.md · GIT_HISTORY.md · artifacts/ (the adjudication ledger + the wire-schema dump).
