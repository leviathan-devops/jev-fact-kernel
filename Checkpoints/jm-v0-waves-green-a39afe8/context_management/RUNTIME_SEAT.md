# RUNTIME SEAT RECORD — jm-live-01

**H0 DECLARATION (2026-09-21):** I am the driver of **jm-live-01** — the JM CLI +
`jm serve :7777` on this host, running against the real `@shadow` (11,831 files),
`@reports` corpora and the real TypeSafe API (key source: file, fingerprint
`463e63ca5302`; never the value). I must live with: a 159MB FTS index, a
100k-row job queue, and real per-call cost.
**Slide trigger:** "the code does X" -> SLID. "I ran X and it did Y" -> DRIVER.

## THE OPERATION STREAM (first-person, numbered, pre-registered expectations)

| # | I DID | I EXPECTED | IT DID |
|---|-------|-----------|--------|
| OP-01 | add the shadow target | a registry row | `target shadow (fs)` registered |
| OP-02 | index @shadow (batch) | files=11831, $0 | `files=11831 changed=11831 text=11306 ms=4019` |
| OP-03 | index @shadow again | <10% wall | `changed=0 ms=60` (ratio 2.5%) |
| OP-04 | query --where "size>2000" | >=1 row with ids | `rows=1182`, sample `ses_211321a0....json` |
| OP-05 | query --fts "theatrical" | the known rows | `rows=341` |
| OP-06 | queued index then SIGKILL | orphans in `running`, resumable | `done=1328 pending=10495 running=8` |
| OP-07 | re-run the SAME job | resumed=8, completes, dup=0 | `resumed=8 done=11831 running=0`, DONE=11831 DISTINCT=11831 |
| OP-08 | --budget-calls 100 on the queue | hard stop, cap named, resumable | `done=100 budget_stopped=true` exit 3, pending kept |
| OP-09 | live decision-tree (real API) | correct routing on 3 rows | crash `act 0.97` . typo `noop 0.08` . 500s `act 0.90`, $0.000044 |
| OP-10 | the SAME rows again | 0 calls, identical artifact | `calls=0 cached=3`, both sha a3bc30351f68dad8 |
| OP-11 | serve + /decide live | an answer, a cost | `noul 0.98`, model jev-1.13.0, $0.0000124; replay cached, cost 0 |
| OP-12 | find "theatrical claim without evidence" over @reports | patterns with exemplars | trend 44 -> 30 -> 1 -> 1; the Fire Gate blueprint at p=0.80 |
| OP-13 | PUSH: N=4 concurrent /decide | all four answered, no clobber | noul 0.62 / 0.67 / 0.69 / 0.66, zero errors |
| OP-14 | PUSH: starve (no key) | FAIL CLOSED, nothing written | JEV_NO_KEY, out NOT written, exit 2 |
| OP-15 | PUSH: hostile rows (malformed JSON) | loud, named refusal | `JM_ERROR: JSON Parse error`, exit 1 |
| OP-16 | PUSH: empty input | a sane low signal, not a crash | `noop 0.11` |
| OP-17 | PUSH: legit path twice (HTTP) | second run free | `cached=True cost=0` |

## THE RUNTIME LEDGER — what RUNNING taught that READING could not

1. **Corpus is not corpus.** `session_diff` holds *file-diff blobs* (many literally `[]`);
   the claim-bearing text lives elsewhere. A find for "theatrical claim" over @shadow
   returned kept=0 — TRUTH, not a bug — while the same chain over @reports found the one
   document that genuinely discusses it. Target choice is a first-class decision.
2. **The corpus contains 100-400MB files.** The 8MB-hash / 256KB-text caps are load-bearing;
   without them the index would try to digest 400MB blobs. `truncated:true` is the honest flag.
3. **Single-expression inline execution is blocked on this host** (the STTGF gate). Every
   probe must be a file; the one-liner form is unavailable by design — including in DOCS:
   a document that contains the trigger pattern is itself refused at write time.
4. **The queue's real crash shape:** exactly `concurrency` rows orphan in `running` (8 of 8);
   the sweep recovered precisely those. The design assumption held under a real SIGKILL.
5. **Cost is measurable per call:** 3 live decisions = $0.000044 (~$0.0000147 each);
   40 find-judgments = $0.001321 (~$0.000033 each). The published rate holds.

## BUG LEDGER (found BY RUNNING, fixed, re-proven)
D-001 glob depth (index ate everything) . D-002 json stdout pollution . D-003 budget
off-by-one . D-004 flaky crash test . D-005 budget checked after the call . D-006 artifact
carried run metadata. All six in RUNNING_DEBUG_LOG with root cause + fix + verification.

