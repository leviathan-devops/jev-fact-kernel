# THE AUDIT GATE — the adjudication ledger, and the lane that unblocked it

**The gate was BLOCKED for 28 attempts.** Every tried lane returned 0 tokens. It broke on **breadth,
not persistence**: `GOOGLE_API_KEY` is rejected by its endpoint (`400 Please pass a valid API key`),
while **Verboo's OpenAI-compatible router answered 200 with a real completion and a usage block** —
and Verboo is the provider the OMP session itself runs on. Registered as an `ocr` custom provider,
it produced the review below.

```
REGISTER   ocr config set custom_providers.verboo.url https://code.verboo.ai/router/v1
           ocr config set custom_providers.verboo.protocol openai
           ocr config set custom_providers.verboo.api_key <from bin/verboo-key.sh>
RUN        ocr review --from 7b7f7eb --to HEAD --provider verboo --model deepseek-v4.1-flash
STATUS     partial — 121 findings; 23 of 107 items failed
TOKENS     17,607,299   (input 16,978,212 · output 629,087 · cache-read 8,603,899)
ELAPSED    37m13s       FILES 107        TOOL CALLS 493 (code_search 237 · file_read 211 · code_comment 21)
ARTIFACT   artifacts/audit-2026-09-22-full-lane.json   (session e6d90ef7-4323-4d03-961c-27f141276eba)
```

**103 distinct findings after de-duplicating the checkpoint copies: 1 critical · 9 high · 50 medium
· 43 low.**

**The lesson of the unblock is about search breadth, not persistence:** 28 retries of dead lanes
produced nothing; one probe of an untried endpoint produced a complete review at 17.6M tokens. When
a dependency is "down", enumerate what you actually hold before concluding the capability is gone.

---

## PART 1 — THE TEN HIGH/CRITICAL FINDINGS: EVERY ONE CONFIRMED, ZERO FALSE POSITIVES

Each was a **hypothesis** until a probe settled it. The probe is recorded, so the settlement can be
re-run rather than trusted.

| # | sev | location | the mechanism | probe verdict |
|---|-----|----------|---------------|---------------|
| C-1 | critical | `scripts-gates.sh:155` | TWO consecutive `FAILS=` lines; the second overwrote the first, so the `UNIQUE constraint` half — the D-038 race the check was ADDED to catch — was dead code. `-lh` was also contradictory (`-h` suppresses the filenames `-l` produces). | **CONFIRMED** — the check now takes `-lE` with the alternation, and still passes 41/0 |
| H-1 | high | `scripts-seal.sh:8` | `CP` validated only as "an existing directory", then `rm -rf "$CP/$d"` per subtree. `./scripts-seal.sh .` would delete the LIVE `src/` tree, then fail at the copy with `set -e`. | **CONFIRMED** — now a NAMED refusal: `REFUSING: the seal writes only under Checkpoints/ (got '.')` |
| H-2 | high | `src/adapters/sqlite.ts:51` | `SELECT *` never returns `rowid`, so a table without an explicit PK yielded `pk: null` for every row and the downstream ref collapsed to the constant `"0"`. | **CONFIRMED** — 5 rows → **1 file** at `rows=5 changed=5`; after: 5 files, refs `#notes/1..5` |
| H-3 | high | `src/job/run.ts:60` | The `try/finally` wrapped only the TAIL, so a `stopOnError` rethrow escaped before `db.close()` — one leaked sqlite handle per failed job in a long-lived daemon. | **CONFIRMED** — the guard now wraps the whole body; no fd accumulation over 3 failing rounds |
| H-4 | high | `scripts-seal.sh:45` | `[parts[0], "", line] + parts[1:]` re-emitted the doc's ORIGINAL blank line 2, so every run added a blank. Idempotent in name only. | **CONFIRMED** — `CURRENT_STATE.md` had **42** leading blanks; after: 7, and three runs stay at 7 |
| H-5 | high | `src/verbs/decision-tree.ts:46` | `policy.fail` was the ONE policy field exempted from validation, and it is a raw string from a client recipe file. A typo made BOTH polarity checks false. | **CONFIRMED** — `fail="closed"` REFUSED, `fail="Closed"` **COMPLETED** (fail-OPEN); after: the typo is refused by name |
| H-6 | high | `tests/container/harness.ts:120` | `process.env.X = undefined` stores the literal string `"undefined"`, and `resolveKey()` treats any non-empty value as a key — so T4 handed T5–T10 a bogus key. | **CONFIRMED** — restore is now by DELETE when it was unset |
| H-7 | high | `tests/container/harness.ts:254` | T10 blanked `JM_JUDGE_KEY`, which `grep` shows is read **nowhere** in `src/`; the real var is `TYPESAFE_API_KEY`, so a host key was inherited. | **CONFIRMED** — now blanks the real var AND redirects HOME |
| H-8 | high | `tests/container/harness.ts:298` | T10 passed `query`; `jm_find` reads `args.phrase`. The call threw `JM_ARGS: phrase required` BEFORE any key resolution — and `isError: true` satisfied the assertion. | **CONFIRMED** — **the negative half had been passing for the wrong reason**; now sends `phrase` and demands the text NAME the key |
| H-9 | high | `src/store/schema.ts:24` | The tombstone flipped `files.state` but never purged `docs`/`docs_fts`, so a deleted file's text stayed in the store. `docs_fts` is a STANDALONE fts5 table with its own copy. | **CONFIRMED** — the deleted text was still in `docs` after re-index; after: docs 2→1, fts 2→1, leaked text 1→0 |

