# THE JEV OMP TOOL — THE AUDIT ADJUDICATION LEDGER (2026-10-07)

The independent audit arc over the extension changeset (two files, scratch repo
`/tmp/jev-audit-repo`). Six COMPLETE rounds + lane-blocked retries. 19 critical/high findings —
EVERY one adjudicated: 15 FIXED · 3 DECLINED-with-evidence · 1 PROBE-ERROR · 0 confirmed open.

| # | Round/session | Finding (short) | Severity | Adjudication | Evidence |
|---|---|---|---|---|---|
| 1 | R1 685c7e4d | buildArgs drops params for watch/evaluate/gates | high | FIXED | buildArgs completed; guards `JEV_NEED_EVAL_ARGS` etc. live (RESULT-T9) |
| 2 | R1 | unvalidated file paths to execFile | high | FIXED | async stat+R_OK+realpath guards |
| 3 | R1 | timeout/abort masked as exit 0 | high | FIXED | run() exit truth; errno/signal/killed surfaced |
| 4 | R1 | positional flag injection | high | FIXED | leading-dash guard on 17 fields |
| 5 | R1 | (5th high) buildArgs coverage (source twin) | high | FIXED | same fix, both files |
| 6 | R2 970204df | caller abort → judge outage | high | FIXED | JEV_CANCELLED path |
| 7 | R2 | --json corrupted by stderr splice | high | FIXED | raw-stdout-only + details.stderr |
| 8 | R2 | (twin) json truncation marker | high | FIXED | details truncated/totalChars; envelopes |
| 9 | R3 e9e387bb | caller abort during run() → JEV_EXIT_* | high | FIXED | signal?.aborted check after run() |
| 10 | R3 | TOCTOU/symlink gap | high | FIXED | realpath canonicalization feeds the CLI |
| 11 | R3 | (twin) abort naming (source) | high | FIXED | same fix, both files |
| 12 | R4 21d2d920 | JM_BIN untrusted (env path) | high | FIXED | realpath + reject group/world-writable |
| 13 | R4 | target/path bypass the path hardening | high | FIXED (existence+canonicalization) / DECLINED (traversal containment) | the tool's purpose is indexing host trees |
| 14 | R4 | raw SQL/FTS passthrough | high | DECLINED with evidence | the CLI binds parameters: query.ts `docs_fts MATCH ?`, `LIMIT ?` "bound, never interpolated", tags `name = ? AND value = ?`; --where goes through the restricted-predicate parser |
| 15 | R4 | out containment (restrict to cwd) | high | DECLINED with evidence | the tool's contract is the operator's CLI; the wrapper adds shape guards, not a sandbox |
| 16 | R4 | (twin) SQL passthrough (source) | high | DECLINED with evidence | same evidence |
| 17 | R5 9c975710 | execFile lacks encoding:"utf8" | high | FIXED | encoding: "utf8" set |
| 18 | R5 | surrogate-guard asymmetry | high | FIXED | high-only guard (a trailing LOW = pair complete) |
| 19 | R6 1c939723 | "out-parent uses .isFile()" | critical | PROBE-ERROR | index.js:366 reads `(await stat(parent)).isDirectory()` — the reviewer conflated file-param .isFile() (353) with the parent check |

## THE RUNTIME PROOF SET (independent of the audit)
`verb=report` executed (ledger ticked) · `JEV_NEED_EVAL_ARGS` · `JEV_NEED_QUESTION` ·
`JEV_WATCH_NEEDS_ONCE` · `JEV_FILE_MISSING` — 5/5 mechanical passes in a live OMP process (pid 2680561).

## THE LANE STATE (the retry condition)
muse-free: QUOTA EXHAUSTED (429 FreeUsageLimitError). poolside-laguna-s: 2 complete rounds, then
OCR_JSON_ABSENT ×2. openrouter-laguna-s: OCR_JSON_ABSENT. Retry: rerun the scan with
`provider=poolside-laguna-s` when the lane recovers; sessions resumable:
1c939723 (last complete) · 9c975710 · 21d2d920 · e9e387bb · 970204df · 685c7e4d.
