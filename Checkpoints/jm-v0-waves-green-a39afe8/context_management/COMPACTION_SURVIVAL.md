# COMPACTION_SURVIVAL — JM (overwrite; state-at-a-glance + the operating laws + recovery)

**TREE SHA: `c6fa375a6362820914ff842f80c5e515` (git 47b4d7c)** - every canon doc that carries this line carries THIS sha; a disagreement means one is stale. Re-derive with ./scripts-seal.sh
## 1. STATE AT A GLANCE (2026-09-21)

```
 repo        Shared_Workspace/JevManager · branch master
 commits     7b7f7eb (design base) · 715e5e8 (W0) · ad2c8e1 (W1) · bede487 (W3+W5)
             a39afe8 (W4+W6+W7) · 75cf6e4 (docs+checkpoint) · 0deac03 (scoped tests)
             78cd3be (audit fix pass) · e88cbcd (manifest)
 battery     89 pass / 0 fail / 343 expects / 9 files      tsc exit 0
 index       @shadow 11,831 files (2.5% incremental re-run) · @reports 57 files
 judge       live-verified (jev-1.13.0) · cache replay 0 calls · sha-identical artifacts
 crash law   SIGKILL -> running:8 -> resume -> done=11831, dup=ZERO
 budget law  exact stop at the cap, exit 3, resumable
 audit       AUDIT GATE: FAIL (0 critical, 30 high) — fixes applied, RE-AUDIT OWED
 NOT DONE    W2 adapters · W8 fire gate · MCP/daemon · the drill · calibration move
```

## 2. THE OPERATING LAWS (carry these; they are the whole system in ten lines)

1. **Code narrows, Jev judges, code routes.** No verb sends a corpus to the judge; narrow >= 100x first.
2. **Bounded state always.** 8MB hash cap, 256KB text cap, 5k tokens per firing (the fire gate).
3. **Ledger or it did not happen.** One row per invocation — deterministic ops included, errors included.
4. **Cache-first.** `sha256(model ⊕ schema#questionsHash ⊕ canonical(redact(state)))`; repeats are free.
5. **Fail polarity per surface.** Decision verbs FAIL CLOSED (exit 2); index/scan are keyless.
6. **Budgets are hard stops with the cap NAMED** — check `roomLeft()` BEFORE the call, spend after.
7. **Targets are pointers.** Indexes live under `~/.jm/`; never copy a corpus; never write to a source.
8. **The artifact is the decision.** Never embed cache/cost/timing — replays must be byte-identical.
9. **Secrets: env or an owner-only file; fingerprints only; redact BEFORE hashing.**
10. **On this host: no single-expression inline execution** (the STTGF gate) — probes and docs must be files.

## 3. THE DIRECTORY MAP (where everything lives)

```
 repo            ~/JARVIS_WORKSPACE/Shared_Workspace/JevManager/
 package         packages/jm/{00-MISSION,01-DISCOVERY,JM_DPL1_SPEC,06-WAVES,07-GOALS,00-INDEX,MASTER_PROMPT}.md
 designs         docs/blueprints/ (the fire gate master blueprint, the engine, v0.1, siblings)
 substrate       docs/bibles/JEV_ENGINEERING_BIBLE.md (3,006L)
 canon           context_management/ (this set + RUNNING_BUILD_LOG + RUNNING_DEBUG_LOG + RUNTIME_SEAT)
 ship docs       BUILD_REPORT.md · DEBUG_LOG.md · TESTING_LOG.md · FAILURE_LOG.md · THEATRICALITY_LOG.md · AUDIT_SUMMARY.md
 source          src/{cli,serve,ledger,calibrate}.ts · src/{store,judge,job,pools,verbs}/
 tests           tests/*.test.ts (9 files, 17 test files)
 runtime state   ~/.jm/index/*.sqlite · ~/.jm/jobs/<id>/ · ~/.jm/ledger.jsonl · ~/.jm/targets.json
 audit           artifacts/audit-2026-09-21.json (+ the re-audit when it lands)
 checkpoints     Checkpoints/jm-design-baseline-7b7f7eb/ · Checkpoints/jm-v0-waves-green-a39afe8/
```

## 4. THE RECOVERY PROCEDURES (and their triggers)

