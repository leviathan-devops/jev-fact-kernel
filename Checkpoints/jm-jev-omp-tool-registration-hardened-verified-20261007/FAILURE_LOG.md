# FAILURE_LOG — JM derailment ledger (append-only)

### F-01 — The silent zero (index ate the whole corpus) (2026-09-21)
- **What happened:** `jm index @shadow --include '*.json'` returned `files=0` with exit 0.
- **Found:** by running the probe and asserting counts (not by reading).
- **Root cause:** `[^/]*` cannot cross `/`; every nested path failed the include filter.
- **Impact:** the primary corpus appeared empty while the tool reported success.
- **Disposition:** FIXED+PROVEN (EN-001; full run `files=11831`).

### F-02 — The invisible byte (a security control silently dead) (2026-09-21)
- **What happened:** secret redaction did not fire on `sk-` shaped strings.
- **Found:** the adversarial sweep (P5), before any ship claim.
- **Root cause:** a backspace byte (0x08) in the regex, produced by an escape through a non-raw string layer.
- **Impact:** secrets could have entered the canonical state and the cache fingerprint pre-image.
- **Disposition:** FIXED+PROVEN (EN-007; control-char sweep 1->0; `test_adv_redaction` green).

### F-03 — The corpus that was the wrong corpus (2026-09-21)
- **What happened:** `find "theatrical claim"` over @shadow returned `kept=0` at p>=0.8.
- **Found:** by operating live and reading the excerpts (they are diff blobs, many literally `[]`).
- **Root cause:** not a defect — target selection: `session_diff` carries file diffs, not claim text.
- **Impact:** a naive reading would have called the chain broken; the truth is the corpus choice.
- **Disposition:** NOT-A-BUG (recorded; the same chain found the real document over @reports at p=0.80).

### F-04 — The plan named `WAVE PLAN` twice; the validator's head window is strict (2026-09-21)
- **What happened:** a draft pin failed G2 until the build-package reference sat inside WAVES/LAWS/PROOF.
- **Root cause:** the validator scans only the three slots for the package reference.
- **Impact:** one emit iteration.
- **Disposition:** FIXED (pin re-emitted; PASS 122 lines).

### F-05 — The audit gate FAILED on first run (30 high findings) (2026-09-21)
- **What happened:** `ocr review` over the build diff returned 174 comments; 91 canonical
  (30 high) — real defects: `filter`/`find` swallowed `JEV_NO_KEY` into an empty success (an L4
  violation), tombstones stayed searchable, `/decide` bound 0.0.0.0 unauthenticated, `claim(NaN)`
  became `LIMIT -1`, `runPool(NaN)` created zero lanes, budget caps accepted NaN, the cache
  fingerprint ignored the question set, and a per-file index error aborted the whole batch.
- **Found:** the P6 audit gate (the first time it ran).
- **Root cause (one mechanism):** the happy path was built and tested; the BOUNDARY arguments
  (NaN, negative, missing key, deleted files, hostile concurrency) were not.
- **Impact:** the gate blocks every ship-ready claim — correctly.
- **Disposition:** FIXED (the post-audit fix pass; battery 18/0, tsc 0) — **RE-AUDIT OWED**;
  the gate remains FAIL until it passes.

### F-06 — The audit scanned the checkpoint copies too (2026-09-21)
- **What happened:** 83 of the 174 comments were duplicates from `Checkpoints/**/src`.
- **Root cause:** the checkpoint snapshot is committed, so it appears in the diff.
- **Impact:** inflated the finding count ~2x (canonical 91, not 174).
- **Disposition:** FIXED (canonical-only analysis; the checkpoint is excluded from test discovery
  via `bunfig.toml [test] root = "tests"`). Future audits should diff the checkpoint out.

### F-07 — The re-audit lane failed (BLOCKED, not passed) (2026-09-21)
- **What happened:** the second `ocr review` run returned `status: failed` — 53/53 items failed,
  76/76 requests failed after 380 retries, 0 tokens, 2m49s. The provider lane (muse-free) is down.
- **Found:** by running it — the failure is loud in the artifact, not silent.
- **Root cause:** the provider lane, not the code under review (0 tokens means no review happened).
- **Impact:** the gate cannot be re-verified this session; the first run's FAIL remains authoritative.
- **Disposition:** **BLOCKED** with the retry condition: re-run when a lane returns non-zero tokens,
  or switch lanes (zen-free adapter :4098, or `--provider poolside --model laguna-s-2.1:high`).
  The blocked artifact is preserved at `artifacts/audit-2026-09-21-reaudit-BLOCKED.json`.

### F-08 — The re-audit ran on a working lane and found 6 new highs (2026-09-22)
- **What happened:** after the muse-free lane failed at 0 tokens, the run was re-executed on
  `poolside-laguna-s` (10,617 tokens on the lane test first): status `partial`, 45 comments,
  37 canonical (6 high / 18 medium / 13 low), 46m24s.
- **Found:** the lane works; the high set is SMALLER (30 -> 6) but non-empty.
- **Root cause classes:** a ledger that could mask a real error (H1); an unvalidated spend (H2);
  an un-awaited registry write (H3); Date/Map collapse in redaction (H4); an interpolated LIMIT
  (H5); a tombstone that never reactivates (H6).