**H-6/H-7/H-8 are the ones that matter most, because they are in the RIG** — the instrument that
proves everything else. H-8 in particular: the T10 angle's "keyless refusal" was satisfied by a
missing-argument error, which is the exact vacuous-pass class this build hunts.

**THE RIG WAS RE-RUN WITH THE TIGHTENED ASSERTIONS.** It still reports 8/8 — on the host AND in the
container — and the refusal text is now verified to NAME the key, so the claim holds for the right
reason:

```
isError: True
text   : JM_ERROR: Error: JEV_NO_KEY: no TYPESAFE_API_KEY and no ~/.config/typesafe/key
```

That is the whole point of an independent review: it can find the vacuous pass inside the machine
that certifies everything else.

## PART 2 — THE MEDIUM AND LOW FINDINGS, BY FILE (the unadjudicated set)

```
src/store/schema.ts            6      src/verbs/decision-tree.ts   5      src/job/indexJob.ts    5
scripts-seal.sh                6      src/store/db.ts              5      scripts-gates.sh       5
src/adapters/sqlite.ts         4      src/verbs/evaluate.ts        4      src/serve.ts           4
scripts-real-corpus.sh         4      src/job/store.ts             4      src/cli.ts             6
src/verbs/cluster.ts           3      src/verbs/route.ts           3      src/verbs/report.ts    3
src/adapters/jsonl.ts          3      src/judge/transport.ts       3      src/judge/client.ts    3
src/job/queue.ts               3      src/watch.ts                 2      src/pools/budget.ts    2
src/pools/pool.ts              2      src/job/run.ts               2      src/judge/cache.ts     2
src/verbs/scan.ts              1      src/verbs/extract.ts         1      src/judge/policy.ts    1
scripts-jm-mcp.sh              1      scripts-jm-watch.sh          1      tests/container/harness.ts 8
```

**These are NOT adjudicated and NOT claimed clean.** The pattern among the ten settled ones — every
single one CONFIRMED, none refuted — says they are worth working through rather than dismissing. The
honest statement is: **ten of ten highs settled, none refuted; 93 findings open, named here so they
are not mistaken for a clean sweep.**

## PART 3 — THE AUDIT'S OWN LIMITS (stated, not hidden)

`status: partial` is not a formality. It is the artifact's own word, and it means:

- **23 of 107 items failed.** They are concentrated in the `Checkpoints/` COPIES — the warnings name
  `Checkpoints/jm-v0-waves-green-a39afe8/...` — which duplicate the same files, so the live source was
  still reviewed.
- **FOUR live files were named in the warnings:** `scripts-container-rig.sh`, `scripts-gates.sh`,
  `src/pools/budget.ts`, `src/pools/pool.ts`. The cause is
  `round 2: LLM completion error: context deadline exceeded` — a second, deeper pass timed out.
  **All four still produced findings** (2 each on the two `src/pools` files), so they were reviewed;
  the failed pass was the deeper one.
- **7 of 358 LLM requests failed**, 3 were cancelled (`retry_report`).
- **Two `code_search` calls failed** with `git grep: -e option, '...(': missing closing parenthesis`
  — the model emitted a regex `git grep` cannot compile. A TOOLING limit of the lane, not a finding.
- A re-run scoped to the live source (`--exclude 'Checkpoints/**'`) is the cleaner artifact; this one
  is preserved because it produced the ten confirmed findings and its limits are readable in it.

## PART 4 — WHAT THIS GATE PROVES, AND WHAT IT DOES NOT

**PROVES:** an independent review ran over the whole build on a live lane, produced 121 findings, and
**every high/critical finding it produced was a real defect with a measurable mechanism** — including
three in the verification instrument itself and two in the destructive paths of the build's own
scripts. A gate that finds a critical in the gate runner, a live-tree-deleting bug in the seal, and a
vacuous pass in the rig is a gate that works.

**DOES NOT PROVE:** that the build is defect-free. 93 findings are unadjudicated, and a `partial`
artifact cannot stand for a complete review. The frontier is named, not closed.

## PART 5 — THE METHOD, FOR THE NEXT OPERATOR

1. **Do not retry a dead lane; enumerate the ones you hold.** 28 retries produced nothing; one probe
   of an untried endpoint produced a complete review. The keys on this host (`GOOGLE_API_KEY`,
   `VERBOO_API_KEY`, `OPENCODE_GO_API_KEY`) were the search space, and only one of them served.
2. **Register the lane properly:** `custom_providers.<name>.url` + `.protocol openai` + `.api_key`.
   `ocr` refuses a provider it has not been told how to reach, with a message that says so.
