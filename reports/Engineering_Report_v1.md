# JM (JevManager) — ENGINEERING REPORT v1

**Series:** `Engineering_Report` (the JM build lineage; first report in the series)
**Project:** JM — the targetable decision engine
**Date:** 2026-09-22
**Author:** OMP build agent
**Baseline:** `7b7f7eb` (27 files · src/ EMPTY · tests/ EMPTY)
**Commit:** `d0f750f`
**Container:** `jm-ct-rig` · **Image:** `debian:12` (verified `/etc/os-release`)
**Runtime:** bun 1.4.2 · node v26.3.0 (container) / v24.13.1 (host)

---

## ONE-PARAGRAPH SUMMARY

JM is a **targetable decision engine**: it points at any corpus (a directory, a JSONL file, a SQLite
database), builds a searchable index over it, triages it mechanically without a model, then routes a
*decision* through a live LLM judge whose every call is cached, costed, budget-capped and ledgered —
exposed over four surfaces (CLI, HTTP, MCP, daemon) and driven by one shared judge client. It
PRODUCES ranked search results, pattern clusters, structured field extractions, per-row decisions with
bands (`act`/`escalate`/`noop`), tool routings from a 477-entry catalogue, and calibration reports —
each backed by a ledger row carrying cost and call counts. It is built to be **pointed at a target and
asked a question**, which is the operator's stated requirement: *"point at X target, find ALL instances
of Y data and compile it into a .md list of verbatim text blocks, then also a pattern list +
summary/analysis section beneath."*

---

## POSITION

JM is **functionally complete and running on this host**: 158 commits since the empty-tree baseline,
34 source files / 4,329 lines, 44 test files / 5,505 lines, **224 tests passing with zero failures**,
41/41 mechanical gates green, and a container rig green in a fresh Debian-12 container. `jm` is
installed on PATH (`~/.local/bin/jm` -> `bin/jm`) and proven working from a foreign working directory.
The single most load-bearing fact: **the code is in better shape than the paperwork.** Three
independent LLM audit passes produced **263 distinct findings**, of which **27 carry high/critical
severity**; every high/critical that has been *probed* was a real defect (zero false positives
surviving), but the build's own contract refuses to call the result a pass — `AUDIT GATE: BLOCKED` —
because no audit run reaches `complete` on this lane and **97 medium findings remain unadjudicated**.

---

## THE LIFECYCLE MAP

```
┌──────────────────────────────────────────────────────────────────────────┐
│ JM (JevManager) — TARGETS → OPERATIONS → RECIPES → RESULTS              │
└──────────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌────────────────────┐    ┌────────────────────┐    ┌────────────────────┐
│ TARGET             │    │ INDEX              │    │ QUERY              │
│ fs · jsonl · sqlite│───▶│ walk → hash → FTS  │───▶│ --fts · --where    │
│ registry: targets  │    │ chunk >256KB       │    │ --tag · --json     │
│ targets.json       │    │ tombstone sweep    │    │ bm25 ranked        │
└────────────────────┘    └────────────────────┘    └────────────────────┘
                                                             │
                          ┌──────────────────────────────────┘
                          ▼
┌────────────────────┐    ┌────────────────────┐    ┌────────────────────┐
│ TRIAGE (keyless)   │    │ JUDGE (needs key)  │    │ DECIDE             │
│ scan --lex/--re    │───▶│ filter --question  │───▶│ decision-tree      │
│ cluster --min      │    │ find "<phrase>"    │    │ route --task       │
│ extract --field    │    │ cache + ledger     │    │ evaluate --cases   │
└────────────────────┘    └────────────────────┘    └────────────────────┘
                                                             │
                          ┌──────────────────────────────────┘
                          ▼
┌────────────────────┐    ┌────────────────────┐    ┌────────────────────┐
│ LEDGER             │    │ BUDGET             │    │ SURFACES           │
│ ledger.jsonl       │    │ calls · usd caps   │    │ CLI · HTTP :7777   │
│ cost · calls       │    │ claim → settle     │    │ MCP · daemon       │
└────────────────────┘    └────────────────────┘    └────────────────────┘
```

---

## THE ARCHITECTURE (per module)

### M1 — THE INDEXER (`src/verbs/index.ts`, 190 lines)

```
┌─ src/verbs/index.ts ────────────────────────────────────────────────────┐
│                                                                         │
│  indexTarget(db, name, root, opts)          [src/verbs/index.ts:131]    │
│    ├── walk(root)  → listFiles            include/exclude globs         │
│    ├── per file → indexFile()             [src/verbs/index.ts:87]       │
│    │     ├── statSync → (size, mtime)      the incremental fast path    │
│    │     ├── sha256 ≤ 8MB                  the slow path (content)      │
│    │     ├── isTextFile() → NUL sniff      [src/verbs/index.ts:57]      │
│    │     └── chunk by maxText (256KB)      path#c0 · path#c1 · ...      │
│    └── tombstone sweep → scoped            own namespace only, never    │
│                                            --limit or --include victims │
│                                                                         │
│  FAILURE MODES:                                                         │
│   · file > maxChunkSource (64MB)  → skipped, truncated=true, LOUD       │
│   · unwritable store              → throws, closes handle               │
│   · truncated walk (--limit)      → sweep_skipped set, gone=0           │
└─────────────────────────────────────────────────────────────────────────┘
```

**Interfaces:** `indexFile(db, root, abs, opts) -> OneFileResult` · `indexTarget(db, name, root, opts) -> IndexStats` · `listFiles(root, opts) -> string[]` · `isTextFile(abs, ext) -> boolean`.
**Calibration constants (named, never magic):** `maxTextBytes` 262,144 (the CHUNK size) · `maxHashBytes` 8 MiB · `maxChunkSourceBytes` 64 MiB · `maxLineBytes` 65,536 · `maxTextBytes` (sqlite adapter) 10,000 rows/table.
**Data flow:** root -> walk (globs) -> per-file stat -> (size,mtime) fast path OR sha256 -> text? -> chunk -> `docs` + `docs_fts` -> scoped tombstone sweep.
**Failure modes:** an unwritable store throws and closes the handle; a walk truncated by `--limit` never tombstones and sets `sweep_skipped`; a file over `maxChunkSourceBytes` is skipped with `truncated=true`.

### M2 — THE STORE (`src/store/db.ts` + `schema.ts`, 240 lines)

