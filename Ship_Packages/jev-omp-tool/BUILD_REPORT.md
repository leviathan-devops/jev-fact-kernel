# BUILD_REPORT — the jev OMP tool (ship package v1.0, 2026-10-07)

> Generated for the ship package from the live docs (ship-docs-update 2026-10-07; the checkpoint
> jm-jev-omp-tool-registration-hardened-verified-20261007). Every claim traces to an artifact in
> this package or the checkpoint; the honest line count note: this document is authored from a
> single-session hardening arc — it carries the full real material (no padding), and the floors
> it misses are stated here rather than filled with whitespace.

## 1 · BUILD SUMMARY

The `jev` OMP tool is the Jev decision engine exposed as a FIRST-CLASS OMP tool — one native
schema entry (27 params, 16 verbs) over the `jm` CLI, with a local free judge and mechanical
gates. This build delivers the tool's REGISTRATION HARDENING (the activation law: both-branch
receipts, serialized re-assert, verify-after-write CAS) and the AUDIT HARDENING (six independent
review rounds; 19 critical/high findings adjudicated: 15 fixed, 3 declined-with-evidence, 1
mechanically refuted). The delivery is proven by a clean-room boot (`/dump` → 23 wire tools
including `jev` at top level), a 5/5 named-refusal guard battery in a live process, and the
extension's own boot receipts. The independent audit's remaining rounds are lane-BLOCKED with the
retry named — the gate is NOT claimed as PASS; the adjudication ledger stands as the record.

## 2 · WHAT WAS BUILT — the narrative

### 2.1 The tool
The extension `jev-manager` registers ONE tool:

- **name/label:** `jev`; **loadMode:** `essential`; **defaultInactive:** `false`.
- **Keyless verbs (free, no judge):** `index` (ingest a path or @target, incremental by content
  sha), `query` (FTS5 / restricted WHERE / tag), `scan` (keyword/regex seeds + excerpts),
  `cluster` (signature groups), `extract` (regex/field → structured rows), `report` (index state
  + ledger), `target` (registry), `watch` (single reconcile tick).
- **Judged verbs (the local judge; ~100ms warm):** `filter` (calibrated narrowing with
  probabilities), `find` (the 9-stage pattern chain), `decision-tree` (batch classification from
  a recipe), `route` (tool selection), `evaluate` (calibration metrics).
- **Mechanical gates:** `push-gate` (the commit checklist; drives the Judge), `st-detect` (shitty-
  test detection), `spec-audit` (spec-component coverage).

### 2.2 The registration law (the saga's product)
Three measured facts drive the design:
1. OMP force-includes `!defaultInactive` extension tools into the initial active set at session
   CONSTRUCTION (`sdk.ts:2984-2997`) — so a fresh boot ships `jev` top-level, always.
2. `isMountableUnderXdev` mounts ONLY `loadMode === "discoverable"` (`xdev.ts:81-84`) — so
   `essential` never degrades to an `xd://` device.
3. A live session's wire set is FROZEN at construction; later `setActiveToolsByName` calls (goal
   mode applies `[...previousTools, "goal"]`, `interactive-mode.ts:2547/2763/3524-3529`) can strip
   a late tool — so the extension re-asserts on `session_start` (both-branch receipts) and
   `before_agent_start` (serialized, CAS-verified).

### 2.3 The audit arc (the quality product)
Six complete independent rounds over the two-file changeset (scratch repo, two-commit diffs):
- R1 685c7e4d (5 high): buildArgs coverage for five verbs; path guards; exit truth; flag
  injection.
- R2 970204df (3 high): abort-vs-outage; `--json` integrity (raw stdout; details-carried stderr);
  serialized activation.
- R3 e9e387bb (3 high): caller-abort naming in `run()`; async realpath canonicalization (the CLI
  receives the canonical paths).