| the symptom | the recovery |
|-------------|--------------|
| the battery is red | read the failing test's assertion; fix or (if the probe is wrong) correct the probe — never both silently |
| `tsc` is red | the fixtures/types drift; fix the type, never delete the assertion |
| the index looks empty | assert `files=11831`; a filter bug looks exactly like an empty corpus (EN-001) |
| a run died mid-way | the queue's `sweep()` returns orphans; re-run the same job id |
| the cache is not hitting | check the fingerprint inputs (model, recipe version, redaction) — a version bump cold-starts it |
| decisions differ across runs | a non-determinism entered the artifact: strip run metadata (EN-006) |
| a secret appears in the cache | STOP: check the redaction regexes for invisible bytes (EN-007); rotate the secret |
| the audit says FAIL | enumerate, fix, RE-AUDIT; the fix alone is not the proof |
| the checkpoint is stale | re-copy src/tests/docs + refresh SOURCE_TREE.sha256 + re-run its battery |
| a job dir grows unbounded | the gc policy (N-3) |

## 5. THE NUMBERS THAT MUST MATCH (the cross-consistency set)

```
 battery            24 / 0         (repo and the checkpoint copy — independently run)
 tsc                exit 0
 index @shadow      11,831 files / 11,306 fts rows
 ledger             ~32 run rows at the time of writing (grows)
 checkpoint sha     9dc2e8c4dcc694567800447dee79d1df (source tree, post-fix)
 audit canonical    91 findings: 30 high / 49 medium / 12 low
```
If any doc quotes a different number for one of these, the doc is stale — fix the doc, not the number.

## 6. THE FIRST THREE COMMANDS AFTER ANY COMPACTION

```
 cd ~/JARVIS_WORKSPACE/Shared_Workspace/JevManager
 bun test && bunx tsc --noEmit      # expect 24/0 and exit 0 — if not, the tree moved under you
 bun src/cli.ts report              # the ledger: how many runs, of what kinds
 git log --oneline | head -5        # the commit chain since the design base
```

## 7. THE ONE PARAGRAPH THAT REPLACES EVERYTHING ELSE

JM is a targetable decision engine: point it at a corpus, it narrows deterministically (FTS/sqlite/
walk), judges the survivors with one closed question per item through a cache-first Jev client,
routes the answers through policy bands into act/escalate/noop, writes the decisions as a
byte-reproducible artifact, and records every run in an append-only ledger. It survives crashes
(fingerprint-unique queue + sweep), respects hard budgets, fails closed when the key is missing,
serves decisions over loopback HTTP, and refuses to claim anything the audit has not confirmed.

## 8. THE FAILURE TAXONOMY (what has actually gone wrong here, so it can be recognized fast)

| class | the tell | the fix |
|-------|----------|---------|
| silent empty result | success line + zero count | assert counts, not exits (EN-001) |
| stream pollution | a parser fails at char 0 | separate stdout (data) from stderr (chatter) (EN-002) |
| boundary off-by-one | a cap refuses its own last unit | test N-1/N/N+1 (EN-003) |
| timing-dependent test | intermittent red/green | simulate the failure explicitly (EN-004) |
| check-after-act | one extra unit slips past a cap | room-check before, spend after (EN-005) |
| non-deterministic artifact | replays differ in metadata | the artifact is the decision only (EN-006) |
| invisible-byte corruption | a control that never fires | scan for C0 bytes after generated writes (EN-007) |
| swallowed failure value | an error collected but unread | inspect `errors`; rethrow the critical class (EN-009) |
| partial delete | deleted rows still searchable | delete in every index (EN-010) |
| implicit platform default | a log line disagrees with reality | explicit binds/params (EN-011) |
| NaN passthrough | guards that stop guarding | validate at the boundary (EN-012) |
| label-as-hash | a stale label keys a live decision | hash the actual content (EN-013) |
| all-or-nothing batch | one bad item kills the run | per-item containment (EN-014) |
| double-counted measurement | counts look inflated | root discovery; filter snapshots (EN-015) |

## 9. THE TRUST HIERARCHY (what beats what)

```
 the operator's ruling   >  the DPL1 spec  >  the wave plan  >  a build ruling  >  a comment
 a tool result           >  a test exit code >  a battery count >  a doc's prose >  a memory
 the checkpoint          >  the working tree  (the checkpoint is the rollback point)
 the audit artifact      >  any claim about code quality
```
When two sources disagree, the higher wins and the lower is corrected — with the correction
recorded (a doc that contradicts the artifact is stale, not authoritative).