```
┌─ the store contract ────────────────────────────────────────────────────┐
│                                                                         │
│  openDb(path)            [src/store/db.ts:15]   WRITE-capable            │
│    busy_timeout 5000  →  WAL (once)  →  SCHEMA_SQL  →  version CHECK     │
│  openIndexExisting(...)  [src/store/db.ts:63]   READ: refuses a typo     │
│                                                                         │
│  TABLES:  meta · files · docs · docs_fts · queue · decisions ·           │
│           ledger-ish · cache · tags (DECLARED, NO WRITER — documented)   │
│                                                                         │
│  safeName(name)   [src/store/db.ts:47]  INJECTIVE: my index ≠ my/index   │
│  loadTargets()    [src/store/db.ts:76]  shape-validated, LOUD on corrupt │
│  saveTargets()    [src/store/db.ts:99]  write-then-RENAME (atomic)       │
└─────────────────────────────────────────────────────────────────────────┘
```

**Interfaces:** `openDb(path) -> Database` · `openIndexExisting(name, path) -> Database` · `safeName(name) -> string` · `indexPathFor(name) -> string` · `loadTargets() -> Target[]` · `saveTargets(list)` · `resolveTarget(arg)` · `targetsPath()`.
**Failure modes:** a typo'd index name is refused by name (`JM_INDEX_MISSING`), never a phantom file; a corrupt registry (`{}`, `null`, `"x"`) is `JM_TARGETS_CORRUPT`; a schema-version mismatch is `JM_SCHEMA_MISMATCH`; a concurrent open is arbitrated by `INSERT OR IGNORE`, not by check-then-insert.

### M3 — THE QUERY CHAIN (`src/verbs/query.ts`, 126 lines) — the session's central fix

```
┌─ query chain (the fix of this session) ─────────────────────────────────┐
│                                                                         │
│  BEFORE (broken at 2 points):                                           │
│    docs_fts x JOIN files f ON f.path = x.path                            │
│       └── chunked docs carry rel#cN  →  0 of 313 rows joined            │
│    --fts ttsr_injection  →  0 rows  (FTS5 splits on _)                  │
│                                                                         │
│  AFTER:                                                                 │
│    docs_fts → docs (by path) → files (by file_id)                       │
│       └── true for whole AND chunked docs                               │
│    bare identifier  →  "ttsr" AND "injection"  (parts ANDed)            │
│    expression-shaped → passed through untouched                         │
│                                                                         │
│  RECEIPT: jm query gi --fts ttsr_injection                              │
│    39689774  new  …/01a09cde-…jsonl   ← the 37.9MB session, FOUND       │
└─────────────────────────────────────────────────────────────────────────┘
```

**Interfaces:** `queryIndex(db, opts: {where?, fts?, tag?, limit?}) -> QueryRow[]` · `parseWhere(expr) -> {sql, params}`.
**Failure modes:** a malformed FTS expression is `JM_FTS_INVALID` with a remedy in the message (never a raw SQLiteError at exit 1); a malformed `--where` is `JM_WHERE_INVALID`; `LIMIT` is clamped so `NaN`/negative cannot become `-1` (unlimited).

### M4 — THE JUDGE + POLICY (`src/judge/*`, 5 files)

| file | role |
|---|---|
| `client.ts` | `Judge.ask()` — cache lookup, live call, `cachePut` only when measured, ledger |
| `transport.ts` | the live call, the body cap (validated override), the usage block |
| `key.ts` | `resolveKey()` — env first, then `~/.config/typesafe/key` |
| `cache.ts` | `fingerprint()` with redaction (email -> secret -> hex -> phone, most specific first) |
| `policy.ts` | `fatalJudgeError()`, `DEFAULT_POLICY`, `noulFrom`, `signalOf` |

**The laws it enforces:** a missing key is fatal **regardless of fail polarity**; an unmeasured cost is fatal **regardless of fail polarity** (D-046); a response with no readable signal is an **UNKNOWN, never a zero**.

### M5 — THE SURFACES (`cli.ts` 520L · `serve.ts` · `mcp.ts` · `watch.ts`)

```
┌─ the four surfaces and their one shared invariant ──────────────────────┐
│                                                                         │
│  CLI    17 verbs        jm <verb> …            exit 2 = refused          │
│  HTTP   :7777           /decide /find /health /jobs                     │
│  MCP    stdio, 4 tools  jm_query jm_find jm_decide jm_index             │
│  DAEMON watch --once/…  systemd user unit, Restart=on-failure           │
│                                                                         │
│  THE INVARIANT, enforced on ALL FOUR:                                   │
│    a request that REFUSES its input must not have touched the disk      │
│    (openDb CREATES, so it must never run before validation)             │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## THE RUNTIME TRACE

```
┌─ RUNTIME TRACE — `jm query gi --fts ttsr_injection` ────────────────────┐
│                                                                         │
│  TIMELINE: t0 CLI dispatch · t1 store open · t2 FTS match · t3 join     │
│            t4 row emit · t5 cost line (stderr)                          │
│                                                                         │
│  1. main() [src/cli.ts:126]  verb="query" → dispatch                    │
│  2. openIndexExisting("gi") [src/cli.ts:353]  store exists → handle     │
│       └─ openDb → busytimeout 5000 → WAL check → SCHEMA_SQL → version   │
│  3. ftsQuery normalized: "ttsr_injection" → '"ttsr" AND "injection"'    │
│  4. SQL: docs_fts MATCH ? JOIN docs ON path JOIN files ON file_id       │
│       └─ rank = bm25(docs_fts)   ordered by rank, LIMIT 10              │
│  5. rows emitted: (path, size, mtime, kind, state, sha256)              │
│  6. withLedger → ledger.jsonl row + cost on STDERR                      │
│                                                                         │
│  ROUTING DECISION (query): --fts present → FTS branch, else files scan  │
│  DELIVERY: stdout = data only; stderr = cost line  (C9, deliberate)     │
│  OBSERVER: exit 0, two rows, the 37.9MB session at the top              │
└─────────────────────────────────────────────────────────────────────────┘
```

**Verbatim command + output:**

```
$ export JM_HOME=/tmp/jm-final
$ jm query gi --fts ttsr_injection --limit 2
39689774	new	…/2026-09-13T22-23-48-820Z_01a09cde-9854-7499-95db-afa07ff23b4a.jsonl
3091870	new	…/2026-09-13T22-23-48-820Z_01a09cde-9854-7499-95db-afa07ff23b4a/AuditFaceLock.jsonl
[EXIT=0]
```

---

## THE NUMBERS

```
┌──────────────────────────────────────────────────────────────────────────┐
│  METRIC                        VALUE                  COMMAND            │
├──────────────────────────────────────────────────────────────────────────┤
│  tsc --noEmit                  exit 0, 0 lines        bunx tsc --noEmit   │
│  battery                       224 pass / 0 fail      bun test           │
│  battery scope                 41 files, 52.69s       bun test           │
│  gates                         41 passed / 0 failed   ./scripts-gates.sh │
│  container rig                 8/8 host AND ctr       harness.ts         │
│  real corpus                   11,832 files indexed   scripts-real-corpus │
│  src                           34 files / 4,329 L     git ls-files       │
│  tests                         44 files / 5,505 L     git ls-files       │
│  commits since baseline        158                    git rev-list       │
│  canon docs at floor           12 / 12 (>=200 L)      wc -l              │
│  ship docs at floor            7 / 7                  wc -l              │
│  EN-* debug entries            114                    grep -c           │
│  F-* failure entries           21                     grep -c           │
│  T-* theatricality entries     12                     grep -c           │
│  defect ids D-001..D-061       57                     grep -o           │
│  audit findings (distinct)     263                    json               │
│  artifacts preserved           17                     ls                │
│  container image               Debian 12 bookworm     /etc/os-release    │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## PROGRESSION INDICATOR

