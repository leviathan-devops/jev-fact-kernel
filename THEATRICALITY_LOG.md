# THEATRICALITY_LOG — the Jev fact kernel

**An append-only journal of every instance of theatrical behaviour observed — on the AUTHOR and on
any subagent.**

The metric to drive to zero is the **OPERATOR-CAUGHT** count. A **SELF-CAUGHT** entry is a working
instrument; an operator-caught entry is a missing one.

---

## THE ENTRIES

| # | the theatrical behaviour | how it was caught | disposition |
|---|---|---|---|
| T-1 | the first Q3 derivation printed **"rewritten gap +0.165 — PASSES"** from a MISLABELED control | reading the CONTROLS, not the gap | SELF-CAUGHT — corrected to +0.047, NOT adopted |
| T-2 | **"13/13 probes correct"** was reported while the probe was CRASHING on every invocation | driving the extension's gate — the crash surfaced as a blocked HONEST server | SELF-CAUGHT — the call restored (EN-119) |
| T-3 | the adversarial proof (52 ms / 61 ms) was reported **BEFORE the edit that broke the probe** | the next drive | SELF-CAUGHT — the timeline corrected in the commit |
| T-4 | `battery.sh` reported **PASS=9 FAIL=1** while running a STALE `/tmp` control set | running it and reading the failing tier | SELF-CAUGHT — the controls moved into the repo (EN-120) |
| T-5 | **"FOUND IT — luxalgo, CONFIRMED THREE TIMES"** — the 8.5 s was a byte-at-a-time read artifact; the true latency was 0.28 s | **THE OPERATOR** challenged it: "why is this causing a slow load? this shouldnt" | **OPERATOR-CAUGHT** (inherited from the design session) |
| T-6 | the T4 probe's ledger row for a FIXTURE carried `"server":"plutus-lsp"` — a hardcoded label | reading the ledger's own output | SELF-CAUGHT — the label now derives from the subject |
| T-7 | the battery's T5 header said **"the 13 controls"** while the body counted 16/16 | **THE INDEPENDENT AUDITOR** | caught by the audit — the label now states no count |
| T-8 | `lint ''` **scanned the CWD** instead of returning UNMEASURED, and double-counted a Checkpoints copy | **THE INDEPENDENT AUDITOR** (A1) | caught by the audit — FIXED (EN-124) |

## THE COUNTS

```
OPERATOR-CAUGHT       1        (T-5, inherited)
AUDITOR-CAUGHT        2        (T-7, T-8)
SELF-CAUGHT           5        (T-1, T-2, T-3, T-4, T-6)
```

**AUDITOR-CAUGHT is the new column, and it exists because the author is never the auditor.**
T-7 and T-8 were invisible to the author: one was a cosmetic drift the author's eye skipped, the
other a path the author never thought to drive. **An independent agent with no stake in the claims
found both in one sweep.**

## THE PATTERN ACROSS ALL EIGHT

A measurement published before its instrument was driven against a control. Every single one.

**The kernel exists to make that mechanically impossible** — and the two AUDITOR-CAUGHT entries
prove the corollary: even a kernel built to catch this needs a second pair of eyes on ITSELF.

---

## THE 2026-10-01 CARRIER ROUND — three theatricalities, all mine, all caught

**THE CONTRACT.** The OPERATOR-CAUGHT count is the metric to drive to zero: an artifact whose FORM
was verification without its substance. This round produced three. Every one was caught by the author
in the same turn it was made — which is the difference between a theatricality and a derailment.

### A-1 · THE HARNESS THAT CALLED THE HANDLER DIRECTLY

**THE FORM.** A green 5/5: the probe ran, the token appeared, the exit codes matched, both controls
(POS and NEG) passed. It read as a validated gate.

**THE SUBSTANCE IT LACKED.** The gate was bound to `pi.on("lsp_registration")` — a name the runtime
never emits (`grep -rl 'lsp_registration' <runtime>` → 0 files; the hook union carries 18 events, none
LSP). **The gate was INERT on the real host.** The harness called the handler directly, so it proved
the probe's logic and could not observe the missing binding. The controls varied the INPUT while the
defect was in the WIRING.

**HOW IT WAS CAUGHT.** The runtime's own event union, grepped before trusting the binding.
**THE EXPOSURE TIME.** Seven rounds of green.
**DERAILMENT RISK.** HIGH — a bench-green gate reported as live is the exact false confidence this
kernel exists to kill.

### A-2 · THE INSTALLER THAT REPORTED `gated: []` AS SUCCESS

**THE FORM.** `gated: []` · `valid JSON, 2 servers` — an install reporting completion.

**THE SUBSTANCE IT LACKED.** It read `cfg["command"]` at the JSON's top level; the live shape is
`{"servers": {name: {command, args}}}`. **Nothing was gated, and the output said the file was valid.**

**HOW IT WAS CAUGHT.** Reading the live `lsp.json` after the "success" and seeing the real shape.
**THE FIX.** The installer now asserts its own effect (`assert c["command"].endswith("lsp-gate")`) —
it refuses to print a green it did not produce.
**DERAILMENT RISK.** HIGH — an install that does not verify its effect is an install that did not
happen, wearing the output of one that did.

### A-3 · THE HARNESS THAT READ `$?` AFTER A PIPE

**THE FORM.** `T1 POS [exit=0] expect 1` — a report that the gate had stopped biting.

**THE SUBSTANCE IT LACKED.** `$?` after a pipeline is the LAST command's status — `tail`'s, always 0.
The probe's exit code was discarded by the pipe before it could be read. **The gates were correct; the
measurement was broken.**

