# JEV FACT KERNEL — ENGINEERING REPORT v1

**Series:** jev-fact-kernel (the five-tier fact kernel lineage; the base-tree series is `.` — this is a branch series, so the counter resets)
**Project:** the Jev fact kernel — mechanical lie-blocking at the runtime
**Date:** 2026-10-02
**Author:** the build session (agent)
**Baseline:** `feat/jev-fact-kernel` @ `2fb2f06`
**Commits:** 245 · **dirty:** 0
**Judge:** `http://127.0.0.1:8090` → `{"ok":true,"model":"jevk5-4b-v0.2-Q8_0","runtime":"gguf","backend":"llama:200"}`
**Audit lane:** `http://127.0.0.1:4097` → HTTP 200

---

## ONE-PARAGRAPH SUMMARY

The kernel is five tiers of probes that convert a claim into a verdict by measuring the artifact instead of reading the prose. T0 lints a command's own measurement code for defects that would make its numbers measure the instrument. T1 grounds asserted numbers against a corpus. T2/T3 route a claim span through the local Jev judge and derive the cut from a control set. T4 answers six artifact questions — does the file exist, does the hash match, did the suite pass, is the spec section implemented, does the symbol have production consumers, does the LSP server's capability reply match what it actually answers. Every verdict is written as a `{Pattern, State, Evidence}` triad to an append-only ledger. The enforcement carriers are `bin/lsp-gate`, a wrapper that occupies the `command` position in `lsp.json` so it sees an LSP registration the plugin API cannot, and `extensions/fact-firewall/`, which binds `tool_call` and `tool_result`. It produces one strong guarantee: a lying LSP server gets no live registration on this host. It does NOT produce the guarantee its own documentation once claimed — that the server is never executed — because the probe must spawn it to interrogate it. That correction is this report's most load-bearing item.

---

## POSITION

The build is at **P6 (checkpoint) complete, P2 (script-test) green, P3/P4 (container/adversarial) proven on the live wire, and the ship gate FAILING at 3 critical / 24 high.** The single most load-bearing fact: **every one of the five proof tiers reproduces this turn, the battery is green, and the external LLM ship gate still refuses the tree.** Those two facts are not in conflict — the tiers test the kernel's behavior, the gate reviews its code, and the gate found five real defects the tiers could not see, four of which are now fixed and re-proven. The fifth (`bin/lsp-gate:52`) is not a code defect at all: it is a **false claim in my own documentation**, now corrected.

---

## PROGRESSION INDICATOR

### The FR denominator (the DPL1)

```
16/16 FR present in the spec as sections      (denominator: FR-1..FR-16, specs/DPL1_JEV_FACT_KERNEL.md)
16/16 FR have an implementation site          (the FR MAP in BUILD_REPORT.md + this report §3)
16/16 FR cited by at least one commit         (git log — every commit carries an FR id; the hook REFUSES otherwise)
```

### The SC denominator — THE PIN'S DENOMINATOR DOES NOT EXIST

```
  specs/DPL1_JEV_FACT_KERNEL.md               grep -c 'SC-[0-9]+'  ->  0
  specs/PLANNING_SUITE_JEV_FIVE_TIER_KERNEL.md                     ->  0
  reports/JEV_FACT_KERNEL_ShowMe.md                                ->  0
```

**The goal pin names "FR-1..FR-16, the 12 SC". No authority document contains a single `SC-n` token.** The spec's acceptance criteria are per-FR blocks — `specs/DPL1_JEV_FACT_KERNEL.md:198` is `## FR-12 · ACCEPTANCE CRITERIA (mechanical; every line command-checkable)`. **A 12-SC denominator cannot be measured against, so no SC percentage is reported.** This is a PIN defect (§12).

### The build phases

| phase | the exit gate | measured state |
|---|---|---|
| P0 preflight | exit-2 refusals · worktree clean · judge up | **COMPLETE** — `dirty: 0`, judge `ok:true` |
| P1 build (8 steps) | each commit FR-cited | **COMPLETE** — 245 commits; the hook REFUSES an uncited kernel commit |
| P2 script-test | POS bites, NEG clean | **COMPLETE** — battery 16/16; all five tiers reproduce |
| P3 container/host | a lying LSP refused at registration | **COMPLETE — on the live wire** (not a container) |
| P4 red-team | the 23-declare/0-implement server BLOCKS | **COMPLETE** — 23 LIE lines, exit 1 |
| P5 docs | 12 canon + 5 ship current | **PARTIAL** — 12 canon exist; 5 ship docs at floor; the B-13 correction is not yet in all five |
| P6 checkpoint | sealed with the tree sha | **COMPLETE** — `Checkpoints/jev-fact-kernel-20261001-2344/` |

---

## SPEC → CODEBASE MAP

