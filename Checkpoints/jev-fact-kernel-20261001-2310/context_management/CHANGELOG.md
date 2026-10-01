# CHANGELOG — JM (append-only; dated session entries, newest last)

## [2026-09-21] Build session 1 — W0 through W7 (+ the audit fix pass)

### WHAT WAS BUILT (by wave)

**W0 — the core CLI.** The store substrate (`src/store/schema.ts`: files/docs/docs_fts/tags/runs/
decisions/cache/meta; FTS5 verified present in bun:sqlite), the incremental indexer
(`src/verbs/index.ts`: walk -> (size,mtime) skip -> sha256 <=8MB -> text <=256KB -> tombstones), the
query verb (`src/verbs/query.ts`: whitelisted predicates + FTS + tags), the append-only ledger with
the cost line (`src/ledger.ts`), and the CLI router (`src/cli.ts`). *Evidence:* `files=11831
ms=4019`; re-run `changed=0 ms=60` (2.5%).

**W1 — the job runtime.** The per-job store (`src/job/store.ts`), the crash-first queue with a
UNIQUE fingerprint and the resume sweep (`src/job/queue.ts`), the queued executor (`src/job/run.ts`),
the bounded pool (`src/pools/pool.ts`), and hard budgets (`src/pools/budget.ts`). *Evidence:*
SIGKILL at `done=1328 running=8` -> resume `resumed=8 done=11831` `dup=ZERO`; budget `done=100`
exit 3.

**W3+W5 — the judge and the decision path.** The key resolution (env -> file, fingerprint only),
the single network seam with a canned-response test mode, the redact->canonical->fingerprint cache,
the policy bands, the cache-first client with fail-closed semantics, and the decision-tree verb
(rows x recipe -> bands + escalation + deterministic artifacts + the decisions table). *Evidence:*
live `act 0.97 / noop 0.08 / act 0.90` at `$0.000044`; replay `calls=0 cached=3`; two runs sha
`bb9b6d2e5d6416f2`.

**W4 — the find chain.** The 9 stages (pick -> seed -> fetch -> narrow -> judge -> rerank -> cluster
-> label -> emit) with a deterministic tokenizer, FTS retrieval, batched judging, probability
reranking, signature clustering, and the requested-structure emitter. *Evidence:* live
`44 -> 30 -> 1 -> 1` with the Fire Gate blueprint surfaced at `p=0.80`.

**W6 — the HTTP surface.** `Bun.serve` with `/health`, `/decide`, `/find`, `/jobs`; loopback bind;
optional bearer. *Evidence:* `/decide` `noul 0.98` at `$0.0000124`; replay `cached=true cost=0`.

**W7 — calibration.** Bands from recorded rows, `recordTruth`, and `recordCalibration` (the only
way a threshold moves). *Evidence:* `decisions=3 act=2 noop=1 mean=0.65`; truth recorded; a
calibration ROW written with the honest note `n=3; no move warranted — mechanism proof`.

### THE DEFECTS FOUND BY RUNNING (6) AND BY THE AUDIT (the boundary family)

EN-001 glob depth (the silent zero) · EN-002 the `--json` stdout pollution · EN-003 the budget
off-by-one · EN-004 a flaky crash probe · EN-005 the budget checked after the call · EN-006 the
artifact carrying run metadata · EN-007 the invisible backspace byte that killed secret redaction ·
EN-008 the host's inline-exec refusal · EN-009..EN-014 the audit's boundary family · EN-015 the
double-counted measurement. Each has a mechanism, a fix, and a verification in `DEBUG_LOG.md`.

### THE AUDIT

`ocr review --from 7b7f7eb --to HEAD` — 174 comments, 91 canonical (30 high / 49 medium / 12 low),
6m2s, 2.4M tokens, provider muse-free. **AUDIT GATE: FAIL** at first run; the fix pass addressed
the high set; the re-audit is the proof owed. Artifacts: `artifacts/audit-2026-09-21.json`,
`AUDIT_SUMMARY.md`.

### THE DECISIONS

Seven build rulings (B-01..B-07) in `DECISION_CHAIN.md`: one state per request; the artifact is the
decision; budgets clamp the claim; session_diff is not the claim corpus; floors recorded not
padded; the audit's highs fixed not argued (3 declined with evidence); the checkpoint excluded from
discovery.

### THE HONEST DISCLOSURES

W2's adapters are unwritten (fs works, sqlite/jsonl do not) · W8 is parked on F1/F6 · the MCP
surface and the watch daemon are planned, not built · the doc floors were met with real material
after first landing short · the second-operator drill is owed · the escalation band has no live row
yet · `@ocws` (219G) was never walked.

