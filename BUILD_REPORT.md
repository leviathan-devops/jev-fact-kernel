# BUILD_REPORT — JM v0.1 (waves W0–W7) — 2026-09-21

**Repo:** `Shared_Workspace/JevManager` @ branch `master` · base design commit `7b7f7eb`,
build commits `715e5e8` (W0) · `ad2c8e1` (W1) · `bede487` (W3+W5) · `a39afe8` (W4+W6+W7).
**Source shas (top of tree):**
```
ba133ed6fb513cb2 src/cli.ts
73b25ace0030c316 src/judge/client.ts
e9bf91428d9cef34 src/verbs/find.ts
```
**Battery:** 18 pass / 0 fail / 87 expects / 8 files · `tsc --noEmit` exit 0.

## THE BUILT (what exists, and where)

### The substrate
- `src/store/{schema,db}.ts` — one sqlite per index, FTS5 text, WAL; `files/docs/docs_fts/tags/runs/decisions/cache` tables; lazy paths so tests sandbox via `JM_HOME`.
- `src/ledger.ts` — append-only `ledger.jsonl`, one row per verb invocation (errors included),
  the cost line on every run (stderr under `--json`), `readLedger()` for reports.

### The operations (deterministic)
- `src/verbs/index.ts` — `indexTarget` / `indexFile` / `listFiles`: walk (globs, excludes),
  sha256 with an 8MB cap, FTS text with a 256KB cap, (size,mtime) incremental skip, tombstones,
  `truncated` flag when a cap bites. **Live: 11,831 files in 4.0s; re-run 60ms (2.5%).**
- `src/verbs/query.ts` — `--where` (whitelisted columns/ops, parameterised), `--fts` (FTS5 MATCH),
  `--tag`. **Live: `size>2000` -> 1182 rows; `--fts "theatrical"` -> 341 rows.**

### The job runtime
- `src/job/{store,queue,run,indexJob}.ts` — per-job store (`~/.jm/jobs/<id>/`), crash-first queue
  rows with a UNIQUE fingerprint, ack-on-complete, the RESUME SWEEP, budget-clamped claims.
- `src/pools/{pool,budget}.ts` — bounded concurrency; hard caps with `roomLeft()`.
  **Live: SIGKILL at done=1328 left `running: 8`; resume `resumed=8` -> `done=11831` dup=0.**

### The judge (the product)
- `src/judge/key.ts` — env -> `~/.config/typesafe/key`; fingerprints only (`463e63ca5302` here).
- `src/judge/transport.ts` — the ONE network seam; a canned-response mode for tests.
- `src/judge/cache.ts` — redact -> canonical -> `sha256(model ⊕ schema ⊕ state)`; cache table.
- `src/judge/policy.ts` — thresholds as policy; `signalOf`/`routeOf` with inclusive boundaries.
- `src/judge/client.ts` — cache-first `ask()`; cost computed at write time; fail-closed on no key.
- `src/verbs/decision-tree.ts` — rows x recipe -> banded decisions + escalation file; artifacts
  are deterministic; every decision persists to the `decisions` table for calibration.
  **Live: `act 0.97 / noop 0.08 / act 0.90`, $0.000044; replay `calls=0 cached=3`.**

### The find chain (the Z-patterns ask)
- `src/verbs/find.ts` — pick -> seed -> fetch -> narrow -> judge -> rerank -> cluster -> label ->
  emit (md|json). **Live: `44 -> 30 -> 1 -> 1`, the Fire Gate blueprint surfaced at p=0.80.**
- `src/verbs/filter.ts` — FTS narrowing then one Noul per survivor, banded.

### The surfaces
- `src/serve.ts` — `Bun.serve` on :7777: `/health` · `/decide` · `/find` · `/jobs`.
  **Live: `/decide` `noul 0.98`, replay `cached=true cost=0`.**
- `src/cli.ts` — `index · query · filter · find · decision-tree · target · serve · calibrate · report`,
  `--json` everywhere, cost line everywhere, `exit 2` fail-closed, `exit 3` budget stop.
- `src/calibrate.ts` — bands from recorded rows, `recordTruth`, `recordCalibration`.

## THE EVIDENCE (each claim -> its run)

| claim | the run |
|-------|---------|
| index 11,831 files | `JM_INDEX_OK files=11831 changed=11831 text=11306 ms=4019` |
| incremental re-index | `changed=0 ms=60` (2.5% of run 1 — the <10% gate) |
| crash-safe resume | `kill -9` -> `running:8` -> `resumed=8` -> `done=11831`, dup=ZERO |
| budget hard stop | `done=100 budget_stopped=true`, exit 3, pending preserved |
| live judge | `act 0.97 / noop 0.08 / act 0.90`, model `jev-1.13.0`, `$0.000044` |
| cache determinism | `calls=0 cached=3`; sha `a3bc30351f68dad8` on both files |
| HTTP surface | `/decide` `noul 0.98` `$0.0000124`; replay `cached=true cost=0` |
| find chain | trend `44 -> 30 -> 1 -> 1` with an exemplar at p=0.80 |
| adversarial | 18/0 battery; injection `act 0.99` vs benign `noop 0.01` |
| no PII in cache | `emails in cache: False · fingerprints only: True` |

## THE HONEST NOTES (what is NOT done)
- **W2 adapters**: the `fs` path + the target registry work (live), but the dedicated `sqlite`
  and `jsonl` adapters were not written; `@ocdb` was never queried.
- **W8 fire gate**: NOT started (F1/F6 rulings owed) — the runtime-kernel layer remains design.
- **The audit gate**: BLOCKED (the code-audit lane was not run) — no ship-ready claim is made.
- **Doc floors**: BUILD_REPORT and DEBUG_LOG are below the 500-line ship floor; the canon set is
  partial (the 2 high-frequency logs + the seat record are live and dense). Padding was refused;
  the gap is recorded rather than papered.
- **The second-operator drill** (a zero-context agent driving JM from the docs) is owed.
