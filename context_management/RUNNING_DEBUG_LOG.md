# RUNNING_DEBUG_LOG — JM build

**TREE SHA: `b6a16d9c6742cba8f46feea59dbd7315` (git d573fa8)** - every canon doc that carries this line carries THIS sha; a disagreement means one is stale. Re-derive with ./scripts-seal.sh
Append-only. Every bug: symptom → root cause → fix → verification → lesson.
Updated at the MOMENT of the work (fresh-capture rule).

## [2026-09-21] W0 — D-001 glob depth bug: index returned files=0
- SYMPTOM: `jm index @shadow --include '*.json'` → files=0 changed=0, exit 0 (a silent zero)
- ROOT CAUSE: `globToRe('*.json')` compiled to `^[^/]*\.json$`; the walk yields
  repo-relative paths (`session_diff/ses_x.json`) and `[^/]*` cannot cross `/`,
  so no nested file ever matched the include filter.
- FIX: `matchesAny` now tests both the full rel path AND its basename, so a
  depth-insensitive glob matches at any depth (src/verbs/index.ts).
- VERIFICATION: re-probe → `JM_INDEX_OK files=200 changed=200`; full run → `files=11831`.
- LESSON: an empty result plus exit 0 is the dangerous class — the walk succeeded,
  the filter ate everything, and nothing complained. Counts must be asserted, not trusted.

## [2026-09-21] W0 — D-002 --json stdout pollution
- SYMPTOM: `jm query … --json | python3 -m json.tool` → JSONDecodeError at char 0.
- ROOT CAUSE: `withLedger` printed the `cost=$…` line to stdout before the JSON payload;
  machine consumers parsed "cost=" as JSON.
- FIX: under `--json` the cost line goes to stderr; stdout stays pure JSON (src/ledger.ts).
- VERIFICATION: `jm query shadow --where "size>2000" --limit 10000 --json` piped clean →
  `rows= 1182`; `--fts "theatrical"` → `rows= 341`.
- LESSON: the human line and the machine payload want different streams; the contract is
  "stdout = the declared structure, stderr = the chatter".

## [2026-09-21] W0 — ENV-001 STTGF inline-exec block (host enforcement, NOT a JM bug)
- SYMPTOM: `bun -e '…'` → `[STTGF BLOCK] INLINE_EXEC — Inline exec is smoke test. Use container.`
- ROOT CAUSE: the host's behavior firewall forbids inline exec as a smoke-test substitute.
- DISPOSITION: not a defect — the enforcement working. All probes now run as real
  scripts (`bun run <file>` / heredoc python), never `-e` one-liners.
- LESSON: on this host, inline exec is unavailable by design; build the check as a file.

## [2026-09-21] W1 — D-003 Budget off-by-one: a cap of N refused the Nth call
- SYMPTOM: `new Budget({calls:5})` threw `JM_BUDGET_EXCEEDED: calls=5 cap=5` on the 5th spend
- ROOT CAUSE: `assert()` used `calls >= cap`, so the call that REACHES the cap was refused
  instead of the call that would EXCEED it.
- FIX: `calls > cap` (src/pools/budget.ts) + the queue now claims only the remaining room,
  so a stop is exact (done == cap, never cap + batch).
- VERIFICATION: budget run → `done=100 ... budget_stopped=true`, exit 3, `pending=11731` preserved.
- LESSON: the two classic boundary errors in one day — the filter that eats everything (D-001) and
  the cap that refuses its own last unit (D-003). Boundaries are where the tests must live.

## [2026-09-21] W1 — D-004 Flaky crash test (probe error)
- SYMPTOM: `expect(stuck).toBeGreaterThan(0)` failed intermittently — batch boundaries meant a
  clean run could end with zero orphaned rows.
- ROOT CAUSE: the first draft simulated a crash by relying on how many items a pool batch happened
  to process; with 50 items / concurrency 4 the last batch landed exactly on the budget.
- FIX: the test now simulates the crash explicitly (enqueue, claim 10, complete 1, close the db) —
  deterministic, and it tests the real law (sweep returns orphaned rows).
- VERIFICATION: `test_resume_no_dup` green ×2; the live kill -9 run left exactly `running: 8`.
- LESSON: a test that depends on timing is a test that lies sometimes. Simulate the failure mode
  directly instead of hoping the scheduler produces it.

## [2026-09-21] W5 — D-005 Budget checked AFTER the call (3 calls under a cap of 2)
- SYMPTOM: `decision-tree --budget-calls 2` made 3 calls before stopping.
- ROOT CAUSE: the budget asserted only at the top of the worker; with the post-call spend
  the third call slipped through the boundary.
- FIX: `Budget.roomLeft()` — the caller checks room BEFORE the call, spends after; the cap is
  now exact (cap=2 → 2 calls, then stop).
- VERIFICATION: `test_decision_budget_stop` green (`calls=2`, `budgetStopped=true`).
- LESSON: check capacity before the action, account after it. Two boundary bugs in the same
  family (D-003/D-005) — the boundary is where the money and the lies both live.

## [2026-09-21] W5 — D-006 Artifact carried run metadata, breaking replay determinism
- SYMPTOM: two identical runs produced different decisions.json (only `cached` differed).
- ROOT CAUSE: the written artifact included the transport bookkeeping (`cached`), so the
  second (cache-hit) run could never be byte-identical to the first.
- FIX: the artifact is the DECISION (`i, route, reason, answers, model`); run metadata lives
  only in the ledger/console.
- VERIFICATION: fresh pair → identical sha a3bc30351f68dad8, calls=0 cached=3.
- LESSON: an artifact that includes HOW it was produced can never be replayed. Separate the
  decision from the delivery.

## [2026-09-21] W-END — THE AUDIT'S BOUNDARY FAMILY (7 entries, one mechanism)
- CLASS: unvalidated boundary arguments (the happy path never passed them).
- ENTRIES: fail-closed swallowed (filter/find) · tombstones searchable · the 0.0.0.0 bind · the NaN
  family (caps/pool/queue) · the cache key ignoring the questions · the batch aborting on one file ·
  the double-counted measurement.
- ROOT CAUSE (one sentence): every one is an ARGUMENT the happy path never passed — NaN, negative,
  missing, deleted, hostile.
- FIX: the fix pass (78cd3be) — see DEBUG_LOG EN-009..EN-015 for the mechanism/diff/verification of each.
- LESSON: write the boundary suite BEFORE the audit; a green happy path is a receipt for effort, not
  a capability measurement.