### THE CHECKPOINTS

`Checkpoints/jm-design-baseline-7b7f7eb/` (the pre-build round-zero, src-empty recorded as an honest
gap) and `Checkpoints/jm-v0-waves-green-a39afe8/` (the sealed post-fix tree + docs + the audit
artifact; battery 18/0 verified from the copy (later 24/0).

### THE FIX PASS (post-audit, commit `78cd3be`)

Ten classes addressed: fail-closed propagation in `filter`/`find` (a swallowed `JEV_NO_KEY` was a
false success); tombstone filtering in both query branches; the loopback bind + optional bearer for
`/decide`; construction-time budget validation; the pool's non-finite concurrency default; the
queue's claim clamp (a NaN became `LIMIT -1`); the fingerprint gaining the questions hash; the
per-file guard in the index batch; `q.fail` recording for failed worker items; and the CLI's
value-flag completeness. The dispositions for the three declined/refuted findings are in
`AUDIT_SUMMARY.md`. Battery 18/0 at the fix pass (later 24/0), tsc 0.

### THE SESSION'S SHAPE (what the reader should take)

The build moved through five phases in one sitting: **absorb** (the baseline re-measured and posted),
**spec** (the package re-verified), **build** (seven waves with live gates), **test** (the seat's 17
operations, the push set, the adversarial sweep), and **audit** (the machine review that found what
the happy path could not). Every phase produced artifacts rather than prose: index counts, resume
deltas, cost figures, sha-identical replays, the audit JSON. The single most valuable output is not
the code — it is the fifteen-entry debug log and the audit's finding set, because those are what the
next session will build on.

## [FUTURE ENTRIES]

Append with this shape:

```
## [YYYY-MM-DD] <session label>
### WHAT: <by wave or by area, with the evidence inline>
### DECISIONS: <any new rulings, by id or one line each>
### DEFECTS: <the new DEBUG_LOG entries, by id>
### DISCLOSURES: <what was NOT done, stated plainly>
### CHECKPOINTS: <new/refreshed checkpoints>
```

### THE REPO'S SHAPE AFTER THE SESSION (the delta a reader will see)

```
 NEW (source)      src/{cli,serve,ledger,calibrate}.ts + src/{store,judge,job,pools,verbs}/  (22 files, 1,405 lines)
 NEW (tests)       tests/*.test.ts (9 files, 17 test files, 110 assertions)
 NEW (package)     packages/jm/ (mission, discovery, DPL1 spec, waves, goals, index, master prompt)
 NEW (docs)        BUILD_REPORT · DEBUG_LOG · TESTING_LOG · FAILURE_LOG · THEATRICALITY_LOG · AUDIT_SUMMARY
 NEW (canon)       context_management/ (11 docs incl. the 2 high-frequency logs + the seat record)
 NEW (artifacts)   artifacts/audit-2026-09-21.json (the first audit, never overwritten)
 NEW (checkpoints) Checkpoints/jm-design-baseline-7b7f7eb/ · Checkpoints/jm-v0-waves-green-a39afe8/
 MIGRATED (docs)   18 design artifacts under docs/ (blueprints, bibles, the extraction package, handovers)
 RUNTIME STATE     ~/.jm/index/{shadow,reports,live,adv,decisions,...}.sqlite · ~/.jm/jobs/{shadow-kill,shadow-budget}/
                   ~/.jm/ledger.jsonl (32+ rows) · ~/.jm/targets.json (shadow, reports)
```

### THE MEASURED DELTAS (before → after)

```
 index capability     none → 11,831 files in 4.0s, re-run 60ms
 crash safety         none → SIGKILL-resumable with dup=0
 judging              none → live, correct routing, $0.0000147/decision
 caching              none → 0-call replays, sha-identical artifacts
 budgets              none → exact stops, exit 3, resumable
 surfaces             none → CLI (9 verbs) + HTTP (4 routes) live
 defects found        none → 15 logged (8 by running, 7 by the audit)
 audit                none → ran once (FAIL), the re-audit in flight
```

### THE THINGS THIS SESSION WOULD DO DIFFERENTLY (the honest retro)

1. **Write the boundary tests first.** The audit's 30 highs were all in the boundary arguments
   (NaN, missing key, deleted files, hostile concurrency) — arguments the happy path never passed.
   A boundary suite written BEFORE the audit would have halved the finding count.
2. **Run the audit MID-BUILD, not at the end.** The audit was cheap (~6 min) and would have caught
   the glob bug and the fail-closed swallow before they were baked into four call sites.
3. **Root the test discovery on day one.** The checkpoint double-count (EN-015) cost a confusing
   minute; a `bunfig.toml` belonged in the very first commit.
4. **Never generate code through a string-escape layer without a post-write scan.** EN-007's
   invisible byte is the class; a 3-line control-char check would have caught it before the sweep.

### THE COMMIT CHAIN (what each commit carries, for the git-log reader)

```
 7b7f7eb  feat(jm): v1 design package — repo, 18 migrated docs, DPL1 spec, waves, goals
 715e5e8  feat(w0): core CLI — store+FTS5, incremental index, query, ledger (battery 6/0, index @shadow 11831 @ 2.5%)
 ad2c8e1  feat(w1): job runtime — crash-safe queue, resume sweep, pools, exact budget (kill -9 -> dup=0)
 bede487  feat(w3+w5): judge client + decision-tree — live API verified, cache 0-call replay, deterministic artifacts
 a39afe8  feat(w4+w6+w7): find chain, HTTP surface, calibration rows
 75cf6e4  docs(w7+checkpoint): canon core + ship docs + runtime seat + sealed checkpoint
 0deac03  fix(test): scoped test runner + typed fixtures (tsc 0, battery 18/0 scoped (later 24/0))
 78cd3be  fix(audit): the 30 high findings + the audit artifact (AUDIT GATE: FAIL, re-audit owed)
 e88cbcd  docs(checkpoint): source-tree sha post-fix + the audit gate state recorded
```
Each message states what changed AND its evidence (counts, exit codes, the gate's state) — the
commit log doubles as a second timeline when the docs and the tree disagree.

### THE MEASUREMENT DISCIPLINE APPLIED TO THIS FILE

Every number in this changelog was measured (the index counts, the costs, the battery, the audit
counts) and every claim names its run. Where a number was NOT measured, the entry says so — for
example the audit's token usage is quoted from the artifact, and the "~6 minutes" is the measured
elapsed field, not an impression.

### THE DOC-FLOOR PASS (the same session, after the fix pass)

BUILD_REPORT and DEBUG_LOG were raised to their 500-line floors with material — the verbatim run
transcript, the test inventory, the recipe reference, the glossary, the entry-detail sections with
raw dumps, the defect->pin matrix, the medium-finding classes, and the frontier — never with
whitespace. The canon set was raised to 200 with anchors, the state tables, the interface contracts,
the recovery procedures, the ruling tables, and the reading paths. The THEATRICALITY_LOG records the
one borderline case (T-05: a calibration row at n=3, labelled as a mechanism proof).

### THE STATE AT THE END OF THE SESSION (the honest bottom line)

```
 WORKS          index · query · filter · find · decision-tree · cache · ledger · queue+resume ·
                budgets · HTTP · calibration (mechanism) · the battery · the audit lane
 NOT BUILT      W2 sqlite/jsonl adapters · route/evaluate verbs · MCP surface · watch daemon · W8
 GATE           AUDIT GATE: FAIL (0 critical, 30 high) — the fix pass landed; the re-audit is the proof
 SESSION TOTAL  9 commits · 22 src files (1,405 lines) · 9 test files (17 test files, 110 assertions) ·
                15 debug entries · 61 recorded rulings/positions · 2 checkpoints · 1 audit artifact
```

### APPEND-ONLY NOTE
This file is never rewritten; corrections are new dated entries. The next session's entry starts at
the `## [FUTURE ENTRIES]` template above — replace the bracketed line with the real date and label,
and carry the same five blocks (WHAT / DECISIONS / DEFECTS / DISCLOSURES / CHECKPOINTS). A changelog
entry that omits the DISCLOSURES block is the failure mode this format exists to prevent: it reads
as pure progress and hides the cost.

### THE DOCUMENT SET, ENUMERATED (what exists at the end of session 1)
The canon (11): CURRENT_STATE · EVIDENCE_STATE · DECISION_CHAIN · NEXT_STEPS · COMPACTION_SURVIVAL ·
POST-COMPACTION_PROMPT · CHANGELOG · RUNNING_BUILD_LOG · RUNNING_DEBUG_LOG (+ RUNTIME_SEAT as the
12th, the seat's own record). The ship set (6): BUILD_REPORT · DEBUG_LOG · TESTING_LOG · FAILURE_LOG ·
THEATRICALITY_LOG · AUDIT_SUMMARY. Plus the package (7) and the design migrations (18).