## RESIDUAL (what I could not operate)
- F1/F6 rulings owed -> the fire-gate layer (W8) was never started.
- The @ocws 219G corpus was never walked (skip-rules design owed).
- The escalation band has unit coverage but no live row landed in 0.5-0.8 (ladder untested live).
- The second-operator drill (a zero-context subagent running JM from the docs alone) is OWED.

## SEAT VERDICT
Occupied. 17 numbered operations, 6 defects found by running (not by reading), all fixed and
re-proven. The zero-bugs red flag is avoided — the defects are enumerated above.

## APPENDIX — THE SEAT'S PUSH RESULTS IN FULL

```
 PUSH-1  N=4 concurrent /decide
   probe1 -> noul=0.62 cached=False      probe3 -> noul=0.69 cached=False
   probe4 -> noul=0.66 cached=False      probe2 -> noul=0.67 cached=False
   verdict: all four answered, no clobbering, no errors — the loopback server handles concurrency.

 PUSH-2  starve (no key, no mock)
   JM_ERROR: JEV_NO_KEY: no TYPESAFE_API_KEY and no ~/.config/typesafe/key
   STARVE_EXIT=2   out_written=NO
   verdict: FAIL CLOSED — nothing written, the exit code names the class.

 PUSH-3  hostile input (malformed JSONL)
   JM_ERROR: JSON Parse error: Unexpected identifier "NOT_JSON_AT_ALL"
   HOSTILE_EXIT=1
   verdict: loud, named, non-zero — no partial artifact.

 PUSH-4  empty input
   JM_DECISIONS rows=1 decided=1 act=0 escalate=0 noop=1 calls=1
   empty-input decision: noop signal=0.11 < flag=0.5
   verdict: a sane low signal, not a crash.

 PUSH-5  legit path twice (HTTP idempotence)
   run1 cached=False cost=1.1886e-05      run2 cached=True cost=0
   verdict: the second run is free — the cache law holds on the HTTP surface too.
```

## APPENDIX 2 — WHAT THE SEAT COULD NOT REACH (the unexperienced surface)

- The escalation band (0.5-0.8) — unit-covered but no live row landed there in this session.
- The `@ocdb` adapter — the DBs exist but no adapter is written.
  **[STALE 2026-09-21 — second-operator drill]** A `sqlite` target kind IS registered and ingests:
  `jm target add op2db sqlite /tmp/op2/src.sqlite` then `jm index --in op2db` -> `rows=2 changed=2`,
  rows addressable as `<db>#<table>/<pk>`. The seat's own `@ocdb` may have meant a different DB set.
- The `@ocws` 219G tree — never walked (skip-rules design owed).
- The fire gate — blocked on F1/F6; the reflex host was never started.
- The MCP surface and the watch daemon — planned, unbuilt.
  **[STALE 2026-09-21 — second-operator drill]** BOTH ARE BUILT AND RUN. `jm mcp` answers
  `tools/list` with 4 tools (jm_query/jm_find/jm_decide/jm_index); `jm watch --once --in a,b`
  ticks and writes `$JM_HOME/watch/journal.jsonl`; `jm journal` renders it.
- Multi-process queue contention — single-process tested; the sweep is unfenced (recorded as open).

## APPENDIX 3 — THE SEAT'S VERDICT ONE MORE TIME
Operated: yes (17 ops with pre-registered expectations). Found: 6 defects by running, each fixed and
re-proven. Unexperienced: the escalation band, the @ocdb adapter, @ocws, the fire gate, the MCP/watch
surfaces. The zero-bugs red flag was avoided by pushing (concurrency, starvation, hostile input).


## THE OPERATION STREAM, CONTINUED (the daemon boundary, 2026-09-21 session 2)

The seat's first pass ran `jm watch --once` — a SINGLE tick. The daemon as a LONG-LIVED PROCESS
was never experienced, so it was never proven. This pass crosses that boundary.

| # | I DID | I EXPECTED | IT DID |
|---|-------|-----------|--------|
| OP-13 | started `jm watch --interval 2000 --in dc --name dcidx` with nohup as a real background process | a tick every 2s, journaling | `[jm watch] 20:52:02 changed=1`, then `20:52:04 changed=0` — the loop is real, and the SECOND tick is idempotent |
| OP-14 | mutated the corpus (`a.md` rewritten) while the daemon ran | the next tick notices | `20:52:06 changed=1 6ms`, then `20:52:08 changed=0` — it noticed, and settled |
| OP-15 | read the journal after ~32s of running | one row per tick, valid JSONL | 16 rows, 2 of them `changed>0`, every row parses |
| OP-16 | read the state pointer and the index it maintains | an updated pointer; the new text queryable | `state.json` at the last tick; `query dcidx --fts tombstone` returns `dc/a.md` with state `changed` |
| OP-17 | `kill <nohup pid>` | the daemon stops | **IT KEPT TICKING.** The nohup pid is the `bun run` WRAPPER, not the daemon: `bun run <script>` is a wrapper plus a CHILD, and signalling the wrapper orphans the child. `ppid=2647` on the surviving process is the tell |
| OP-18 | `kill -TERM <the real pid>` | a clean exit | exited cleanly, no orphan left (`pgrep -f "cli.ts watch"` -> none) |

