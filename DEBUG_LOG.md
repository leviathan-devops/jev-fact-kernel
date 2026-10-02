# DEBUG_LOG — the Jev fact kernel

**Every bug this build found, with its FULL chain: symptom -> root cause -> diagnosis -> fix ->
verification -> lesson.**

These entries are the SOURCE; every digest elsewhere is derived from them. Reproduced verbatim
from `context_management/RUNNING_DEBUG_LOG.md` — the canon — and append-only by construction.

**The count: 10 entries.** Every one was found by RUNNING a control, never by reading a
diff. That is the whole lesson of this build, and it repeats below.

| # | the class | found by |
|---|---|---|
| EN-115 | the pattern set was imagined, not measured | driving T0 against THREE corpora |
| EN-116 | the cascade failed its first control at 5/8 | driving the router against its span set |
| EN-117 | the probe HUNG; my fixtures were DEAF | the first adversarial round |
| EN-118 | a mislabeled control nearly published a false pass | reading the controls, not the gap |
| EN-119 | the probe had been crashing; the gate called it a finding | driving the extension's gate |
| EN-120 | a /tmp control bit TWICE | the first full battery run |
| EN-121 | the block convention was wrong -- a return vs a throw | reading the host's own blocker |
| EN-122 | the return audit's polarity | the design question, then the drive |
| EN-123 | T1's boundary, proven against the incident | driving T1 on the motivating case |
| EN-124 | the EMPTY-PATH scope surprise | THE INDEPENDENT AUDITOR (the author never drove '') |

## REGRESSION WATCH

- `bash kernel/battery.sh` is the single gate. A red row names its tier.
- The control set lives IN `fixtures/` -- a /tmp control bit TWICE.
- Every probe's controls must be driven BOTH ways before the probe ships.
- A fix re-runs its subject (EN-119: an edit broke the probe for a commit span).
- A code that can mean two things must be split (exit 1 = lies OR crash; exit 0 = clean OR unread).

## IRON LAWS

1. An unread path is UNMEASURED (exit 2), never clean.
2. A finding must carry the evidence that constitutes it.
3. Drive every gate both ways.
4. The control set ships with the instrument.
5. A fix re-runs its subject.
6. An empty input is UNMEASURED, never an inferred scope (EN-124).
7. The author is never the auditor (EN-124 found what the author could not see).

---
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


---

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


---

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


---

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


---

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


---

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


---

## EN-121 · THE BLOCK CONVENTION WAS WRONG — and the tool_call guard is wired

**SYMPTOM.** The LSP gate's first version RETURNED `{block:true, reason}` on a lie. The harness
passed it, but the host's contract is different.

**ROOT CAUSE — THE CARRIER LAW, AGAIN.** Reading the omp host's own working blocker (`omp-ct`,
which refuses bash) showed the convention:

```js
pi.on("tool_call", (event, ctx) => {
  ...
  throw new Error(message);      // <-- THE BLOCK IS A THROW
});
```

A returned `{block:true}` is NOT the contract. The host's call is cancelled by a thrown Error; the
return value carries only an optional `{input}` rewrite. The first version would have been a NO-OP
on the real host — a gate that reads as armed and refuses nothing. **The same class as the
`pre-commit` carrier defect: the right check on the carrier that cannot deliver it.**

**THE FIX + THE SECOND HALF (ST-402).** The LSP gate now throws. And the `tool_call` guard is
wired — on the carrier that can see the ARGUMENTS, with the spillover controlled by construction:

  1 · a `bash` command carrying T0's instrument pattern     -> THROW
  2 · a `write`/`edit` whose PARENT DIRECTORY does not exist -> THROW (a true phantom target)

It does NOT gate prose, does NOT gate a legitimate new file in an existing directory, and every
block names its remedy. `FACT_FIREWALL_TOOLCALL=warn` observes without refusing.

**DRIVEN BOTH WAYS — 7/7:**

