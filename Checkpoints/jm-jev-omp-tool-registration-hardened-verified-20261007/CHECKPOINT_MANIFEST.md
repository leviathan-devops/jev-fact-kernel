# CHECKPOINT MANIFEST — jm-jev-omp-tool-registration-hardened-verified-20261007

**Checkpoint token:** jm-jev-omp-tool-registration-hardened-verified-20261007 (hyphens only, no spaces)
**Date:** 2026-10-07
**Project root:** /home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/JevManager
**Scope:** the jev OMP host extension (the tool) + the JevManager source tree it drives.

## THE ARTIFACT (dist/)
The project ships as SOURCE (the manifest: "Dist artifact: (NONE — this project ships as source;
the store is bun:sqlite at runtime)"). For THIS checkpoint the deployable artifact is the OMP
extension:
- `dist/jev-manager-index.js` — sha256 `64d69fa2938e5ec5feefbed2b9eed37dab63d19e67cecb238a52bfede117af4b`
- `dist/jev-manager-index.ts.source` — sha256 `55a0c75e33e6d470b2bda42b4320522bc5d2b3ab52c38f4225cac581a009094d`
- The live install (`~/.omp/agent/extensions/jev-manager/`) carries the SAME bytes (copied at seal).

## THE STATE — VERIFIED
- **Registration:** VERIFIED — the clean-room `/dump` on this session's data: 23 wire tools
  including `jev` top-level (`artifacts/wire-schema-dump-ab-copy.json`); the fresh-boot receipts
  (`registered jev (loadMode=essential)` → `jev already in the active set`); the refreshed live
  session's DIRECT call executed (ledger `report=` ticked 20→21).
- **Guard battery:** VERIFIED — 5/5 named refusals in a live process (visual/runtime-state.png
  carries the verbatim outputs).
- **Audit:** BLOCKED-WITH-ADJUDICATION — 19/19 critical/high adjudicated (15 fixed · 3
  declined-with-evidence · 1 probe-error); 0 confirmed open; the lane retry named
  (artifacts/AUDIT_LEDGER.md carries the table). The gate does NOT claim PASS.
- **Builds:** `bun build` 0 errors on both files, every round.

## THE CONTENTS (counts)
- `src/JevManager-src/` — the project source tree (40 .ts files) + tests etc.
- `src/jev-manager-extension/` — the tool's own source (index.js + index.ts.source; the stale
  .bak excluded).
- `dist/` — the two artifact files + SHAs (above).
- `context_management/` — the 12 canon docs (incl. RUNTIME_SEAT.md).
- Ship docs (6): BUILD_REPORT (2014 lines) · DEBUG_LOG (3575) · FAILURE_LOG (605) ·
  SPEC_VIOLATION_LOG (57) · TESTING_LOG (1484) · THEATRICALITY_LOG (491) + SHIP_DOCS_MANIFEST.
- `DPL1_SPEC.md` — the canonical spec (packages/jm-production-grade/DPL1_SPEC.md, 128 lines).
- `artifacts/` — the wire-schema dump (1.7MB) + AUDIT_LEDGER.md (the 19-finding adjudication).
- `visual/runtime-state.png` — sha256 `8e00f0cec89ab12e10b6e35338c7124409d51f83190bd419cb5638cb2472c2b2`
  (the live runtime outputs: receipts, the direct call, the 5/5 guard battery, the wire schema).

## THE HONEST GAPS
1. The audit's later rounds are LANE-BLOCKED (quota + JSON-parse); the retry condition is named.
   The adjudication ledger stands; the gate is NOT claimed as PASS.
2. The visual artifact is a CANVAS of the live runtime OUTPUT (the tool is a CLI inside a TUI;
   its observable state is text). It quotes the observed outputs verbatim; it is not a screenshot
   of a graphical surface.
3. The three declined audit findings are documented (remit-exceeding); a future reviewer may
   re-raise them — the evidence trail is in artifacts/AUDIT_LEDGER.md.

## THE NEXT WORK
- Re-run the audit when the lane recovers (`provider=poolside-laguna-s`).
- The ship package: `Ship_Packages/jev-omp-tool/` (the independently-deployable tool).
- The stale `.bak` file in the live extension dir may be retired at the operator's discretion.

## THE SEAL
Mode B — NO chattr lock (the operator's default for a checkpoint that may receive follow-ups;
the guardian layer owns lock/unlock). The manifest documents the mutable-snapshot state.