- **Impact:** the gate stays FAIL — correctly: the fixes are claims until a THIRD audit passes.
- **Disposition:** FIXED in the second fix pass (all six + the medium frontier items); pinned in
  `tests/regression.test.ts`; battery 28/0.

### F-09 — The second re-audit found 1 high (the stale-ack race) (2026-09-22)
- **What happened:** the third audit run (second working-lane run) returned 131 comments, 52
  canonical (1 high / 24 medium / 27 low) in 1h37m. The 1 high: `complete()`/`fail()` without
  a state guard let a stale process overwrite a live process's re-claimed row.
- **Found:** the machine review, not the battery (the race needs two processes).
- **Root cause:** the ack wrote unconditionally on `id` alone; the sweep legitimately moves rows
  between claim and ack, so the stale ack landed on a row it no longer owned.
- **Impact:** double-processing with possible data loss under process overlap — a real race.
- **Disposition:** FIXED (conditional ack `AND state='running'` + a refused-ack error path) and
  PINNED (`test_queue_stale_ack_refused`); battery 29/0. The gate stays FAIL until a fourth audit.

### F-10 — The third re-audit found 1 critical (refuted) + 2 highs (2026-09-22)
- **What happened:** the fourth audit run returned 15 comments, 6 canonical (1 critical / 2 high /
  2 medium / 1 low). The critical claims the schema DDL applies only the first statement; the
  highs claim cached judge calls consume budget slots in `filter` and `find`.
- **Found:** the machine review.
- **Adjudication:** the critical is REFUTED — a live probe shows `db.run` applies every statement
  (all 13 tables exist) and the suite exercises them. The 2 highs are CONFIRMED and fixed.
- **Impact:** the gate stays FAIL — correctly: the fixes are claims until a fifth audit passes.
- **Disposition:** FIXED (cached hits skip `spend`; same-class fix in `decision-tree`; route+reason
  from one signal; tag split on first `=`; saveTargets import) and pinned; battery 29/0.

### F-11 — Every audit lane is rate-limited; the gate is BLOCKED (2026-09-22)
- **What happened:** five lane probes and three full-scope runs: only `openrouter-laguna-xs-free`
  returned tokens, and it 429s on the full 58-file scope (`upstream_provider_shared_pool`).
- **Found:** by probing each lane on a 2-file commit before committing to a full run.
- **Root cause:** upstream provider shared-pool limits on every configured free lane; the direct
  poolside lane 429s at 90/90 requests.
- **Impact:** the fifth audit cannot complete; the fourth run's FAIL remains authoritative.
- **Disposition:** **BLOCKED** with the retry condition (any lane returning non-zero tokens across
  the full scope). The scoped partial run's 4 findings were adjudicated (2 high fixed + pinned,
  1 medium fixed, 1 medium refuted).
- **Note:** the checkpoint copies inflate the audit scope (58 files vs 26) — future audits should
  carry `--exclude 'Checkpoints/**'` by default.

### F-12 — D-008 CRITICAL: cross-target path collision (silent row loss) — FIXED + PINNED
- **Found by:** the W3 retrieve suite (a cluster count that would not come out right).
- **Defect:** target-root-relative store paths merged `one/a.md` and `two/a.md` into one row; the
  second was reported `changed=0` and never written. Silent, unreported data loss.
- **Fixed:** paths are namespaced by target name for multi-target ingest; single-target unchanged.
- **Evidence:** `artifacts/` battery 59/0 + `test_same_named_files_across_targets_do_not_collide`.
- **Frontier:** the same class should be checked for the row adapters (jsonl/sqlite refs are
  absolute already, so they cannot collided — verified by reading the ref construction).

### F-13 — The run that hung with EMPTY stdout and stderr (a quadratic redactor) (2026-09-21)
- **WHAT I SAW:** a full extract over 2,000 rows printed nothing, wrote nothing, and exited
  nothing — for the better part of a minute. The shape of the failure was a FREEZE, not an error.
- **ROOT CAUSE:** the redaction pass was quadratic. Measured directly: 505 ms at 50k characters,
  1,986 ms at 100k, 7,912 ms at 200k. A 4 MB decision row put minutes of work between the start
  and the first byte of output.
- **WHY NO EARLIER TEST CAUGHT IT:** every fixture was small. A quadratic cost is invisible at
  every size a developer types by hand and dominant at every size a machine produces.
- **FIX:** the redactor made single-pass, and the giant-row path bounded. Pinned by a scaling
  measurement rather than a single case.
- **LESSON:** an unbounded input is an AVAILABILITY problem. And when a program produces no
  output, the first question is not "did it fail" but "where is it spending its time".

### F-14 — A judge answered under a key nobody read, and `evaluate` fabricated every metric (2026-09-21)
- **WHAT I SAW:** `evaluate` reported a confident score table for answers that did not exist.
- **ROOT CAUSE:** the answer key was renamed at the boundary. Four verbs read `answers.answer`
  and the judge was returning something else; the reader returned `undefined` for every row, and
  `evaluate` counted the undefineds as wrong answers, producing a full metric table over nothing.