| requirement | status | evidence |
|---|---|---|
| FR-1 the ledger row shape | IMPLEMENTED | `kernel/ledger.py`; 893 rows in `~/.omp/run/fact-firewall.jsonl` |
| FR-2 T0 instrument lint | IMPLEMENTED | `kernel/tier0-instrument-lint.py` (123 L); exit 1/0/2 all reproduce |
| FR-3 T1 grounding | IMPLEMENTED | `kernel/tier1-grounding.py` (78 L) — **B-4: it over-grounds** |
| FR-4 T2 comparative | IMPLEMENTED | `kernel/tier2-comparative.py` |
| FR-5 the router | IMPLEMENTED | `kernel/router.py` (88 L) — **B-5: no try/except** |
| FR-6 the six T4 probes | IMPLEMENTED | `kernel/tier4-probes.py` (110 L) — **B-1, B-6** |
| FR-7 worker-return audit | IMPLEMENTED | `kernel/audit-return.py` (58 L) — **B-3: HASH_RE dead** |
| FR-8 the 12 canon docs | IMPLEMENTED | `context_management/` — 12 files, measured |
| FR-9 the 5 ship docs | IMPLEMENTED | 533 / 534 / 133 / 201 / 124 lines, all above floor |
| FR-10 the Q3 rewrite gap | IMPLEMENTED | `kernel/q3-control.py` — **B-7: exits 1 on a WARN-only path** |
| FR-11 TTSR files, never blocks | DESIGNED | the polarity law; not exercised this turn — **UNVERIFIED** |
| FR-12 the LSP capability probe | IMPLEMENTED | `kernel/tier4-lsp-capability-probe.py` (200 L); exit 1 on 23 lies, exit 0 honest |
| FR-13 the fail-closed law | IMPLEMENTED | every unread path returns exit 2; `battery.sh` now gates on UNM |
| FR-14 the derived threshold | IMPLEMENTED | the Q2 cut; `kernel/q3-control.py` carries the control set |
| FR-15 container/host test | **PROVEN ON THE LIVE WIRE** | `context_management/RUNTIME_SEAT.md` — the registry, command, args, root are all live |
| FR-16 the docs contract | PARTIAL | floors met; **the B-13 correction is not yet in all five ship docs** |

---

## THE ARCHITECTURE — per module, with diagrams

### M1 · the probe tier

```
┌────────────────────────────────────────────────────────────────────┐
│ kernel/tier0-instrument-lint.py                             123 L  │
│ ────────────────────────────────────────────────────────────────── │
│ scan(text,name) ──► the patterns ──► hits[]                        │
│   │                                    │                           │
│   │  T0_BYTE_READ_IN_TIMED_LOOP        │ hits   ──► exit 1 BLOCK   │
│   │  (fires on any .read(1) — the      │ none   ──► exit 0 clean   │
│   │   name promises a timed region     │ unread ──► exit 2 UNREAD  │
│   │   the regex does not check)        │                           │
└────┼───────────────────────────────────┴───────────────────────────┘
     │  B-2: the name is a claim the code does not support
     ▼
┌────────────────────────────────────────────────────────────────────┐
│ kernel/tier4-lsp-capability-probe.py                        200 L  │
│ ────────────────────────────────────────────────────────────────── │
│ ropen pipe ──► Popen(cmd,cwd=root) ──► {"initialize"} ──► wait     │
│                     ▲                                              │
│                     └── THE SERVER EXECUTES HERE (line 110)        │
│                                                                    │
│ cap = reply.capabilities ──► CAP2METHOD map ──► per-method call    │
│   -32601 back ──► LIE (declared, not implemented) ──► exit 1       │
│   answered   ──► OK                               ──► exit 0       │
│   no reply   ──► UNMEASURED                       ──► exit 2       │
│ ledger.append("T4_LSP_CAPABILITY_LIE","BLOCK",4,1.0,capability=…)  │
└────────────────────────────────────────────────────────────────────┘
```

### M2 · the enforcement carrier (the one that can see a registration)

```
┌────────────────────────────────────────────────────────────────────┐
│ ~/.omp/agent/lsp.json                                              │
│ "plutus-lsp": {                                                    │
│   "command": ".../bin/lsp-gate",      ◄── THE GATE SITS HERE       │
│   "args": ["bun", ".../plutus-lsp.ts", "--stdio"] }                │
└────────────────────────────┬───────────────────────────────────────┘
                             ▼  omp spawns THIS
┌────────────────────────────────────────────────────────────────────┐
│ bin/lsp-gate                                                 70 L  │
│ python3 tier4-lsp-capability-probe.py "$ROOT" "$@"                 │
│        ├── RC=2 / "UNREAD" ──► stderr + exit 2  (never clean)      │
│        ├── RC≠0 / "T4 BLOCK" ─► stderr + exit 1  ── exec NEVER     │
│        │                                              reached      │
│        └── RC=0 ─────────────► exec "$@"  ◄── THIS PROCESS         │
│                                              BECOMES THE SERVER    │
└────────────────────────────────────────────────────────────────────┘
```