## 10. THE HEALTHY RUN: WHAT TO WATCH (and what each signal means)

| signal | healthy | what a deviation means |
|--------|---------|------------------------|
| cost line | prints; matches the ledger sum | a verb that skips `withLedger` |
| cache hits | climb across repeated batches | a fingerprint input churned (version bump) |
| act band | non-empty on a live corpus | the question is vague (the silent middle) |
| `truncated` | rare, and you know why | a corpus with files over the caps (expected on @shadow) |
| escalation file | small but non-empty across many runs | the thresholds are miscalibrated either way |
| battery | 24/0 after every change | a regression, or a probe that drifted |
| tsc | 0 after every change | types and fixtures diverging |
| the audit gate | PASS, or FAIL with fixes in flight | a claim about to be made without proof |

## 11. THE QUICK REFERENCE (the surfaces and what they cost)

```
 deterministic verbs (index/query/cluster)   $0.000000 — no key, no network
 judged verbs (filter/find/decision-tree)    ~$0.0000147 per decision (measured: 3 decisions = $0.000044)
 find over 30 candidates                     $0.000890 (measured)
 HTTP /decide                                ~$0.0000124 per novel decision (measured); replays $0
 the audit (ocr review, full range)          ~6 minutes, ~2.4M tokens (measured once)
 the battery                                 ~0.2s (17 test files) — run it after EVERY change
```

## 12. THE LEDGER AND CACHE, IN ONE REMINDER

```
 ledger row   { ts, kind:"run", verb, args, started, ended, status, stats, cost_usd, calls, cached }
              append-only; one per invocation; the cost line echoes it
 cache row    { fingerprint, provider, model, schema_hash, state_hash, answer_json, created_at, hits }
              fingerprint = sha256(model ⊕ schema#questionsHash ⊕ canonical(redact(state)))
              ONLY the fingerprint + the answer are stored — never the raw state
```

## 13. THE GLOSSARY (the terms the next reader will meet)

| term | meaning |
|------|---------|
| target | a named pointer (registry) or a path; never copied |
| index | one sqlite file under `~/.jm/index/<name>.sqlite` |
| recipe | a versioned question pack + policy — the unit of judgment |
| band | act (`>= act`) · escalate (`>= flag`) · noop (`< flag`) |
| fingerprint | the decision's identity; the cache key |
| job | a resumable work unit under `~/.jm/jobs/<id>/` |
| sweep | the resume action: orphaned `running` rows return to `pending` |
| artifact | the declared-structure output (md/json/csv); deterministic by law |
| pin | a test or guard that prevents a fixed defect from returning |
| gate | a runnable pass/fail check (battery, tsc, the audit). |

## 14. THE OPERATING RHYTHM (the cadence this project uses)

```
 after EVERY change    bun test + bunx tsc --noEmit          (~0.3s — no excuse to skip)
 after EVERY wave      append RUNNING_BUILD_LOG + RUNNING_DEBUG_LOG
                       refresh the checkpoint if the tree changed
 once per session      canon-doc-update (this set) + ship-docs-update
 before ANY ship claim the audit gate (ocr review over the range) — never skipped
 on any defect         the DEBUG_LOG entry at the moment of the fix + a pin
 on any ruling         append DECISION_CHAIN with the cost-if-wrong
```

## 15. THE FIVE SENTENCES (if everything else is lost, these rebuild the stance)

1. Code narrows, Jev judges, code routes — never blur the three.
2. Every run writes a row; every judgment is cached; every artifact is reproducible.
3. Fail closed on decisions, stay keyless on determinism, stop hard at budgets.
4. Operate it first-person before believing it; the audit is the second opinion; both are required.
5. A fix without its pin and its log entry did not happen.

## 16. THE ESCALATION PATHS (who to tell, in order)

1. **A defect in the code** -> fix it, pin it, log it (no escalation needed).
2. **A defect in the DESIGN** (the spec says something the API cannot do) -> a DECISION_CHAIN ruling
   (B-01 is the precedent: the bible's "64 items/request" became "one state, concurrent requests").
3. **A gated decision** (F1/F6, a threshold move at n<50) -> the operator, stated with its blast radius.
4. **A blocked verification** (the audit lane down, a provider dead) -> record BLOCKED with the resume
   condition; never PASS.
5. **A security class** (a secret in a log, a key in a repo) -> stop, rotate, log, then continue.

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