- **WHY IT SURVIVED:** the mock answered under the OLD key, so the suite agreed with the code's
  belief about the far side of the boundary. **A mock encodes the author's belief.**
- **FIX:** one answer-reader used by all four verbs, pinned against a REAL live response shape,
  with the negative half (a renamed key must be a NAMED refusal, never a zero).
- **LESSON:** a metric computed over absent data is worse than an error, because it looks like
  evidence.

### F-15 — A call with no `usage` block was billed at $0, so the USD cap could never fire (2026-09-21)
- **WHAT I SAW:** a judge that answered correctly while omitting its accounting block produced
  `inputTokens: 0, costUsd: 0`. Fifty such calls against a **$0.0001** cap still reported
  `roomLeft=true`.
- **ROOT CAUSE:** `resp.usage?.input_tokens ?? 0`. The absent field became a specific number —
  zero — and that number flows into both the ledger's `cost_usd` and the budget's usd cap.
- **WHY IT MATTERS:** the budget is the guard that stops a runaway loop from spending. Its
  measurement was, in this path, a constant zero.
- **FIX:** the gap is REPORTED (`usageMissing: true`) and routed through the existing fail
  policy — `fail=closed` refuses with `JM_JUDGE_USAGE_MISSING`, `fail=open` degrades with a
  marked row. **An unmeasurable quantity must refuse a limit enforcement, not satisfy it.**
- **LESSON:** `?? 0` on a COST is not a default; it is an assertion that the call was free.

### F-16 — Three process failures of my own, and the command that hid one of them (2026-09-21)
Not software defects. They reached a gate, so they belong here.
- **THE `pkill` THAT KILLED NOTHING:** this host's `pkill` returns **exit 2** and terminates
  nothing. A gate failed while the same commands succeeded by hand. The background job runner is
  the verified tool on this host; `pkill` is a name that resolves to something else.
- **THE COMMIT THAT LANDED WITH `tsc` RED:** the chain used `;` between the type check and
  `git commit`, so the commit ran after a failed gate. Fixed by ONE `&&` chain.
- **THE `tail -2` THAT HID A RED BATTERY:** the command that REPORTED the result printed the
  expect-count line instead of the pass/fail counts, and a commit ran on a failing suite. The
  seal's own battery caught it. The verification now reads the counts explicitly and refuses to
  commit without `0 fail`.
- **THE LOG WRITTEN TO THE WRONG FILE:** sixty commits of canon-log entries went to the ship log.
  The floor stayed unmet not because the work was missing but because it was filed elsewhere.
- **THE LESSON, ONCE, FOR ALL FOUR:** the command which reports a result is part of the result.

### F-17 — The sanitiser that was not injective: two targets, one namespace, silent row loss (2026-09-21)
- **WHAT I SAW:** ingesting two targets named `same name` and `same/name` produced **1 row from
  2 files**, with no error.
- **ROOT CAUSE:** the target-name sanitiser mapped both to `same_name`. A value that becomes a
  **key** must map one-to-one; a sanitiser that is not injective is not a sanitiser — it is a
  **merge**.
- **WHY IT SURVIVED:** every test used one clean name. A collision needs two names that differ
  before the sanitiser and agree after it, which is exactly what a test author never types.
- **FIX:** names carry a distinguishing suffix derived from the original when the sanitised form
  collides; pinned by feeding the colliding pair and asserting `2 rows`.
- **LESSON:** any function that turns a human string into a KEY is a partition of the input
  space, and partitions need collision tests.

### F-18 — A verb that had NEVER made a successful call (the rejected question type) (2026-09-21)
- **WHAT I SAW:** `route` threw HTTP 400 against the live judge on its first real call, ever.
- **ROOT CAUSE:** it asked with `type: "mcq"`. The API rejects that type. Every test of `route`
  used a mock that happily answered whatever was asked, so the tests validated the CALLER's
  belief about the API, not the API.
- **WHY IT SURVIVED:** the mock is the author's belief encoded as a fixture. It cannot be wrong
  in a way that exposes the author.
- **FIX:** `route` now asks with the accepted types; a live call is part of its test.
- **LESSON:** at least one test per external boundary must cross it FOR REAL. A boundary covered
  only by a mock is a boundary with no test.

### F-19 — The excerpt that excluded the match (twice, in two verbs) (2026-09-21)
- **WHAT I SAW:** a decision row carried a `head-1200-chars` excerpt in which the matching phrase
  did not appear — it sat at character 1267 of 9224.
- **ROOT CAUSE:** the excerpt was taken from the start of the document while the match could be
  anywhere in it. The judge was being asked to reason about a passage that had been cut out.
- **WHY IT SURVIVED:** the fixture documents were short. Under 1,200 characters, head and match
  coincide, and the bug is invisible by construction.
- **FIX:** the excerpt is anchored ON THE MATCH with context on both sides; `filter` carried the
  identical defect and was fixed in the same pass.
- **LESSON:** grep for the idiom after fixing one instance. The same mistake lived in a second
  verb, and only looking for it found it.