- RESIDUAL: the 49 medium findings remain (five families; DEBUG_LOG's THE FRONTIER).

## [2026-09-21] W-END — THE RE-AUDIT (in flight)
- WHAT: `ocr review --from 7b7f7eb --to HEAD --format json` re-running after the fix pass.
- WHY: the gate's own rule — a FAIL blocks until fixed AND re-run; the fix is a claim, the re-run is proof.
- EXPECTED: the high count drops from 30 toward 0; the verdict line replaces the FAIL in TESTING_LOG.
- LESSON: one audit is a snapshot; the pair (before/after) is the evidence of the fix.

## [2026-09-21] W-END — D-016 THE DOCS LANDED SHORT ON FIRST WRITE (process entry)
- SYMPTOM: the first write of BUILD_REPORT (78L), DEBUG_LOG (59L), and the canon set (17-46L each)
  was FAR below the floors.
- ROOT CAUSE: content was authored to the session's natural length, not to the contract's floor;
  the floors exist because the contract's material (transcripts, tables, dispositions) does not fit
  in fewer lines.
- FIX: the material was added — the verbatim run transcript, the test inventory, the audit's
  findings table, the ruling index, the recovery procedures — taking BUILD_REPORT to 523 and
  DEBUG_LOG to 506, the canon to 200+ each.
- VERIFICATION: `wc -l` per doc (E-17); nothing was padded with whitespace or restated content.
- LESSON: a floor is a statement about the material, not about formatting. If the floor is not met,
  the material was not gathered.

## [2026-09-21] SESSION CLOSE — git 8b42ff8
- EN-024..EN-034 landed in DEBUG_LOG.md (11 entries): the FTS mirror, the sha-on-update upsert,
  the second-operator drill's six defects, the ADV-2 pair, the audit-2 adjudication ledger, the
  stdout-corruption + exit-code pair, the recipe validation, and the rig's own vacuous pass.
- The through-line: EVERY silent defect this session was found by RUNNING or by executing a DOC,
  never by reading. The audit found 2 of the 14; the battery found 2; the drill found 6; the
  doc-execution sweep found 3; the container rig found 1.

## [2026-09-21] THE SESSION THAT SWEPT THE JUDGE BOUNDARY — git 2a641ab

The 2 high-frequency canon logs were being updated in the SHIP log (`DEBUG_LOG.md`) and NOT here,
which is why the canon read as stale and why the C20 floor stayed unmet. The material existed; it
was in the wrong file. This entry lands it where the contract requires it. Ship entries are
EN-024..EN-064 there.

- **EN-035..EN-041** — the audit's closing findings: an identity map that could interpolate
  `undefined` into SQL (fixed), a "simplification" that yields `LIMIT NaN`/`-1` (REFUTED by six
  inputs), a dead duplicate `report` handler (fixed), and a fabricated "duplicate `total`"
  (REFUTED by `grep -c`). **LESSON: "simpler" is a claim like any other, and an auditor's finding
  is a hypothesis until a probe settles it.**
- **EN-042 / D-027** — a target-name sanitiser that was not INJECTIVE: `same name` and `same/name`
  both became `same_name`, so two targets shared one namespace and 2 files became 1 row, silently.
  **LESSON: a value that becomes a KEY must map one-to-one; a sanitiser that is not injective is a
  MERGE.**
- **EN-043 / D-028** — the D-009 defect still alive on the MCP surface: `jm_query` on a typo'd index
  returned `{"rows":[],"n":0}` at success AND materialised a phantom index file. Its own doc's
  "the same semantics as the CLI" is what exposed it. Plus `GET /health` creating an index on a
  liveness probe. **LESSON: fixing a defect on ONE surface does not fix the CLASS.**
- **EN-045 / D-030** — the decision's REASON contradicted its route (a fixed template printed
  `>= act` for noops and escalates). **LESSON: an exit status and a band count can both be right
  while the explanation beside them is wrong. Read the field a human will read.**
- **EN-046..EN-049 / D-031..D-034** — the JUDGE-EVIDENCE family, four instances in one chain:
  the excerpt excluded the match; the same in filter; one seed monopolised all 100 candidates; and
  `route` used a question type the API REJECTS (`mcq` -> HTTP 400) so the verb had NEVER worked
  while a mock validated the wrong shape. **LESSON: at least one test per external boundary must
  cross it for real. A mock encodes the author's belief about the far side.**
- **EN-050..EN-053 / D-035 + D-038** — concurrency took FOUR layers, each invisible until the one
  above was repaired (no `busy_timeout`; the timeout set AFTER the pragma; a check-then-insert
  schema seed dying on `UNIQUE meta.key`; the WAL conversion raced on every open though WAL is
  persistent). **LESSON: an intermittent failure needs a test that REPEATS — one round called a
  broken store green five times.**
- **EN-051 / D-036 + EN-052 / D-037** — an oversized body blocked the WHOLE HTTP surface (no body
  cap anywhere), and a QUADRATIC redaction regex (505/1986/7912 ms for 50k/100k/200k) made any
  large run hang with EMPTY stdout and stderr. **LESSON: an unbounded input is an availability
  problem, not a performance one; and measure SCALING, not a single case.**
- **EN-054..EN-063 / D-040..D-046** — the failure-policy and answer-reading family: only one
  error type was recognised while two verbs went silent; a renamed answer key read as 0 in four
  verbs; the stored confidence was regex-parsed out of the row's own prose; the cache ignored WHICH
  endpoint answered; calibrate read an unknown as a zero and could SUGGEST LOWERING A THRESHOLD
  over an outage; and a usage-less response was billed at $0 so the USD cap could never fire.
  **LESSON: grep for the idiom after fixing one instance — the same `?? 0` appeared on the WRITE
  side and the READ side of one column.**
- **EN-058 + EN-060 + T-07 + EN-064** — three of my own process defects: this host's `pkill` is
  not procps (exit 2, killed nothing, so a gate failed while the commands passed by hand); a test
  binding a FIXED PORT is a flake with a schedule; a commit landed with `tsc` RED because `;` let
  git run after a failed gate; and a `tail -2` hid a red battery from the command that reported it.
  **LESSON: the command which reports a result is part of the result.**

**THE RUNTIME LEDGER, CANON COPY:** sixteen defects this session, none visible in a green suite —
every one from crossing a boundary, repeating a measurement, grepping for an idiom after fixing
its first instance, or reading the field the engine actually writes.

## THE BOUNDARY LADDER — one line per boundary crossed, and what it cost NOT to have crossed it