```
  ST-401  LYING server -> THREW   "FACT-FIREWALL T4 BLOCK: T4_LSP_CAPABILITY_LIE. 23 advertised..."
          HONEST server -> passed
  ST-402  bash + T0's byte-read pattern  -> THREW   "T0_INSTRUMENT_DEFECT"
          bash with a CLEAN command      -> passed   (no spillover)
          write to an EXISTING dir       -> passed   (no spillover)
          write to a NONEXISTENT dir     -> THREW   "T4_PHANTOM_ARTIFACT"
          a read tool                    -> passed   (never gated)
```

**LESSON.** A gate's CONTRACT is not a detail — it is the whole mechanism. `{block:true}` and
`throw` differ by one character of syntax and by whether the gate exists at all. Read the working
implementation of the host's own blocker before writing a blocker for that host.


---

## EN-122 · ST-403 — the worker-return audit, and the polarity law's third application

**THE DESIGN QUESTION.** A subagent's return is a RESULT: it already exists by the time any hook
sees it. The polarity law (the LSP REPORTS; the HOOK REFUSES) therefore puts the refusal at the
CONSUMPTION point, not at the hook — the parent runs the audit BEFORE it acts on the return, and
the audit's verdict IS the refusal.

**WHAT IT SETTLES — the artifact-naming claims only**, because those are the ones a machine can
settle. A return naming a path gets T4-FILE on that path. A return naming no artifact is UNSETTLED
(exit 2), **not** a pass: the kernel's contract is CHECKABLE claims, and a claim with no subject
cannot be probed. Recording it as a pass would be the fail-open this kernel exists to kill.

**DRIVEN BOTH WAYS — 3/3:**

```
  a return naming `kernel/ledger.py`            -> ACCEPTED    exit 0
  a return naming `kernel/fact-firewall.ts`     -> REFUSED     exit 1  T4_PHANTOM_ARTIFACT
  a return with no artifact claim               -> UNMEASURED  exit 2
```

**ST-403b is the motivating case exactly:** "I created `kernel/fact-firewall.ts` and wired it into
the CLI" — the phantom-artifact claim, refused against the disk.

**W4 IS COMPLETE.** ST-401 (the LSP refusal), ST-402 (the tool_call guard), ST-403 (the return
audit) — all three wired surfaces, each driven both ways, none gating prose.


---

## EN-123 · T1 — the grounding check, WITH ITS BOUNDARY PROVEN RATHER THAN CLAIMED

**WHAT IT DOES.** Extracts every ASSERTION-SHAPED number from a claim and looks for a producer in
the tool results that preceded it. A number with a producer is GROUNDED; a number in NO tool result
is UNGROUNDED. Only assertion-shaped numbers are extracted — a measure with a unit or a count with
a noun — because a rule that fires on "the 2026 build" is a rule that misfires (the EN-115 lesson,
applied before the fact this time).

**DRIVEN BOTH WAYS — 3/3:**

```
  T1a  the corpus carries 13 / 0 / 265 / 8/8  -> GROUNDED    exit 0
  T1b  a claim asserting 417 defects, 92 files-> UNGROUNDED  exit 1
  T1c  a claim with no number                 -> UNMEASURED  exit 2   (NOT a pass)
```

**THE BOUNDARY, PROVEN — THE IMPORTANT PART.** T1 was driven against THE MOTIVATING INCIDENT
ITSELF:

```
  the claim:  "luxalgo takes 9.99s to reach tools/list"
  the corpus: a probe printed "9.99s elapsed"
  VERDICT:    GROUNDED  [EXIT=0]     <-- T1 PASSES IT
```

**T1 CANNOT CATCH THE BYTE-READ CLASS, and the kernel says so.** The number was PRESENT in a tool
output; the OUTPUT was wrong, not absent. T0 catches that one, before the number exists.

This is the DPL1's §10 residual made executable: a tier that claimed to catch the class it cannot
catch would be the exact failure the kernel exists to kill. **The boundary is a test, not a
footnote.**


---