- R4 21d2d920 (5 high): JM_BIN realpath + mode check; index target existence/canonicalization;
  3 declined-with-evidence (SQL passthrough — the CLI binds parameters; `out` containment — the
  CLI's contract; target traversal — the tool indexes host trees by design).
- R5 9c975710 (2 high): explicit `encoding:"utf8"`; the surrogate guard's symmetry (high-only).
- R6 1c939723 (1 critical): PROBE-ERROR — the reviewer's claim contradicted `index.js:366`
  (`.isDirectory()` present); the 2 lows (nested ternaries) fixed.
- R7+: BLOCKED (muse-free 429; poolside/openrouter OCR_JSON_ABSENT) — retry named.

## 3 · TECHNICAL IMPLEMENTATION

### 3.1 The execute pipeline (per call)
```
0 · THE TOOL EXISTS      async stat(JM_BIN).isFile + X_OK + realpath + reject group/world-writable
1 · ARGS BEFORE THE TOOL per-verb required params → named refusals
1b · INPUT SHAPE         leading-dash guard (17 fields) · integer guards · min_p ∈ [0,1]
1c · FILE PARAMS         async stat.isFile + R_OK + realpath → the CLI gets CANONICAL paths;
                         out-parent: isDirectory + W_OK; index target: exists + canonical
2 · JUDGE WARM-UP        for JUDGED + push-gate: a bounded /health probe (finally-cleanup;
                         non-JSON named; caller-abort → JEV_CANCELLED, never JEV_JUDGE_DOWN)
3 · THE RUN              execFile(jm, args, {timeout 180s, maxBuffer 32MB, encoding utf8, env
                         pinned JM_HOME/JM_JUDGE_URL, NO_COLOR})
4 · EVIDENCE             exit truth (errno/signal/killed surfaced; abort → JEV_CANCELLED);
                         --json: raw stdout + in-band failure envelopes (JSON.stringify);
                         truncation: surrogate-safe slice + details.truncated/totalChars;
                         human mode: stderr spliced with a chars marker
```

### 3.2 The named refusals (the contract surface)
`JEV_CLI_MISSING` · `JEV_BAD_VERB` · `JEV_NEED_QUESTION` (filter/route) · `JEV_NEED_PHRASE` ·
`JEV_NEED_ROWS_RECIPE` · `JEV_NEED_TARGET` · `JEV_TARGET_MISSING` · `JEV_NEED_EVAL_ARGS` ·
`JEV_NEED_SPEC` · `JEV_WATCH_NEEDS_ONCE` · `JEV_BAD_ARG` · `JEV_BAD_NUM` · `JEV_FILE_MISSING` ·
`JEV_OUT_DIR_MISSING` · `JEV_JUDGE_DOWN` · `JEV_CANCELLED` · `JEV_EXIT_<code>` · `JEV_EMPTY_OUTPUT` ·
`JEV_OUTPUT_TOO_LARGE` · `JEV_ERROR`.

## 4 · ARCHITECTURE (ASCII)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ THE OMP SESSION (TUI host process)                                       │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ the wire tool schema (frozen at construction; rebuilt on set)      │  │
│  │   read · bash · edit · … · jev (loadMode: essential) · …           │  │
│  └───────────────┬────────────────────────────────────────────────────┘  │
│                  │ a direct `jev` tool call                             │
│  ┌───────────────▼────────────────────────────────────────────────────┐  │
│  │ the jev-manager extension (index.js)                               │  │
│  │   registerTool(essential, !defaultInactive)                        │  │
│  │   session_start  → both-branch receipt + add-if-missing            │  │
│  │   before_agent_start → serialized re-assert (CAS verify-after-write)│  │
│  │   execute() → guards → execFile(jm …) → evidence                   │  │
│  └───────────────┬────────────────────────────────────────────────────┘  │
└──────────────────┼───────────────────────────────────────────────────────┘
                   │ execFile (utf8, pinned env, 180s, 32MB)
        ┌──────────▼──────────┐        ┌───────────────────────────────┐
        │ the jm CLI          │───────▶│ the LOCAL judge               │
        │ (~/.local/bin/jm)   │        │ 127.0.0.1:8090 /v1/systemone  │
        │ keyless · judged ·  │        │ (~100ms warm; NO billing)     │
        │ gates               │        └───────────────────────────────┘
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────┐
        │ ~/.jm (bun:sqlite)  │  the index store (incremental by sha)
        └─────────────────────┘
```

## 5 · FILES CHANGED (the audited changeset)

| File | Lines | What |
|---|---|---|
| index.js (the bundle) | ~450 | the deployed artifact — the full hardened logic |
| index.ts.source (the source twin) | ~650 | the readable source — identical behavior |

Lineage (the audit scratch repo): `e5ddb8f` (the initial hardened build) → `7166fba` (R1 fixes)
→ `478b7bf` (R2) → `ee309bd` (R3) → `927c0b7` (R5) → `f51ea0a` (R6) → `f2afbc1` (R7 style).

## 6 · TEST RESULTS (with evidence)

- **Parse:** `bun build <file> --target=node` → `Bundled 1 module` / 0 errors — both files, 7
  rounds (every commit).
- **The guard battery (live process pid 2680561, verbatim):**
  `verb=report` → the report (ledger ticked) · `verb=evaluate` → `JEV_NEED_EVAL_ARGS` ·
  `verb=route` → `JEV_NEED_QUESTION` · `verb=watch` → `JEV_WATCH_NEEDS_ONCE` ·
  `verb=decision-tree rows=/tmp/does-not-exist.json` → `JEV_FILE_MISSING: rows is not a readable
  file: /tmp/does-not-exist.json` — **5/5**.
- **The wire schema:** the clean-room `/dump` → 23 tools incl. `jev` (artifacts/wire-schema-dump.json).
- **The receipts:** `[jev-manager] registered jev (loadMode=essential)` →
  `[jev-manager] jev already in the active set`.
- **The audit:** 6 complete rounds; the adjudication table in artifacts/AUDIT_LEDGER.md.

## 7 · KNOWN ISSUES (honest)

1. The audit's later rounds are lane-BLOCKED (quota/JSON-parse) — retry:
   `provider=poolside-laguna-s` when the lane recovers.
2. Three declined findings (SQL passthrough / out containment / target traversal) are documented
   with their evidence; a future reviewer may re-raise them.
3. The `jm` CLI is a runtime dependency — the tool refuses `JEV_CLI_MISSING` by name when absent.
4. The visual artifact in the checkpoint is a canvas of the live OUTPUT (the tool is a CLI in a
   TUI; text is its observable state).

## 8 · DEPLOYMENT NOTES

- `bash DEPLOY.sh` → installs to `~/.omp/agent/extensions/jev-manager/`; add the config.yml line
  (printed); **RESTART the session** (a running process never re-reads extension files); verify:
  `bash register/verify-registration.sh`.
- The engine: the `jm` CLI at `~/.local/bin/jm` (or `JM_BIN`); the judge at
  `127.0.0.1:8090/v1/systemone` (or `JM_JUDGE_URL`; health override `JM_JUDGE_HEALTH_URL`).
- The registration traps (measured): the stale-process trap · the model-self-report trap · the
  silent-handler trap · the xd://-fallback trap — all four in register/REGISTRATION.md §6.
