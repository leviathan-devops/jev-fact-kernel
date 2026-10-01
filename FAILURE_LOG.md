# FAILURE_LOG — the Jev fact kernel

**Every derailment this build committed or caught, with the signature that identifies it.**

The metric that matters: **how many were SELF-CAUGHT vs OPERATOR-CAUGHT.** One was operator-caught
(inherited from the design session); the rest were caught by driving a control — which is the
instrument working.

---

## THE DERAILMENT CLASSES

| # | the class | the signature (how you see it) | the kill | caught by |
|---|---|---|---|---|
| 1 | **EDITING WITHOUT RE-DRIVING** | a probe crashes for a whole commit span; nobody ran it. EN-119: the label fix replaced a CALL with a bare assignment, `NameError` on every invocation | every fix RE-RUNS its subject | self — by driving the extension's gate |
| 2 | **A CONTROL OUTSIDE THE REPO** (x2) | a control deleted between runs; its absence reads as a pass. EN-120: the T0 control in `/tmp` was deleted and re-ran `clean`; the probe controls in `/tmp` were stale | the controls live IN `fixtures/` | self — the first full battery run |
| 3 | **A CODE THAT MEANS TWO THINGS** | exit 1 = lies OR crash; exit 0 = clean OR unread. EN-119: a crash blocked an HONEST server | SPLIT the code; a verdict requires its evidence (a LIE needs its LIE lines) | self — the harness drive |
| 4 | **A MISLABELED CONTROL** | a derivation prints a pass from an inverted gap. EN-118: `always-empty` labelled POS when it is the NEG it exists to be → "PASSES at +0.165" | read the CONTROLS, not the gap | self — reading the control set |
| 5 | **A QUESTION THAT ENUMERATES** | pass-1 routed real claims to NONE at 0.51. EN-116: the question listed four subject kinds and the judge read the list as the definition | state the CLASS; the enumeration became the definition | self — driving the router |
| 6 | **AN UNBOUNDED READ** | `timeout(1)` exit **124**, not a named refusal. EN-117: `readline()` with the timeout checked only between calls | `select()` with a deadline | self — the adversarial round |
| 7 | **THE RIGHT CHECK ON THE WRONG CARRIER** (x2) | a gate that is correct and never fires. The spec gate's first version used `pre-commit` — which cannot see the commit message and refused its own seed commit. EN-121: the LSP gate RETURNED `{block:true}` when the host's contract is a THROWN Error — a no-op on the real host | the CARRIER LAW: read the host's own working implementation | self — reading omp-ct's blocker |
| 8 | **AN IMAGINED PATTERN SET** | a detector that fires on legitimate code and on its OWN text. EN-115: 4 of 5 T0 patterns had non-zero false-positive rates; one matched its own comment | the precision measurement PER PATTERN (POS/NEG/SELF) | self — driving T0 against three corpora |
| 9 | **AN INFERRED SCOPE** | a scope that depends on an empty string. EN-124: `lint ''` fell through `argv[1:] or ["."]` to the CWD, double-counting a Checkpoints copy | no args → the cwd BY DESIGN; an explicit empty arg → UNMEASURED BY REFUSAL | **THE INDEPENDENT AUDITOR** |
| 10 | **A LABEL DRIFTED FROM ITS SUBJECT** | the battery's header said "the 13 controls" while the body counted 16/16 | state no count it can drift from | the auditor (cosmetic find) |

## THE RECURRING CLASS

**Eight of the ten are ONE semantic pattern: an instrument whose FLAW and whose FINDING point the
same way.** The broken probe's number was consistent across three runs; the mislabeled control
inflated the gap; the enumerated question produced a plausible abstention. **Consistency across
repeated broken runs is not evidence.**

## WHAT ACTUALLY WORKED

Only ONE defence held every time: **DRIVING THE CONTROL.** Not reading the diff. Not the passing
suite. Not the agent's own confidence. Every one of the ten was found by executing something and
looking at what it actually returned.

## THE OPERATOR-CAUGHT COUNT

**1** — the inherited "FOUND IT — luxalgo, confirmed three times" claim (the operator challenged
it from first principles before I did).

**The kernel exists to drive that number to zero.**

## F-7 · THE INSTRUMENT DEFECT CLASS — three instances, one shape (2026-10-01)

**THE CLASS.** A measurement reports a plausible number, and **nothing in the output distinguishes it
from a working measurement.** The instrument is the first thing to validate, and it is the last thing
anyone checks, because a broken instrument's output reads exactly like a correct one's.

| # | the instance | how it read | the truth | how it was caught |
|---|---|---|---|---|
| F-7a | the harness **called the handler directly** | 5/5 pass, tokens present | the handler was bound to `lsp_registration`, **an event the runtime never emits** — the gate was inert | grep'd the runtime's 18-event hook union: 0 files mention the name |
| F-7b | the installer read `cfg["command"]` at the top level | `gated: []` · `valid JSON, 2 servers` | the live shape is `{servers:{name:{command,args}}}` — **nothing was gated, and it reported success** | read the live `lsp.json` and saw the real shape |
| F-7c | the harness read `$?` **after a pipeline** | `T1 POS [exit=0] expect 1` | `$?` after a pipe is the LAST command's status — `tail`'s, always 0 | re-measured with the status captured before formatting: exit=1 |