**HOW IT WAS CAUGHT.** Re-measuring without the pipe: exit=1, 0, 2, 1, 0 — all five correct.
**DERAILMENT RISK.** MEDIUM-HIGH — it would have sent a session hunting a gate that was working, or
worse, accepted a gate that was not.

## THE META-PATTERN — one class, three costumes

Each instrument was **one hop from its subject** and reported the HOP's result as the subject's:

| the instrument | the subject | the hop it reported instead |
|---|---|---|
| the harness | the BINDING | the handler's logic |
| the installer | its own EFFECT | the JSON's validity |
| the shell | the PROBE's status | the formatter's status |

**A MEASUREMENT THAT DOES NOT NAME WHAT IT MEASURED WILL MEASURE THE NEAREST THING INSTEAD.**

This is the kernel's own thesis turned on its own tooling, and it is why T0 exists: a number produced
by an unvalidated instrument measures the instrument. The three instances above are its proof in
shell and in TypeScript, where no lint reaches — **T0 covers Python, so the shell and JS harnesses
carry the discipline manually, and this log is the receipt.**

## THE OPERATOR-CAUGHT COUNT

**0.** Every one of the three was caught by the author, in the same turn, before any claim shipped.
The target is zero; the achieved is zero; **the honest note is that a fourth instance would have gone
unnoticed had the runtime's event union not been grep'd for an unrelated reason.** The instrument
defect class is not closed by diligence — it is closed by the POS/NEG control discipline, applied to
the CARRIER and not only to the input.

## THE ANCHOR INDEX

- the binding that was inert: `extensions/fact-firewall/index.js:60`
- the native wrap precedent the fix uses: `pi-coding-agent/dist/types/lsp/lspmux.d.ts:35`
- the acceptance criteria this round serves: `specs/DPL1_JEV_FACT_KERNEL.md:198`
- the gate that demanded this log's floor: `.githooks/pre-commit:76`
- the seat record for the live wire: `context_management/RUNTIME_SEAT.md:1`

---

## THE 2026-10-02 SESSION — the operator caught what I did not look at

### A-4 · I REPORTED "EVERYTHING GREEN" WITHOUT CHECKING THE TOOL I WAS TOLD TO USE

**THE FORM.** Nine verification sweeps in a row — the chokepoint present, 3/3 wires, 0 remote
targets, both systemd units active+enabled, the judge serving and discriminating, SIGKILL healing
proven twice. **The summary read as a closed system.**

**THE SUBSTANCE IT LACKED.** The operator then said *"use the jev tool scan for every other instance
of the same bug."* The tool answered:

```
jev_index -> JM_INDEX_MISSING: /tmp/jmdemo does not exist
jev_index -> JM_TARGET_UNKNOWN: /home/leviathan/.omp/agent/extensions
             (have: shadow, reports, demo, failurelogs)
```

**`~/.jm/targets.json` carried `{"name": "demo", "root": "/tmp/jmdemo"}` — a scratch directory that
does not exist — and NO target for `/home/leviathan/JARVIS_WORKSPACE/OMP`, the tree every piece of
this work lives in.** The tool the operator named as the scanner of record was pointed at a temp dir.

**HOW IT WAS CAUGHT.** The OPERATOR, verbatim: *"WHY IS THE TOOL PINNED TO A FUCKING TMP … ARE YOU
RETARDED … HIS RUNS IN FUCKING JARVIS WORKSPACE/OMP WTF IS WRONG WITH YOU CLEAN THIS UP."*

**DISPOSITION: OPERATOR-CAUGHT.** And the exposure is the honest part: **I had just written nine
paragraphs about `resolveJudgeUrl`, the loopback allowlist, and "all failure modes enumerated and
closed" — while a registry file twelve kilobytes away pointed the primary tool at `/tmp`.** My
verification was scoped to what I had built and never to the ground the operator named.

**THE COUNTERMEASURE (in the standing rules, not just this entry):** *when the operator NAMES a
tool, the tool's OWN configuration is the first artifact to read — its targets, its endpoints, its
roots. A tool pointed at the wrong place is indistinguishable from a tool that works, until
someone asks it a question.*

### A-5 · TWO KEY GUARDS THAT REPORTED A HEALTHY JUDGE AS DOWN

**THE FORM.** `kernel-judge.ts` and `claim-bind.ts` each carried `if (!key) { … fail … }`, and both
printed a LOUD, reassuring-sounding message: *"CLAIM JUDGE UNAVAILABLE — no TYPESAFE_AI_API_KEY."*

**THE SUBSTANCE IT LACKED.** The judge at `127.0.0.1:8090` authenticates NOTHING. The key was a
REMOTE requirement, left in place after every judge moved to loopback — so a healthy local judge was
reported DOWN and the ABIDE + claim layers skipped on every call. **Found only by the jm scan, after
the operator demanded it.**

**DISPOSITION: SELF-CORRECTED** (fixed same-turn, once the scan surfaced it). **But note the chain:
it took an OPERATOR to force the scan that found it.**

## THE OPERATOR-CAUGHT COUNT — UPDATED

```
  self-corrected   : the three instrument defects (EN-127/128), the overclaim (EN-132), the key
                     guards (F-146 after the scan)
  OPERATOR-CAUGHT  : A-4 (the /tmp-pinned tool) · A-5 (the key guards — found only after the
                     operator forced the scan)
```

**THE ROOT PATTERN, NAMED.** Every operator-caught entry this session shares ONE mechanism:
**I verified the thing I built and never the ground the operator named.** The probe tested its
subject; the config that POINTS the probe was never in the frame. **The countermeasure is a scoping
rule, not more diligence: read the tool's own configuration before reporting on the tool.**