## EN-124 · T5 — THE INDEPENDENT AUDIT, AND THE DEFECT THE AUTHOR MISSED

**THE AUDITOR.** A `scout` subagent, READ-ONLY, dispatched with the instruction to RE-RUN every
claim itself and to trust no number the author wrote. The author is never the auditor.

**THE CLAIMS TABLE — 7 CONFIRMED · 0 REFUTED · 1 UNVERIFIABLE.** Every confirmed claim carries the
auditor's OWN raw output, not the author's:

```
  C1  T0 on /tmp/NOPE.py            -> "T0 UNMEASURED ... is NOT a pass"   [EXIT=2]  CONFIRMED
  C2  T4 on fixtures/lying-server   -> "23 advertised capabilities ... -32601" [EXIT=1] CONFIRMED
  C3  T4 on fixtures/honest-server  -> "every advertised capability answered" [EXIT=0] CONFIRMED
  C4  fixtures/probe-controls.py    -> "PROBE CONTROLS: 16/16"             [EXIT=0]  CONFIRMED
  C5  kernel/router.py              -> "CASCADE ACCURACY: 8/8"             [EXIT=0]  CONFIRMED
  C6  the ledger                    -> 193 rows, a row carrying Pattern/State/Evidence  CONFIRMED
  C8  kernel/q3-control.py          -> "rewritten gap +0.047 ... below the bar" [EXIT=1] CONFIRMED
  C7  the spec gate, staged mode    -> UNVERIFIABLE (see the gap below)
```

**THE ADVERSARIAL SWEEP — 5/6 HELD, 1 BROKE:**

```
  A1  an EMPTY path   ''            -> BROKE  <-- THE FINDING
  A2  a missing dir                 -> HELD (UNMEASURED, exit 2)
  A3  an unreadable file (chmod 000)-> HELD (UNMEASURED, exit 2)
  A4  a server that answers then EXITS -> HELD (0.146s, no hang)
  A5  a directory with no server.ts -> HELD (UNMEASURED, never PASS)
  A6  the kernel's probes AGAINST THE KERNEL -> HELD (the only fire is the deliberate POS fixture)
```

**A1 — THE DEFECT THE AUTHOR NEVER DROVE.** `python3 kernel/tier0-instrument-lint.py ''` — an
explicit EMPTY path — fell through `argv[1:] or ["."]` to `Path("")` == `.`, so the lint silently
scanned the CWD and hit a **Checkpoints/ copy of the same fixture, DOUBLE-COUNTING it.**

- The DIRECTION was fail-safe (it BLOCKed rather than passing) — but the SCOPE was undetermined,
  and a gate whose scope depends on an empty string is a gate whose scope is an inference.
- **THE AUTHOR DID NOT FIND THIS. The independent auditor did.** That is T5 working exactly as the
  pin designed it: the author's blind spots are the auditor's first sweep.
- **THE FIX:** no args -> the cwd, BY DESIGN. An EXPLICIT empty arg -> UNMEASURED, BY REFUSAL.

**THE FIX, DRIVEN 3/3:**
```
  A1a  an explicit empty path  -> UNMEASURED, exit 2   ("refusing to infer a scope")
  A1c  a real path             -> still BLOCKs, exit 1 (no regression)
  A1d  kernel/                 -> still clean, exit 0
```

**THE AUDITOR'S SECOND FIND — a stale label.** The battery's T5 header read "the 13 controls" while
its body counted 16/16. Cosmetic, but it is the SAME class the kernel exists to catch: a label that
drifted from its subject. The fix states no count it can drift from.

**THE AUDITOR'S HONEST GAPS (recorded, not deleted):**
1. **C7 UNVERIFIABLE under READ-ONLY.** The gate's carrier is `git diff --cached`; with nothing
   staged the script exits 0 before reading the message, and staging would have violated the
   READ-ONLY constraint. The auditor VERIFIED instead: the refuse branch exists in source; the
   message regex discriminates; the range mode PASSes (`HEAD~1..HEAD` -> "names FR-8"); all 13
   commits carry FR ids. **A verifier permitted to stage may close it.**
