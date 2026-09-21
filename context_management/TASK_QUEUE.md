# TASK_QUEUE — the live queue (OVERWRITE semantics: completed moves to done, active to next)

**TREE SHA: `59a00768718ddf8ee4a41ffff58b63b6` (git a18a880)** - every canon doc that carries this line carries THIS sha; a disagreement means one is stale. Re-derive with ./scripts-seal.sh
































The queue is ORDERED by dependency, not by appeal. A task is `DONE` only when its done-when
criterion resolves mechanically; "worked on" is a status, never a completion.

---

## DONE (verified this session; the evidence column is the criterion, not a claim)

| # | task | done-when | evidence |
|---|------|-----------|----------|
| D1 | W0 core CLI (store · index · query · ledger · router) | `index @shadow` twice, 2nd < 10% wall, known rows return | `files=11831` then `changed=0 ms=60`; `test_index_incremental`, `test_store_roundtrip`, `test_query_known_rows` |
| D2 | W1 job runtime (queue · resume · budgets · pools) | `kill -9` mid-index -> re-run, dup=0; a cap stops | T5 container angle: `SIGKILLed with 8 orphaned -> done=400 distinct=400`; `test_resume_no_dup`, `test_budget_cap` |
| D3 | W2 targets + adapters (fs · jsonl · sqlite · `--in`) | one query spans every kind | one FTS query returns `a.md` + `rows.jsonl#L2` + `src.sqlite#issues/2`; `test_adapter_delta` |
| D4 | W3 retrieve (scan · cluster · extract · recipes) | triage rows with ids + band counts | `test_filter_bands` asserts ids, p per row, and the kept/rejected split |
| D5 | W4 find (the 9-stage chain, C5) | every pattern carries n + exemplar ids | `test_find_patterns` (which did not exist until this session; writing it found three defects) |
| D6 | W5 decide (decision-tree · route · evaluate) | 100 rows; 2nd run 0 judge calls; key off -> exit 2 | `test_cache_zero_calls`, `test_decision_fail_closed`; the T3/T4 angles |
| D7 | W6 surfaces (serve · mcp · watch) | `curl /decide`; an agent calls a tool; a tick journals | `test_serve_decide` (a REAL server + request); the MCP handshake probe; `test_watch_tick_idempotent` |
| D8 | W7 report + calibrate | a threshold move recorded from rows | `test_calibrate_row`: bands 1/1/1, the truth recorded and read back, the calibration event appended |
| D9 | The container rig (spec §9 T1-T7) | tokens emitted by assertions | `artifacts/container-rig-2026-09-21.json` — 7/7 in a fresh Debian-12 container AND on the host |
| D10 | The second-operator drill, rounds 1 and 2 | a zero-context agent completes the steps | round 2: all 10 steps, 3 defects found and fixed, 1 false doc line corrected |
| D11 | The adversarial loop (ADV-1/2/3) | a full pass with zero confirmed defects AND the frontier named | ADV-3: 12 probes, 1 defect (D-027), fixed; the unswept frontier is the parked W8 surface |
| D12 | README §18 — the operating contract | every claim executed | 25/25 verified; the sweep itself found 3 defects |
| D13 | C8 — `jm report --job <id\|last>` (a spec criterion recorded as an OPEN violation) | the invocation exists and reconciles the queue against the ledger | `reconciled: YES` exit 0 on a clean job; `NO` exit 3 on a leftover running row; a typo -> exit 2 with no phantom; `tests/job-report.test.ts` |
| D14 | The escalation band's live row (N6) | a real scenario lands in the band | a 5-scenario live run: `act=1 escalate=1 noop=3`; the escalate row at p=0.590 |
| D17 | The W2 gate on the REAL corpora | one query spans @shadow + @ocdb, and the DBs are untouched | `scripts-real-corpus.sh` -> `REAL-CORPUS RIG: PASS`: 11,832 files + 2,309 rows from four DBs (~33 GB), `READ-ONLY LAW: HOLDS`, `CROSS-KIND: YES` |
| D16 | The independent audit runner (the pin's PROOF CONTRACT clause) | every prior gate re-runs on the combined tree with a token per check | `scripts-gates.sh` -> `GATES: 33 passed / 0 failed`, exiting non-zero on any failure; its own first run found a bad CHECK (a grep for a column `scan` does not have) |
| D15 | D-030 — the reason/route contradiction | every reason states the comparison that fired | `reasonForSignal` in the ladder's own module; `tests/ladder-reason.test.ts` asserts route/reason agreement in all three bands AND against `routeOf` |

---

## NEXT (active; each carries its done-when and its blocker)

| # | task | done-when | blocker |
|---|------|-----------|---------|
| N1 | **One complete source-scope audit pass** | `ocr review` over the 36-file source scope returns `status: complete` | EXTERNAL: every lane returns 0 tokens. Retry condition: any lane with a non-zero token count on a 2-file probe |
| N2 | `jm report --job <id\|last>` (spec C8) | the verb exists and its output reconciles one job's queue rows against its ledger rows | none — OWED, recorded in VIOLATION_LOG.md |
| N3 | C14's session-live half | an OMP session calls a JM MCP tool and receives rows | needs a client registration + a session restart; the protocol path is already proven |
| N4 | The 3 short append-only logs reach their floor | `wc -l` >= 200 on THEATRICALITY_LOG and the 2 running logs | appends only; padding is forbidden, so this closes by living |
| ~~N5~~ | ~~`@ocws` (219G) walked~~ **CUT — it contradicts the SPEC** | — | spec section 4 lists "`@ocws` full indexing" as explicitly OUT OF SCOPE for v1. It should never have been on this queue; recorded as cut rather than quietly dropped. The real-corpus proof that IS in scope is D17 |
| ~~N6~~ | ~~The escalation band gets a live row~~ **CLOSED** | a decision row in the escalate band from a REAL scenario | DONE: a 5-scenario live run on the real judge gave `act=1 escalate=1 noop=3`, with the escalate row at p=0.590 (`agg=0.59 in [flag=0.5, act=0.8)`) — and reading its REASON found D-030 |

---

## BACKLOG (re-prioritized; not blocked, not next)

| # | task | why it is here |
|---|------|----------------|
| B1 | Embeddings / vector search | explicitly OUT OF SCOPE for v1 (spec §4) |
| B2 | A web UI | explicitly out of scope |
| B3 | Cross-machine cache sharing | out of scope |
| B4 | `learn` / RSI automation | W7 is manual feedback only by design |
| B5 | The doc backlog N-10..N-16 from the FIRST drill | mostly closed by README §18; the residue is prose polish |

---

## W8 — PARKED, not queued (operator-owned)

| # | task | blocker |
|---|------|---------|
| W8a | The fire gate (`src/firegate/`, `jef`) | **F1** — the embedding/vector ruling |
| W8b | The reflex schema + one reflex in OBSERVE | **F6** — the pi wrap points |
| W8c | Container angles T8 (twin fixtures) and T9 (token cap) | W8a/W8b |

W8 is not "waiting to be worked on"; it is waiting on TWO DECISIONS. Nothing in this file assumes
it will land.

---

## THE RULE THIS FILE FOLLOWS

A task leaves this queue by one of three doors: it is DONE with a mechanical criterion, it is
BLOCKED with a named blocker, or it is CUT with a reason. A task that is merely "worked on" stays
where it is — that is what the queue is for.


---

## PER-TASK EVIDENCE CHAINS (why each DONE row can be trusted)

### D1 — W0 core CLI
The wave's gate is three-part and all three ran on the REAL corpus, not a fixture:
`index @shadow` produced `files=11831 changed=11831 text=11306 ms=4019`; the re-run produced
`changed=0 ms=60`, which is 1.5% of the first pass against a `<10%` gate; and
`query @shadow --where "size>2000"` returned 1182 rows, each carrying its id. The incremental
mechanism has TWO paths — a (size, mtime) fast path and a content-sha slow path — and both are
exercised: the fast path by the re-run above, the slow path by `test_index_incremental`'s
touch-and-reindex case.

### D2 — W1 job runtime
The crash contract is proven by a REAL SIGKILL rather than a hook. The T5 container angle spawns the
queued index as a child process, polls the job store until a row is in state `running`, and only
then sends SIGKILL — leaving rows claimed and un-acked, which is precisely the state a crash
produces. The re-run resumes them, and the angle asserts `done=400 distinct=400`, so a duplicated
fingerprint would fail it. The angle ALSO asserts `orphaned > 0` before it will report a pass: the
first version of that probe slept 320 ms and killed the child during start-up, which would have been
a green light over a run that proved nothing.

### D3 — W2 targets and adapters
The gate is "one query spans every kind", and the evidence is the three path shapes inside a single
result set: a bare `a.md` (fs), a `rows.jsonl#L2` (a line of a JSONL file), and a
`source.sqlite#issues/2` (a row of a table). Two defects were found building this wave: same-named
files across two targets collapsed into ONE row (D-008), and later a target NAME that collided with
another after sanitisation merged two namespaces and did the same thing again (D-027). Both are
pinned.

### D4 — W3 retrieve
`test_filter_bands` asserts the shape the wave's gate names: rows with IDS (a non-empty `path`), a
probability per row, `kept_rows.length === kept`, and — the part that matters for a triage surface —
that the REJECTED rows are still counted (`judged - kept === 2`). A replay test asserts `calls === 0`
on the second run, which proves the bands came from the cache rather than from fresh judgement.

### D5 — W4 find
The pin's proof contract names `test_find_patterns`; it did not exist before this session. Writing
it found three defects the rest of the battery could not see: a raw SQLiteError leaking from
malformed FTS input (now `JM_FTS_INVALID`, exit 2), a budget cap that overshot 3x under concurrency
(the claim/settle fix), and `--common` accepted-and-never-read. The test asserts, per pattern:
`n >= 1`, non-empty exemplar ids, `exemplars.length <= n`, and `p >= 0.8` per exemplar.

### D6 — W5 decide
The determinism gate is measured: a 100-row batch makes 100 judge calls on the first pass and ZERO
on the replay, with byte-identical routes. The fail-closed gate is measured separately with `HOME`
redirected AS WELL AS the env var unset — unsetting the variable alone still leaves the key FILE
reachable, so a test that only unsets it proves nothing about the starve path.

### D7 — W6 surfaces
`test_serve_decide` starts a REAL server on a real port, issues a real fetch, and asserts the
decoded answer value; it also asserts the three negative halves (malformed body to 400, missing
questions to 400, unknown route to 404). The MCP half is proven by a real JSON-RPC session:
initialize, a notification that correctly produces NO response frame, tools/list, and a tools/call
returning a known row. The daemon half is proven by two ticks on one corpus: `changed=4` then
`changed=0`.

### D8 — W7 report and calibrate
`test_calibrate_row` seeds three decisions spanning the three bands, asserts the read-back
(`act/escalate/noop = 1/1/1`), records an operator truth and asserts the calibration SEES it
(`truthFilled` moves from 0 to 1), asserts an absent row refuses (`recordTruth(999999) === false`),
and asserts the calibration event is appended with a timestamp.

### D9 — the container rig
The rig's tokens can only be produced by the assertions that name them, and the same harness file
ran in two environments: a fresh Debian-12 container (bun 1.4.2, container-local /tmp, no host key
file visible) and this host. Both returned `JM_CONTAINER_RIG PASS — 7/7 angles`. T8 and T9 are
excluded because they belong to W8.

### D10 — the second-operator drills
Round 1's operator reported 14 doc gaps, and those became README section 18. Round 2's operator then
worked from section 18 alone and completed all ten steps — while exposing three defects that the
docs themselves had implied were impossible (section 18.8's "the same semantics as the CLI" was
false for the MCP surface) and one false doc line (section 18.9's tick-index claim). A doc that is
wrong IS a defect; a drill is the instrument that finds it.

### D11 — the adversarial loop
Three sweeps, each against the surface as it stood: ADV-1 (the W0 surface), ADV-2 (the post-W1
surfaces), ADV-3 (everything changed since ADV-2). Each sweep lists the probes that PASSED as well
as the failures, so silence is never read as proof. The frontier is named: the parked W8 surface has
no code to probe, and everything else has been swept.

### D12 — README section 18
The operating contract was written from a zero-context operator's gaps and then EXECUTED; the sweep
found 25 claims, of which 20 passed, 2 were the verifier's own stale expectations, and 3 were real
defects. The section now states its own precedence rule: if a line disagrees with the engine, the
engine wins and the line is the bug.


---

## HOW A TASK MOVES THROUGH THIS FILE (so the next editor does not invent a status)

| transition | requires | forbidden |
|-----------|----------|-----------|
| NEXT -> DONE | the done-when criterion RESOLVES, and the resolution is a command output or an artifact path pasted beside the row | "it works", "tested", a green battery offered as capability |
| NEXT -> BLOCKED | a NAMED blocker (an external quota, an operator ruling, a missing dependency) | "waiting", "needs more work" |
| NEXT -> BACKLOG | a written reason it is not next (out of scope, lower value, depends on something cut) | silently dropping it |
| BACKLOG -> NEXT | a reason it became next (a dependency landed, the operator asked) | re-prioritizing without saying so |

A task that is merely "worked on" does not move. That is what an explicit queue is for: the reason a
thing is not done is recorded where the thing lives, not in a session summary that the next agent
never reads.

## THE WAVE-TABLE CROSS-REFERENCE

Every DONE row above maps to a wave table row in `packages/jm/06-WAVES.md`, and each wave's test id
is present and passing under its own selector (12 of 13; the 13th is W8's `test_firegate_twin`):

- W0 core -> D1 -> `test_index_incremental`, `test_store_roundtrip`, `test_query_known_rows`
- W1 job runtime -> D2 -> `test_resume_no_dup`, `test_budget_cap`
- W2 targets -> D3 -> `test_adapter_delta`
- W3 retrieve -> D4 -> `test_filter_bands`
- W4 find -> D5 -> `test_find_patterns`
- W5 decide -> D6 -> `test_cache_zero_calls`, `test_decision_fail_closed`
- W6 surfaces -> D7 -> `test_serve_decide`
- W7 report/calibrate -> D8 -> `test_calibrate_row`

W8 -> the parked table below -> `test_firegate_twin` (ABSENT by design).

Three of those test ids did not exist when this queue was first written. A wave table that names a
test the code does not have is a hole in the evidence, not a formality — and closing this one hole
found four defects (a driver error leaking from user input, a budget race, an unread flag, an MCP
surface returning empty-at-success).

## WHY N1 IS THE ONLY EXTERNALLY BLOCKED ITEM

Every other open row can be closed by work. N1 cannot: the code-audit lane's free tier returns zero
tokens, and the audit's own contract forbids recording a partial run as a pass. The five methods
tried (full scope, scope chunking, half scope, `--resume`, and `--concurrency 1`) are listed in
`AUDIT_SUMMARY.md` section 5.1, and the last of them DISPROVED its own hypothesis: 62 requests, 62
failures, zero tokens — a quota, not a burst.