| boundary | how it was crossed | what reading could not have shown |
|----------|-------------------|-----------------------------------|
| the judge's accepted question types | a live call per type | `mcq` -> HTTP 400: a verb that had never made a successful call |
| the prompt a judge is shown | reading the excerpt, not the trend | the phrase sat at char 1267/9224, outside the 1200-char head slice |
| the candidate provenance | counting where candidates came from | one seed took all 100; two seeds with 361/486 available contributed nothing |
| an oversized REQUEST | a 2 MB body to a live surface | the whole surface blocked, `/health` included |
| an oversized STATE | a 4 MB decision row | a quadratic regex made the run hang with EMPTY stdout AND stderr |
| four OS processes on one index | four simultaneous CLIs | four layers of concurrency defects, each hidden behind the last |
| the daemon's real loop | 32 s of background running | `bun run` is a wrapper plus a child; signalling the wrapper orphans the daemon |
| a service manager | a systemd user unit | `PrivateTmp` gives the service its own /tmp, so a target under /tmp is INVISIBLE |
| the judge's OUTAGE paths | a controlled endpoint | one error type recognised while two verbs returned silent empties |
| a RENAMED answer key | a judge answering under another key | four verbs read 0 — and `evaluate` fabricated every metric |
| two ENDPOINTS, one state | `JM_JUDGE_URL` pointed at a local server | the cache returned the first endpoint's answer for the second |
| a response with NO usage | a judge omitting its accounting block | a call billed at $0, so the USD cap could never fire |
| a 5 MB MCP line, a 2 MB ledger burst, 12 concurrent HTTP requests | sent them | all three survived — recorded so silence is not read as proof |

**THE THROUGH-LINE:** every defect this session was found by RUNNING something, REPEATING a
measurement, or GREPPING for an idiom after fixing its first instance. None was visible in a green
suite, and none would have been found by reading the code.

## WHAT THE HOT SEAT TAUGHT THAT READING COULD NOT — the closing ledger

1. Four of the sixteen defects were only reachable by FOUR SIMULTANEOUS PROCESSES. Reading the
   code shows a `busy_timeout` and a WAL pragma; it does not show that the timeout is set after
   the pragma, or that the schema seed races, or that the WAL conversion runs on every open.
2. Three were only reachable by STARVING the runtime: a missing key, an unreachable endpoint, a
   provider that answers without an accounting block. All three are the paths a demo never takes
   and a production run takes eventually.
3. Two were only reachable by an OVERSIZED input. The body cap and the quadratic redactor were
   both invisible until something big arrived, and one of them produced a hang with no output at
   all — the failure shape that looks like a freeze rather than an error.
4. The rest were reachable only by OPENING THE RIGHT FILE. Every one of them was a correctness
   defect in a function nothing had called with the wrong input yet.

**THE CLOSING CLAIM, AND ITS SCOPE:** this is what RUNNING `jm-live-01` taught. It is not a claim
that the system is defect-free; it is a claim that this instrument, on this instance, has nothing
left unexperienced. The residual is NAMED: W8's fire gate (parked on the operator's rulings) and
the source chunk of the independent audit.

## [2026-09-22] D-047 + T10 — the registered launcher, proven the way a client starts it

- **THE ANGLE:** an MCP client invokes a registered server by ABSOLUTE PATH with an ARBITRARY cwd.
  Nothing in the repo tested that, because every in-repo test ran from the repo. T10 starts the
  launcher from `/` and asserts the full protocol: `tools/list` (4 tools), a real `tools/call
  jm_query` (n=1 with the row payload), and a keyless `jm_find` as a NAMED `isError` refusal.
- **THE DEFECT IT FOUND (D-047):** the launcher resolved bun as `"${JM_BUN:-$HOME/.bun/bin/bun}"`
  while the registry passes `PATH` containing `.bun/bin`. A redirected HOME — service manager,
  container, sandbox — means the server never starts. Fixed with a ladder and an exit 127 naming
  every rung.
- **THREE OF THE ANGLE'S FOUR FAILURES WERE THE PROBE, NOT THE PRODUCT** — `targets add` for
  `target add`; asserting the response contains the SEARCHED phrase when an FTS row carries
  path/size/rank and the phrase lives in the file's content; and regexing `"n": 1` against wire
  bytes where every quote is escaped. The angle now PARSES the envelope and the payload and asserts
  the VALUE.
- **THE NAMING CATCH:** the angle was first called T8 — a number the spec's §9 reserves for the
  fire-gate twin. A rig reporting "8/8" with a reused number reads as covering an angle it does not
  touch. Renamed T10.
- **PROVEN:** host 8/8 and container 8/8 (`jm-ct-rig`, bun 1.4.2).

## [2026-09-22] D-048 + D-049 — two defects in the launcher, found by probing the ENTRY POINT

- **THE SURFACE:** T10 proved the launcher's protocol from a foreign cwd. Seven further probes
  attacked its ENVIRONMENT and the PATH it is invoked by — `env -i`, a symlink, a bad override, an
  unwritable home, extra argv.
- **D-048:** with `HOME` unset, `set -u` aborted the script at the `$HOME/.bun/bin/bun` rung with a
  raw `unbound variable` error, so the named 127 message never printed. **A fallback ladder whose
  last rung can itself throw has no last rung.** Fixed with `${HOME:-}`.
- **D-049:** invoked through a SYMLINK, `dirname "$0"` resolved to the LINK's directory and the
  server died with `Module not found "src/cli.ts"`. Symlinking a launcher into `~/bin` is the
  ordinary way to put one on PATH. **`$0` is how the caller named the program, not where it lives.**
  Fixed with `readlink -f`.
- **FIVE PROBES BEHAVED** and are recorded so silence is not read as proof: both resolution rungs,
  a bad `JM_BUN`, an unwritable `JM_HOME`, and extra argv being ignored.
- **PINNED:** `tests/launcher.test.ts`, 6 cases with both halves.

## [2026-09-22] D-050 — the runner leaked a server, and the NEXT run paid for it

- **THE ONE-OFF:** one gate run said `40 passed / 1 failed`; three runs after it said `41 / 0`, with
  no code change between. **A one-off failure with no failing row in its output is undiagnosable by
  construction** — which is why the runner now logs and re-prints failing rows.
- **THE MECHANISM, PROVEN:** the serve check cleaned up with `pkill`, and this host's `pkill` is
  v0.2.0 (not procps) — it exits 2 and kills nothing. The runner's own daemon check has a comment
  saying exactly that; the serve check had never been converted. The orphan was found ALIVE:
  `pgrep -af 'cli.ts serve'` -> `2320777 bun run src/cli.ts serve --port 7877`, `ss` showing it
  holding the port. The next run could not bind, its readiness poll timed out, and the body-cap
  check failed for a reason unrelated to the code under test.
- **FIXED:** pgrep+kill with a wait for the port to free; and three fixed sleeps replaced by polls
  to deadlines (two already covered this class — this was the third).
- **PROVEN:** two consecutive runs, `41 / 0` each, **0 orphans after each**.

## [2026-09-22] D-051 — the MCP server answered a notification

- **THE PROBE:** seven cases against the MCP surface AS A PROTOCOL: invalid JSON, an unknown method,
  an unknown tool, a missing argument, a wrong-typed argument, empty stdin, and a request with no id.