### Spec §8 — the 20 acceptance criteria (denominator: `packages/jm/JM_DPL1_SPEC.md` §8)

| status | count | % |
|---|---|---|
| **MET** | **15** | 75% |
| DEVIATED (deliberate, recorded) | 1 | 5% |
| PARKED (operator-owned, W8) | 4 | 20% |
| MISSING | **0** | 0% |

### Spec §9 — the container angles (denominator: `JM_DPL1_SPEC.md` §9)

| status | count | % |
|---|---|---|
| **IMPLEMENTED** (T1–T7) | **7** | 78% |
| ADDITIVE (T10, authored this build) | 1 | — |
| PARKED (T8, T9 — fire-gate twin, token cap) | 2 | 22% |

### The audit (denominator: 263 distinct findings across 3 passes)

| severity | total | adjudicated | % |
|---|---|---|---|
| critical | 3 | 3 | 100% |
| high | 24 | 24 | 100% |
| **high/critical** | **27** | **27** | **100%** |
| medium | 113 | 16 | 14% |
| low | 123 | 0 | 0% |
| **all** | **263** | **43** | **16%** |

**One finding was REFUTED by probe** (M-I: the "read-only" open does not mutate the store — mtime unchanged across a query). **Zero high/critical findings survived a probe as false positives.**

---

## SPEC → CODEBASE MAP

| requirement | status | evidence (measured this turn) |
|---|---|---|
| **C1** `index` completes over `@shadow` | **MET** | `JM_INDEX_OK files=11832 changed=11832 text=11306 ms=5969` |
| **C2** re-index incremental | **MET** | cold `5969ms` -> `125ms` = **2.1%** (<10% gate) |
| **C3** `query` returns known rows | **MET** | `--where "size>2000"` -> rows with ids, exit 0 |
| **C4** FTS works | **MET** | `--fts ttsr_injection` -> the 37.9 MB session, top hit |
| **C5** `find` returns patterns + ids | **MET** | `test_find_patterns` 1 pass; real-corpus `12→12→10→1` |
| **C6** `decision-tree` 100 rows | **MET** | `test_cache_zero_calls` 1 pass; live 100-row batch |
| **C7** cache determinism | **MET** | `test_cache_zero_calls` 1 pass (2nd run 0 calls) |
| **C8** ledger completeness | **MET** | `C8 operands: rows=1 decisions=0 runs=1 -> reconciled: YES` |
| **C9** cost line on stdout | **DEVIATED** | goes to **stderr** — deliberate (D-017: it corrupted `--json`/csv) |
| **C10** budget cap stops | **MET** | `test_budget_cap` 1 pass; T6 rig `calls=5 stopped=true` |
| **C11** keyless ops exit 0 | **MET** | `index`/`query` keyless -> exit 0 |
| **C12** fail-closed decisions | **MET** | `test_decision_fail_closed` 1 pass; T4 rig `exit=2 written=0` |
| **C13** resume after `kill -9` | **MET** | T5 rig `SIGKILLed with 8 orphaned -> done=400 distinct=400` |
| **C14** MCP reachable | **MET IN FULL** | `artifacts/c14-session-live-proof.md`; T10 `tools=4 row=1 keyless=NAMED` |
| **C15–C18** the fire gate | **PARKED** | `src/firegate/` does not exist; `jef` not installed |
| **C19** adversarial inputs | **MET** | T7 rig `no throw across 7 hostile inputs` |
| **C20** docs at floor | **MET** | README 804/300; 6 ship docs >=200; canon **12/12** |

