# CURRENT_STATE — JM (2026-09-21, waves W0–W7 + the audit fix pass)

**TREE SHA: `e5b7942f68b8d9d652993580f245dfbb` (git bb3930f)** - every canon doc that carries this line carries THIS sha; a disagreement means one is stale. Re-derive with ./scripts-seal.sh
The current truth of the system: what exists, what works, what does not. Overwrite doc — it
describes NOW. (Anchors are `file:line`; every claim has a run behind it in EVIDENCE_STATE.)

## 1. THE ARCHITECTURE AS IT IS

```
 CLI (src/cli.ts:1-246)                    verbs, --json, cost line, exit codes
   ├─ index/query        deterministic (no key)      src/verbs/index.ts:1-145, query.ts:1-51
   ├─ filter/find        FTS narrow -> Jev judge     src/verbs/filter.ts:1-46, find.ts:1-114
   ├─ decision-tree      rows x recipe -> bands      src/verbs/decision-tree.ts:1-93
   ├─ serve              HTTP :7777 loopback         src/serve.ts:1-56
   └─ calibrate/report   ledger + thresholds         src/calibrate.ts:1-46, ledger.ts:1-57
 judge (src/judge/*)     key -> transport -> cache -> policy -> client
   ├─ key.ts:1-26        env -> ~/.config/typesafe/key, fingerprint only
   ├─ transport.ts:1-38  the ONE network seam + the canned-response mode
   ├─ cache.ts:1-41      redact -> canonical -> sha256; the cache table
   ├─ policy.ts:1-23     thresholds; routeOf bands (act/escalate/noop)
   └─ client.ts:1-48     ask() = cache-first; cost at write time; fail-closed
 job  (src/job/*)        store.ts:1-37 · queue.ts:1-62 · run.ts:1-56 · indexJob.ts:1-40
 pools(src/pools/*)      pool.ts:1-26 (bounded concurrency) · budget.ts:1-37 (hard caps)
 store(src/store/*)      schema.ts:1-69 (DDL, FTS5) · db.ts:1-48 (open + target resolve)
```

## 2. PER-MODULE STATUS (with the live evidence)

| module | state | evidence | anchor |
|--------|-------|----------|--------|
| store + FTS5 | WORKING | tables created; live reads/writes | `src/store/schema.ts:1-69` |
| incremental index | WORKING | 11,831 files in 4.0s; re-run 60ms (2.5%) | `src/verbs/index.ts:indexTarget` |
| per-file guard | WORKING (post-audit) | one bad file no longer aborts the batch | `src/verbs/index.ts:indexFile` |
| query (where/fts/tag) | WORKING | `size>2000` -> 1182; `theatrical` -> 341 | `src/verbs/query.ts:queryIndex` |
| tombstones | PARTIAL | query filters `state != 'gone'`; docs/FTS cleanup owed | `src/verbs/query.ts:49` |
| ledger + cost line | WORKING | 32 runs recorded; cost on stdout (stderr under --json) | `src/ledger.ts:withLedger` |
| job queue + resume | WORKING | SIGKILL -> running:8 -> resume dup=0 | `src/job/queue.ts:Queue.sweep` |
| pools | WORKING | N=4 concurrent HTTP all answered | `src/pools/pool.ts:runPool` |
| budget | WORKING | exact stop at cap; exit 3; NaN refused | `src/pools/budget.ts:roomLeft` |
| judge client + cache | WORKING | live act 0.97/0.08/0.90; replay 0 calls | `src/judge/client.ts:ask` |
| fingerprint | WORKING (post-audit) | now includes the questions hash | `src/judge/client.ts` |
| decision-tree | WORKING | 100-row batches; deterministic artifacts | `src/verbs/decision-tree.ts` |
| find chain | WORKING | 44 -> 30 -> 1 -> 1 with an exemplar | `src/verbs/find.ts` |
| HTTP surface | WORKING (loopback) | /decide live; bearer optional | `src/serve.ts` |
| calibrate | PARTIAL | bands + truth + the calibration row; no move earned (n=3) | `src/calibrate.ts` |
| sqlite/jsonl adapters | NOT BUILT | — | — |
| route/evaluate verbs | NOT BUILT | — | — |
| MCP surface / watch daemon | NOT BUILT | — | — |
| fire gate (W8) | NOT STARTED | F1/F6 rulings owed | design only |