**THE FAILURE MODE THIS DIAGRAM MUST SHOW.** The probe's `Popen` at `kernel/tier4-lsp-capability-probe.py:110` **executes the server** before the gate decides. A hostile server therefore **runs once** during probing. What the gate withholds is the **live registration** — the long-lived client session, the editor wiring, the capability advertisement to a consumer. **A hostile server is not prevented from RUNNING; it is prevented from being ADOPTED.**

### M3 · the plugin extension (and its inert binding)

```
┌────────────────────────────────────────────────────────────────────┐
│ extensions/fact-firewall/index.js                           133 L  │
│ pi.on("lsp_registration")   ◄── INERT (line 60)                    │
│   the runtime emits 18 events; NONE is an LSP event                │
│   grep -rl lsp_registration <runtime> -> 0 files                   │
│ pi.on("tool_call")          ◄── LIVE                               │
│ pi.on("tool_result")        ◄── LIVE                               │
│ pi.registerTool("fact-check") ◄── LIVE                             │
│ run() ──► execFile ──► {code: e?typeof==number ? e.code : -1}      │
│                       ◄── FIXED: was `e?.code ?? 0`, which mapped  │
│                           a TIMEOUT to exit 0 = ok:true            │
└────────────────────────────────────────────────────────────────────┘
```

---

## THE RUNTIME TRACE — one claim, end to end

```
timeline ─────────────────────────────────────────────────────────────────►
 1  omp starts, reads ~/.omp/agent/lsp.json
 2  a .ts file opens → the client wants plutus-lsp
 3  omp spawns the entry's `command` → bin/lsp-gate
 4  lsp-gate runs the probe → the probe Popen()s the REAL server
      └── THE SERVER EXECUTES ONCE, HERE, BEFORE ANY VERDICT
 5  the probe speaks {"initialize"} and maps capabilities → methods
 6  the server answers -32601 (a lie) or a result (honest)

ROUTING DECISION
 ┌──────────────────────────────┬──────────────────────────────────────┐
 │ RC=1 / "LIE"                 │ RC=0                                 │
 │ → stderr + exit 1            │ → exec "$@" — the gate BECOMES       │
 │ → exec NEVER reached         │   the server, registered normally    │
 │ → NO REGISTRATION            │                                      │
 └──────────────────────────────┴──────────────────────────────────────┘

DELIVERY PATH
 lsp-gate ──► (BLOCK) stderr ──► the ledger row ──► ~/.omp/run/fact-firewall.jsonl
          └─► (PASS) exec ────► the LSP stdio channel, unpolluted (stdout: 0 bytes on BLOCK)

OBSERVER
 the ledger — tail -1 carries {Pattern, State, Evidence} with capability, method, code
 measured this run: 893 rows · T4_LSP_CAPABILITY_LIE: 851 · T4_LSP_CAPABILITY_OK: 41 · SELFTEST: 1
```

---

## THE INDEPENDENT AUDITORS — dispatched in one batch, both returned

**The law they serve:** *the auditor is never the author.* Two scouts, disjoint lenses, neither given the other's findings as premises, both READ-ONLY.

### FabricationHunter — the fabrication lens

> *"every number is a lie until a command reproduces it; every test asserts nothing until you read its assertion"*

**Its return: C1–C9 ALL CONFIRMED.** Not one of the build's headline claims was refuted. Its raw outputs:

| its ID | the claim | the command it ran | its output | verdict |
|---|---|---|---|---|
| C1 | T0 unread fails closed | `python3 kernel/tier0-instrument-lint.py /tmp/NOPE.py; echo exit=$?` | `UNMEASURED … 0 file(s) were inspected … exit=2` | **CONFIRMED** |
| C2 | T0 broken bites | `… fixtures/broken-probe.py; echo exit=$?` | `T0_BYTE_READ_IN_TIMED_LOOP at fixtures/broken-probe.py:8 … exit=1` | **CONFIRMED** |
| C3 | T0 clean passes | `… fixtures/clean-probe.py; echo exit=$?` | `clean. (1 file(s) inspected) … exit=0` | **CONFIRMED** |
| C4 | T0 self-scan | `… kernel/; echo exit=$?` | `clean. (9 file(s) inspected) … exit=0` | **CONFIRMED** |
| C5 | T4 lying | `timeout 120 … fixtures/lying-server bun server.ts; echo exit=$?; grep -c '^    LIE'` | `exit=1` · `23` LIE lines | **CONFIRMED** |
| C6 | T4 honest | `timeout 120 … fixtures/honest-server bun server.ts; echo exit=$?` | `exit=0` · `LIES (0)` | **CONFIRMED** |
| C7 | the probe controls | `python3 fixtures/probe-controls.py` | `PROBE CONTROLS: 16/16`, exit 0 | **CONFIRMED** |
| C8 | the router cascade | `timeout 280 python3 kernel/router.py; echo exit=$?` | `CASCADE ACCURACY: 8/8` · `spans that reached the fine pass: 7/8` · p2 values **0.42–0.95** | **CONFIRMED** |
| C9 | the judge | *live against :8090* | `jevk5-4b-v0.2-Q8_0` | **CONFIRMED** |

