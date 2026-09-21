# COMPACTION_SURVIVAL — JM (overwrite; state-at-a-glance + the operating laws)

## STATE AT A GLANCE (2026-09-21)
- Repo `Shared_Workspace/JevManager`, branch `master`, build commits `715e5e8` → `a39afe8`.
- Battery **18/0**, tsc **0**. Index `@shadow` = 11,831 files (2.5% re-run). Queue resume dup=0.
- Live judge verified (`jev-1.13.0`), cache replay 0 calls, HTTP `/decide` live, find chain live.
- **Not done:** W2 adapters (sqlite/jsonl), W8 fire gate, the audit lane, the doc floors.

## THE OPERATING LAWS (carry these)
1. Code narrows, Jev judges, code routes. Never send a corpus to the judge.
2. Bounded state always: 8MB hash cap, 256KB text cap, 5k tokens per firing (W8).
3. Ledger or it did not happen — one row per invocation, errors included.
4. Cache-first: `sha256(model ⊕ schema ⊕ canonical(redact(state)))`; repeats are free.
5. Fail polarity per surface: decision verbs FAIL CLOSED (exit 2); index/scan are keyless.
6. Budgets are hard stops with the cap NAMED (`roomLeft()` before the call).
7. Targets are pointers; indexes live in `~/.jm/`; never copy a corpus.
8. The artifact is the decision — never embed run metadata (replay must be byte-identical).
9. Secrets: env or owner-only file; fingerprints only; redact BEFORE hashing.
10. On this host: no single-expression inline execution (the STTGF gate) — probes are files.

## RESUME POINTERS
`packages/jm/` (spec, waves, goals, MASTER_PROMPT) · `context_management/` (this set + the 2 logs +
RUNTIME_SEAT.md) · `DEBUG_LOG.md`/`TESTING_LOG.md`/`BUILD_REPORT.md`/`FAILURE_LOG.md`/`THEATRICALITY_LOG.md` ·
`Checkpoints/` · the ledger at `~/.jm/ledger.jsonl`.