## 3. WHAT IS PROVEN (the capability list, each with its run)

1. **Index 11,831 files in 4.0s, re-run in 60ms** — the incremental fast-path works at scale.
2. **Survive a SIGKILL with zero duplicates** — crash-first rows + the sweep + the fingerprint UNIQUE.
3. **Judge live with correct routing** — `act 0.97` on a downed database, `noop 0.08` on a typo.
4. **Replay byte-identically from cache** — sha `a3bc30351f68dad8` on both runs; 0 calls.
5. **Stop exactly at a budget** — `done=100` with the cap named; the remainder stays resumable.
6. **Fail closed** — no key -> `JEV_NO_KEY`, exit 2, nothing written.
7. **Serve decisions over HTTP** — `/decide` live; replay cached; loopback-bound.
8. **Find patterns with exemplars** — the 9-stage chain, live, on a real corpus.
9. **Resist injection** — attack `act 0.99` vs benign `noop 0.01`.
10. **Keep PII out of the cache** — fingerprints only; redaction before hashing.

## 4. WHAT IS KNOWN-OPEN

- **The audit gate is FAIL** (0 critical, 30 high) — fixes applied; the re-audit is the proof owed.
- The 49 medium audit findings (five families; see DEBUG_LOG's THE FRONTIER).
- W2 adapters; W8; the MCP/daemon surfaces; the second-operator drill; the escalation band's live gap;
  `@ocws` (219G) never walked.

## 5. THE OPERATING CONSTANTS (current)

```
 hash cap         8 MB per file (larger files recorded truncated, never hashed)
 text cap         256 KB into FTS5 (larger text: kind recorded, text skipped)
 pool default     6 (judge verbs), 8 (queued index)
 budget           calls and usd, both hard; validated at construction
 bands            act 0.8 / flag 0.5 (recipe-overridable), inclusive boundaries
 index location   ~/.jm/index/<name>.sqlite      jobs ~/.jm/jobs/<id>/
 ledger           ~/.jm/ledger.jsonl             cache  the `cache` table per index
```

## 6. THE NEXT READER'S FIRST FIVE MINUTES

```
 cd Shared_Workspace/JevManager
 bun test && bunx tsc --noEmit      # 24/0 and exit 0
 bun src/cli.ts report              # the ledger's run counts
 bun src/cli.ts query shadow --limit 3
 cat context_management/NEXT_STEPS.md
```

## 7. THE CLI SURFACE (every verb, its flags, an example)

```
 jm index <path|@target> [--name N] [--include a,b] [--exclude a,b] [--limit N]
                         [--queued] [--job ID] [--concurrency N] [--budget-calls N] [--json]
   e.g.  jm index @shadow --name shadow --include '*.json,*.jsonl,*.md'
   e.g.  jm index @shadow --queued --job shadow-kill --budget-calls 100

 jm query <index|@target> [--where "size>2000"] [--fts "phrase"] [--tag k=v]
                          [--limit N] [--json]
   e.g.  jm query shadow --fts "theatrical" --limit 10000 --json

 jm filter <index> --question "…" [--fts X] [--where P] [--min-p 0.8]
                                   [--limit N] [--budget-calls N] [--json]
   e.g.  jm filter shadow --fts theatrical --question "Is this a real defect?"

 jm find "<phrase>" --in <index> [--common N] [--structure md|json] [--out F]
                     [--min-p 0.8] [--limit N] [--budget-calls N] [--json]

 jm decision-tree --rows F --recipe F [--context F] [--criteria F] [--out F]
                  [--escalation F] [--name IDX] [--concurrency N] [--budget-calls N] [--json]

 jm target add <name> <kind> <root>   |   jm target ls
 jm serve [--port 7777] [--name IDX]      (loopback; JM_SERVE_TOKEN optional)
 jm calibrate [--name IDX] [--truth ID] [--truth-value V] [--apply] [--apply-note S] [--json]
 jm report [--json]
```

**Exit codes (the contract):** `0` ok · `1` error (loud, named) · `2` fail-closed (no key / bad args) ·
`3` budget stopped (partial progress preserved).

## 8. THE DATA MODEL (the tables, their columns, the invariants)

```
 files(id, path UNIQUE, size, mtime, sha256, kind, text_indexed, state, indexed_at)
       state ∈ {new, changed, gone}; the UNIQUE(path) is the idempotency spine of indexing.
 docs(id, file_id, path, text)          + docs_fts(text, path) — FTS5, one row per indexed file
 tags(id, path, name, value, prob, judged_at)    — reserved for W3's extract/tag pass
 runs(id, verb, args_json, started, ended, status, stats_json, cost_usd)   — mirrored by the ledger
 decisions(id, scenario_ref, question, answer_json, conf, policy, context_ref, at)
       conf = the aggregate signal; context_ref = the later-truth slot (calibration feedstock).
 cache(fingerprint PK, provider, model, schema_hash, state_hash, answer_json, created_at, hits)
       the fingerprint = sha256(model ⊕ schema#questionsHash ⊕ canonical(redact(state))).
 meta(key, value)                        — schema_version, calibration:<ts> rows
 queue(id, fingerprint UNIQUE, kind, payload, state, attempts, result, error, …)
       state ∈ {pending, running, done, failed}; UNIQUE(fingerprint) makes re-processing idempotent.
```

## 9. THE ERROR VOCABULARY (every token the system can emit)

| token | meaning | exit |
|-------|---------|------|
| `JM_TARGET_MISSING` | the path does not exist | 1 |
| `JM_TARGET_UNKNOWN` | `@name` is not in `~/.jm/targets.json` | 1 |
| `JM_WHERE_INVALID` | the where-predicate does not parse | 1 |
| `JM_WHERE_COLUMN` | the column is not whitelisted | 1 |
| `JEV_NO_KEY` | no `TYPESAFE_API_KEY` and no key file | **2** |
| `JM_JUDGE_HTTP_<code>` | the judge transport refused | 1 |
| `JM_BUDGET_EXCEEDED` | the cap would be exceeded (named) | 3 |
| `JM_BUDGET_INVALID` | a cap was NaN/Infinity/negative | 1 |
| `JM_DUP_VIOLATION` | done rows != distinct fingerprints (the dup law) | 1 |
| `JM_ROUTE` / `JM_ARGS` | unknown HTTP path / missing CLI args | 2 / 2 |
| `JM_SERVE` | the server banner (listening line) | 0 |

## 10. THE ENVIRONMENT (this host, measured 2026-09-21)

```
 runner            bun 1.4.2 · node v24.13.1 · NO system sqlite3 (bun:sqlite is the store)
 FTS5              verified available in bun:sqlite (the pre-flight passed)
 test discovery    rooted at ./tests via bunfig.toml (checkpoint snapshots excluded)
 inline exec       BLOCKED by the host's STTGF gate — probes must be files
 corpora           @shadow 11,831 files/9.8G · @reports 57 files · @ocdb 4 DBs (unqueried)
 key               ~/.config/typesafe/key (fingerprint 463e63ca5302); env var unset
 audit lane        ocr (OpenCodeReview) available; provider muse-free
```

## 11. THE CONVENTIONS (follow these when extending)

1. Every verb writes exactly one ledger row via `withLedger`; a verb that skips it is unfinished.
2. Every judged path goes through `Judge.ask` (cache-first) — never a raw fetch.
3. Thresholds live in policy objects; a float literal in a verb is a review finding.
4. Artifacts are deterministic: never embed cache/cost/timing in a written result.
5. Fail-closed on decision verbs; keyless for deterministic verbs.
6. Tests assert observation channels (rows, bytes, exit codes), never internal call counts.
7. Batches contain per-item failure containment; one bad item never aborts the run.
8. The two high-frequency logs update at the moment of the work, before the milestone docs.

## 12. THE INTERFACE CONTRACTS (what a caller may rely on)

1. **`withLedger` wraps every verb** — one row per invocation, `status:'error'` rows included.
2. **`Judge.ask` is the only judge path** — cache-first, cost computed at write time, fail-closed.
3. **`runQueued` is the only batch executor** — crash-first rows, ack-on-complete, sweep on entry,
   budget-clamped claims, per-item failure recorded via `q.fail`.
4. **`runPool` never throws for an item** — it returns `{ok, errors}`; callers decide the policy
   (the audit's EN-009 is exactly this: a caller that ignored `errors`).
5. **`indexFile` is the one file-indexing unit** — the batch walker and the queue share it, so the
   two paths cannot drift.
6. **Artifacts are deterministic** — `decisions.json` excludes run metadata; a replay is byte-identical.
7. **Exit codes are contract** — 0 ok / 1 error / 2 fail-closed / 3 budget-stopped.

## 13. WHAT A REVIEWER SHOULD CHECK FIRST (the highest-risk surfaces)

| surface | why it is risky | what to verify |
|---------|-----------------|----------------|
| `src/serve.ts` | an unauthenticated endpoint that SPENDS money | the bind is loopback; the token gate works |
| `src/judge/client.ts` | the fingerprint decides what is cached forever | the questions hash is in the key |
| `src/verbs/filter.ts` / `find.ts` | a swallowed error becomes a false success | JEV_NO_KEY propagates |
| `src/verbs/query.ts` | a missing filter leaks deleted data | `state != 'gone'` in both branches |
| `src/pools/budget.ts` | a NaN cap silently disables the stop | construction-time validation |
| `src/job/queue.ts` | a NaN limit claims the whole queue | the clamp to >= 0 |
| `src/verbs/index.ts` | one bad file aborting a 11k-file batch | the per-file guard |

---

## CURRENT (appended 2026-09-21, git 8b42ff8)



**Battery: 89 pass / 0 fail / 343 expects / 17 files · `bunx tsc --noEmit` exit 0.**
**Container rig (spec §9 T1–T7): PASS 7/7 in a fresh Debian-12 container AND on the host.**

### What landed after the wave-1 foundation
- **W2 TARGETS** — fs · jsonl · sqlite adapters; `--in a,b|all`; row-level incrementality by
  content sha; the sqlite SOURCE proven read-only. Fixed D-008 (two targets' same-named files
  collapsed into ONE row — a silent row loss).
- **W3 RETRIEVE** — `scan` (regex gate + hit counts + excerpts) · `cluster` (signature groups, no
  model) · `extract` (capture-group pulls; md/json/csv).
- **W5 DECIDE** — `route` (the catalogue Choice, injection text on act, runner-up logged) ·
  `evaluate` (agreement/Brier/ECE/variance + `--replay`).
- **W6 SURFACES** — the **MCP** stdio surface (jm_query/jm_find/jm_decide/jm_index) and the
  **watch daemon** (idempotent tick, real JSONL journal). All four surfaces now live.
- **W7** — `report` (read-only status over the store + ledger).
- **README §18 — THE OPERATING CONTRACT**, written from a zero-context operator's 14 reported
  gaps and then EXECUTED: 25 claims verified against the live engine, which found three more
  defects (the cost line corrupted piped output; per-verb exit codes; `target add` accepted a
  phantom root).

### The defect ledger (all fixed, all pinned)
D-008 cross-target row collapse · D-009 unknown index returned empty+exit 0 (and created a phantom
index file) · D-010 `@sqlite-target` indexed the DB file, not its rows · D-011 `index <file>` was a
silent no-op · D-012 `--structure csv` rendered markdown · D-013 `find` ignored JM_HOME · D-014 the
ledger dropped the flags · D-015 a target NAME was a path fragment · D-016 `route` injected an
out-of-catalogue choice · D-017 the cost line corrupted piped stdout · D-018 per-verb exit codes ·
D-019 `target add` accepted a nonexistent root · D-020 a questions-less recipe "succeeded" as
noop=all · D-021 `--in` silently dropped `--queued`.

### The gates
- **P6 DOCUMENT: BLOCKED.** The audit's tests-chunk and root-chunk are COMPLETE with 0 findings;
  the src chunk (36 files) is PARTIAL in every attempt — upstream rate limits. Half a dozen runs,
  every finding adjudicated (9 confirmed+fixed, 6 REFUTED by probe). Method + ledger:
  `AUDIT_SUMMARY.md`. NEVER PASS while the largest chunk is unmeasured.
- **W8 FIRE GATE: NOT BUILT** — parked on the operator-owned F1/F6 rulings.
- Residual, named: the unswept frontier is the src chunk under a working lane; `@ocws` never
  walked; the escalation band has no live row.
