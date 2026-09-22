# BUILD_STATE — the module inventory + the SHA chain (OVERWRITE + append SHA)

**TREE SHA: `f579c3ccc31938775339bc1dbb86aefc` (git 85ad7c4)** - every canon doc that carries this line carries THIS sha; a disagreement means one is stale. Re-derive with ./scripts-seal.sh
## THE SHA CHAIN (append-only; each row is a state that was SEALED and re-verified)

| when | git | tree sha | battery (from the sealed copy) |
|------|-----|----------|-------------------------------|
| 2026-09-21 wave-0 | `a39afe8` | `35e7742545bb011bfaf9df11ed01317a` | 18 pass / 0 fail |
| 2026-09-21 waves 1-4 | `b8bd8fa` | refreshed per wave | 29 pass / 0 fail |
| 2026-09-21 post second-operator r1 | `cc94a1e` | `35e7742545bb011bfaf9df11ed01317a` | 30 pass / 0 fail |
| 2026-09-21 W2/W3 | `b4d60b9` | `a75230e39e862224460a9bbf971ae8ad` | 71 pass / 0 fail |
| 2026-09-21 W5/W6/W7 + the rig | `b3d7536` | `22178de50f7d2037999fd0efb7d7d53c` | 116 pass / 0 fail |
| 2026-09-21 final | `97f522f` | `0d5d99f34de62b20304d5a79169fdb53` | 116 pass / 0 fail + rig 7/7 |

The chain exists so a future session can tell WHAT was proven WHEN. A row that cannot point at a
sealed copy does not belong here.

## THE MODULE INVENTORY (src/, 34 files)

| file | lines |
|------|-------|
| `src/adapters/jsonl.ts` | 38 |
| `src/adapters/sqlite.ts` | 75 |
| `src/calibrate.ts` | 61 |
| `src/cli.ts` | 604 |
| `src/job/indexJob.ts` | 40 |
| `src/job/queue.ts` | 83 |
| `src/job/run.ts` | 75 |
| `src/job/store.ts` | 38 |
| `src/judge/cache.ts` | 55 |
| `src/judge/client.ts` | 67 |
| `src/judge/key.ts` | 26 |
| `src/judge/policy.ts` | 121 |
| `src/judge/transport.ts` | 66 |
| `src/ledger.ts` | 64 |
| `src/mcp.ts` | 195 |
| `src/pools/budget.ts` | 60 |
| `src/pools/pool.ts` | 27 |
| `src/serve.ts` | 136 |
| `src/store/db.ts` | 95 |
| `src/store/schema.ts` | 69 |
| `src/targets.ts` | 180 |
| `src/verbs/cluster.ts` | 93 |
| `src/verbs/decision-tree.ts` | 173 |
| `src/verbs/evaluate.ts` | 141 |
| `src/verbs/excerpt.ts` | 54 |
| `src/verbs/extract.ts` | 88 |
| `src/verbs/filter.ts` | 58 |
| `src/verbs/find.ts` | 163 |
| `src/verbs/index.ts` | 173 |
| `src/verbs/query.ts` | 77 |
| `src/verbs/report.ts` | 192 |
| `src/verbs/route.ts` | 150 |
| `src/verbs/scan.ts` | 93 |
| `src/watch.ts` | 105 |

## THE TEST INVENTORY (tests/, 38 files)

| file | lines |
|------|-------|
| `tests/adapters.test.ts` | 196 |
| `tests/adversarial.test.ts` | 101 |
| `tests/adversarial2.test.ts` | 230 |
| `tests/adversarial3.test.ts` | 242 |
| `tests/audit-findings.test.ts` | 56 |
| `tests/budget.test.ts` | 62 |
| `tests/cache-endpoint-scope.test.ts` | 46 |
| `tests/calibrate-unknown.test.ts` | 66 |
| `tests/cli-contract.test.ts` | 153 |
| `tests/concurrency.test.ts` | 95 |
| `tests/container/harness.ts` | 347 |
| `tests/decide.test.ts` | 209 |
| `tests/decision.test.ts` | 112 |
| `tests/find-excerpt.test.ts` | 91 |
| `tests/find.test.ts` | 157 |
| `tests/guard-query.test.ts` | 46 |
| `tests/guards.test.ts` | 88 |
| `tests/helpers.ts` | 30 |
| `tests/index.test.ts` | 57 |
| `tests/job-report.test.ts` | 101 |
| `tests/judge-answer-shape.test.ts` | 79 |
| `tests/judge-outage.test.ts` | 77 |
| `tests/judge-policy.test.ts` | 128 |
| `tests/judge-usage.test.ts` | 72 |
| `tests/ladder-reason.test.ts` | 55 |
| `tests/launcher.test.ts` | 94 |
| `tests/ledger.test.ts` | 26 |
| `tests/mcp-notification.test.ts` | 70 |
| `tests/mcp.test.ts` | 89 |
| `tests/phantom-artifacts.test.ts` | 175 |
| `tests/query.test.ts` | 37 |
| `tests/redact-perf.test.ts` | 58 |
| `tests/regression.test.ts` | 54 |
| `tests/resume.test.ts` | 100 |
| `tests/retrieve.test.ts` | 192 |
| `tests/store.test.ts` | 37 |
| `tests/watch.test.ts` | 133 |
| `tests/wave-gates.test.ts` | 192 |