### F-20 — The confidence that was regex-parsed out of the row's own prose (2026-09-21)
- **WHAT I SAW:** a threshold-calibration suggestion that did not reflect the probabilities the
  judge had actually returned.
- **ROOT CAUSE:** the stored confidence was being scraped with a regex from the decision row's
  human-readable REASON string, instead of read from the structured field written for it.
- **WHY IT SURVIVED:** early rows happened to format the same way the regex expected.
- **FIX:** the structured field is read directly, and a row without it is UNKNOWN (counted and
  excluded) rather than parsed from prose.
- **LESSON:** a human-readable message is not a data channel. If a value matters, it gets a field.

### F-21 — The second-operator drill's two defects, and the family they belong to (2026-09-22)
- **WHAT THE OPERATOR SAW:** `index --in nosuchtarget --name zzz` failed at exit 2 and left
  `zzz.sqlite` behind; `query zzz` then answered at **exit 0 with zero rows**. Separately, a keyless
  `decision-tree` failed at exit 2 and left `decisions.sqlite` behind, contradicting the README's
  "fail-closed writes nothing".
- **THE CLASS:** `openDb` CREATES the file and ran before the input was validated. Identical to
  D-009 and D-028; this was its third and fourth appearance.
- **THE WORSE INSTANCES I FOUND BY PROBING THE FAMILY:** `filter` and `find` used the create-on-open
  and answered at **exit 0** — a typo'd index became a real, empty index that reported healthy.
- **WHY IT SURVIVED THREE EARLIER FIXES:** each fix repaired the SITES it knew about (`query`,
  `scan`) or the SURFACE it found them on (MCP), never the INVARIANT. The invariant is now stated:
  **a run that refuses its input must not have touched the disk.**
- **FIX:** reads refuse; judged verbs resolve the key before opening; `calibrate --apply` may still
  create because it writes. Pinned with both halves.
- **LESSON:** fix the INVARIANT, then grep for its idiom across every surface. Two defect repairs
  left two worse instances standing, and only probing the family found them.

---

# THE FULL FAILURE LEDGER — every derailment observed across 161 commits

**Scope.** Every failure observed during the build: test failures, operator rejections, discipline
failures, spec violations, and the instrument defects. Grouped by CLASS, because the class is the
durable finding — a single instance is an incident, a class is a rule.

**The classes, and their instance counts. THIS TABLE IS THE SUMMARY OF THE ENTIRE LEDGER.**

| class | instances | what it is | the rule it produced |
|-------|-----------|------------|----------------------|
| **A VALUE LAUNDERED** | **11** | an absent/unknown value read as a specific one and acted upon | never let `?? 0`, a default, or a fallback stand in for a measurement |
| **A GUARD WITH AN OFF-SWITCH** | **7** | a check that exists but can be disabled by a typo, an omitted argument, or an override | when the guard's job is to STOP something, its off-switch must not exist |
| **FIX THE SITES, NOT THE RULE** | **9** | a defect repaired where it was found while the same defect lived elsewhere | grep for the idiom after fixing its first instance |
| **RELEASED ON THE HAPPY PATH ONLY** | **4** | a resource (store handle, budget claim, stream) freed on success and not on the other exit | every claim is released on EVERY exit; `finally` is the only shape that covers a rethrow |
| **A BOUNDARY NEVER CROSSED** | **4** | a unit test that mocked the far side and thereby tested a belief | at least one test per external boundary must cross it FOR REAL |
| **A REPORT THAT CANNOT REPORT** | **4** | a command or label that prints something other than the result | the command which reports a result is PART OF the result |
| **THE FIX'S OWN BLAST RADIUS** | **3** | a fix that broke a consumer the fixer did not consider | a fix is a change like any other; its consumers are its blast radius |
| **ACCEPTED GARBAGE** | **6** | a value the code trusts that nobody validated (a cast, a raw string, a hand-maintained set) | a value that crosses a boundary unchecked is a value the boundary does not exist for |

## CLASS A — A VALUE LAUNDERED INTO A SPECIFIC ONE (11 instances)

**The most productive class in the build.** Each instance: an absent or unrecognised value became a
concrete number, and the code ACTED on it, producing a wrong answer that looked like data.

### A-1 · D-039

- **the mechanism:** 4 verbs read `answers.<key>.noul ?? 0`
- **what it produced:** a judge saying 0.95 under another key read as **0**
- **the fix:** `noulFrom` by SHAPE; an unusable answer THROWS

### A-2 · D-042

- **the mechanism:** the same in `filter`
- **what it produced:** a renamed answer key produced `kept=0` after six real calls
- **the fix:** one `answerFrom` resolver, shape-first

### A-3 · D-043

- **the mechanism:** the stored confidence was regex-parsed from the row's own REASON prose
- **what it produced:** every degraded/errored row stored `conf=0` — a fabricated "the judge said no"
- **the fix:** the signal rides on the row; NULL = unknown

### A-4 · D-045

- **the mechanism:** the READ side of the same column
- **what it produced:** an UNCERTAIN confidence counted as zero in bands and mean
- **the fix:** unknown rows are COUNTED and EXCLUDED

### A-5 · D-046

