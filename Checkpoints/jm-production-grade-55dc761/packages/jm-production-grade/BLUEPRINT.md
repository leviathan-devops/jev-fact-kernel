# BLUEPRINT — the JevManager production-grade architecture

## THE MACRO PATTERN
One decision engine, three surfaces over one store: the CLI (`jm`), the MCP server
(`jev-manager`), and the HTTP surface (`jm serve`). All three share `src/judge/*` (the
transport seam + the cache), `src/store/*` (the index + meta), and `src/verbs/*` (the verbs).
The batch path (`askMany`) is the ONE judge entry every judged verb calls.

## SHARED MACHINERY (interfaces)
- `Judge.ask(state, questions, schema)` — ONE item. `Judge.askManyBatch(items, questions, schema)` — N.
- `callSystemOne(key, body, timeoutMs)` — the ONLY network seam; `JM_MOCK_DIR` + `JM_JUDGE_URL`
  make the boundary testable; the outbound cap refuses BEFORE the network.
- `Budget{calls,usd}` — claim() before an await, settle(cost,cached) after; a REFUND frees a slot.
- `reconcileRoots(db, entries, rebuild)` — one index, one root-set, recorded per NAMESPACE.
- `purgeIndex(db)` — clears the row spaces; the meta record belongs to the caller.

## DATA FLOWS
```
index:  walk -> (size,mtime) fast-path -> sha256 -> text -> files+docs+docs_fts
        (batched every 500: ixBatch) -> the tombstone sweep in its own sweepTx
query:  FTS5 MATCH (bm25 rank) | a whitelisted WHERE predicate | a tag join
judge:  candidates -> excerptAround(seed-aware) -> askManyBatch(chunks of 200)
        -> per-item cache identity -> the chunk cost SHARED across its asked items
decide: rows -> the recipe's questions per row -> act/escalate/noop by the policy ladder
        -> the decisions table (later_truth in context_ref)
gate:   staged content -> decision-tree -> act>0 -> exit 1 (the commit is refused)
```

## PER-COMPONENT (anchors)
| component | file:line | contract |
|---|---|---|
| the batch entry | `src/judge/client.ts:44` | `askManyBatch` — the usage check FIRST, fatal at both polarities |
| the transport seam | `src/judge/transport.ts:37` | the mock is FAITHFUL (one answer per question, keyed to the request) |
| the claim loop | `src/verbs/decision-tree.ts:150` | claim min(200, room) per chunk; a mid-chunk failure is not final |
| the walk batching | `src/verbs/index.ts:218` | `ixBatch` every 500 — the 7 GB WAL defect |
| the root guard | `src/store/db.ts:150` | `reconcileRoots` — the duplication defect |
| the fd release | `src/adapters/jsonl.ts:41` | awaits 'close' — the 20% flake |

## FAILURE MODES (what breaks and how it announces itself)
A missing index -> `JM_INDEX_MISSING` (a read verb never creates). A changed root-set ->
`JM_INDEX_ROOTS_CHANGED`. A non-numeric value on a numeric column -> `JM_WHERE_VALUE`. A
usage-less response -> `JM_JUDGE_USAGE_MISSING` (fatal, both polarities). A short response ->
`JM_JUDGE_ANSWER_COUNT`. An unreadable answer -> `JM_JUDGE_NO_SIGNAL` under `fail: closed`.
An exhausted rate -> `JM_JUDGE_RATE_EXHAUSTED`. An oversized body -> `JM_JUDGE_PAYLOAD_TOO_LARGE`.

## REPLICATION RECIPE (a fresh agent)
1. `jm index <mount> --name m` (keyless, incremental). 2. `jm scan/cluster/extract` (keyless narrowing).
3. `jm filter/find/decision-tree` (judged, batched, `requests` printed). 4. `jm report` (the store's
own counts). 5. the pre-commit gate. 6. `scripts-host-suite.sh` (the deployed surface).