## WHAT EACH MODULE OWNS (one line each, so a reader knows where to look)

| module | owns |
|--------|------|
| `src/cli.ts` | the verb router (17 verbs), the flag parser, the exit-code policy (0 ok / 1 runtime / 2 client / 3 budget-stopped) |
| `src/store/db.ts` | the store spine: `openDb` (creating), `openIndexExisting` (refusing), the registry, `safeName` |
| `src/store/schema.ts` | the schema: files · docs · docs_fts · tags · runs · decisions · cache |
| `src/verbs/index.ts` | the walker, the (size, mtime) fast path, the content-sha slow path, tombstones, the target-namespacing path PREFIX |
| `src/verbs/query.ts` | the restricted `--where` parser (whitelisted columns AND operators), FTS with bm25 rank, the LIMIT guard |
| `src/verbs/scan.ts` | seeds to candidates: a regex gate with hit counts and a bounded excerpt |
| `src/verbs/cluster.ts` | deterministic signature grouping (no model): (source, kind) first, then top-N tokens |
| `src/verbs/extract.ts` | structured pulls (capture-group regex or a named field), md/json/csv rendering |
| `src/verbs/find.ts` | the 9-stage chain, the support filter (`--common`), the pattern shape C5 requires |
| `src/verbs/filter.ts` | per-row judged triage with bands |
| `src/verbs/decision-tree.ts` | batching, the recipe VALIDATOR, the ladder, the escalation file |
| `src/verbs/route.ts` | the catalogue Choice, the injection text, the runner-up log |
| `src/verbs/report.ts` | the read-only status view (index + global ledger) |
| `src/judge/client.ts` | the ONE judge client: cache lookup before the transport |
| `src/judge/cache.ts` | the fingerprint (provider · model · schema · state) and the hits-preserving upsert |
| `src/judge/key.ts` | key resolution (env, then the file) — never logged |
| `src/judge/policy.ts` | the ladder (signalOf, routeOf) and the policy defaults |
| `src/judge/transport.ts` | the ONE network seam; JM_MOCK_DIR makes it canned for tests |
| `src/job/queue.ts` | claim/ack/complete, and the stale-ack refusal |
| `src/job/run.ts` | the pool runner, the SYNCHRONOUS budget claim, the resume path |
| `src/job/indexJob.ts` | the queued index path (the crash-resume contract) |
| `src/job/store.ts` | the per-job directory and its queue db |
| `src/pools/budget.ts` | caps, claim/settle, and the sticky post-refusal state |
| `src/pools/pool.ts` | the deterministic worker pool |
| `src/targets.ts` | the adapters (fs · jsonl · sqlite) and the INJECTIVE target-name namespace |
| `src/adapters/sqlite.ts` | read-only source attach, table enumeration, row rendering |
| `src/adapters/jsonl.ts` | streaming parse; a malformed line is a marked row, never a crash |
| `src/serve.ts` | the HTTP surface; /health is a pure report, /find refuses a missing index |
| `src/mcp.ts` | the MCP stdio surface; READ tools refuse a missing index, the WRITE tool creates |
| `src/watch.ts` | the reconcile daemon: one idempotent tick and a real JSONL journal |
| `src/calibrate.ts` | the band read, the truth record, the calibration event |
| `src/ledger.ts` | the append-only run record; the cost line on STDERR so stdout stays data |

## WHAT IS NOT BUILT (and where that absence is STATED)

| absent | where it is stated |
|--------|--------------------|
| `src/firegate/` and the `jef` CLI (W8) | README sections 7 and 10 mark the layer NOT BUILT; VIOLATION_LOG C15-C18 are NOT APPLICABLE |
| the per-job reconciliation verb (`report --job`) | VIOLATION_LOG C8, recorded as an OPEN violation |
| embeddings, a web UI, cross-machine cache sharing | README section 14 and spec section 4: explicitly out of scope for v1 |
| the 3 short append-only logs | VIOLATION_LOG C20, recorded as PARTIAL |

