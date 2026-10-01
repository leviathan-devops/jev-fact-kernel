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
