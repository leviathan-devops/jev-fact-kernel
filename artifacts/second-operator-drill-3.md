# THE SECOND-OPERATOR DRILL, ROUND 3 — the raw report, verbatim

**Protocol.** A zero-context subagent (`sonic`), given ONLY `README.md` and
`packages/jm/MASTER_PROMPT.md`, with the project's own logs forbidden (`DEBUG_LOG`, `FAILURE_LOG`,
`TESTING_LOG`, `VIOLATION_LOG`, `THEATRICALITY_LOG`, `context_management/`, `Checkpoints/`).
Revision operated: `5c1e76a`. Duration 17 minutes. It modified nothing and cleaned up after itself.

**Why this drill exists.** The pin's RUNTIME SEAT section: *"THE SECOND OPERATOR: a zero-context
subagent, given only the operating docs, must operate it."* An author cannot see the documentation
defects, because the author already knows the answers. This is the instrument that reads what a new
operator reads — and it is the only instrument in this build that tests the DOCS rather than the
code.

**Result: 12/12 operations completed · 2 reproducible defects · 9 doc-vs-reality mismatches.**

It found what four adversarial sweeps and a full runtime seat had missed, because it did the one
thing none of them did: **it followed the docs.**

---

## PART 1 — THE TWO DEFECTS IT REPORTED

**DEFECT #1 — a failed `index --in <unknown> --name X` leaves a phantom index that reads as "no matches".**

```
$ rm -f $JM_HOME/index/zzz.sqlite
$ ls $JM_HOME/index/
all.sqlite  both.sqlite  decisions.sqlite  drill.sqlite
$ jm index --in nosuchtarget --name zzz
JM_ERROR: Error: JM_TARGET_UNKNOWN: nosuchtarget (have: drill,recs)
exit=2
$ ls $JM_HOME/index/
all.sqlite  both.sqlite  decisions.sqlite  drill.sqlite  zzz.sqlite
$ jm report zzz
index:        zzz (72.0 KB)
files:        0 live · 0 gone · 0 with text
exit=0
$ jm query zzz --fts tombstone
exit=0
```

Its own words: *"Exit 2 says 'your arguments are wrong'; the store says 'index `zzz` exists and has
no matches'. This is precisely the class §18.3 claims was fixed."*

**DEFECT #2 — the fail-closed judged path creates its index before the key check.**

```
$ rm -rf /tmp/drill3-freshdt
$ env -u TYPESAFE_API_KEY HOME=/tmp/nokey JM_HOME=/tmp/drill3-freshdt \
    jm decision-tree --rows /tmp/drill3-rows.jsonl --recipe /tmp/drill3-recipe.json --out /tmp/drill3-out2.md
JM_ERROR: JEV_NO_KEY: no TYPESAFE_API_KEY and no ~/.config/typesafe/key
exit=2
$ find /tmp/drill3-freshdt -maxdepth 3
/tmp/drill3-freshdt
/tmp/drill3-freshdt/index
/tmp/drill3-freshdt/index/decisions.sqlite
/tmp/drill3-freshdt/ledger.jsonl
$ ls -la /tmp/drill3-freshdt/index/
-rw-r--r--+ 1 leviathan leviathan 73728 Sep 22 03:59 decisions.sqlite
```

Its own words: *"Zero decisions and no `--out` file (correct), but a 72 KB empty index is created by
the run that was supposed to write nothing… a keyless operator who runs `decision-tree` once gets a
permanent empty index named `decisions` that reports healthy and answers every query with zero rows.
It also contradicts §18.7's 'writes nothing'."*

## PART 2 — WHAT PROBING THE FAMILY FOUND (D-056 — worse than either report)

The two reports are one class, so every verb that opens a store was probed directly:

```
BEFORE THE FIX
  filter typo --question "x"        exit=0   created typo.sqlite
  find "phrase" --in typo           exit=0   created typo.sqlite
  calibrate (no key)                exit=0   created decisions.sqlite
  route (no key)                    exit=2   created decisions.sqlite
  evaluate (no key)                 exit=2   created nothing
  index --in nosuchtarget --name z  exit=2   created zzz.sqlite
  decision-tree (no key)            exit=2   created decisions.sqlite
  query typo --fts x                exit=2   created nothing   (the D-028 fix, holding)
  scan typo --lex x                 exit=2   created nothing   (the D-028 fix, holding)
```