## HOW TO RE-DERIVE EVERYTHING IN THIS FILE

Run each of these; if a number disagrees with a table above, the command wins and this file is the
bug:

- `find src -name '*.ts' | wc -l` — the src file count
- `find src -name '*.ts' -exec cat {} + | wc -l` — the src line total
- `bun test 2>&1 | tail -3` — the battery, from the LIVE tree
- `cd Checkpoints/jm-v0-waves-green-a39afe8 && bun test tests/` — the battery, from the SEAL
- `cat Checkpoints/jm-v0-waves-green-a39afe8/SOURCE_TREE.sha256` — the sealed sha
- `git log --oneline 7b7f7eb..HEAD | wc -l` — commits since the design base
- `./scripts-seal.sh` — refresh the seal (idempotent; replaces each subtree rather than nesting it)
- `./scripts-container-rig.sh host` — the spec section 9 rig on this host


## THE MODULE BOUNDARIES THAT TOOK THE LONGEST TO GET RIGHT

Four rules in this codebase were each learned from a defect, and each is worth stating plainly
because the next editor will be tempted to "simplify" one:

1. **A read verb REFUSES a missing index; a write verb CREATES one.** The asymmetry is the whole
   point. When the rule was half-applied (the CLI had it, the MCP and HTTP surfaces did not), a
   typo produced an empty result at exit 0 AND a phantom index file, so "no matches" and "no such
   index" were indistinguishable from the outside. The rule now lives in two named functions —
   `openDb` and `openIndexExisting` — and every caller picks one deliberately.

2. **A budget is claimed SYNCHRONOUSLY, before an awaited call.** `roomLeft()` alone is a
   check-then-await, so every lane in a pool can pass it before any lane spends; a cap of 1 produced
   3 calls. `claim()` runs before the await and `settle(cost, cached)` runs after, refunding the
   claim for a cache hit. The post-refusal state is deliberately STICKY: the budget stays closed,
   because a rollback would re-open the cap and permit unlimited retries.

3. **A value that becomes a KEY must map one-to-one.** Two separate defects (D-008 via the path,
   D-027 via the name) were the same bug: a transformation that was supposed to make a value SAFE
   silently MERGED two of them. Both are now injective, and both have a pin asserting the row count
   rather than merely that a row exists.

4. **STDOUT IS DATA; diagnostics go to stderr.** The cost line sat on stdout because it is not an
   error — but it corrupted every piped payload (a csv got a non-csv first line, a json document
   failed to parse). The rule is not "the cost line is an error"; it is "stdout carries only the
   payload".

## WHAT A "PROVEN" CLAIM LOOKS LIKE IN THIS PROJECT

Every architectural statement above traces to one of four instruments, and a claim that traces to
none of them is not made:

- **The battery** (116 assertions) — for module behaviour, run from the live tree AND from the seal.
- **The container rig** (7 angles) — for environment independence, with tokens that only the
  assertions can emit.
- **The runtime seat** — for behaviour under first-person operation, where the author's seat is the
  default failure.
- **The adversarial sweeps** — for the input classes the author did not imagine.

The audit lane sits beside these as a fifth instrument, and it is the only one that can be BLOCKED
rather than passed or failed: an external quota cannot be argued with, and a partial run is never
recorded as a pass.

## THE RESIDUAL, STATED ONCE

The engine does what the spec asks of it, in two environments, with every defect it has ever had
documented beside the probe that found it. What remains is named in exactly three places — the
checkpoint manifest's HONEST GAPS, VIOLATION_LOG.md parts 1 and 2, and TASK_QUEUE.md's NEXT and W8
tables — and none of the three softens the others.


## THE INSTRUMENTS, AND WHAT EACH ONE CANNOT SEE

| instrument | sees | CANNOT see |
|-----------|------|-----------|
| the battery (116) | module behaviour on known paths | the paths its author did not imagine; a hostile input class it never wrote a fixture for |
| the container rig (7) | environment dependence (a different kernel, userspace, /tmp, no host key) | behaviour under real load; anything requiring the host's key |
| the runtime seat | behaviour first-person, under real corpora and real cost | a defect that only appears in a load pattern the seat did not reach |
| the adversarial sweeps | the input classes an attacker (or a bored operator) would try | a defect that needs two features in combination |
| the audit lane | a fresh reader's view of every line | nothing reliable while it is rate-limited; ~1 in 3 of its findings is a hallucination |

Each instrument found defects the others could not, and the union is what the defect ledger records.
That is the argument for keeping all five rather than the cheapest one.