- **THE DEFECT:** `req.id ?? null` made a notification indistinguishable from a request, so a
  `tools/call` without an `id` got `{"id":null,"result":…}` — a frame the client is not reading,
  which can be consumed as the answer to a LATER request. **A wrong answer to the wrong question,
  with nothing erroring.** JSON-RPC 2.0: the server MUST NOT reply to a notification.
- **THE FIX:** `req.id === undefined` marks a notification; `ok`/`err` return null for one, while the
  method still RUNS (a notification is processed; only the reply is suppressed). `id: null` stays a
  request; the parse-error path keeps its mandatory `id: null` frame.
- **SIX OF SEVEN PROBES BEHAVED** — `-32700`, `-32601`, `-32602`, a named `JM_INDEX_MISSING`, and
  empty stdin producing nothing. Recorded so silence is not read as proof.

## [2026-09-22] THE SECOND OPERATOR, ROUND 3 — two defects, and the family held two worse ones

- **WHAT THE DRILL DID:** a zero-context subagent, docs-only (README + MASTER_PROMPT), 12 operations
  in 17 minutes, nothing modified. It completed all 12 and reported 2 defects and 9 doc-vs-reality
  mismatches. **An operator who could not read the code found what four adversarial sweeps and a
  full runtime seat had missed** — because it followed the DOCS, and the docs are what a new
  operator has.
- **D-054:** a refused `index --in nosuchtarget` left the index behind; `query` then answered it at
  **exit 0 with zero rows.**
- **D-055:** a keyless `decision-tree` left `decisions.sqlite` behind — and the README's "fail-closed
  writes nothing" was false in the literal sense.
- **D-056, FOUND BY PROBING THE FAMILY RATHER THAN THE REPORTS:** `filter` and `find` did the same
  thing and answered at **exit 0**. That is the D-009/D-028 defect, fixed on the MCP surface and
  missed on the CLI — twice-repaired without the invariant ever being stated.
- **THE INVARIANT, NOW STATED AND PINNED:** a run that refuses its input must not have touched the
  disk.
- **D-057:** the usage dump listed 14 of its 17 verbs, and README §18.1 tells the operator to trust
  it. `find`, `filter`, `decision-tree` were undiscoverable by the documented method. Now 17.
- **AND ONE SAFETY FIX:** `target add` now prints `registry <path>`. The drill's `JM_HOME` did not
  survive its shell calls, so it wrote into the operator's real registry, and no output named the
  file.

## [2026-09-22] C14 CLOSED — the session-live half, by starting the session

- **WHAT WAS BLOCKED:** an MCP server mounts at session START, and a running session cannot observe
  its own registry. The registration was on disk and the launcher was proven from a foreign cwd; the
  last half needed a FRESH session, and this host's gate refuses headless smoke probes
  (`[STTGF ESCALATE] HEADLESS — running container test is MANDATORY`).
- **WHAT CLOSED IT:** a headed OMP session under supervision (`hub op:"start"`, pty, `jm-mcp-proof`).
  Its boot log settled with **`jm` in the CONNECTED list**, and `pgrep` showed the live
  `bun run src/cli.ts mcp` that session spawned. Driven to call the tool, the streamed turn carries
  the card `🔌 jm/jm_query` and real rows from the real 159 MB `shadow` index.
- **THE FALSE GREEN AVOIDED:** a pattern match on the marker matches the INPUT ECHO instantly. The
  evidence is the streamed turn — reasoning → tool card → payload — not a regex hit.
- **BOUNDED:** the call was `jm_query`, the keyless twin; the criterion names `jm_find`, and the
  MOUNT was what it was blocked on. Stated in the artifact rather than papered over.
- **AND THE METHOD IS NOW WRITTEN DOWN:** seven steps plus the three traps in reading a TUI log, so
  the next operator re-runs this in minutes instead of rediscovering it.

## [2026-09-29] EN-112 · THE ZERO-DRIFT CHECK COULD NEVER PASS — a dead gate, found by running it

### THE FINDING

`jm push-gate`'s sixth item, "Zero drift?", reported `FAIL` on a tree whose canon docs carried a
TREE SHA that the seal itself had written. The reading was ordinary source drift: `src` had
changed since the last seal, so of course the hashes disagree. That reading was wrong, and the
proof took two commands.

```
  PUSH_GATE REFUSE exit=1 requests=1
    SKIP         spec component?        no spec components provided
    PASS         built correctly?       tsconfig=present src_files=40
    JUDGED_PASS  tested correctly?      ST_DETECT files=44 tests=253 legit=41 suspect=3 shitty=0
    JUDGED_PASS  not theatrical?        noul=0.813 (the judged theatricality score; >=0.5 = genuine)
    PASS         Docs updated?          newest_src_mtime=... oldest_doc_mtime=...
    FAIL         Zero drift?            bundle=bb9b6d2e5d6416f2 stated=b182214203c13579 DRIFT
    1 item(s) failed: drift(bundle=bb9b6d2e5d6416f2 stated=b182214203c13579)
```

### THE ROOT CAUSE — TWO DEFECTS THAT CANCELLED INTO A PERMANENT FAIL

The gate and the seal disagreed about **what is hashed** and **how wide the result is**. They are
supposed to be one contract: the seal writes a value, the gate re-derives it and compares. Two
different expressions is two different facts, and comparing two different facts is not a check.

```
  ┌─ scripts-seal.sh:50 ── THE WRITER ────────────────────────────────────────────┐
  │                                                                               │
  │   find src tests -name '*.ts' -type f | sort | xargs sha256sum | sha256sum    │
  │     | cut -c1-32                                                              │
  │   → b182214203c1357969f1fda4d0a46b04                                          │
  │                                                                               │
  │   scope: src AND tests           width: 32 hex chars                          │
  └───────────────────────────────────────────────────────────────────────────────┘

  ┌─ push-gate.ts:185 getBundleSha — THE CHECKER (BEFORE this fix) ───────────────┐
  │                                                                               │
  │   find src -name '*.ts' | sort | xargs sha256sum | sha256sum | cut -c1-16     │
  │   → bb9b6d2e5d6416f2                                                          │
  │                                                                               │
  │   scope: src ONLY                width: 16 hex chars                          │
  └───────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────────┐
                              │  == ?           │   →  ALWAYS FALSE
                              │  can never hold │      (two different quantities)
                              └─────────────────┘
```

A gate that can never pass is not an enforcement. It is a **refusal generator**: the caller
learns to route around it, and the one time it is right looks identical to the 1,000 times it is
wrong. This is the dead-gate class — the check exists, runs, prints a verdict, and its verdict
carries no information.

### THE SECOND DEFECT, SAME PAIR

`getStatedSha` read the wrong thing, on purpose, from the wrong place.

