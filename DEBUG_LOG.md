# DEBUG_LOG — the fact kernel

Five entries, all in context_management/RUNNING_DEBUG_LOG.md in full. The chains, compressed:

## EN-115 — the pattern set was imagined, not measured

**Symptom** T0's own controls went red: the NEG fixture fired, and the kernel's own source got 7 hits.
**Root cause** five patterns authored from imagination. Driven against three corpora, four failed:
`T0_GROWING_BUFFER` fired on legitimate code; `T0_BYTE_READ_ANY` fired on `readline()`;
`T0_PIPE_HEAD` matched its OWN comment text; `T0_SLEEP` never bit the positive.
**Fix** the set reduced to the one pattern with POS=1 NEG=0 SELF=0.
**Lesson** a detector's pattern set is a hypothesis until driven against its own controls.

## EN-116 — the cascade failed its first control (5/8)

**Root cause** pass-1's question ENUMERATED four subject kinds; the judge read the enumeration as
the whole definition, so a wire declaration fell to NONE at 0.51. Then NONE was defined by grammar,
which let `Created X` escape — an escape hatch for the phantom-artifact class.
**Fix** three question rewrites: 5/8 → 6/8 → **8/8**. The derived cut never moved.
**Lesson** a question's wording is the mechanism; a threshold is not.

## EN-117 — the probe hung and my fixtures were deaf

**Root cause A** `read_msg()` used blocking `readline()` with the timeout checked only between
calls → an unbounded hang, `timeout(1)` exit 124, temp dirs leaked.
**Root cause B** the fixture servers used `readline()`, which STRIPS the newline, so the
`\r\n\r\n` frame terminator could never match — both servers were deaf.
**Fix** `select()` with a hard deadline; raw frame parsing in both servers.
**Lesson** a fail-closed probe is DIAGNOSTIC — its UNMEASURED located the deaf fixtures.

## EN-118 — a mislabeled control nearly published a false pass

**Symptom** the first Q3 derivation printed "rewritten gap +0.165 — PASSES".
**Root cause** `always-empty` ("the two runs are identical") was labelled POSITIVE when it is the
NEGATIVE it exists to be. The bad label inverted the gap.
**Fix** corrected → original +0.089, rewritten +0.047. BOTH below the +0.10 bar. NOT adopted.
**Lesson** read the controls, not just the gap.

## EN-119 — the probe had been crashing; the gate called the crash a finding

**Root cause A** the label fix replaced the `probe()` CALL with a bare assignment — `declared`
unbound, `NameError` on every invocation, broken for a whole commit span.
**Root cause B** the extension read exit 1 as "lies found"; a NameError also returns 1 — with no
LIE lines — so a crash blocked an HONEST server.
**Fix** the call restored; a LIE verdict now REQUIRES its LIE lines.
**Lesson** every fix re-runs its subject. And: a code that can mean two things must be split.

## REGRESSION WATCH

- `bash kernel/battery.sh` is the single gate. A red row names its tier.
- The control set lives IN `fixtures/` — a /tmp control bit TWICE.
- Every probe's controls must be driven BOTH ways before the probe ships.

## IRON LAWS

1. An unread path is UNMEASURED (exit 2), never clean.
2. A finding must carry the evidence that constitutes it.
3. Drive every gate both ways.
4. The control set ships with the instrument.
5. A fix re-runs its subject.