- **the mechanism:** `resp.usage?.input_tokens ?? 0`
- **what it produced:** a usage-less call billed **$0**; the USD cap could never fire (50 calls vs a $0.0001 cap: `roomLeft=true`)
- **the fix:** the gap is REPORTED (`usageMissing`) and routed through the fail policy

### A-6 · evaluate:35

- **the mechanism:** `pOf` read `probs`; the canonical field is `probabilities`
- **what it produced:** every choice answer scored 0; agreement and Brier were computed over fabricated zeros
- **the fix:** read the canonical field; verified 100.0% vs 0%

### A-7 · decision-tree:85

- **the mechanism:** `answersToPolicyValue` seeded `best = 0`
- **what it produced:** an unrecognised answer shape returned 0 and was ROUTED as a decision; also swallowed NaN
- **the fix:** returns `number \| null`; the polarity decides

### A-8 · report.ts:57/146

- **the mechanism:** `cost += Number(r.cost_usd ?? 0)`
- **what it produced:** ONE malformed ledger row made the whole report print **`$NaN`**
- **the fix:** an unreadable cost is COUNTED (`cost_unknown`) and NAMED on the output

### A-9 · indexJob.ts:31

- **the mechanism:** `res?… ?? 0` on every counter after a caught crash
- **what it produced:** a crashed run reported `done=0 … files=<the whole index>` — indistinguishable from an empty job
- **the fix:** an explicit `ok`; `failed` carried from `RunResult`

### A-10 · filter.ts:70 (attempted)

- **the mechanism:** I applied `find`'s fix here too
- **what it produced:** would have DESTROYED a real signal: every outage would report `judged=candidates`
- **the fix:** REVERTED — the same rule was wrong for one of the two verbs

### A-11 · calibrate.ts:30

- **the mechanism:** inline `0.8`/`0.5` duplicating `DEFAULT_POLICY`
- **what it produced:** a policy change would silently not reach calibration — bands describing a policy nobody runs
- **the fix:** import the canonical default

**THE RULE, stated once:** *a value that crosses a boundary unchecked is a value the boundary does
not exist for.* Where a number will be ACTED on, an absence must be representable — `null`, a
thrown error, a counted-and-named gap — never a number.

## CLASS B — A GUARD WITH AN OFF-SWITCH (7 instances)

### B-1 · H-5

- **the mechanism:** `policy.fail` was the ONE unvalidated policy field
- **what it produced:** a typo (`"Closed"`) made BOTH polarity checks false → the run silently degraded to **fail-OPEN**
- **the fix:** validate the enum; a typo is refused by name

### B-2 · transport.ts:49

- **the mechanism:** `Number(env ?? DEFAULT)` yields NaN for `1mb`; `bytes > NaN` is ALWAYS FALSE
- **what it produced:** the judge body cap was **silently disabled**
- **the fix:** a non-finite override refuses by name

### B-3 · serve.ts:57

- **the mechanism:** the same shape on `JM_SERVE_MAX_BODY`
- **what it produced:** the HTTP body cap was **silently disabled** — the D-036 availability defect came back
- **the fix:** refuses to start with the cap disabled

### B-4 · H-1 / C-2

- **the mechanism:** `[ -d "$CP" ]` then `rm -rf`; then a glob `Checkpoints/*` that MATCHES `Checkpoints/..`
- **what it produced:** `./scripts-seal.sh .` would have **deleted the live `src/` tree**
- **the fix:** canonicalize + containment + FAIL CLOSED

### B-5 · C-2 (2nd hole)

- **the mechanism:** `readlink -f` returns EMPTY for a non-existent path; the `\|\| echo` fallback restored the raw string
- **what it produced:** the bypass re-opened in exactly the environment a fresh clone starts in
- **the fix:** an unresolvable path is REFUSED, not guessed

### B-6 · queue.ts:61

- **the mechanism:** `complete()` guarded on `state='running'` ALONE
- **what it produced:** a stale worker's ack could overwrite a LIVE result
- **the fix:** match the `attempts` generation

### B-7 · E1

- **the mechanism:** the attempt parameter was OPTIONAL with a permissive fallback
- **what it produced:** **its only production caller omitted it within one turn** — the guard was unprotected
- **the fix:** attempt is REQUIRED; tsc enumerates every bypass

**THE RULE:** *a guard that can be switched off by LEAVING OUT AN ARGUMENT is not a guard* — and
neither is one disabled by a typo. The off-switch's existence is the defect, not its use.

## CLASS C — FIX THE SITES, NOT THE RULE (9 instances)

### C-1 · D-028 → D-054/055/056

- **the shape:** the phantom-store defect was fixed on the CLI verbs, then on the read guard — and was STILL live on the MCP dispatcher AND the HTTP router
- **what it produced:** a refused `jm_index` created `all.sqlite`; a `404` created `decisions.sqlite`

### C-2 · D-040 → D-041

- **the shape:** the judge-outage policy was fixed in one verb, and the `JEV_NO_KEY`-only check was COPIED into three others
- **what it produced:** `filter` and `find` returned EMPTY RESULTS on a judge outage

### C-3 · D-042 → evaluate