**THE COMMON MECHANISM.** Each instrument was one hop away from its subject and reported the hop's
result as the subject's: the harness reported the handler's logic instead of the binding's existence;
the installer reported the JSON's validity instead of its own effect; the shell reported the
formatter's exit instead of the probe's. **A measurement that does not name WHAT it measured will
measure the nearest thing instead.**

**THE KILL, APPLIED.** (a) Drive the real carrier — never a direct call to the thing under test.
(b) Assert your own effect — `assert c["command"].endswith("lsp-gate")` refuses to report a green it
did not produce. (c) Capture the status before formatting it. **And the kernel's own T0 lint exists
for exactly this class in Python — F-7c shows it has no shell equivalent, so shell probes carry the
discipline manually.**

---

## F-8 · THE CARRIER DEFECT — a gate that could not fire, tested by a harness that could not miss

**THE INSTANCE.** `extensions/fact-firewall/index.js:60` bound `pi.on("lsp_registration", …)`. The
runtime emits **no such event**: `grep -rl 'lsp_registration' <the shipped runtime>` returns **0
files**, and the plugin hook union carries exactly eighteen names, none an LSP name. The handler
could never fire.

**WHY IT SURVIVED SEVEN ROUNDS OF TESTING.** The harness **called the handler directly**. That
exercises the probe's parsing, the token's format, and the exit codes — every property except the
one that was wrong. **The harness was the emitter, so the harness could not observe the absence of an
emitter.** Both controls (a POS and a NEG, per the instrument-validity law at
`specs/DPL1_JEV_FACT_KERNEL.md:198`) sat on the wrong axis: they varied the INPUT, while the defect
was in the WIRING.

**THE RECURRING SHAPE.** This is `NEXT_STEPS.md`'s standing warning in a new costume — *a gate that
cannot fire is documentation*. The three earlier instances in this build were a dead typecheck
instrument, a guard whose condition was unreachable, and a scanner reporting zero for a scope it
never scanned. **All four share a signature: GREEN, STABLE, AND NEVER ONCE OBSERVED BITING.**

**THE KILL, APPLIED.** Drive the real carrier. `bin/lsp-gate` sits in the `command` position of
`~/.omp/agent/lsp.json`, so it runs in the process that IS the registration — there is no hop between
the check and its subject. Proven both ways on the live wire: the lying fixture `BLOCK`s at exit 1
with `ps` counting 0 processes, and the real `plutus-lsp` passes through at exit 0.

**THE FIX'S OWN DEFECT, CAUGHT THE SAME WAY.** The first installer read `cfg["command"]` at the top
level and printed `gated: []` — **a silent no-op reporting success**, because the live shape is
`{servers:{name:{command,args}}}`. It now asserts its own effect
(`assert c["command"].endswith("lsp-gate")`) and refuses to print a green it did not produce.

---

## F-9 · `grep -c` COUNTS LINES — the anchor predicate measures the wrong unit

**THE INSTANCE.** The enrollment's `W-9` doc gate counts anchors with:

```
grep -cE '[a-zA-Z0-9_/.-]+\.(ts|md|json|sh|yml):[0-9]+'
```

at `.githooks/pre-commit:76`. Two defects in one line:

1. **`grep -c` counts LINES, not occurrences.** Two anchors on one line count once; a doc can carry
   five and read as two. The unit is wrong for the quantity being bounded.
2. **The alternation omits `py` and `js`.** This kernel's entire source is Python
   (`kernel/router.py`, `kernel/ledger.py`, `kernel/tier4-lsp-capability-probe.py`) and its extension
   is `extensions/fact-firewall/index.js`. **Not one of its own files can anchor its own claims.**

**WHY IT IS THE ARTIFACT-CLASS DEFECT.** The enrollment's own header at
`.githooks/lib/pattern-header.sh:11` names the class — *"W-1 fired on every src/ commit in a repo with
no extensions/ dir"* — and requires every gate to name the ARTIFACT CLASS its predicate applies to.
W-9's predicate applies to a class this project is not in.

**STATUS: RECORDED, NOT EDITED.** The gate belongs to the enrollment (`JARVIS-FACTORY/jarvis-upper`);
a worktree does not rewrite its enforcer. The fix would be the alternation plus
`grep -o … | wc -l`. Until then, this repo satisfies the gate by citing real anchors in its classes —
`specs/DPL1_JEV_FACT_KERNEL.md:198`, `context_management/RUNTIME_SEAT.md:1`,
`.github/workflows/gates.yml:11` — which is honest, and is also the gate teaching its subjects to
write for the gate rather than for the reader.

**THE LESSON.** A predicate carries an implicit unit and an implicit class. **Name both in the gate,
or the gate will measure a different thing than it meant to** — and its subjects will learn to satisfy
the measurement instead of the intent.