**THE NOTE I MOST RESPECT IN ANY RETURN THIS SESSION — its own caveat on C6:**

> *"0 declared / 0 tested is pass-by-empty-scope; the honest server answers everything with `result: null` and the probe never exercises an undeclared method, so this control proves the probe does not hallucinate lies, nothing more. The build never claims otherwise."*

**That is the auditor doing the harder job** — not refuting the claim, but bounding exactly what its own green means. The build's TESTING_LOG says "every advertised capability answered" and that is literally true; the auditor added *what it does not prove*.

**Its finds beyond the seeds:**

- **ALPHA-1** — `fixtures/broken-probe.py:1`. The fixture's own header claims **3 hits**; the probe emits **1**. *The fixture's comment is a claim its artifact does not support* — the same class as B-13, one level down, in the fixture I wrote to catch this class.
- **ALPHA-2** — the dead `pi.on("lsp_registration")` binding still ships at `extensions/fact-firewall/index.js:60`.
- **ALPHA-3** — the T0 pattern's name promises `IN_TIMED_LOOP`; the regex proves no timed region.
- **ALPHA-4** — the number `187,757` appears in a doc with **no producer** — a figure that T1 itself would flag.
- **ALPHA-6** — `kernel/battery.sh:68-69`, the `grep -c || echo 0` double-zero (now fixed, B-12).
- **its W-9 check** — it CONFIRMED the seat's self-reported anchor-class defect at `.githooks/pre-commit:73`: the extension alternation omits `py` and `js`.

### SlopHunter — the dumb-slop lens

> *"dead code, no-ops, swallowed errors, magic numbers, duplicated logic, comment-code contradiction"*

| its ID | the site | what it found | severity |
|---|---|---|---|
| BRAVO-1 | `tier4-lsp-capability-probe.py:108` | `except Exception: pass` on `sample.write_text` — a setup failure laundered into wire evidence | HIGH |
| BRAVO-2 | `tier4-lsp-capability-probe.py:184` | the ledger-import failure is silent beside its own adjacent **"LOUD"** comment | HIGH |
| BRAVO-3 | `router.py:50-58` | the docstring promises "Never throws"; `grep 'try\|except'` → **No matches found** | HIGH |
| BRAVO-4 | `q3-control.py:37-40` | same shape — `urlopen` with no guard | MEDIUM |
| BRAVO-5 | `extensions/fact-firewall/index.js:12` | the `e?.code ?? 0` null-code defect | HIGH |

**BRAVO-2 is the sharpest of the five: a comment saying "a ledger write failure is LOUD" sitting two lines above `except Exception: _led = None`.** The code contradicts the comment inside the file whose entire purpose is to prevent exactly that.

### THE CORROBORATION MATRIX — where the two lenses and the gate agree

| the finding | the gate said it | Alpha said it | Bravo said it | now |
|---|---|---|---|---|
| the `?? 0` timeout-as-success | critical `index.js:10` | — | BRAVO-5 | **FIXED (B-8)** |
| the router's no-throw contract | high `router.py:43` | — | BRAVO-3 | OPEN (B-5) |
| the T0 pattern's false name | high `tier0-instrument-lint.py:38` | ALPHA-3 | — | OPEN |
| the ledger's unenforced triad | high `ledger.py:21` | — | — | OPEN |
| the `?`-masking caller gap | critical `index.js:136` | — | — | **FIXED (B-9)** |

**Three independent instruments agreeing on one site is the strongest evidence this report carries.** `router.py:43` and `ledger.py:21` were each named by two or more of them and are still open.

---

## THE ENROLLMENT — the multi-project runtime test

**What the pin asked for:** enroll this worktree as `jarvis-upper`'s **2nd project** — *that IS the multi-project runtime test.*

**What was measured:**

```
bun src/cli.ts projects                enrolled=2  issues=0
  jev-fact-kernel   armed=ARMED
  jarvis-upper      armed=ARMED

journalctl -u jarvis-upper  {"started":true, counts:{armed:1, dark:1, enrolled:2}}
  jev-fact-kernel   NOT-ARMED:TARGET:TARGET-NO-ORIGIN:this tree has no origin remote
  jarvis-upper      ARMED:leviathan-devops/jarvis-upper
```

**THE KERNEL RUNS TWO PROJECTS AND PUBLISHED A NAMED REFUSAL FOR THIS ONE.** `TARGET-NO-ORIGIN` — the worktree has no origin and `leviathan-devops/jev-fact-kernel` does not exist (32 verified against a valid token). **That is the fail-closed law observed on a live kernel**: a dark project produces a loud, named refusal, never a green. The daemon survived the second project and dropped neither.

**THE HOOK-CHAIN CONFLICT.** `core.hooksPath` permits **exactly one** directory. The enrollment ships `.githooks/`; the kernel's spec gate lives at `.git-hooks/`. The APPEND's own step 5 would have **displaced** the FR-citation gate — a silent loss, discovered only by an unstamped commit landing. **Fixed by CHAINING**, never displacing: the spec gate now runs on the enrollment's `prepare-commit-msg`, which its own comment names as *"the absolute anchor"* (it fires where `commit-msg` cannot).