`filter` and `find` are READ verbs using a create-on-open — **the D-009/D-028 defect, fixed on the
MCP surface and missed on the CLI** — and here it reached EXIT 0, so a typo'd index answered as a
real, empty index. That is the exact indistinguishability §18.3 claims to have removed.

```
AFTER THE FIX (the same probes, re-run)
  filter typo                       exit=2   NO artifact
  find --in typo                    exit=2   NO artifact
  calibrate (no key)                exit=2   NO artifact
  route (no key)                    exit=2   NO artifact
  evaluate (no key)                 exit=2   NO artifact
  index --in unknown                exit=2   NO artifact
  decision-tree (no key)            exit=2   NO artifact
HAPPY PATHS, unchanged
  index          -> JM_INDEX_OK files=2 changed=2 gone=0 text=2 ms=1
  filter         -> JM_FILTER candidates=2 judged=2 kept=1   (p=0.96, LIVE judge)
  query          -> the row
  report         -> index: real (72.0 KB) · files: 2 live · 0 gone · 2 with text
```

## PART 3 — THE INVARIANT THIS PRODUCED

> **A run that refuses its input must not have touched the disk.**

The asymmetry had been applied twice — once on the CLI (`query`, `scan`) and once on the MCP surface
(D-028) — without the invariant ever being stated. That is why it survived both repairs and why four
adversarial sweeps walked past it: each fix repaired the SITES it knew about, never the RULE.

Stated by category, and pinned in `tests/phantom-artifacts.test.ts` (4 cases, 21 expects, both
halves):

- a **READ** refuses a missing index (`openIndexExisting`) — `query`, `scan`, `cluster`, `extract`,
  `report`, `filter`, `find`;
- a **JUDGED** verb resolves its key BEFORE it opens anything — a missing key is fatal regardless of
  fail polarity (`policy.ts`), so a refused run has no work to do;
- **ARGUMENT VALIDATION PRECEDES THE OPEN** — the same invariant from the other side. The first
  version of the fix moved the store open earlier, and `calibrate --truth abc` began answering
  `JM_INDEX_MISSING` instead of naming the bad argument. The pre-existing `cli-contract` test caught
  it immediately, which is the suite doing exactly what it is for;
- only a verb that genuinely **WRITES** may create the store (`index`, `calibrate --apply`,
  `calibrate --truth`).

## PART 4 — THE 9 DOC-VS-REALITY MISMATCHES (all fixed)

1. **§18.2's fs table** claims `path = <target>/<rel>` unconditionally; a single-target index has
   bare paths. → made conditional on the index holding more than one source.
2. **§18.1** says *"There are 17 CLI verbs… run `jm` with no verb and it prints the usage dump"*; the
   dump listed **14** — `find`, `filter`, `decision-tree` were undiscoverable by the documented
   method. → the dump now lists 17, verified by count.
3. **§18.7's *"writes nothing"*** was false in the literal sense. → now literally true (D-055).
4. **§18.3's phantom-index claim** was incomplete. → the invariant is now stated beside it.
5. **§18.2's *"never a silent subset"*** is exact on the WRITE side and not on the READ side
   (`query --in nosuchtarget` answers `JM_INDEX_MISSING`, not `JM_TARGET_UNKNOWN`). → stated per side.
6. **§18.9's journal example** is JSON; the verb prints TSV. → annotated.
7. **§18.10a's sample output** lacks the `ledger verbs:` line reality prints. → added.
8. **§18.5** promises `small` and `grouped + ungrouped = candidates`; neither is printed. → the
   promise is **withdrawn** rather than implemented: a counter nobody reads is a claim that can
   drift, and this doc's whole value is that its claims are true.
9. **§13 gives `POST /decide` no body contract.** → the full request/response contract is now in §13,
   including the named errors (`400 JM_JSON_INVALID`, `400 JM_ARGS: state + questions required`,
   `404 JM_ROUTE: unknown path`, `413 JM_BODY_TOO_LARGE`, `503 JEV_NO_KEY`) and the default index.

**Plus one safety fix from a friction, not a defect:** `target add` and `target ls` now print
`registry <path>`. The drill's `export JM_HOME` did not survive its own shell calls, so
`target add drill fs …` wrote into the operator's **real** `~/.jm/targets.json` — and nothing in any
verb's output ever named the file it wrote. One line, and the mistake cannot be missed.

## PART 5 — THE DRILL'S OWN WORDS, ON WHAT IT COULD NOT REACH

