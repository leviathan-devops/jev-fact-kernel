# CURRENT_STATE — JM (as of 2026-09-21, waves W0–W7)

## The architecture as it IS
```
 CLI (src/cli.ts)  ── verbs ──┬─ index/query            (deterministic, keyless)
                              ├─ filter/find           (FTS narrow -> Jev judge)
                              ├─ decision-tree         (rows x recipe -> bands)
                              ├─ target/serve/calibrate/report
                              └─ job runtime (queue + resume + pools + budget)
 judge (src/judge/*) ── key -> transport -> cache -> policy -> client
 store (src/store/*) ── sqlite + FTS5, one file per index, WAL
 ledger (src/ledger.ts) ── append-only jsonl, one row per invocation
```

## Per-module status
| module | state | anchor |
|--------|-------|--------|
| store schema + FTS5 | WORKING (live) | `src/store/schema.ts:1-69`, `src/store/db.ts:1-48` |
| incremental index | WORKING (11,831 files, 2.5% re-run) | `src/verbs/index.ts:indexTarget/indexFile` |
| query (where/fts/tag) | WORKING (1,182 / 341 rows live) | `src/verbs/query.ts:queryIndex` |
| ledger + cost line | WORKING (9 runs recorded) | `src/ledger.ts:withLedger` |
| job queue + resume | WORKING (SIGKILL -> dup=0) | `src/job/queue.ts:Queue.sweep`, `src/job/run.ts` |
| pools + budget | WORKING (exact stop, exit 3) | `src/pools/pool.ts`, `src/pools/budget.ts:roomLeft` |
| judge client + cache | WORKING (live API, 0-call replay) | `src/judge/client.ts:ask` |
| decision-tree | WORKING (live 0.97/0.08/0.90) | `src/verbs/decision-tree.ts` |
| find chain | WORKING (live 44->30->1->1) | `src/verbs/find.ts` |
| HTTP surface | WORKING (`/decide` live) | `src/serve.ts` |
| calibrate | PARTIAL (bands+truth+row; no live threshold move — n=3) | `src/calibrate.ts` |
| sqlite/jsonl adapters | NOT BUILT | — |
| fire gate (W8) | NOT STARTED (F1/F6 owed) | design only |

## Proven machinery (with the run that proved it)
- incremental indexing (C1/C2) · crash-resume dup=0 (C13) · exact budget stop (C10) ·
  live judge routing (C6/C7) · cache determinism sha-identical (C7) · fail-closed exit 2 (C12) ·
  HTTP decide + replay (C14 partial) · find patterns with exemplars (C5) ·
  adversarial battery 18/0 (C19 partial).

## Known-open
- F1/F6 rulings; the audit lane; the doc floors; the second-operator drill; `@ocdb` unqueried.