**THE RUNTIME LEDGER (what RUNNING taught that READING could not):**

1. **The daemon is correct and the LAUNCH is the trap.** `bun run src/cli.ts watch` produces two
   processes; a supervisor that signals the one it spawned signals the wrapper and leaves a daemon
   behind. A production unit must either `exec` or signal the child. This is not a defect in the
   watch loop — it is a fact about the launcher that no amount of reading the loop would surface.
2. **Idempotence held under a real clock**, not just between two manual `--once` calls: every
   post-mutation tick reported `changed=0` and the journal grew by exactly one row per tick.
3. **The daemon keeps its index current**: the text written DURING the run was queryable
   afterwards, which is the whole point of the surface.

**OPS 01-12 remain as recorded.** The residual this pass adds: the daemon has not been run under a
SERVICE MANAGER (systemd), so restart-on-crash and boot-time start are unproven — named, not
claimed.


## THE SERVICE-MANAGER BOUNDARY (systemd --user, 2026-09-21 session 2)

The residual the daemon pass named — "never run under a SERVICE MANAGER, so restart-on-crash and
boot-time start are unproven" — is closed here. `OP-17`'s lesson (bun run = wrapper + child, so
signalling the wrapper orphans the daemon) shaped the launcher: it `exec`s.

| # | I DID | I EXPECTED | IT DID |
|---|-------|-----------|--------|
| OP-19 | wrote `scripts-jm-watch.sh` with `exec` and a systemd user unit (`Restart=on-failure`, `RestartSec=5s`, `NoNewPrivileges`, `PrivateTmp`) | systemd accepts the unit; the tracked PID IS the daemon | `systemctl --user start` -> active, `MainPID=2049058` and `ps -o comm=` says **bun** (the `exec` worked: no wrapper to orphan) |
| OP-20 | watched the first ticks | the journal fills | `[jm watch] … targets=3 rows=11901 changed=1 81ms` — it indexed the REAL `@shadow` corpus (11,832 files) plus the reports target |
| OP-21 | — THE BREAK — | a service with a populated registry to index | **`targets=0 rows=0`** every tick, and NO journal file anywhere. The registry plainly existed at the path the unit was given |
| OP-22 | tested `PrivateTmp` as the cause by pointing `JM_HOME` at a real path | the ticks become real | `targets=3 rows=11901 changed=0 errors=[]` — the daemon had been seeing an EMPTY directory |
| OP-23 | `kill -9` the daemon; then `systemctl --user stop` | systemd restarts a crash; a stop is graceful | **restart: a new pid, `NRestarts=1`, ticking again in under 8 s. Stop: inactive, no orphan, and the restart counter is not incremented** |

**THE MECHANISM BEHIND OP-21 (worth more than the pass itself):** `PrivateTmp=true` gives the
service its OWN `/tmp` namespace. A **target root under `/tmp` is therefore INVISIBLE to it** — the
daemon starts, reads the registry, and reports `JM_INDEX_MISSING: /tmp/… does not exist` for a
directory that plainly exists outside. It looks like a config error and it is a NAMESPACE error. The
law is now written IN the unit file beside the directive that causes it: a target root must live on
a REAL path (home, `/srv`, `/var`), never under `/tmp`.

**THE RUNTIME LEDGER (what RUNNING taught that READING could not):**
1. `exec` in the launcher is what makes a daemon signalable — the unit's `MainPID` is the daemon,
   not a shell. This is OP-17's lesson turned into a file.
2. A service manager proves things a manual run cannot: restart-on-crash and the difference between
   a crash and a stop are now OBSERVED (a new pid and a counter) rather than assumed.
3. **Hardening directives carry laws.** `PrivateTmp` is good practice and it silently isolates any
   data path under `/tmp`; the failure looks like a missing file.

**INSTALLED BUT LEFT STOPPED.** The unit is at `~/.config/systemd/user/jm-watch.service` with a 60 s
interval and the start/enable lines documented in it. A daemon that writes to `~/.jm` continuously
is the operator's call to run, not the builder's.