- **the shape:** the answer-reader was fixed in four verbs; `evaluate` read the key directly and fabricated EVERY metric
- **what it produced:** agreement/Brier/ECE computed from zeros

### C-4 · index.ts:74

- **the shape:** the tombstone rule was repaired twice (D-060 namespace, D-061 `--limit`) before the third instance (`--include` destroyed the excluded files) exposed it as a RULE
- **what it produced:** "not seen this run" is only evidence of deletion if the run WOULD have seen it

### C-5 · EN-083 → find/filter

- **the shape:** the budget-claim `finally` was added to `decision-tree.ts` and NOT swept
- **what it produced:** `find.ts` and `filter.ts` leaked a claim per failed row — instance EIGHT of this class

### C-6 · fatalJudgeError → decision-tree

- **the shape:** the shared policy was extracted in D-041 "IN ONE PLACE"; `decision-tree` kept **two private copies** that DRIFTED
- **what it produced:** under `fail=open` a `JM_JUDGE_USAGE_MISSING` was swallowed and the run completed on unmeasured rows

### C-7 · safeTargetName → safeName

- **the shape:** the injectivity fix landed on the TARGET sanitiser; the INDEX sanitiser had the same defect
- **what it produced:** `my index` and `my/index` resolved to ONE file

### C-8 · the rig's env restore → tests/helpers

- **the shape:** H-6/H-7 fixed the rig's env leak; `tests/helpers.ts` had the same leak, and a test I wrote REPRODUCED it minutes later
- **what it produced:** a DELETED path leaked into every later test

### C-9 · the doc floors → the filing

- **the shape:** the doc contract was believed satisfied; the canon logs had not moved in 60 commits
- **what it produced:** the entries were being written to the SHIP log — a floor that never moves is a filing problem, not a quiet session

**THE RULE:** *after fixing a defect, GREP FOR ITS IDIOM across every surface.* The invariant has
to be stated BEFORE it can be swept, and six of these nine were swept only after the third or
fourth instance forced the statement.

## CLASS D — RELEASED ON THE HAPPY PATH ONLY (4 instances)

| # | the resource | the leak | the fix |
|---|--------------|----------|---------|
| D-1 | the sqlite handle in `job/run.ts` | the `try/finally` wrapped only the TAIL, so a `stopOnError` rethrow escaped before `db.close()` | the guard wraps the WHOLE body |
| D-2 | the budget claim in `decision-tree.ts` | both degraded-return sites returned without `settle()`, so a judge outage under `fail: open` leaked a claim per row and then reported a **FALSE "budget exhausted"** | a `finally` refunds via the `cached` path |
| D-3 | the budget claim in `find.ts` AND `filter.ts` | the same leak, unswept (instance eight of class C) | the same `finally` |
| D-4 | the `fs.ReadStream` in `adapters/jsonl.ts` | `rl.close()` relinquishes the interface but does NOT destroy the stream — **40 abandoned generators left 40 open fds, exactly 1:1** | `stream.destroy()` in the `finally` |

**PLUS THE FIX'S OWN BUG, which is its own lesson:** my first refund used `settle(0, false)`, which
calls `spend(0)` — **INCREMENTING the call count and billing a call that failed.** Measured: a cap
of 3 over 6 failing rows stopped at 3 with `budgetStopped=true`. **A refund is not a purchase.**

## CLASS E — A BOUNDARY NEVER CROSSED (4 instances)

| # | the boundary | the belief the mock encoded | what crossing it found |
|---|--------------|----------------------------|------------------------|
| E-1 | the live judge's accepted question types | that `mcq` worked | **D-034: `route` had NEVER made a successful call** — the API rejects `mcq` with HTTP 400 |
| E-2 | the real 37.9 MB session file | that `index` indexes a corpus | **86 of 124 files had no searchable text** — the ftp chain was blind |
| E-3 | the container's environment | that the suite was hermetic | **9 tests failed with `JEV_NO_KEY`** — the suite depended on an ambient key FILE |
| E-4 | a judge answering without a `usage` block | that `usage` is always present | **D-046** — an unmeasured call billed at $0 and the USD cap could never fire |

**AND THE SHARPEST ONE, IN THE RIG ITSELF:** T10's negative half asserted "a keyless `jm_find` is
refused" and PASSED — **on `JM_ARGS: phrase required`.** The angle sent `query`; `jm_find` reads
`phrase`. The call threw BEFORE any key resolution, and `isError: true` satisfied the assertion.
**A missing-argument error read as a key refusal — the vacuous pass the whole rig exists to catch,
inside the rig.** Found by the audit (H-8).

**THE RULE:** *a mock encodes the author's belief about the far side of a boundary.* At least one
test per external boundary must cross it FOR REAL.

## CLASS F — A REPORT THAT CANNOT REPORT (4 instances)