**A DEFECT IN THAT FIX, CAUGHT BY DRIVING IT:** the first attempt **appended** the block — and the script **ends with `exit 0`**. The block was unreachable; both ways returned 0. **A gate behind an exit is not a gate.** Re-fixed by inserting before the exit, then re-driven: **NEG=1, POS=0.**

**WHAT THE ENROLLMENT'S GATES REFUSED IN THIS TREE — three real defects, each correct:**

| the gate | what it refused | the fix |
|---|---|---|
| W-9 (doc density) | `RUNTIME_SEAT.md` at 26 lines, 0 anchors | rewritten to 268 lines, 7 anchors |
| W-9 (again) | `.js:60` / `.py` anchors cannot match its `(ts\|md\|json\|sh\|yml)` alternation | real anchors in the counted classes; the gate's own defect recorded as F-9 |
| W-8 (claim evidence) | a commit body carrying "landed" with no artifact | the artifact added (the counts + the tree sha) |

**A gate that has never refused anything has never been tested.** These refused three times, each time correctly, and each refusal named its remedy.

---

## THE ADVERSARIAL-FIRST ORDER — what ran first

The pin requires the adversarial cases **first**, the happy path **last**. The order that was actually executed:

```
1  ADV  the lying fixture through the gate, direct          -> exit 1, 23 LIE lines
2  ADV  the lying fixture through the INSTALLED lsp.json    -> exit 1, BLOCK token, ps -> 0
3  ADV  the OLD BYPASS attempted (FACT_FIREWALL_LSP=warn)   -> exit 1, the bypass DEAD
4  ADV  a probe exiting 127, driven on the REAL export      -> {"ok":false,"exit":127}
5  ADV  a timed-out exec, driven on the REAL run()          -> {"code":-1,"signal":"SIGTERM"}
6  ADV  the hash claim "d" (one character)                  -> UNMEASURED
7  ADV  the all-UNMEASURED battery (0/0/16)                 -> exit 2
8  NEG  the honest fixture through the gate                 -> exit 0, exec'd
9  HAPPY the battery                                        -> PASS=16 FAIL=0 UNM=0
```

**Seven adversarial scenarios before the first negative, nine before the happy path.** Every one produced a real tool output; every one is recorded in `TESTING_LOG.md` §THE CARRIER ROUND.

---

## THE VERIFICATION CHANNELS — degraded or live

| the channel | its state this turn | what it can and cannot prove |
|---|---|---|
| the host shell | **LIVE** | every command in this report |
| the local judge `:8090` | **LIVE** — `{"ok":true,…,"backend":"llama:200"}` | the T2/T3 tiers |
| the audit lane `:4097` | **LIVE** — HTTP 200 | the ship gate's own reviews |
| omp's LSP client | **NOT EXERCISED** | a gated server has never been spawned by omp itself |
| a container | **NOT USED this turn** | the P3 phase was proven on the host, not in a container |
| the ABIDE judge | **FIRING ADVISORY** — p 0.82–0.93 on doc/probe writes, edits land | noted, not routed around |

**NO VERDICT IN THIS REPORT RESTS ON A DEGRADED CHANNEL.** The one channel that could have carried a weaker claim — the container — was replaced by the live host wire, which is the stronger seat for this subject: the gate's whole thesis is that a bench pass is not a wire pass, and the wire here is the real `lsp.json` in the real home directory.

---

## THE BUG LEDGER

| # | the bug | root cause | the fix | the evidence |
|---|---|---|---|---|
| **B-1** | `tier4-probes.py:48` — a one-character hash claim PASSED | `h[:16]==c[:16]` truncates; `startswith` accepts 4 bits | a 16-hex-char floor | `"d"`→UNMEASURED, 16→PASS, wrong-16→BLOCK |
| **B-2** | `battery.sh:83` — `PASS=0 FAIL=0 UNM=16` exited 0 GREEN | UNM was never consulted | RED(1)/UNMEASURED(2)/NOTHING(2)/GREEN(0) | 4 combinations driven |
| **B-3** | `audit-return.py:25` — HASH_RE defined, never used | the docstring promises a T4-HASH path never wired | **OPEN** | 1 definition, 0 uses |
| **B-4** | `tier1-grounding.py:52` — `99` grounds from `1999` | plain substring, no boundaries | **OPEN** | named in all four gate runs |
| **B-5** | `router.py:43` — promises "never throws", has no try | the docstring outran the body | **OPEN** | `grep 'try\|except'` → 0 matches |
| **B-6** | `tier4-probes.py:113` — `foobar` counts as a consumer of `foo` | substring grep, 3-suffix filter | **OPEN** | reported twice |
| **B-7** | `q3-control.py:65` — a WARN-only path calls `sys.exit(1)` | the law says "never BLOCKS"; the exit says otherwise | **OPEN** | the 3rd gate run |
| **B-8** | `index.js:10` — `e?.code ?? 0` mapped a TIMEOUT to exit 0 | null code on signal/timeout | `-1` sentinel + signal/killed | `{"code":-1,"signal":"SIGTERM"}` |
| **B-9** | `index.js:43/58/136` — **three callers** let any non-zero code fall to `ok:true` | **my own B-8 fix** changed the return shape; the callers were not updated | every non-zero → refuse, named | both real exports → `{"ok":false,"exit":127}` |
| **B-10** | `bin/lsp-gate:50` — `FACT_FIREWALL_LSP=warn` neutered the gate | the env is inherited by the gate's own subject | the variable is GONE | bypass set → still EXIT=1 |
| **B-11** | `bin/lsp-gate:63` — probe text on stdout (the LSP channel) | an unredirected `printf` | `>&2` | `stdout bytes on a BLOCK: 0` |
| **B-12** | `battery.sh:68` — `grep -c \|\| echo 0` gave `L=[0\n0]` | `grep -c` prints 0 AND exits 1 | assign, then default | proven both ways |
| **B-13** | **the overclaim** — "the server was NEVER EXECUTED" | the claim was stronger than the mechanism | corrected in the gate + EN-132 | `Popen` at `:110` |