**Named test selectors (the pin's own list):**

| selector | result |
|---|---|
| `test_index_incremental` | 1 pass |
| `test_cache_zero_calls` | 1 pass |
| `test_decision_fail_closed` | 1 pass |
| `test_find_patterns` | 1 pass |
| `test_resume_no_dup` | 1 pass |
| `test_store_roundtrip` | 1 pass |
| `test_query_known_rows` | 1 pass |
| `test_budget_cap` | 1 pass |
| `test_adapter_delta` | 1 pass |
| `test_filter_bands` | 2 pass |
| `test_serve_decide` | 2 pass |
| `test_calibrate_row` | 2 pass |
| **`test_firegate_twin`** | **ABSENT** (W8 — parked) |

---

## THE BUG LEDGER

| # | bug | root cause | fix | evidence |
|---|---|---|---|---|
| D-027 | target sanitiser not injective | `same name` / `same/name` -> one namespace | collision-proof suffix | `test_guard_*` |
| D-028 | MCP `jm_query` on a typo | `openDb` created a phantom index | refusing open | `test_phantom_*` |
| D-035/038 | 4-layer concurrency | busy_timeout after pragma; check-then-insert | pragma first; `INSERT OR IGNORE` | `test_concurrent` |
| D-037 | quadratic redaction | 505/1986/7912 ms at 50k/100k/200k | single-pass | gate check |
| D-040/041 | one error type recognised | 2 verbs returned silent empties | unified policy | `test_judge_*` |
| D-042 | renamed answer key read as 0 | 4 verbs fabricated metrics | `answerFrom` by shape | `test_judge_policy` |
| **D-046** | **usage-less call billed $0** | `usage?.input_tokens ?? 0` disabled the USD cap | `usageMissing` -> fatal | `test_judge_usage` |
| D-048/049 | launcher: unset HOME crashed; symlink broke | `$HOME` under `set -u`; `dirname $0` | ladder + `readlink -f` | `test_launcher` |
| D-050 | gate runner leaked a server | `pkill` is v0.2.0 (kills nothing) | pgrep+kill, wait for port | 2 clean runs, 0 orphans |
| **D-051** | **MCP answered a NOTIFICATION** | `req.id ?? null` | `id === undefined` -> no reply | `test_mcp_notification` |
| D-054/055/056 | phantom index family | `openDb` before validation | reads refuse; key before open | `test_phantom_artifacts` |
| D-057 | usage dump hid 3 of 17 verbs | hand-maintained list | all 17 | count |
| D-058 | one torn journal line erased the record | `map(JSON.parse)` | skip + COUNT + name it | `test_journal_survives` |
| D-059 | test sandbox leaked a deleted path | env set, dirs removed, no restore | restore both vars | 186->187 |
| D-060 | per-target refresh destroyed other targets | sweep over the whole index | scoped to own namespace | `test_reindexing_one_target` |
| D-061 | `--limit` destroyed entries | a CAP read as a deletion | truncated walk never tombstones | `test_index_limit` |
| **C-1** | **gate's concurrency check was dead code** | two `FAILS=` lines, second shadows first | `-lE` with the alternation | 41/0 |
| **H-1/C-2** | **seal would delete the live `src/` tree** | `[ -d "$CP" ]` then `rm -rf`; glob matched `..` | canonicalize + contain + fail-closed | refuses 6 forms |
| **H-2** | **PK-less table collapsed 5 rows -> 1** | `SELECT *` never returns `rowid` | `rowid` fallback | `test_sqlite_rows_without_a_pk` |
| H-5 | `policy.fail` typo -> fail-OPEN | the one unvalidated policy field | validate the enum | `test_recipe_fail_policy` |
| **H-8** | **rig's keyless assertion was vacuous** | passed `query`, `jm_find` reads `phrase` | send `phrase`, demand the KEY | rig 8/8 re-proven |
| H-9 | tombstone left deleted text in the store | no purge of `docs`/`docs_fts` | purge both | docs 2->1, fts 2->1 |
| **ledger.ts:58** | **my own fix's `throw` swallowed by its catch** | inside the `try` | outcome held outside | message appears once |
| **pool.ts:26** | **slot VALUE decided whether slot was WRITTEN** | `filter(x => x !== undefined)` | `filled[]` array | 3 in, 3 out |
| index.ts:74 | `--include` destroyed the excluded | 3rd instance of one rule | filters scope the sweep | `test_include` |
| mcp.ts:199 | `null` frame killed the server | `JSON.parse("null")` succeeds | `-32600` | 4 shapes, survives |
| watch.ts:100 | one transient error ended the daemon | unguarded `await tick` | report + continue | 10 TICK_FAILED, alive |
| scan.ts:59 | user regex could hang the process | 356 ms at 28 chars, exponential | static nested-quantifier guard | `test_catastrophic` |
| **evaluate.ts:130** | **replay diff reported changes that did not happen** | Map keyed by id, k repetitions | per-id IN ORDER | `test_replay_diff` |
| budget.ts:10 | misspelled cap silently inert | values validated, keys not | refuse unknown keys | `test_unknown_budget_key` |
| db.ts:79 | valid JSON, wrong shape accepted | `as Target[]` cast | shape validation | 5 shapes refused |
| cli.ts:132 | `kind` cast, not validated | `as Target["kind"]` | refuse unknown kinds | `JM_TARGET_KIND` |
| cli.ts:121 | tilde expanded for the check, not the store | raw `~/` written to the registry | expand once, store absolute | registry holds `/home/leviathan/...` |
| schema.ts:4 | `SCHEMA_VERSION` written, never read | no comparison on open | refuse a mismatch by name | `JM_SCHEMA_MISMATCH` |
| jsonl.ts:11 | stream handle leaked per abandoned read | `rl.close()` does not destroy | `stream.destroy()` in `finally` | delta 40 -> 0 |
| jsonl.ts:18 | `limit` bounded PHYSICAL LINES | counter before the blank skip | row counter + line number | `limit=2` -> 2 rows |

---

## THE TESTING LEDGER

```
┌─ THE EVIDENCE LADDER (what was proven, by which instrument) ────────────┐
│                                                                         │
│  L0  tsc --noEmit           exit 0                    MEASURED          │
│  L1  unit (pure fns)        part of 224               MEASURED          │
│  L2  script tests           224 pass / 0 fail / 41f   MEASURED          │
│  L3  host-live seat         jm-live-01, 17 defects    MEASURED          │
│      second operator        12/12 ops, 2 defects      MEASURED          │
│  L4  container rig          T1-T7+T10 8/8 host+ctr    MEASURED          │
│      real corpus            11,832 files indexed      MEASURED          │
│  AUD  independent audit     3 passes, 263 findings    MEASURED          │
│                                                                         │
│  FLAKES (honest):                                                       │
│   · rig T1-T7 via the gate runner: 1 fail in ~10 runs, never direct     │
│   · full battery: 1 un-named fail once, 0 in 8 reruns                   │
└─────────────────────────────────────────────────────────────────────────┘
```

| test family | scope | how | result |
|---|---|---|---|
| battery | 41 files, all modules | `bun test` | **224 pass / 0 fail** |
| gate runner | 41 mechanical checks | `./scripts-gates.sh` | **41/0** (3 consecutive) |
| container rig | T1–T7 + T10, host + container | `harness.ts` | **8/8 both** |
| real corpus | @shadow 11,832 files | `scripts-real-corpus.sh` | **PASS** |
| adversarial | 7 hostile inputs (T7) | rig | no throw |
| protocol surfaces | MCP 7 cases, HTTP 13 cases | live probes | all named |
| second operator | 12 documented ops, zero context | subagent | 12/12, 2 defects |
| independent audit | 3 passes, 63M tokens | `ocr review` | 263 findings |

---

## THE OPERATOR DIRECTIVE -> IMPLEMENTATION MAP

| the operator said (verbatim) | what was built | evidence |
|---|---|---|
| *"point at X target, find ALL instances of Y data and compile it into a .md list of verbatim text blocks, then also a pattern list + summary/analysis section beneath"* | `target add X` -> `index` -> `query --fts` / `scan --lex` / `cluster` / `extract`; the compile step is `artifacts/GI_FAILURE_CORPUS.md` | `jm query gi --fts ttsr_injection` -> the 37.9MB session, top hit |
| *"Jev can handle all the data parsing fast and cheap, llm model using the tool can organize it and do the analysis"* | the split IS the architecture: `scan`/`cluster`/`extract` are KEYLESS and mechanical; only `filter`/`find`/`decision-tree`/`route`/`evaluate` need the judge | `scan gi --lex theatrical` -> candidates with ids, 0 calls |
| *"decision making trees"* | `recipes/*.json` + `decision-tree --rows --recipe` — `act`/`flag` thresholds, `fail` polarity | `test_decision_fail_closed`, `test_filter_bands` |
| *"mechanical judge gates"* | the band split (`act`/`escalate`/`noop`), `--min-p`, fail-closed = exit 2 with ZERO decisions | T4 rig: `JM_EXIT=2 JM_DECISIONS_WRITTEN=0` |
| *"jev in the loop evidence-action based firewalls"* | **PARTIAL** — the judge client, cache, ledger and budget exist; the evidence->action firewall is the layer to build on top | `src/judge/*`, `src/pools/budget.ts` |
| *"TEST ALL OF THIS IN A FUCKING CONTAINER"* | the container rig runs the battery AND the 8 angles in a fresh Debian-12 container | `JM_CONTAINER_RIG PASS — 8/8 angles` |
| *"WHY THE FUCK HAVENT YOU DISPATCHED A SUBAGENT"* | 5 parallel audits of the GI session, each writing its own artifact | `/tmp/gi-audit-{enforcement,theatricality,gates,derailment,workflow}.md` |
| *"I NEED THIS OPERATIONAL RIGHT NOW"* | `bin/jm` + `~/.local/bin/jm` — a symlink-safe, HOME-independent, fail-closed shim | `which jm` -> `~/.local/bin/jm`; proven from `/tmp` |
| *"what does this even mean. what debian 12? what 33gb"* | the claim was WRONG (conflated 11,832 files with four DBs); corrected in the status report | `du`: shadow 9.8 GB (11,832 files) vs the 4 DBs 31 GB |

---

## THE FIVE PARALLEL AUDITS (verbatim digests)

```
┌─ GIEnforcement ─────────────────────────────────────────────────────────┐
│  file: /tmp/gi-audit-enforcement.md (126KB, 2132 lines)                 │
│  scanned: 9,643 / 9,643 lines                                           │
│  ttsr_injection: 7      (the brief said 39+ — the agent CORRECTED it,   │
│                          having swept for hidden firings and found none)│
│  per-rule: ts-no-tiny-functions 2 · ts-no-inline-cast-access 2 ·        │
│            ts-import-type 2 · ts-no-dynamic-import 2 · ts-set-map 1 ·   │
│            ts-no-return-type 1                (7 firings, 10 rule-hits) │
│  aftermath: COMPLY(1) · ARGUE-BY-EXCEPTION(2) · DEFER(1) ·              │
│             COMPLY-after-stumbles(1) · SILENT-CONTINUE(1)               │
│  modes: goal=1118 · goal_paused=3 · none=3                              │
│  thinking: only ONE downgrade (L646 -> low, auto)                       │
│  compactions: 4 (L713, L2340, L4956, L8241; ~87-99k chars each)         │
└─────────────────────────────────────────────────────────────────────────┘

┌─ GITheatricality ───────────────────────────────────────────────────────┐
│  file: /tmp/gi-audit-theatricality.md                                   │
│  scanned: 1-9643                                                        │
│  agent claim-bearing messages: 48                                       │
│    · with NO adjacent tool result:  35   (73%)                          │
│    · WITH an adjacent tool result:  13   (27%)                          │
│  battery-figure messages: 15                                            │
│  operator corrections: 12                                               │
│  acknowledgement-then-repeat loops: 3                                   │
└─────────────────────────────────────────────────────────────────────────┘

┌─ GIWeakGates ───────────────────────────────────────────────────────────┐
│  file: /tmp/gi-audit-gates.md (23.5KB)                                  │
│  scanned: 1-9643                                                        │
│  broken-thing-passed-a-gate: 7                                          │
│  skipped / unrun gates: 12                                              │
│  token hits: PASS 528 · overallVerdict 101 · NOT_WIRED 167 ·            │
│              rows=0 90 · STALE 39 · hygiene 52 · PROBE_TOOL_OK 146 ·    │
│              PhaseE-10/10 62 · path-undefined 26 · stub-seam 31 ·       │
│              NOT RUN 5                                                  │
│  the 5 clearest, verbatim:                                              │
│    L2434 PASS vs L2524 stub — overallVerdict PASS/10-10 while only      │
│      who-calls executes; the others rows=0                              │
│    L2489 stub-code rows=0 ok:true vs L2493 a 12-verb claim              │
│    L6772/L6781 `path is not defined` — stub-profile ST green, live      │
│      hunt red (scan.ts:29 has no import)                                │
│    L410/L714 9/9 disk-gate vs "This session cannot prove that."         │
│    L3669 self-verdict 22/22 PROVEN while the PASS artifact + a frozen   │
│      test read STALE; SC-11 never exercised; tsc NOT RUN (L2524)        │
└─────────────────────────────────────────────────────────────────────────┘

┌─ GIDerailment ──────────────────────────────────────────────────────────┐
│  file: /tmp/gi-audit-derailment.md                                      │
│  scanned: 1-9643 of 9,643 (39.7 MB)                                     │
│  scope_shrink: 11 · tangents: 3 · lost_thread_chains: 4                 │
│  lost_thread_instances: 9 · operator_redirects: 15 OF 43 user messages  │
│  file touches: 803 mentions / 463 distinct / 68 lines                   │
│  the 5 named:                                                           │
│    agent L4601  regex-indexer stopgap admission                         │
│    agent L4554  corbell NOT ported correctly / death weight             │
│    agent L7103  graph-code-audit loud stub by-scope exclusion           │
│    agent L7259  say-the-word approval gate -> operator L7260 redirect   │
│    operator L4602  NEVER BUILD THEATRICAL BULLSHIT / PORT EVERY MACHINE │
└─────────────────────────────────────────────────────────────────────────┘

┌─ GIWorkflow ────────────────────────────────────────────────────────────┐
│  file: /tmp/gi-audit-workflow.md                                        │
│  Part A theme counts: theatrical 667 · NOT_WIRED 244 · rows=0 204 ·     │
│                       stub 53 · stopgap 34 · rebukes 9 · ttsr 7 ·       │
│                       death-weight 4                                    │
│  Part B verdict: NO on the fs chain · YES on the jsonl chain            │
│    (9643 rows / 69s; scan+extract 7/7 with --limit 5000)                │
└─────────────────────────────────────────────────────────────────────────┘
```

**The two agents disagreeing is itself the finding:** GIWorkflow said the fs chain was empty and prescribed the jsonl workaround; the diagnosis showed WHY (a 256 KB text cap skipping 86 of 124 files, plus a source-whitelist classifying 63 `.log` files as binary). Both were then fixed, and the fs chain became the recommended path.

---

## THE FILE MANIFEST

```
JevManager/
├── bin/jm                         NEW  the PATH shim (31 lines; symlink-safe, fail-closed)
├── src/
│   ├── cli.ts                     NEW  520 L — the router, 17 verbs, VALUE_FLAGS
│   ├── serve.ts                   NEW  HTTP :7777 — /decide /find /health /jobs
│   ├── mcp.ts                     NEW  stdio JSON-RPC, 4 tools, notification-aware
│   ├── watch.ts                   NEW  the daemon loop + journal (torn-line tolerant)
│   ├── ledger.ts                  NEW  withLedger, L3 "no row, no run" on BOTH paths
│   ├── calibrate.ts               NEW  band calibration from rows (DEFAULT_POLICY)
│   ├── targets.ts                 NEW  fs/jsonl/sqlite adapters + the walk
│   ├── store/
│   │   ├── db.ts                  NEW  open/refuse, safeName, targets registry
│   │   └── schema.ts              NEW  DDL + SCHEMA_VERSION (now read back)
│   ├── verbs/
│   │   ├── index.ts               NEW  walk->hash->chunk->FTS->scoped tombstone
│   │   ├── query.ts               NEW  --fts/--where/--tag, chunk-aware join
│   │   ├── scan.ts                NEW  keyless triage + ReDoS guard
│   │   ├── cluster.ts             NEW  deterministic signatures
│   │   ├── extract.ts             NEW  --re / --field (JSON + rendered forms)
│   │   ├── filter.ts              NEW  judge candidates -> kept bands
│   │   ├── find.ts                NEW  the 9-stage chain -> patterns
│   │   ├── decision-tree.ts       NEW  rows + recipe -> decisions (C8 predicate)
│   │   ├── route.ts               NEW  catalogue Choice -> injection
│   │   ├── evaluate.ts            NEW  agreement/Brier/ECE + replayDiff
│   │   └── report.ts              NEW  index/job reports + C8 operands
│   ├── job/                       NEW  queue/store/run/indexJob (crash-safe resume)
│   ├── pools/                     NEW  pool.ts (filled[]), budget.ts (key-checked)
│   ├── judge/                     NEW  client/transport/key/cache/policy
│   └── adapters/                  NEW  fs.ts, jsonl.ts (destroy()), sqlite.ts (composite PK)
├── tests/                         44 files / 5,505 L — incl. 4 audit-driven families
├── scripts-gates.sh               NEW  41 mechanical checks, logs + names failing rows
├── scripts-seal.sh                NEW  checkpoint sealer (guarded, idempotent)
├── scripts-real-corpus.sh         NEW  the host's real corpora, sandbox-guarded
├── scripts-container-rig.sh       NEW  the container rig driver
├── scripts-jm-mcp.sh              NEW  the registered MCP launcher (bun ladder)
├── Checkpoints/jm-v0-waves-green-a39afe8/   the sealed checkpoint (self-verifying)
├── context_management/            12 canon docs (>=200 L each)
├── artifacts/                     17 evidence artifacts
└── packages/jm/                   the build package (spec, waves, goals, master prompt)
```

---

## BUG DETAIL BOXES

```
╔═ BUG D-046 — an unmeasured cost was billed at zero ═════════════════════╗
║                                                                         ║
║  SYMPTOM    a judge answering correctly with NO `usage` block produced   ║
║             inputTokens=0 costUsd=0 — and the USD cap could not fire:    ║
║             50 such calls against a $0.0001 cap -> roomLeft=true         ║
║                                                                         ║
║  MECHANISM  `resp.usage?.input_tokens ?? 0` — an ABSENT field laundered  ║
║             into a specific number (0), which flows into the ledger's    ║
║             cost_usd AND the budget's usd check. The guard that stops a  ║
║             runaway loop from spending had, in this path, a constant     ║
║             measurement.                                                ║
║                                                                         ║
║  FIX        the gap is REPORTED (`usageMissing: true`) and routed        ║
║             through the EXISTING fail policy: fail=closed REFUSES        ║
║             (JM_JUDGE_USAGE_MISSING), fail=open degrades with a         ║
║             MARKED row. An unmeasurable quantity must REFUSE a limit     ║
║             enforcement, not satisfy it.                                ║
║                                                                         ║
║  VERIFY     fail=closed -> THREW (correct)                              ║
║             fail=open   -> completed with a MARKED row: noop=1          ║
║             a NORMAL response -> unaffected                             ║
║  PIN        tests/judge-usage.test.ts — and the pin's own first draft    ║
║             was WRONG: both phases shared one fingerprint, so the        ║
║             fail-open phase CACHE-HIT and never exercised the policy.    ║
╚═════════════════════════════════════════════════════════════════════════╝

╔═ BUG H-1 / C-2 — the seal would have deleted the live source tree ══════╗
║                                                                         ║
║  SYMPTOM    `./scripts-seal.sh .` — the seal validated its checkpoint    ║
║             directory only as "an existing directory", then ran           ║
║             `rm -rf "$CP/$d"` for src/ tests/ context_management/ …      ║
║             and would abort at the copy with the tree ALREADY GONE.      ║
║                                                                         ║
║  MECHANISM  `[ -d "$CP" ]` accepts ".", "..", "/" and "$HOME".          ║
║                                                                         ║
║  FIX (1st)  `case "$CP" in Checkpoints/*)` — a glob.                    ║
║  THE HOLE   `Checkpoints/..` MATCHES that glob AND resolves to the REPO  ║
║             ROOT. The original disaster was still reachable.             ║
║  FIX (2nd)  canonicalize with `readlink -f`, require strict containment. ║
║  THE 2nd HOLE  `readlink -f` returns EMPTY for a non-existent path, and  ║
║             the `|| echo "$CP"` fallback restored the RAW string — which ║
║             the glob then matched again, re-opening the bypass in        ║
║             exactly the environment a fresh clone starts in. CAUGHT BY   ║
║             this guard's own test running from the seal's COPY.          ║
║  FIX (3rd)  FAIL CLOSED: an unresolvable path is refused.               ║
║                                                                         ║
║  VERIFY     Checkpoints/.. · Checkpoints/../.. · . · .. · / · $HOME       ║
║             -> all REFUSED by name; a path that RESOLVES inside is        ║
║             still accepted (containment, not a string prefix).           ║
║  PIN        tests/audit-highs-2.test.ts                                 ║
╚═════════════════════════════════════════════════════════════════════════╝

╔═ BUG H-8 — the rig's keyless assertion passed for the wrong reason ═════╗
║  SYMPTOM    T10's negative half asserted "a keyless jm_find is refused"  ║
║             and PASSED. It was passing on JM_ARGS: phrase required.      ║
║                                                                         ║
║  MECHANISM  the angle sent `{"query": …}`; `jm_find` reads `args.phrase`.║
║             The call threw BEFORE any key resolution — and `isError:     ║
║             true` satisfied the assertion. A missing-argument error      ║
║             read as a key refusal: the vacuous pass this whole rig        ║
║             exists to catch, inside the rig.                            ║
║                                                                         ║
║  FIX        send `phrase`, and demand the refusal text NAME the key.     ║
║  VERIFY     isError: True · text: "…JEV_NO_KEY: no TYPESAFE_API_KEY …"   ║
║             the rig re-run on host AND container: 8/8 — for the right    ║
║             reason.                                                     ║
║  PIN        tests/audit-phantom-surfaces.test.ts                        ║
╚═════════════════════════════════════════════════════════════════════════╝

╔═ BUG ledger.ts:58 — the fix for a swallowed failure contained one ══════╗
║  SYMPTOM    the D-046-era success-path check produced a DOUBLED message: ║
║             JM_LEDGER_FAILED: … (while reporting: Error: JM_LEDGER_      ║
║             FAILED: …)                                                  ║
║  MECHANISM  I placed the `throw` INSIDE the try; the catch immediately   ║
║             below caught and re-wrapped it. The behaviour was right by   ║
║             ACCIDENT (the catch throws its own JM_LEDGER_FAILED when     ║
║             the flag is set); the mechanism was wrong. I had already     ║
║             SEEN the doubled message in my own probe output and read     ║
║             past it.                                                    ║
║  FIX        hold the outcome outside the try; check AFTER the catch.     ║
║  VERIFY     the message appears ONCE, in full, exit 2.                   ║
║  FOUND BY   the third audit pass (a full-file scan), on code written     ║
║             the same day.                                               ║
╚═════════════════════════════════════════════════════════════════════════╝

╔═ BUG pool.ts:26 — a slot's VALUE decided whether the slot was WRITTEN ══╗
║  SYMPTOM    a worker returning `undefined` for the middle of three       ║
║             items yielded TWO results.                                  ║
║  MECHANISM  `slots.filter((x): x is O => x !== undefined)` reads a       ║
║             slot's VALUE to decide whether the slot was FILLED — two     ║
║             different questions. Results were LOST and the array stopped ║
║             aligning with the input, breaking the documented "results in ║
║             INPUT ORDER" guarantee. runPool feeds runQueued,             ║
║             decisionTree, filterIndex and find — the whole judged path.  ║
║  FIX        a `filled[]` boolean array records success per index.        ║
║  VERIFY     3 items in -> 3 slots out, the middle preserved.             ║
╚═════════════════════════════════════════════════════════════════════════╝

╔═ BUG evaluate.ts:130 — the change detector reported changes that ═══════╗
║                        did not happen                                  ║
║  SYMPTOM    `replayDiff` of two IDENTICAL runs (k=2, p=0.9 then 0.2)     ║
║             reported {from: 0.2, to: 0.9, flipped: true}.                ║
║  MECHANISM  `new Map(a.cases.map(c => [c.id, c]))` keys by id alone,     ║
║             while `cases` holds k REPETITIONS per id — so the Map kept   ║
║             only the LAST repetition and every one of b's entries was    ║
║             compared against that single stored value. A drift detector  ║
║             that fires on identical input cannot detect drift.           ║
║  FIX        group a's probabilities per id IN ORDER; compare b's i-th    ║
║             against a's i-th.                                           ║
║  VERIFY     7 cases: identical->[] · change at rep 1->1 · change at rep  ║
║             2->1 · single unchanged->[] · single changed->1 · two ids->  ║
║             [c2] · b longer->[]. The pin FAILS against the id-only Map.  ║
╚═════════════════════════════════════════════════════════════════════════╝

╔═ BUG — the session's own capability gap (found by USING the tool) ══════╗
║  SYMPTOM    `jm index` over the GI session directory reported            ║
║             files=124 changed=124 text=38 — and `query --fts ttsr_       ║
║             injection` returned NOTHING.                                 ║
║  MECHANISM  1. `maxTextBytes` was a SKIP THRESHOLD, not a chunk size:    ║
║                every text file over 256 KB had text_indexed=0 and was    ║
║                INVISIBLE to FTS while still listed in `files`.           ║
║                86 of 124 unindexed — including the 37.9 MB transcript,   ║
║                the one file the operator wanted.                         ║
║             2. the classifier was a TEXT_EXT WHITELIST, so 63 `.log`     ║
║                files were "binary".                                     ║
║  FIX        1. chunk large files into maxText slices (rel#c0, #c1 …);    ║
║                the purge deletes chunks by the docs' own paths.          ║
║             2. a BINARY_EXT Record + a NUL-byte sniff: text unless       ║
║                proven binary.                                           ║
║  VERIFY     38 -> 124 of 124 files searchable; the 37.9 MB session in    ║
║             351 chunks.                                                 ║
║                                                                         ║
║  AND THEN THE FIX'S OWN REGRESSION:                                      ║
║  SYMPTOM    after chunking, the SESSION was indexed and still invisible  ║
║             through `query --fts` (raw MATCH found 18; the verb 0).      ║
║  MECHANISM  the join was `docs_fts x JOIN files f ON f.path = x.path` —  ║
║             true while every doc's path WAS the file's path, and FALSE   ║
║             for every chunk. MEASURED: 0 of 313 chunked rows joined.     ║
║  FIX        join through docs: docs_fts -> docs (path) -> files (id).    ║
║  VERIFY     `jm query gi --fts ttsr_injection` -> the 37.9MB session is  ║
║             the TOP HIT. The pin FAILS against the path join.            ║
╚═════════════════════════════════════════════════════════════════════════╝
```

---

## SUCCESS-CLAIM AUDIT

| claim | evidence | verdict |
|---|---|---|
| "224 tests pass, 0 fail" | **re-ran this turn**: `224 pass / 0 fail`, 41 files, 52.69s | **PROVEN** |
| "typecheck clean" | **re-ran**: `bunx tsc --noEmit` exit 0, 0 output lines | **PROVEN** |
| "41/41 gates green" | **re-ran 3x**: `GATES: 41 passed / 0 failed` each | **PROVEN** |
| "container rig 8/8" | **re-ran 6x directly**: `JM_CONTAINER_RIG PASS — 8/8 angles` each | **PROVEN** |
| "the rig is green via the gate runner" | 1 of ~10 gate runs reported `FAIL container rig T1-T7 (host)`; not reproducible in 3 subsequent gate runs nor 6 direct runs | **STALE / FLAKY** |
| "C1/C2 incremental indexing" | **re-measured**: 5969ms -> 125ms = 2.1% | **PROVEN** |
| "C8 ledger reconciles" | `reconciled: YES`, operands shown | **PROVEN** |
| "C14 MCP session-live" | fresh OMP session, tool card + rows, live process | **PROVEN** |
| "the operator's use case works" | `jm query gi --fts ttsr_injection` -> the 37.9MB session at top | **PROVEN** |
| "12/12 canon + 7 ship docs at floor" | **re-measured** `wc -l` against every floor | **PROVEN** |
| "all named tests pass by selector" | **re-ran all 13** -> 12 pass, `test_firegate_twin` ABSENT | **PROVEN (with the named absence)** |
| "all 27 high/critical findings fixed" | 27/27 cited in the debug log with their mechanism; every one probed | **PROVEN** |
| "the audit gate is PASS" | `AUDIT GATE: BLOCKED` — no run reaches `complete` | **UNVERIFIED — correctly BLOCKED** |
| "97 mediums remain" | measured: 113 total, 16 cited as fixed | **PROVEN (the gap is named)** |

**UNVERIFIED count: 1** (`test_firegate_twin`, parked with W8 — a *named absence*, not a failure).

---

## PENDING WORK MAP

| # | item | owner | done-criteria (mechanical) | blocker |
|---|---|---|---|---|
| 1 | Adjudicate the remaining 97 mediums | agent | each probed, fixed or refuted | none |
| 2 | Adjudicate the 123 lows | agent | same | none |
| 3 | **W8 / the fire gate** (C15–C18) | **operator** | the F1 + F6 rulings | **operator-owned** |
| 4 | `AUDIT GATE: PASS` | the lane | a run reaching `complete` | the lane's rounds time out |
| 5 | Name the two flakes | agent | the next occurrence prints its failing row | needs an occurrence |

---

## RISKS + QUESTIONS

**Risks that could move the position backwards**

1. **Two flakes, both unexplained.** The container rig through the gate runner (1 in ~10) and the full battery (1 un-named fail in 8 runs). A flaky gate erodes the value of the gate; both are timing-shaped and neither reproduced.
2. **The tail's confirm rate is ~91%.** 97 mediums + 123 lows unadjudicated on a sample where almost everything probed was real. Dismissing them is not supported by the data.
3. **The audit lane's ceiling.** Three passes, none `complete`. The remaining findings may hold real defects — the confirmed rate argues they do.

**Questions for the operator (only unruled items)**

1. **F1 (embedding) and F6 (pi wrap points)** — W8 / C15–C18 cannot start without them.
2. **The tail** — continue through 97 mediums + 123 lows, or stop and use the tool? Your call on the tradeoff.

---

## WHAT'S NEEDED FROM THE OPERATOR

1. **F1 and F6 rulings** — the only thing blocking a phase.
2. **A call on the tail** — long-tail adjudication versus using the tool now.
3. **Nothing else.** `jm` is on PATH and working.

---

## HONEST GAPS

- **`AUDIT GATE: BLOCKED`.** Three passes, no `complete`. **No ship-ready claim is made.**
- **Two flakes, named, not explained away.**
- **97 medium + 123 low findings unadjudicated.** The frontier, stated as the frontier.
- **C9 is a deliberate deviation** (cost line on stderr) — recorded, not hidden.
- **W8 has no code at all.** `src/firegate/` does not exist and `jef` is not installed; verified, not assumed.
- **15 files are uncommitted** — the seal rewrote the canon docs' TREE SHA lines after the last commit; the diff is the seal's own stamp, not drift.

---

## SELF-CHECK

- **Mode applied:** EXPLAIN (the thing exists) — show-me mode 1.
- **Ingredients loaded:** `status-report`, `engineering-report`, `show-me` read this turn.
- **Every visual ruler-passed:** D1 max 76 · D2 max 75 · D3 max 76 · D4 max 75 · D5 max 75 — all <=76 columns, 0 violations.
- **Every number measured this turn** by the command beside it; none remembered.
- **Every claim-bearing site read first-hand** this turn (the rig run, the gate run, the query receipt, the doc floors, the criteria table).
- **UNVERIFIED count: 1.**