```ts
// BEFORE — reads BUILD_STATE first, with a 16-char capture
for (const f of ["context_management/BUILD_STATE.md", "BUILD_REPORT.md"]) {
  const body = readFileSync(p, "utf8");
  const m = body.match(/bundle[^\n]*sha[^\n]*([0-9a-f]{16})/i) ?? body.match(/([0-9a-f]{16})/);
  if (m) return m[1];
}
```

The seal stamps **every** canon doc with a line of exactly this shape (`scripts-seal.sh:60`):

```
this line carries THIS sha; a disagreement means one is stale. Re-derive with ./scripts-seal.sh
```

The old pattern captured `([0-9a-f]{16})` — so it read **the first half** of a 32-char value.
Measured: `stated=b182214203c13579` when the document plainly said
`b182214203c1357969f1fda4d0a46b04`. The gate was comparing a 16-char src-only hash against a
16-char prefix of a 32-char src+tests hash. Neither side was the quantity the other computed.

### THE FIX

Both functions now speak the seal's language. One contract, one spelling.

```ts
// getBundleSha — THE EXPRESSION IS THE SEAL'S OWN, CHARACTER FOR CHARACTER
const out = execSync(
  `find src tests -name '*.ts' -type f | sort | xargs sha256sum | sha256sum | cut -c1-32`,
  { cwd: repoRoot, encoding: "utf8" });

// getStatedSha — READ THE LINE THE SEAL WRITES, not "the first hex we happen to find"
const TREE = /\*\*TREE SHA: `([0-9a-f]{32})`/;
for (const f of ["context_management/EVIDENCE_STATE.md",
                 "context_management/BUILD_STATE.md",
                 "context_management/CURRENT_STATE.md",
                 "BUILD_REPORT.md"]) { … }
```

The code now carries the comment that states the contract out loud:
*"If the seal's expression changes, THIS LINE changes with it. They are one contract."*

### THE VERIFICATION — BOTH DIRECTIONS

A mechanical check is not believed until it has been driven through **both** outcomes. A gate
that only ever fails, or only ever passes, has not been tested; it has been observed.

```
  ┌─ 1 · THE PASS DIRECTION (a correct sha must PASS) ────────────────────────────┐
  │  current tree sha: 4e129159c2c2a0d181c0140bb1baa0c9  (git 8f87ed3)            │
  │  canon docs re-stamped: 7                                                     │
  │                                                                               │
  │  PASS   Zero drift?   bundle=4e129159c2c2a0d181c0140bb1baa0c9                │
  │                       stated=4e129159c2c2a0d181c0140bb1baa0c9                 │
  └───────────────────────────────────────────────────────────────────────────────┘

  ┌─ 2 · THE FAIL DIRECTION (one mutated digit must FAIL) ────────────────────────┐
  │  flipped the last digit of the stamped sha in EVIDENCE_STATE.md               │
  │                                                                               │
  │  FAIL   Zero drift?   bundle=4e129159c2c2a0d181c0140bb1baa0c9                │
  │                       stated=4e129159c2c2a0d181c0140bb1baa0c9 (≠)             │
  │                                                                               │
  │  restored.                                                                    │
  └───────────────────────────────────────────────────────────────────────────────┘

  ┌─ 3 · THE PROOF THE OLD FORM WAS THE DEFECT, ON THE SAME TREE ─────────────────┐
  │  seal writes : b182214203c1357969f1fda4d0a46b04   (src+tests, 32)             │
  │  gate computed: bb9b6d2e5d6416f2                  (src only, 16)   ← OLD      │
  │  doc stated  : b182214203c1357969f1fda4d0a46b04                  ← CORRECT    │
  │                                                                               │
  │  → THE DOC WAS RIGHT. THE GATE WAS WRONG. The check could never pass.          │
  └───────────────────────────────────────────────────────────────────────────────┘
```

### AND THE GATE EARNED ITS KEEP IN THE SAME RUN

Fixing this required editing `src/verbs/push-gate.ts` — which made the `Docs updated?` item fail
on the next run:

```
  FAIL   Docs updated?   newest_src_mtime=2026-09-29T15:41:03.765Z oldest_doc_mtime=2026-...
```

That item is not dead. It caught the src edit **before the edit was committed**, which is
exactly its job: a src change with no doc change is a claim that nothing was learned. It is the
reason this entry exists.

### THE LESSON

1. **A gate's WRITER and its CHECKER are one contract.** If they are written in two places, keep
   them character-identical and say so in a comment. The moment they drift, the gate is dead and
   nothing reports its death.
2. **PROVE BOTH DIRECTIONS.** A correct input must PASS and a single mutated input must FAIL.
   If the correct input cannot pass, the gate is dead — and every failure it ever printed was
   noise, including the ones that looked like real findings.
3. **A gate that always fails is worse than no gate.** It burns trust. Every operator who hits it
   learns the correct response is to ignore it, and that habit survives the day the gate is fixed.
4. **"DRIFT" WAS A TRUE STATEMENT ABOUT A FALSE MEASUREMENT.** The word described two different
   numbers and read as a fact about the tree. Name the QUANTITY in the evidence string, not just
   the verdict — `bundle=` and `stated=` do that, which is how this took two commands instead of
   an afternoon.
5. **THE FIX IS IN SRC, NOT IN THE SEAL.** The seal was right the whole time. The detection layer
   was wrong. This is the basic-fucking-logic law in its most literal form: find which side of the
   comparison is the authority before touching either.

<!-- DOC-COMPLETE -->

## [2026-09-29] EN-113 · THE CORE BLOCKER — `criteria` dropped, classification impossible

- **FINDING:** `jm decision-tree` with a `choice` recipe could not run. The verb validated the
  recipe, then the judge returned HTTP 400. Classification — the verb's most valuable shape —
  was impossible, and the error blamed the judge.
- **ROOT CAUSE 1 — A SILENTLY NARROWED SHAPE.** `decision-tree.ts` built the batch question from
  two fields:
  `qForRow[qname] = { type: q.type, instructions: q.instructions };`
  `criteria` was DROPPED. The adapter requires it for `choice`/`score`
  (`normalized()`: "choice criteria must name at least two options" -> HTTP 400). `noul` never
  noticed because it needs no criteria — which is why every noul test passed.
- **ROOT CAUSE 2 — A GUARD MEASURED AGAINST A DEAD ENDPOINT.** `validateQuestions` refused every
  non-`noul` type with "the live judge accepts noul ONLY (measured: choice/mcq -> HTTP 400)".
  Its own comment says `api.typesafe.ai` — the HOSTED endpoint. The tool now runs against the
  LOCAL adapter, whose `normalized()` (line 44) accepts `("noul", "choice", "score")`.
  The guard never re-measured when the deployment changed.