### DETAIL BOX · B-9 (the process lesson)

```
┌─ THE FIX'S OWN BLAST RADIUS ────────────────────────────────────────┐
│                                                                     │
│  EN-130 fixed run() to return -1 instead of the false 0.            │
│  THE CALLERS STILL TESTED ONLY `code === 1` AND `code === 2`.       │
│  So -1 — the very sentinel the fix introduced — fell straight       │
│  through to `return { ok: true }`. lintInstrument was worse:        │
│  its tail HARDCODED `{ ok: true, exit: 0 }`.                        │
│                                                                     │
│  THE CLASS: a fix that changes a function's RETURN SHAPE must be    │
│  re-verified at every CALL SITE.                                    │
│                                                                     │
│  HOW IT WAS CAUGHT: the ship gate re-reads the WHOLE FILE, not the  │
│  diff. It found it in one round.                                    │
│                                                                     │
│  FIXED:  probeCapabilities -> {"ok":false,"refused":"T4_PROBE_FAILED","exit":127}
│          lintInstrument    -> {"ok":false,"refused":"T0_LINT_FAILED","exit":127}
└─────────────────────────────────────────────────────────────────────┘
```

### DETAIL BOX · B-13 (the honesty item)

```
┌─ THE CLAIM THAT WAS FALSE ──────────────────────────────────────────┐
│                                                                     │
│  WHAT I SHIPPED (5 documents):                                      │
│    "registration REFUSED — the server was NEVER EXECUTED."          │
│                                                                     │
│  WHAT MY OWN SOURCE SAYS:                                           │
│    kernel/tier4-lsp-capability-probe.py:110                         │
│      p = subprocess.Popen(cmd, stdin=PIPE, stdout=PIPE, …)          │
│                                                                     │
│  THE PROBE EXECUTES THE SERVER TO INTERROGATE IT. That is how a     │
│  capability probe works. The server runs ONCE.                      │
│                                                                     │
│  the claim        │ what I said                 │ what is true       │
│  ─────────────────┼─────────────────────────────┼───────────────────│
│  execution        │ "NEVER EXECUTED"            │ runs ONCE under    │
│                   │                             │ the probe's Popen  │
│  ─────────────────┼─────────────────────────────┼───────────────────│
│  the guarantee    │ "enforcement by absence"    │ enforcement by     │
│                   │                             │ WITHHELD REGISTRATION│
│                                                                     │
│  WHAT THE GATE ACTUALLY WITHHOLDS: the long-lived client session,   │
│  the editor wiring, the capability advertisement to a consumer.     │
│  A hostile server is not prevented from RUNNING; it is prevented    │
│  from being ADOPTED.                                                │
│                                                                     │
│  FOUND BY: the 4th ship-gate run, critical, bin/lsp-gate:52.        │
│  CORRECTED: the gate's message + EN-132 (append-only, superseding   │
│  the phrase rather than erasing it).                                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## THE NUMBERS

```
┌──────────────────────────────────────┬──────────────────────────────┐
│ THE METRIC                           │ THE VALUE (measured this turn)│
├──────────────────────────────────────┼──────────────────────────────┤
│ commits on the branch                │ 245                          │
│ worktree dirty                       │ 0                            │
│ HEAD                                 │ 2fb2f06                      │
│ the spec sha16                       │ 1f0339511782204f (matches)   │
│ the spec lines                       │ 320                          │
│ FR count                             │ 16                           │
│ SC count                             │ 0  ◄── the pin says 12       │
│ the battery                          │ PASS=16 FAIL=0 UNM=0 exit 0  │
│ T1 POS / NEG / UNREAD                │ exit 1 / 0 / 2  ✓            │
│ T4 LYING / HONEST                    │ exit 1 / 0  ✓                │
│ the ledger rows                      │ 893                          │
│   T4_LSP_CAPABILITY_LIE              │ 851                          │
│   T4_LSP_CAPABILITY_OK               │ 41                           │
│   LEDGER_SELFTEST                    │ 1                            │
│ the live servers gated               │ 3 / 3  (gi, plutus, jg)      │
│ kernel files / lines                 │ 8 / 779                      │
│ fixtures files                       │ 7                            │
│ gates files                          │ 6                            │
│ .githooks files                      │ 8                            │
│ canon docs                           │ 12                           │
│ reports                              │ 8                            │
│ checkpoints                          │ 3                            │
│ BUILD_REPORT                         │ 533 lines                    │
│ DEBUG_LOG                            │ 534 lines                    │
│ FAILURE_LOG                          │ 133 lines                    │
│ TESTING_LOG                          │ 201 lines                    │
│ THEATRICALITY_LOG                    │ 124 lines                    │
│ the judge                            │ ok:true, gguf, llama:200     │
│ the audit lane                       │ HTTP 200                     │
│ the ship gate (4th run)              │ FAIL (3 critical, 24 high)   │
└──────────────────────────────────────┴──────────────────────────────┘
```

---

## THE FILE MANIFEST

```
worktrees/jev-fact-kernel/
├── kernel/                    8 files · 779 lines   the probes
│   ├── tier0-instrument-lint.py      123   the instrument lint
│   ├── tier1-grounding.py             78   the number-grounding check
│   ├── tier4-lsp-capability-probe.py 200   the advertised-vs-answered probe
│   ├── tier4-probes.py               110   the six artifact probes
│   ├── router.py                      88   the judged claim router
│   ├── q3-control.py                  69   the Q3 derivation + control set
│   ├── audit-return.py                58   the worker-return audit
│   └── ledger.py                      44   the append-only triad ledger
├── bin/
│   ├── lsp-gate                       70   THE CARRIER — the registration gate
│   └── jm                                   the jm shim
├── fixtures/                  7 files           the POS/NEG control pairs
├── gates/                     6 files           the enrollment's gates
├── .githooks/                 8 files           the hooks + the chained spec gate
├── specs/                     2 files · 678 L   the DPL1 + the planning suite
├── context_management/       12 files           the canon
├── reports/                   8 files · this report is the 9th
├── Checkpoints/               3 sealed
└── {BUILD_REPORT,DEBUG_LOG,FAILURE_LOG,TESTING_LOG,THEATRICALITY_LOG}.md
```

---

## PENDING WORK MAP

| # | item | owner | done-criteria (mechanical) | blocker |
|---|---|---|---|---|
| 1 | propagate the B-13 correction to the 4 remaining docs | agent | `grep -rn 'NEVER EXECUTED' *.md` → 0 hits outside the debug log | none |
| 2 | close B-3 (`audit-return.py` HASH_RE) | agent | a hash-only return settles ACCEPTED/REFUSED, not UNMEASURED | none |
| 3 | close B-4 (`tier1-grounding.py` boundaries) | agent | `99` does NOT ground from `1999` | none |
| 4 | close B-5 (`router.py` try/except) | agent | a dead judge returns a fail-polarity value, not a traceback | none |
| 5 | close B-7 (`q3-control.py` exit polarity) | agent | a WARN-only path exits 0 | none |
| 6 | reach `GATE: PASS (0 critical/high)` | agent | a 5th `qwen-code-audit` run | the remaining ~24 high findings |
| 7 | **the enrollment's PR DoD** | **operator** | a real PR merges; the merge sha lands in the verdicts ledger | **`TARGET-NO-ORIGIN` — the repo does not exist; creating one is OUTWARD** |
| 8 | a live omp session spawning a gated LSP | agent | a ledger row written by omp's own client spawn | needs a session that opens a `.ts` file |

---

## ERROR LEDGER — open items

| # | symptom | suspected mechanism | tried | state |
|---|---|---|---|---|
| E-1 | the ship gate returns 3 critical / 24 high | an LLM reviewer generates findings by design; the count oscillates 59→55→53→55 | 4 runs; 8 defects fixed and re-proven | **OPEN** — ~24 high unfixed |
| E-2 | `TARGET-NO-ORIGIN` — the enrollment is unarmed | the worktree has no origin; the named repo does not exist (32 verified against a valid token) | local enrollment complete; the daemon carries both | **BLOCKED ON THE OPERATOR** |
| E-3 | the ABIDE gate fires p≈0.82–0.93 on my doc/probe writes | an advisory noul judge reading the diff; the edits LAND | noted, not routed around | **OPEN, ADVISORY** |
| E-4 | `battery.sh:17` writes fixed `/tmp/batt-*` paths | predictable temp names — a cross-run race and a symlink squat | not fixed | **OPEN** |
| E-5 | the doc-density gate TRUNCATED this report's first write | a chunked-write protocol requiring `<!-- DOC-COMPLETE -->` | rebuilt via the bash channel in chunks | **RESOLVED this turn** |

---

## SUCCESS-CLAIM AUDIT

| claim | evidence | verdict |
|---|---|---|
| "T0 is fail-closed on an unread path" | `exit=2`, no `clean` printed, measured this turn | **PROVEN** |
| "T0 bites on the broken fixture" | `exit=1`, `T0 BLOCK` | **PROVEN** |
| "T4 caught the 23-lie server" | `exit=1`, `T4 BLOCK: 23 advertised capabilities answered -32601` | **PROVEN** |
| "T4 passes the honest server" | `exit=0`, `every advertised capability answered` | **PROVEN** — with the auditor's caveat: *0 declared / 0 tested is pass-by-empty-scope; it proves the probe does not hallucinate lies, nothing more* |
| "the battery is green" | `PASS=16 FAIL=0 UNM=0`, exit 0 | **PROVEN** |
| "a lying LSP cannot REGISTER on this host" | 3/3 servers gated; the lying fixture BLOCKs at exit 1 through the installed command; `ps` → 0 | **PROVEN** |
| "the server is NEVER EXECUTED" | `Popen` at `tier4-lsp-capability-probe.py:110` | **FALSE — RETRACTED (B-13)** |
| "all three live servers work through the gate" | gi+plutus+jg are gated; only plutus was driven on the live wire | **STALE** — two are asserted, not driven |
| "the 12 SC are met" | `SC-` appears in 0 authority documents | **UNVERIFIABLE — the denominator does not exist** |
| "the enrollment's 8 contexts are armed" | journalctl `counts:{armed:1, dark:1, enrolled:2}` | **PARTIAL** — jarvis-upper ARMED; jev-fact-kernel NOT-ARMED |
| "the kernel is ship-ready" | the gate returns FAIL | **FALSE** |

**UNVERIFIED count: 4** (FR-11 TTSR; the gi/jg live drives; the enrollment PR DoD; the kill path under load).

---

## RISKS

1. **THE TREADMILL.** The gate's count does not converge downward (59→55→53→55). An LLM reviewer generates findings indefinitely. *The progress measure is the confirmed defects fixed — 8 this session, each re-proven — never the count.* Chasing zero will never terminate.
2. **THE PIN'S STALE DENOMINATOR.** "The 12 SC" does not exist. Any completion claim measured against it is unmeasurable. The operator may have meant the 12 canon docs, the per-FR acceptance blocks, or another spec.
3. **THE PROBE'S INHERENT EXECUTION.** `bin/lsp-gate:52` cannot be code-fixed — a capability probe must run its subject. The remedy is disclosure and a sandbox, neither of which is built.
4. **THE ENROLLMENT'S ARMED GAP.** The daemon carries `dark:1`. Arming needs a repo that exists — an outward action reserved to the operator.
5. **MY OWN INSTRUMENT DEFECT RATE.** Three in one session (a direct-called handler, a wrong config shape, a pipe-masked exit code), plus one shot-from-my-own-fix (B-9). The class is closed only by driving the real carrier, never by diligence.

---

## WHAT'S NEEDED FROM THE OPERATOR

1. **A RULING on the repo** — create `leviathan-devops/jev-fact-kernel` (outward), point the registry at an existing repo, or leave the enrollment locally complete.
2. **A RULING on the ship bar** — the gate cannot reach 0 while an LLM reviewer generates findings by design. Options: accept the triaged remainder, fix the ~24 highs (a long tail), or redefine the bar as "0 confirmed CRITICAL" (currently 1, and it is a documented design limit).
3. **A RULING on the probe's execution** — sandbox the probe's `Popen` (a container or bwrap), or accept and publish the limitation.

---

## THE HONEST GAPS

- **A real omp session spawning a gated LSP has never run.** The registry, command, args and root are live; omp's own client did not perform the spawn. The next session opening a `.ts` file exercises it; the ledger row is the receipt.
- **`gi-lsp` and `jg-lsp` were never driven** through the gate on the live wire.
- **The kill path under load** — concurrency, a mid-probe hang, the probe's own timeout — was never exercised live.
- **FR-11 (TTSR files, never blocks)** was not exercised this turn.
- **The gate's own findings were not independently re-verified.** I accepted the 4th run's 3 criticals as real after reading the sources; I did NOT re-run each as a probe. **The 24 highs are UNADJUDICATED.**
- **No 5th gate run was taken** after the last two fixes. The last measured verdict is FAIL (3 critical, 24 high); two of those three criticals are fixed and proven by probe, and the third is corrected by disclosure — **but the plate has not been re-weighed.**

---

**POSITION RESTATED IN ONE LINE:** the kernel's five tiers, battery, live carrier and ledger all reproduce green this turn, while the external ship gate still refuses the tree at 3 critical / 24 high — four of five gate-found defects closed and re-proven, one shown to be a false claim in my own documentation rather than a code bug.

**UNVERIFIED COUNT: 4.**

<!-- DOC-COMPLETE -->
