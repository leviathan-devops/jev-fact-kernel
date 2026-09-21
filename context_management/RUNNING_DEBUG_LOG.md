# RUNNING_DEBUG_LOG — JM build

Append-only. Every bug: symptom → root cause → fix → verification → lesson.
Updated at the MOMENT of the work (fresh-capture rule).

## [2026-09-21] W0 — D-001 glob depth bug: index returned files=0
- SYMPTOM: `jm index @shadow --include '*.json'` → files=0 changed=0, exit 0 (a silent zero)
- ROOT CAUSE: `globToRe('*.json')` compiled to `^[^/]*\.json$`; the walk yields
  repo-relative paths (`session_diff/ses_x.json`) and `[^/]*` cannot cross `/`,
  so no nested file ever matched the include filter.
- FIX: `matchesAny` now tests both the full rel path AND its basename, so a
  depth-insensitive glob matches at any depth (src/verbs/index.ts).
- VERIFICATION: re-probe → `JM_INDEX_OK files=200 changed=200`; full run → `files=11831`.
- LESSON: an empty result plus exit 0 is the dangerous class — the walk succeeded,
  the filter ate everything, and nothing complained. Counts must be asserted, not trusted.

## [2026-09-21] W0 — D-002 --json stdout pollution
- SYMPTOM: `jm query … --json | python3 -m json.tool` → JSONDecodeError at char 0.
- ROOT CAUSE: `withLedger` printed the `cost=$…` line to stdout before the JSON payload;
  machine consumers parsed "cost=" as JSON.
- FIX: under `--json` the cost line goes to stderr; stdout stays pure JSON (src/ledger.ts).
- VERIFICATION: `jm query shadow --where "size>2000" --limit 10000 --json` piped clean →
  `rows= 1182`; `--fts "theatrical"` → `rows= 341`.
- LESSON: the human line and the machine payload want different streams; the contract is
  "stdout = the declared structure, stderr = the chatter".

## [2026-09-21] W0 — ENV-001 STTGF inline-exec block (host enforcement, NOT a JM bug)
- SYMPTOM: `bun -e '…'` → `[STTGF BLOCK] INLINE_EXEC — Inline exec is smoke test. Use container.`
- ROOT CAUSE: the host's behavior firewall forbids inline exec as a smoke-test substitute.
- DISPOSITION: not a defect — the enforcement working. All probes now run as real
  scripts (`bun run <file>` / heredoc python), never `-e` one-liners.
- LESSON: on this host, inline exec is unavailable by design; build the check as a file.