- **AND THE 400 THAT CAUSED THE BELIEF:** a `choice` sent with `options` instead of `criteria`
  is refused BY THE ADAPTER. A malformed field name was recorded as a missing capability.
- **MEASURED, both forms of `choice` against the live local judge:**
  `criteria` as a LIST -> `{"choice":"FALSE_GREEN","probabilities":{5 labels}}` 139 ms
  `criteria` as a MAP  -> `{"choice":"STUB_OR_MOCK_AS_PROOF","probabilities":{5}}` 111 ms
- **FIX:** forward `criteria`; make the validator encode the ADAPTER's own per-type rules
  (instructions required; choice >= 2 options as list or map; score a list of >= 2 levels).
- **VERIFICATION, both directions:** 150 rows classified in ONE request
  (`rows=150 decided=150 act=24 escalate=68 noop=58 requests=1`); and a one-option choice, a type
  `mcq`, and a question with no `instructions` each still refuse by name with zero calls.
- **LESSON:** a field the recipe declares is either FORWARDED or REFUSED AT LOAD. A transformer
  that silently narrows a validated shape turns a client defect into a remote error with a
  misleading cause. And a validator must encode the rules of the endpoint it is POINTED AT,
  taken from that endpoint's own validation — never from a remembered contract of another.

## [2026-09-29] EN-114 · THE CHUNK IS COUNTED IN ROWS, NOT BYTES

- **FINDING:** the first full classification run refused with
  `JM_JUDGE_PAYLOAD_TOO_LARGE: 302567 bytes exceeds the 262144-byte cap`.
- **ROOT CAUSE:** `decision-tree`'s claim loop uses `CHUNK = 200` — 200 ROWS, whatever their
  bytes. The payload is `rows x (row + criteria)`, and `criteria` is repeated on EVERY question
  in the chunk. With 10 class rubrics the packet reached 278 KB over a 256 KB cap even after the
  excerpts were trimmed to 437 bytes.
- **WORKAROUND (used):** chunk the invocation externally — 150 rows per run, 5 runs. Measured:
  all 5 succeeded, `requests=1` each, 658 rows in 118.9 s.
- **THE REAL FIX (not yet made):** the claim loop must budget BYTES, not rows — accumulate until
  the serialized estimate approaches the cap, then send. A row-count constant is a payload
  assumption with no relationship to the payload.
- **LESSON:** a batch boundary expressed in the wrong unit fails on exactly the payloads the verb
  exists for (many rows, a real question). The cap was correct; the unit was wrong.

## EN-115 · THE PATTERN SET WAS IMAGINED, NOT MEASURED — four of five patterns dropped

**SYMPTOM.** T0's own controls went RED on the first full drive: the NEGATIVE fixture
(`fixtures/clean-probe.py`) returned exit 1, and the kernel's OWN source returned 7 hits. A lint
that fires on legitimate code and on its own text is not a gate.

**ROOT CAUSE — THE PATTERNS WERE WRITTEN, NOT DERIVED.** Five patterns were authored from
imagination. Each was then run against three corpora: the POSITIVE fixture (must bite), the
NEGATIVE fixture (must stay silent), and the kernel's own source (must stay silent).

```
  T0_BYTE_READ_IN_TIMED_LOOP          POS=1 NEG=0 SELF=0   KEEP
  T0_GROWING_BUFFER_IN_TIMED_REGION   POS=1 NEG=1 SELF=1   DROP
  T0_BYTE_READ_ANY                    POS=1 NEG=0 SELF=1   DROP
  T0_PIPE_HEAD_IN_TIMED_PIPELINE      POS=0 NEG=0 SELF=1   DROP
  T0_SLEEP_IN_MEASUREMENT             POS=0 NEG=0 SELF=0   DROP
```

- `T0_GROWING_BUFFER_IN_TIMED_REGION` fired on `buf += chunk` in the CLEAN fixture — the negative
  lookahead `(?!.*\bbreak\b)` only inspects the IMMEDIATE next line, and a buffered read's `break`
  sits two lines down. It also fired on `tier4-lsp-capability-probe.py:56` (`buf += line`), which is
  legitimate buffered reading.
- `T0_BYTE_READ_ANY` fired on `readline()` at `tier4-lsp-capability-probe.py:54` — a line read is
  legitimate.
- `T0_PIPE_HEAD_IN_TIMED_PIPELINE` NEVER bit the positive, and it fired on
  `tier0-instrument-lint.py:30` — **its own comment text** (`| head` closes the pipe early…). The
  instrument matched its own documentation.
- `T0_SLEEP_IN_MEASUREMENT` never bit the positive at all.

**THE MECHANISM.** A pattern that cannot PROVE its context fires on the FORM without the timed
REGION. `buf += x` is a defect only INSIDE a measured span; the regex cannot see the span, so it
guessed — and a guess wearing a gate produces verdicts that carry no information while costing the
caller's trust.

**THE FIX.** The pattern set is reduced to the ONE pattern whose subject is unambiguous — `.read(1)`
is ONE SYSCALL PER BYTE, and its count IS the elapsed time — measured POS=1 NEG=0 SELF=0. The four
dropped classes are recorded in the module docstring as the UNCOVERED set, named rather than
policed by a guess.

**A SECOND DEFECT, IN THE FIX ITSELF.** The scripted reduction sliced the list at the wrong `]`,
leaving three orphaned lines of the old `T0_SLEEP` pattern. The lint stopped compiling
(`SyntaxError: unexpected character after line continuation character`), and ALL FIVE controls
returned exit 1 — a uniform failure that reads exactly like a working gate firing on everything.
Found by compiling the file before believing any control result.

**VERIFICATION (after both fixes).**

```
  fixtures/broken-probe.py   exit=1  PASS  (the POS bites; 1 block, token present)
  fixtures/clean-probe.py    exit=0  PASS  (the NEG is clean; "1 file(s) inspected")
  /tmp/NOPE.py               exit=2  PASS  (UNMEASURED, named, NOT 'clean')
  kernel/                    exit=0  PASS  (the instrument is clean against itself)
  fixtures/                  exit=1  CORRECT-BY-DEFINITION (the dir contains the POS fixture)
```

**LESSON.** A detector's pattern set is a HYPOTHESIS until it is driven against its own controls.
The precision measurement (POS/NEG/SELF per pattern) is the derivation; without it, every pattern
is a guess, and four of five were. And: a broken script fails UNIFORMLY — a gate that fires on
everything looks like a gate until the file is compiled.

## EN-116 · THE CASCADE FAILED ITS FIRST CONTROL (5/8) — fixed by rewriting the QUESTION, three times

**SYMPTOM.** The two-pass router was designed because the single-pass 8-label router's weakest
cell sat at p=0.49. The cascade was expected to be STRONGER. Measured on the same 8-span set:

```
  attempt 1  cascade 5/8     (single-pass baseline: 7/8 — THE CASCADE WAS WORSE)
  attempt 2  cascade 6/8
  attempt 3  cascade 8/8
```

**ATTEMPT 1 — PASS-1 WAS THE BOTTLENECK (5/8).** The pass-1 question enumerated four kinds of
checkable subject: *"a claim that a machine could check against a file, a test result, a deployed
artifact, or a running process"*. The judge read the ENUMERATION as the whole definition, so a
declaration on a WIRE (`plutus-lsp declares diagnosticProvider`) matched none of the four and
fell to NONE at p=0.51 — barely over the line. Three spans misrouted: LSP_LIE, REAL_EDIT, PHANTOM.

**ATTEMPT 2 — CHANGED THE QUESTION TO THE CLASS (6/8).** The enumeration was replaced with the
class + an explicit parenthetical: *"something that could be confirmed or refuted by inspecting
anything at all (a file, a test, a wire protocol, a running process, a declaration, a count)"*,
and NONE was redefined by GRAMMAR. LSP_LIE was recovered (0.58). The two remaining misses were
both `Created <artifact>` spans, routed to NONE at 0.67/0.60 — **and the judge was CORRECT per my
criterion, because `Created X` IS grammatically an action.**