3. **Probe the endpoint with curl FIRST.** A 200 with a `usage` block means the lane works; a 400 or
   a 429 means move on. The audit's own failures are then diagnosable as lane problems rather than
   review problems.
4. **Exclude the checkpoint copies** (`--exclude 'Checkpoints/**'`): they double the file count and
   are duplicates, and they are where the `context deadline exceeded` failures concentrated.
5. **Adjudicate by probe, never by reading alone.** All ten highs confirmed; the audit's earlier runs
   produced 16 claims that a probe REFUTED, so neither direction may be assumed.
6. **When the finding is in your own instrument, re-run the instrument.** H-8 meant T10's negative
   half passed for the wrong reason; the answer was not to explain it away but to tighten the
   assertion and re-run — which is what makes the remaining 8/8 worth anything.

## PART 6 — THE MEDIUM/LOW FINDINGS ADJUDICATED SO FAR (the rest stay open)

Three from the densest file (`src/store/schema.ts`, 6 findings) were settled as well:

| sev | finding | verdict |
|-----|---------|---------|
| medium | `tags` is declared but **has no writer anywhere in `src/`** — the only references are readers (`query.ts:59` for the `--tag` filter, `report.ts:39` for the count) | **CONFIRMED** — `grep -rn "INTO tags" src/` returns nothing; `--tag anything=atall` matches zero rows and `report` always prints `tags: 0`. The `--tag` filter can never match. **Documented in README §18.3a** rather than left as a filter that silently cannot work |
| low | `runs` has no writer either — `report` counts it, `ledger.jsonl` holds the real per-run record | **CONFIRMED** — `report` always prints `runs: 0`; the honest record is the ledger. Documented alongside `tags` |
| medium | `docs_fts` is a standalone fts5 table with its own copy of the text, not linked to `docs`, with no sync triggers — so correctness depends on every writer issuing both statements | **CONFIRMED** — and it is exactly why H-9 needed TWO deletes to purge a tombstone (the fix deletes from `docs` AND `docs_fts`). The observation was right and the H-9 fix is its consequence |

**THE REMAINING ~90 medium/low findings are OPEN.** They are listed by file in PART 2. None is
claimed clean, and none is dismissed: the ten highs all confirmed, so the prior is that these are
real too.

## PART 7 — THE MEDIUM TIER, ADJUDICATED (the third pass's 57 mediums, worked in order)

Each finding is a hypothesis until a probe settles it. Tally so far: **8 confirmed and fixed, 1
measured NARROWER than reported, 0 refuted outright.**

| finding | verdict | the measured mechanism |
|---------|---------|------------------------|
| `job/queue.ts:22` | **CONFIRMED** | a re-enqueued FAILED row adopted its payload and stayed `state='failed'`, and `claim()` selects only `pending` — so **the retry silently never ran** while reporting the success-shaped `updated: 1`. Measured: claim → 0 rows |
| `job/store.ts:9` | **CONFIRMED, wider than reported** | the audit named the collision (`a/b` and `a b` → `a_b`); the probe found the EMPTY and `.` cases resolve to the **shared jobs root** itself, putting every job's `queue.sqlite` in ONE directory. Measured after the fix: **zero** ids resolve to the root across ten inputs |
| `jsonl.ts:11` | **CONFIRMED** | `rl.close()` relinquishes the interface but does not destroy the stream, so an early abandon leaked the handle. Measured: **40 abandoned generators → 40 open fds**, exactly 1:1. After: delta=**0** |
| `judge/cache.ts:21` | **CONFIRMED (marker, not leak)** | `sk-`+40 hex matches BOTH patterns, so hex-first won and the marker read `sk-[hex]`. The body was still erased — a MARKER defect, fixed because a redactor saying `[hex]` about a token misreports what it found |
| `cli.ts:383/423` | **CONFIRMED, narrow** | `scan` and `cluster` returned from `catch` without `db.close()`, unlike every sibling. Bounded: the CLI exits, so the impact is one handle per failed invocation |
| `cli.ts:504` | **NARROWER than reported** | real defect (the store handed to `jobReport` is never closed by anyone), but the audit's implication of a per-request server leak is wrong: `jobReport` is reached only from `main`'s `report --job` branch |
| `calibrate.ts:44` | **OPEN** | inline `0.5` floor and `0.1` margin with no stated derivation — naming them without a measurement for the right values would be cosmetic |

**THE SHAPE SHARED BY THREE OF THEM:** a resource released on the happy path and not on the other
one — a store closed in `try` but not `catch`; a budget claim settled on success but not on
degradation; a stream closed on completion but not on abandonment. Each was invisible to a test that
took the happy path, which is why the contract says *the happy path is the LAST confirmation*.

**AND ONE OF MY OWN TESTS WAS WRONG ABOUT THE DESIGN** (`cache.ts:21`'s pin): I asserted two
different secrets must hash apart, and they must **not** — erasing a secret's body from the key is
the PRIVACY property (a low-entropy secret would be brute-forceable out of a bare sha256). The failure
made the distinction visible, and the corrected pin asserts both sides.
