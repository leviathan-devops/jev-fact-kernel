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