2. **C6 attribution.** The ledger count (193) included rows written by the audit's OWN probes — it
   proves the writer path, not a pre-audit count. No negative was hunted.
3. **C8's backend dependence** — the judge must be up; it answered during the audit.
4. **A1's follow-up:** whether `Checkpoints/` copies should be excluded from the default scope.

**LESSON.** A READ-ONLY auditor can still find what the author cannot see — and the only defence
against the author's blind spots is an agent with no stake in the claims. Every adversarial probe
the auditor ran was one the author COULD have run and did not. The author drove the paths they
believed mattered; the auditor drove the ones that did not look like paths at all.


## EN-137 — THE JM REGISTRY PINNED TO /tmp (2026-10-02)

- **THE FINDING:** the operator ordered a jev scan; the tool answered `JM_INDEX_MISSING:
  /tmp/jmdemo does not exist` and `JM_TARGET_UNKNOWN: … (have: shadow, reports, demo, failurelogs)`.
- **THE ROOT CAUSE:** `~/.jm/targets.json` was authored 2026-09-22 for a demo — it carried
  `{"name":"demo","root":"/tmp/jmdemo"}` (a scratch dir that does not exist) and NO target for
  `/home/leviathan/JARVIS_WORKSPACE/OMP`. Every real tree was invisible to the tool.
- **THE FIX:** the registry rewritten to the real workspace — `shadow` · `reports` · `failurelogs` ·
  `omp` (JARVIS_WORKSPACE/OMP) · `extensions` (.omp/agent/extensions) · `agent` (.omp/agent).
  `/tmp/jmdemo` removed. Backup: `~/.jm/targets.json.bak-*`.
- **THE VERIFICATION:** all six roots exist; `jm index` → `JM_INDEX_OK files=62` (extensions),
  `files=43` (pbk-v2/src); `jm scan ext --re 'https?://(api\.typesafe|…)'` returned the backup-only
  hits and — decisively — **the LIVE dist.js did NOT appear**, proving the endpoint fix is deployed.
- **THE LESSON:** *when the operator NAMES a tool, the tool's OWN configuration is the first artifact
  to read.* A tool pointed at the wrong place is indistinguishable from a tool that works, until
  someone asks it a question.

## EN-138 — THE STALE KEY GUARDS (2026-10-02)

- **THE FINDING:** the jm scan for the bug class surfaced `kernel-judge.ts:306` and
  `claim-bind.ts:104` — each `if (!key) { … }` before the judge, printing *"CLAIM JUDGE UNAVAILABLE —
  no TYPESAFE_AI_API_KEY."*
- **THE ROOT CAUSE:** the key was a REMOTE requirement, left in place when every judge moved to
  loopback. The guard was correct when written and became a LIE when the endpoint changed. **The wire
  was fixed; the precondition in front of it was not.**
- **THE FIX:** both guards read `if (!key && !isLocalJudgeUrl(resolveJudgeUrl("…")))` — they fire
  only for a credentialed judge, and every judge is loopback-only by construction. Build OK
  222.36 KB, deployed, committed `f07592a4`.
- **THE VERIFICATION:** `grep 'if (!key) {' src/ext/*.ts` → the two guards, both carrying the
  local-judge escape; the deployed bundle loads.
- **THE LESSON:** **when an endpoint changes, every precondition in front of it is a candidate lie.**
  Fixing the wire is half the fix; the gate that guards the wire must be re-read.

### EN-138 · THE ANCHOR INDEX

- the chokepoint this session added: `src/ext/judge-endpoint.ts:1`
- the stale guard, kernel side: `src/ext/kernel-judge.ts:311`
- the stale guard, claim side: `src/ext/claim-bind.ts:108`
- the hatches deleted: `src/ext/tool-gate.ts:137`
- the registry that was wrong: `~/.jm/targets.json:1`
- the scan that found the guards: `TESTING_LOG.md:1`
