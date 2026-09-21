# AUDIT ARTIFACT SUMMARY — ocr review, 2026-09-21

- artifact: `artifacts/audit-2026-09-21.json` (161KB, full JSON)
- run: `ocr review --from 7b7f7eb --to HEAD --format json`
- provider/model: muse-free / muse-spark-1.3-contributor-free
- session: `e577741d-2cec-48b8-ba1c-df06f151d4a2` · elapsed 6m2s · tokens 2,435,557
- files reviewed: 50 · comments: 174
- canonical (src/ + tests/) findings: **91** — high 30 · medium 49 · low 12
- duplicate findings from the Checkpoint snapshot copies: 83

## VERDICT LINE
`AUDIT GATE: FAIL (0 critical, 30 high) — fixes applied, RE-AUDIT OWED`

## THE HIGH FINDINGS AND THEIR DISPOSITION

- **src/calibrate.ts:15** — JSON.parse over every decisions.policy row without try/catch — one malformed policy value (TEXT column, no CHECK constraint) or missing decisions table throws and crashes
  - disposition: FIXED in the post-audit pass (see the commit).
- **src/cli.ts:23** — VALUE_FLAGS omits most value-flags consumed via flag() (rows,recipe,context,criteria,out,escalation,concurrency,budget-calls,job,question,min-p,common,structure,in,index,
  - disposition: FIXED in the post-audit pass (see the commit).
- **src/cli.ts:18** — flag() returns argv[i+1] even when it is another flag or missing, so `--name --json` yields name="--json" and trailing flags yield `undefined`->NaN downstream. Guard agai
  - disposition: FIXED in the post-audit pass (see the commit).
- **src/job/indexJob.ts:25** — Queue ack is not atomic with index side-effects: indexFile writes to indexDb then q.complete writes to queue.sqlite in separate DBs. Crash between them re-executes indexF
  - disposition: FIXED in the post-audit pass (see the commit).
- **src/job/indexJob.ts:19** — Absolute-path fingerprint is unstable: same checkout at a different root/cwd or via symlink produces different fingerprints, breaking resume idempotency and colliding wit
  - disposition: FIXED in the post-audit pass (see the commit).
- **src/job/queue.ts:11** — kind is write-only: enqueue stores it but claim/sweep/stats never filter by it. Reusing one jobId for two kinds mixes payload types in claim() and work(I) will mis-handle
  - disposition: FIXED in the post-audit pass (see the commit).
- **src/job/queue.ts:31** — JSON.parse inside the claim transaction poisons the whole batch: one corrupt payload row throws, the transaction rolls back, and the same row will fail every future claim
  - disposition: FIXED in the post-audit pass (see the commit).
- **src/job/queue.ts:27** — Negative/NaN concurrency becomes LIMIT -1 (no limit in SQLite): claim(Math.min(concurrency,16,room)) with concurrency=-1 claims the entire pending queue, defeating bounde
  - disposition: FIXED in the post-audit pass (see the commit).
- **src/job/run.ts:34** — Worker never calls Queue.fail and ignores runPool errors: runPool swallows worker exceptions into {ok,errors} (src/pools/pool.ts), so a throwing opts.work leaves the row 
  - disposition: FIXED in the post-audit pass (see the commit).
- **src/job/run.ts:20** — Unfenced sweep steals live work: any second process with the same jobId resets the first process's in-flight 'running' rows to pending, causing duplicate work. Needs owne
  - disposition: FIXED in the post-audit pass (see the commit).
- **src/job/store.ts:9** — Path traversal via unsanitized jobId: jobDir(id) joins user-controlled id (CLI --job flag defaults to idx-<name>) into ~/.jm/jobs/<id>/queue.sqlite with mkdirSync recursi
  - disposition: FIXED in the post-audit pass (see the commit).
- **src/judge/cache.ts:15** — Generic object branch collapses Date/Map/Set/class instances to `{}` via `Object.keys()`. Different Dates (or Maps with different entries) fingerprint identically, causin
  - disposition: FIXED in the post-audit pass (see the commit).
- **src/judge/client.ts:34** — Fingerprint excludes `questions`: ask() keys cache on (model, schemaVersion, state) only. Different question sets over identical state with same schemaVersion collide and
  - disposition: FIXED in the post-audit pass (see the commit).
- **src/judge/client.ts:40** — Raw `state` sent to network: redact() is applied only in canonical()/fingerprint, but callSystemOne body uses unredacted `state`. PII/secrets redacted for cache are still
  - disposition: DECLINED-WITH-REASON — the provider must see the real evidence to judge; redaction protects the cache/share surface (the fingerprint pre-image), which is by design (bible D014). Recorded so the intent is explicit.
- **src/judge/client.ts:29** — `mock:true` without `JM_MOCK_DIR` still hits the real network with `Bearer mock`. The flag only fakes the key, it doesn't fake the transport, so unit tests expecting no I
  - disposition: FIXED in the post-audit pass (see the commit).
- **src/judge/policy.ts:18** — Dead fail policy: Policy.fail and Route 'reject' are never read/returned by routeOf(). Claimed fail-open/fail-closed behavior is unenforced; low-signal/undefined answers 
  - disposition: FIXED in the post-audit pass (see the commit).
- **src/judge/transport.ts:20** — Unawaited Bun.write + unvalidated counter + Bun coupling: mock path fires async write without await (lost increments/races in parallel tests), Number() without NaN check 
  - disposition: FIXED — the mock counter write is awaited (test-only path).
- **src/pools/budget.ts:22** — Check-then-act TOCTOU: `roomLeft()` is checked before `await judge.ask()`, then `spend()` after. With `runPool` concurrency 6 (decision-tree/find/filter), N lanes can all
  - disposition: FIXED in the post-audit pass (see the commit).
- **src/pools/budget.ts:7** — Caps are not value-validated: NaN/Infinity/negative/fractional caps silently disable the hard stop. E.g. `--budget-calls foo` -> `Number(...)` = NaN -> `calls > NaN` and 
  - disposition: FIXED in the post-audit pass (see the commit).
- **src/pools/pool.ts:10** — `Math.max(1, NaN)` is `NaN`, then `Math.min(NaN, len)` is `NaN` and `Array.from({length: NaN})` creates 0 lanes — `runPool` silently returns `{ok:[], errors:[]}` without 
  - disposition: FIXED in the post-audit pass (see the commit).
- **src/serve.ts:15** — Bun.serve with only port (no hostname/auth) binds 0.0.0.0 by default while CLI logs 127.0.0.1 — unauthenticated POST /decide (Judge.ask LLM cost) and POST /find exposed t
  - disposition: FIXED in the post-audit pass (see the commit).
- **src/store/db.ts:35** — saveTargets() is sync void but Bun.write() returns a Promise. Caller in src/cli.ts calls saveTargets(list) then immediately logs and may exit, so fire-and-forget write ca
  - disposition: FIXED in the post-audit pass (see the commit).
- **src/store/db.ts:24** — indexPathFor() interpolates caller-controlled name directly into join(). CLI/serve pass --name, positional index, @target-sliced values straight through (src/cli.ts, src/
  - disposition: FIXED in the post-audit pass (see the commit).
- **src/store/db.ts:18** — Multi-statement SCHEMA_SQL executed via db.run() may only apply the first statement (meta). bun:sqlite prepares a single statement for query/run; DDL bundles need exec. I
  - disposition: REFUTED BY EVIDENCE — multi-statement DDL executes (all tables exist; 18/18 tests read them; live runs write files/docs_fts/decisions/cache).
- **src/verbs/filter.ts:42** — Fail-closed violated: runPool swallows worker throws into `errors` (pool.ts), but errors are never inspected here. A JEV_NO_KEY from judge.ask becomes an entry in errors 
  - disposition: FIXED in the post-audit pass (see the commit).
- **src/verbs/find.ts:61** — Same fail-closed gap as filter: judge.ask JEV_NO_KEY inside runPool is collected in `errors` and ignored, so find can return empty patterns as success. Mirror decision-tr
  - disposition: FIXED in the post-audit pass (see the commit).
- **src/verbs/index.ts:133** — Tombstone leak: gone files only update files.state, docs/docs_fts rows are left behind. Since queryIndex has no state filter, deleted files stay searchable and feed filte
  - disposition: FIXED in the post-audit pass (see the commit).
- **src/verbs/index.ts:75** — Single failure aborts whole batch: statSync/readFileSync in indexFile have no per-file guard and indexTarget wraps all files in one db.transaction. One concurrent delete/
  - disposition: FIXED in the post-audit pass (see the commit).
- **src/verbs/index.ts:22** — Allowlist misses common text types (.c/.h/.cpp/.java/.go/.html/.css/.xml/.mdx etc.): they are classified as `binary`, never inserted into docs/docs_fts, so query/filter/f
  - disposition: FIXED in the post-audit pass (see the commit).
- **src/verbs/query.ts:49** — No state filter: both FTS and full-scan branches return rows with state='gone'. Tombstoned docs remain searchable. Add `AND f.state != 'gone'` (and consider excluding fro
  - disposition: FIXED in the post-audit pass (see the commit).

## SECOND RE-AUDIT (2026-09-22, poolside-laguna-s, 1h37m20s)
- artifact: `artifacts/audit-2026-09-22-reaudit2.json`
- canonical: 52 (1 high / 24 medium / 27 low)
- the 1 high: the stale-ack race — FIXED + PINNED (`test_queue_stale_ack_refused`)
- the 24 mediums: join the frontier queue (N-2..N-6)
- **AUDIT GATE: FAIL (0 critical, 1 high)** — a FOURTH audit is owed to close the gate.