> *"The keyed judgment path was never exercised (deliberately — a live judge call costs money and was
> not in the ticket). The key is present on this host (`~/.config/typesafe/key`, `/health` ->
> `key_present:true, key_source:"file"`), so the only judged run I made was the no-key one. `find`'s
> judge stage, `filter`, `route`, `evaluate`, `calibrate` and the recipe-validation refusals of §18.12
> are therefore unverified by me."*

Recorded as-is. This drill's coverage is the KEYLESS surface plus the protocol surfaces; the judged
paths are covered by the runtime seat and the adversarial sweeps instead, and the frontier statement
in `TESTING_LOG.md` names them. A drill that claimed more coverage than it had would be worse than no
drill.

> *"No `jm` executable exists, so every command was `bun run src/cli.ts …`. If the intended entry
> point is a shim, it is not on this host's PATH and no doc says to install one."*

Also recorded as-is: README §10/§13/§18 show bare `jm …`. `package.json` has the `jm` script, and §9
shows one `bun run src/cli.ts` line. A zero-context operator following §10 verbatim cannot run a
single line. This is a KNOWN GAP rather than a fix, because installing a shim on the operator's PATH
is an operator-owned action.

## PART 6 — THE FRICTIONS IT LISTED (17, kept because they are the doc's real interface)

Among the 17, the ones that are not already covered above:

- `report` with no index argument is not "the store" — it is index `all`, and answers
  `JM_INDEX_MISSING`. The word "store" appears in the docs as the sqlite index store, the job store,
  and `~/.jm/` generally; §18.10 never says which one a bare `report` targets.
- Two renderings of one error class: `index --in X` prints `JM_ERROR: Error: JM_TARGET_UNKNOWN: …`
  (a doubled prefix) while `index @X` prints a bare `JM_TARGET_UNKNOWN`. Over HTTP the doubling is
  worse: `{"error":"JEV_NO_KEY: JEV_NO_KEY: …"}`.
- `--help` prints the usage dump and exits **0**, while no-args exits **2**; neither the flag nor the
  no-arg exit code is stated.
- `serve`'s default index name is `decisions`, documented nowhere; `/health` is the only place it
  appears.
- `cluster`'s five columns are never defined; the drill inferred them by clustering a cross-source
  index and confirmed §18.5's `(source, kind)` partition claim.
- Multi-target `index` prints no summary token (single-target prints `JM_INDEX_OK`), so a scripted
  caller cannot assert on one.
- A failed run's ledger row did not name the index it touched. → **fixed:** the row now carries
  `name`, so it can reconstruct its own side effect.
- `scan` with zero matches is silent at exit 0 — the documented contract, but with no `rows=0` token.

## PART 7 — CLEANUP IT PERFORMED (its own accounting)

> *"Both `serve` processes stopped (`pgrep -af cli.ts` -> `no cli.ts processes`; port 7888 ->
> `Couldn't connect to server`); the accidental real-home target removed and `~/.jm/targets.json`
> verified back to its original two entries (`shadow`, `reports`); no tracked file written by me."*

Scratch left for evidence: `/tmp/drill3-1590806` (main store), `/tmp/drill3-freshdt` (DEFECT #2
repro), `/tmp/drill3-corpus`, `/tmp/drill3-jsonl`, `/tmp/drill3-rows.jsonl`, `/tmp/drill3-recipe.json`,
`/tmp/drill3-mcp.out`.

## PART 8 — WHY THIS DRILL IS THE STRONGEST INSTRUMENT IN THE BUILD

Every other verification in this repo reads the CODE or runs the BINARY. This one reads the DOCS and
obeys them. It therefore finds the class nothing else can: **the places where the documentation and
the software disagree**, which are invisible to a developer (who knows the truth) and fatal to an
operator (who has only the text).

Its two defects had survived:
- the full runtime seat (`jm-live-01`, 17 defects found by running);
- three adversarial sweeps (ADV-1/2/3) plus a fourth over the launcher;
- a container rig of 8 angles on the host and in a fresh Debian container;
- 174 passing tests, 41 passing gates, and a sealed checkpoint.

None of those instruments could have found them, because none of them ever typed a command the docs
told them to type and then checked whether the docs were right.

**THE STANDING RULE THIS PRODUCES:** a build is not verified until a zero-context operator has
completed its documented workflow and reported what did not match. The instrument is cheap (17
minutes, one subagent, no code access) and it is the only one that tests the interface the user
actually has.