| # | the command | what it printed instead of the result |
|---|-------------|---------------------------------------|
| T-07 | `;` between `tsc` and `git commit` | **a commit landed with L0 RED** — a gate named in the command and joined by the wrong operator |
| T-10 | `bun test 2>&1 \| tail -2` | the EXPECT-COUNT line instead of pass/fail — **a commit ran on a failing suite**; only the seal's own battery caught it |
| EN-067 | the gate runner's own capture | `GATES: 40 passed / 1 failed` with **no failing row** — undiagnosable from its own output |
| T-5 label | T5's verdict line | `JM_RESUME_DUP>0` for BOTH an incomplete resume and a duplicate — and duplicates are **structurally impossible** (`fingerprint` is UNIQUE), so the label named a defect that cannot exist |

**THE RULE:** *the command which reports a result is PART OF the result.* A report command that can
print anything but the outcome is decoration, not a gate.

**AND THE THIRD INSTANCE OF ONE SHAPE (T-07, T-10, T-12):** in all three the gate was NAMED in the
command and joined by `;` instead of `&&`. **The rule is formatting, not motivation.**

## CLASS G — THE FIX'S OWN BLAST RADIUS (3 instances)

| # | the fix | what it broke |
|---|---------|---------------|
| G-1 | chunking large files so they became searchable | the `docs_fts` join was `f.path = x.path` — **0 of 313 chunked rows joined**, so the fix made chunked text searchable IN THE INDEX and invisible THROUGH THE QUERY |
| G-2 | requiring `attempt` on `complete` | the claim reported the attempt BEFORE the increment, so **every ack from a normal claim was refused** |
| G-3 | applying `find`'s `judged` fix to `filter` | would have destroyed the D-041 outage signal (`candidates > judged`); **`test_filter_refuses_a_judge_outage` caught it** and it was reverted |

**THE RULE:** *a fix is a change like any other, and its own consumers are part of its blast*
*radius.* Re-run the downstream checks before declaring it done.

## CLASS H — ACCEPTED GARBAGE (6 instances)

| # | the boundary | what it trusted |
|---|--------------|-----------------|
| H-1 | `kind as Target["kind"]` | an operator string — `target add x bogus /path` registered a target with **no adapter**, failing later at index time |
| H-2 | `JSON.parse(...) as Target[]` | valid JSON of the wrong SHAPE — `{}`, `null`, `"x"` all passed and failed far away as `undefined is not a function` |
| H-3 | `writeFileSync(p, …)` on the registry | a crash mid-write — callers do read-modify-write, so this loses **every target the operator defined** |
| H-4 | the tilde expansion | expanded for the CHECK and stored RAW — validation and every later reader disagreed |
| H-5 | `VALUE_FLAGS`, hand-maintained | drifted from the code TWICE (4 flags, then 8 more); their values leaked into positionals |
| H-6 | `Number(caps)` in `Budget` | the KEYS were unvalidated — `new Budget({call: 5})` was accepted with `roomLeft: true` and the cap did nothing |

**THE RULE:** *a hand-maintained set that must mirror the code will drift from it.* The remedy is not
vigilance but DERIVATION — the pin now derives the check from the source, so the next drift fails at
the test instead of silently at a call site.

## THE TALLY

| class | instances |
|-------|-----------|
| A value laundered | 11 |
| Fix the sites, not the rule | 9 |
| A guard with an off-switch | 7 |
| Accepted garbage | 6 |
| A boundary never crossed | 4 |
| A report that cannot report | 4 |
| Released on the happy path only | 4 |
| The fix's own blast radius | 3 |
| **TOTAL CLASSIFIED** | **48** |