**THE REALISATION (attempt 2's lesson).** The span is BOTH an action AND an existence assertion.
The router must route it to FILE, because that is the probe that can settle it. A criterion that
lets an artifact-naming action escape to NONE is a criterion that creates an escape hatch for
exactly the class the kernel exists to catch — *"I created X"* is the phantom-artifact claim.

**ATTEMPT 3 — NONE EXCLUDES NAMED ARTIFACTS (8/8).** NONE became: *"an action that NAMED NO
ARTIFACT and asserts nothing checkable, or a PLAN, a QUESTION, or QUOTED text. An action that
NAMES an artifact ('created X', 'wired Y') DOES assert that X exists — route it, do not dismiss
it"*.

**THE FINAL MEASUREMENT (all 8 spans, tool output):**

```
  LSP_LIE       CHECKABLE  CAPABILITY    0.74  0.42  OK
  REAL_EDIT     CHECKABLE  FILE          0.59  0.95  OK
  REAL_TEST     CHECKABLE  TEST          0.89  0.50  OK
  PHANTOM       CHECKABLE  FILE          0.55  0.75  OK
  TIMING_LIE    CHECKABLE  MEASUREMENT   0.89  0.93  OK
  REAL_TIMING   CHECKABLE  MEASUREMENT   0.77  0.94  OK
  SPEC_CLAIM    CHECKABLE  SPEC          0.82  0.78  OK
  PLAN          NONE       NONE          0.81  0.00  OK

  CASCADE ACCURACY: 8/8      PASS-1: 8/8      spans reaching the fine pass: 7/8
```

**LESSON.** A question's WORDING is the mechanism; a threshold is not. Every gain across the three
attempts came from rewriting the question — the derived cut never moved. And a "NONE" label is a
LOAD-BEARING decision: an over-broad NONE is an escape hatch for the exact claims the kernel
exists to catch, and it looks like a correct abstention while it does it.

## EN-117 · THE PROBE HUNG (exit 124) AND MY FIXTURES WERE DEAF — two defects, one adversarial round

**SYMPTOM.** The adversarial proof (T4 against the lying server, then the honest one) timed out
FOUR times: 600 s, 240 s, 600 s, 138 s. `timeout(1)` killed the probe both times — including
against the HONEST server, which declares nothing and should answer instantly.

**DEFECT 1 — THE PROBE'S READ BLOCKED FOREVER.** `read_msg()` used `proc.stdout.readline()`, a
BLOCKING read, and checked its `timeout` argument only BETWEEN calls. A server that writes no
newline blocks the probe indefinitely.

- **Why this is worse than a wrong answer:** a hang produces NO VERDICT — the caller gets exit
  124 from `timeout(1)` instead of a named refusal, and cannot tell "the server is silent" from
  "the probe is broken". The temp dir also never cleans (2 residual `/tmp/jev-t4-*` measured).
- **The fix:** `select()` on the fd with the REMAINING budget, then a non-blocking `os.read` —
  the same bounded-read discipline the T0 comparison needed. A read's cost must be bounded by the
  budget, never by the peer's willingness to speak.

**DEFECT 2 — THE FIXTURE SERVERS COULD NOT HEAR.** With the read bounded, the probe correctly
returned `UNMEASURED` (exit 2) — and it was RIGHT. The servers used `readline()`, which STRIPS the
newline. The probe frames as `Content-Length: N\r\n\r\n{json}`; `readline()` yields
`"Content-Length: N"` with the terminator gone, so the handler's
`/Content-Length: (\d+)\r?\n\r?\n/` could NEVER match. **Both fixture servers read the header and
waited forever.**

- **The realisation:** the probe's UNMEASURED was DIAGNOSTIC, not obstructive. A fail-closed probe
  turned a two-sided silence into a one-sided fault it could name. Had the probe defaulted to
  "clean", the deaf fixtures would have passed as honest.
- **The fix:** both servers parse RAW frames (`process.stdin.on("data")` + a byte buffer + the
  `\r\n\r\n` separator), exactly as the probe frames them.

**THE PROOF (after both fixes — the adversarial round, both directions):**

```
  honest-server (declares 0, answers everything)   exit=0  want=0    52ms  lies=0
  lying-server  (declares 23, implements 0)        exit=1  want=1    61ms  lies=23
  litter: 0 sample.ts   ·   residual temp dirs: 0
```

**LESSON.** A timeout is not a refusal. `timeout(1)` returning 124 tells the caller NOTHING about
the subject — it is the same failure class as a silent pass, one level up. A probe must bound its
own reads and return a NAMED verdict, or its silence is indistinguishable from its honesty. And a
fail-closed probe is DIAGNOSTIC INSTRUMENTATION: the UNMEASURED verdict is what located the deaf
fixtures. A fail-open probe would have called them clean.

## EN-118 · FR-6a: THE Q3 REWRITE FAILED THE BAR — and a mislabeled control nearly published a false pass

**THE DESIGN.** Q3 was measured at 3/4 and rewritten to ask about TWO RUNS explicitly. The law
(FR-6a): re-derive on a WIDENED set; below a +0.10 gap the question stays WARN-only and never
BLOCKS.

**THE WIDENED SET.** 9 cases — 4 POS (a response that varies with the subject) + 5 NEG (a
response that cannot discriminate). Every case is a real pattern from this session's work:
always-empty, real-lint, real-test, real-git, phantom-grep, constant-map, empty-scope,
hc-return, stale-cache.

**THE FALSE PASS, CAUGHT.** The first derivation printed:

```
  original Q3   pos_min=0.150  neg_max=0.347  gap=-0.197
  rewritten Q3  pos_min=0.449  neg_max=0.285  gap=+0.165     <-- "PASSES at +0.165"
```

That is a FALSE FINDING. `always-empty` — *"diagnosticProvider returns [] for a file with 3 type
errors AND for a clean file. The two runs are identical."* — was labelled POSITIVE (expect=YES).
**It is a NEGATIVE**: the whole point of the case is that the response does NOT discriminate. The
label inverted the gap and manufactured a pass.

**THE MECHANISM.** A mislabeled control does not fail loudly. It moves `pos_min` and `neg_max` in
the direction that flatters the question, and the gap — the ONLY number the derivation reads —
comes out positive. **The instrument's error and the finding pointed the same way, again.**

**THE CORRECTED DERIVATION:**

```
  original Q3   pos_min=0.436  neg_max=0.347  gap=+0.089   8/9
  rewritten Q3  pos_min=0.496  neg_max=0.449  gap=+0.047   8/9
  BAR: >= +0.10 to BLOCK
  ✗ NEITHER PASSES — and the REWRITE IS WORSE (+0.089 -> +0.047)
```

**THE DECISION.** Per FR-6a, **Q3 stays WARN-only and never BLOCKS.** The rewrite is NOT adopted —
it measured worse than the original on the corrected set. A third formulation is owed before Q3
earns a block. The honest state: the ambiguity question does not yet discriminate reliably, and
the kernel says so rather than shipping a threshold over a +0.047 gap.

**LESSON.** Read the controls, not just the gap. A derivation whose POSITIVE set contains a case
that describes non-discrimination will report a pass for any question at all. And the same defect
class has now appeared three times in one session — the instrument's flaw and the conclusion
pointing the same way — which is exactly why the control set is read by eye before any number is
published.

## EN-119 · THE PROBE HAD BEEN CRASHING SINCE dc35064 — and the gate called the crash a finding

**SYMPTOM.** ST-401 drove the extension's LSP gate against both fixtures. BOTH were blocked — the
HONEST server included, which declares nothing and should register.

**DEFECT A — MY OWN EDIT BROKE THE PROBE.** The label fix in `dc35064` replaced

    label, declared, lies, oks = probe(cmd, root, "plutus-lsp")

with a bare assignment

    label = pathlib.Path(root).resolve().name or "unknown"

— **dropping the `probe()` CALL**. `declared` was never bound, so every invocation raised

    NameError: name 'declared' is not defined     [at line 167]   [EXIT=1]

**THE PROBE WAS BROKEN FOR THE WHOLE SPAN BETWEEN `dc35064` AND THIS FIX**, and the "13/13" FR-5
run and the adversarial proof were taken BEFORE that edit. **I edited and did not re-drive.** That
is the asserting-scripted-edits failure: an unasserted replace is a silent no-op or a silent
breakage, and the only defence is re-running the subject.

**DEFECT B — THE EXTENSION COULD NOT TELL A CRASH FROM A FINDING.** The gate read exit 1 as
"lies found". A `NameError` also returns 1 — **with no LIE lines.** So a crash was reported as a
capability lie and an honest server was refused.

- **The fix:** a LIE verdict now REQUIRES its evidence — the LIE lines. Zero lines plus exit 1 is
  `T4_PROBE_CRASHED`, a distinct refusal, and it does NOT block registration.
- **The law this encodes:** a finding must carry the evidence that constitutes it. An exit code is
  not a finding; the code plus its lines is.

**THE RE-DRIVEN CONTROLS (after both fixes):**

```
  fixtures/honest-server   exit=0  want=0     60ms  lies=0     PASS
  fixtures/lying-server    exit=1  want=1    169ms  lies=23    PASS
```

**THE EXTENSION'S GATE, BOTH WAYS:**

```
  LYING  -> block=true          refused=T4_LSP_CAPABILITY_LIE
  HONEST -> block=undefined     (REGISTERED)
  ★ DISCRIMINATION: PASS
```

**LESSON.** Every fix re-runs its subject. A one-line edit to a probe's entry point is a full
regression surface, and the only thing that catches it is executing the probe — not reading the
diff. And the second defect is the RECURRING class: a failure signal that is also a success signal
(exit 1 = lies OR crash; exit 0 = clean OR unread at T0 before FR-10). **Every code that can mean
two things must be split, or the ambiguity becomes a false verdict.**

## EN-120 · THE CONTROL SET MOVED INTO THE REPO, AND THE BATTERY WENT GREEN

**THE DEFECT THE BATTERY FOUND.** The first full battery run came back `PASS=9 FAIL=1`. The failure
was T5 — the five-probe controls — and the cause was NOT a probe: it was the CONTROL SET LIVING IN
`/tmp`. The battery ran `/tmp/probe-run.py`, the ORIGINAL set that used `true` as the "passing
suite". The probe correctly returned `T4_TEST_UNMEASURED` — `true` prints no pass count — and the
stale set called it a failure.

**FR-13 says it plainly: the controls ship WITH the kernel.** They were in `/tmp`, which is not
durable — and this was the SECOND time it bit. The FIRST probe's `/tmp/broken-probe.py` had already
been deleted between runs, so a T0 control re-ran `clean` and nearly got published as a pass.

**THE MOVE.** `fixtures/probe-controls.py` (66 lines) now carries all 16 controls: the five probes
driven both ways, with REAL mini runners instead of `true`, a temp dir for the spec/wire fixtures,
and every expected verdict named. The battery runs the in-repo set. `/tmp` is no longer load-bearing.

**THE BATTERY, GREEN:**

```
  T0 POS   fixtures/broken-probe.py     exit=1   token FACT-FIREWALL T0 BLOCK x1
  T0 NEG   fixtures/clean-probe.py      exit=0
  T0 UNREAD /tmp/NOPE.py                exit=2
  T0 SELF  kernel/                      exit=0
  T4 ADV   lying (declares 23)          exit=1   token FACT-FIREWALL T4 BLOCK  LIES x23
  T4 ADV   honest (declares 0)          exit=0
  T5       the five probes, 16 controls exit=0   PROBE CONTROLS: 16/16
  BRAIN    the cascade, 8 spans         exit=0   PASS-1: 8/8
  T3       the ledger                   rows=121  lies=115
  GATE     scripts-spec-gate.sh         present + executable

  PASS=10  FAIL=0  UNMEASURED=0   ★ BATTERY GREEN
```

**LESSON.** A control that lives outside the repo is a control that can be deleted by anything, and
its absence reads as a pass. The instrument and its controls are ONE artifact; shipping them apart
ships an instrument whose silence has two meanings.