Plus 13 defect ids that are individual incidents rather than class instances (D-048/D-049 the
launcher's two, D-050 the gate runner's leaked server, D-051 the MCP notification, D-058 the torn
journal line, D-059 the test-sandbox leak, and the audit's own instrument defects).

**THE ROOT PATTERN, and it is ONE mechanism:** every class above is a case where **the FORM of a
check was present and the SUBSTANCE was not.** A default where a measurement belonged. A guard with
a bypass. A rule applied at one site. A resource freed on one path. A mock standing in for the far
side. A label naming the wrong cause. A fix that did not look downstream. A value trusted at the
boundary. **The countermeasure is the same in every case: force the thing to show itself — run it,
cross the boundary, revert the fix, break the guard — instead of reasoning about whether it would
work.**


### F-22 — SIX DUPLICATE MEASUREMENT JOBS, CONTENDING WITH EACH OTHER (2026-09-23)

- **What happened:** to measure the flake rate after the `concurrency = 1` fix, I launched a
  30-run battery loop. When the foreground call backgrounded, I **re-launched the same loop** —
  and then did it again, and again. `hub jobs` showed **SIX identical 30-run jobs running
  simultaneously** (`bg_1`, `bg_3`, `bg_4`, `bg_6`, `bg_7`, `bg_9`) plus two `sleep` jobs.
- **Found:** by listing the job registry instead of waiting on a seventh sleep — the `hub jobs`
  snapshot named every duplicate at once.
- **Root cause:** **I did not check whether the job already existed before re-firing it.** Each
  backgrounding looked like a failure to start, so I re-issued the command. The observable state
  (the registry) was never consulted; the decision was made from the appearance of the foreground
  call.
- **Impact:** six concurrent full-battery loops on one machine. The measurement they were
  supposed to produce was **destroyed by their own contention** — six `bun test` processes competing
  for CPU, disk, and (critically) **the same `~/.jm` store and the same `/proc/self/fd` counts**.
  Worse: this is the SAME class as the defect under investigation. I was measuring a
  shared-resource race while creating a shared-resource race.
- **The measurement they would have produced is INVALID** — any failure in those windows is
  attributable to the contention, not to the code. Discarded, not averaged.
- **Disposition:** FIXED. All eight cancelled via `hub cancel`; ONE loop re-run in isolation.
- **THE COUNTERMEASURE (standing rule):** before any background job, **read the registry**
  (`hub jobs`) and check for an identical job. A job that "did not appear to start" is a claim
  about the foreground call, not about the registry — and the registry is the observable state.
- **THE DEEPER LESSON:** the fix for a shared-resource race is to stop sharing the resource.
  Serializing the test files (`concurrency = 1`) fixed the suite; the very next thing I did was
  re-introduce concurrency at a higher level by running six copies of it. **A fix is not
  internalized until the next action respects it.**


### F-23 — THE REGISTRATION SAGA: three days on a tool that was registered the whole time (2026-10-07)

- **What happened:** The `jev` OMP tool — correctly registered (`loadMode:"essential"`,
  `defaultInactive:false`), loaded, and executing via `xd://jev` — was absent from the operator's
  live session's top-level wire schema for three days. The operator's verdicts, VERBATIM:
  "Refresh, now test the fucking tool." · "you are being fuckng retarded. tell me what you have
  fucked up that your tool is not showing up" · "look at how tools need to be registered and tell
  me what you fucked up stop wasting time on this 2 minute fucking task" · "about fucking time. My
  God, you're so goddamn retarded. Well of the fucking failure data that you wasted three goddamn
  days on not being able to register a fucking tour [tool], you fucking idiot".
- **Found:** by the operator's escalations forcing a fresh-boot A/B (a clean-room copy of the
  session under a new id) + a `/dump` wire-schema read — the decisive instruments that had been
  available the whole time.
- **Root cause:** THREE layers (full detail in EN-115): (1) the registration was CORRECT — a fresh
  boot ships the tool top-level (proven by `/dump`: 23 tools incl. jev); (2) a live session's wire
  set is FROZEN at construction, later `setActiveToolsByName` re-applications (goal mode's
  `[...previousTools,"goal"]`) can strip a late tool, and the original activation handler was a
  SILENT conditional add with no else-log; (3) THE DIAGNOSTIC ITSELF — the live process (started
  18:31:48) was tested for hours while the extension set changed underneath it (hydra-wave 19:08,
  rewrites 19:28:30, config 19:43:59). `stat` vs `ps -o lstart` + a fresh boot would have isolated
  it in minutes.
- **Impact:** three days of operator time and one full session's effort on a NON-EXISTENT
  registration defect; four operator escalations; the actual defect surface (the audit arc, EN-117)
  was found only after.
- **Disposition:** FIXED+PROVEN — both-branch receipts + serialized `before_agent_start` re-assert
  + verify-after-write CAS shipped; the refreshed session's direct `jev` call executed (ledger
  ticked 20→21); the clean-room boot proves delivery.
- **THE COUNTERMEASURES (standing rules):** (a) `mtime(file)` vs `lstart(process)` BEFORE any
  live-process diagnosis; (b) test the FRESH BOOT — the wire set freezes at construction; (c) a
  model's self-report is not an instrument — `/dump`/transcript only (EN-116); (d) any activation
  handler logs BOTH branches and re-asserts idempotently.

### F-24 — The shipped tool carried 19 critical/high defects that its own smoke tests could not see (2026-10-07)

- **What happened:** The independent audit arc (EN-117) over the extension's two files found
  19 critical/high findings across six complete rounds: silently-dropped params for five verbs,
  masked exit codes (timeout/abort → exit 0), flag/path injection surfaces, `--json` corruption,
  caller-abort misreporting, an execFile encoding gap, and a surrogate-guard asymmetry.
- **Found:** by qwen-code-audit / ocr — an INDEPENDENT reviewer — not by the tool's own runtime
  battery (which had passed 5/5 on the happy paths + the guards it knew about).
- **Root cause:** the original build's verification measured what it thought to test (the happy
  path + the guards it wrote) and never let an adversarial reviewer grade the artifact's own
  claims. The defects lived in the UNTESTED surface: the verbs nobody called yet, the failure
  paths, the machine-consumer contract.
- **Impact:** the tool would have shipped with silent-wrong-answer classes (dropped params,
  masked failures) into a judge-adjacent surface — the exact class this project's own laws ban.
- **Disposition:** FIXED — 15 fixed + 3 declined-with-evidence (SQL passthrough / out containment /
  target traversal — remit-exceeding, each with the CLI's own evidence) + 1 probe-error
  (mechanically refuted, EN-117). The remaining audit runs: BLOCKED (lane), retry named.
- **THE LESSON:** a runtime battery proves the paths you thought of; only an independent adversarial
  review finds the surface you didn't. Adjudicate every finding with a probe — fix, decline with
  evidence, or refute — never accept or dismiss wholesale.
