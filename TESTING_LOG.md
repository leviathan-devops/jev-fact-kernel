# TESTING_LOG — the Jev fact kernel

**The order is load-bearing: ADVERSARIAL FIRST, the happy path LAST.**

The corpus is the fixtures plus the live host. Every case below was RUN; the verdict is the tool
result, never a description of the tool result.

---

## PART 1 · THE ADVERSARIAL CASES (run first, before any happy path)

### The fixtures' adversarial pair (the kernel's core claim)

| # | the case | the command | the verdict |
|---|---|---|---|
| ADV-1 | a server declaring **23** capabilities and implementing **0** | `python3 kernel/tier4-lsp-capability-probe.py fixtures/lying-server bun server.ts` | **BLOCK**, `[EXIT=1]`, **23 LIE lines**, 169 ms |
| ADV-2 | a server declaring **0**, answering everything | `... fixtures/honest-server bun server.ts` | **PASS**, `[EXIT=0]`, 0 LIE lines, 60 ms |

**ADV-1 is the motivating case.** A real LSP server advertised `diagnosticProvider` and answered
`textDocument/diagnostic` with `-32601 MethodNotFound` while its authoring agent reported
"everything works, container tests pass".

### The independent auditor's adversarial sweep (A1..A6)

| # | the probe | the raw outcome | held/broke |
|---|---|---|---|
| A1 | an **EMPTY path** — `lint ''` | `FACT-FIREWALL T0 BLOCK ... at fixtures/broken-probe.py:8` `[EXIT=1]` — it scanned the CWD | **BROKE** — wrong scope. FIXED (see below) |
| A2 | a **missing dir** — `/no/such/dir` | `T0 UNMEASURED: 1 target(s) could not be read` `[EXIT=2]` | HELD |
| A3 | an **unreadable file** — `chmod 000` | `UNMEASURED ... (unreadable: [Errno 13] Permission denied)` `[EXIT=2]` | HELD |
| A4 | a server that answers `initialize` then **EXITS** | `FACT-FIREWALL T4: []` `[EXIT=2]`, **0.146 s** | HELD — no hang, the deadline honored |
| A5 | a dir with **no `server.ts`** | `FACT-FIREWALL T4: []` `[EXIT=2]` | HELD — UNMEASURED, never PASS |
| A6 | the kernel's probes **AGAINST THE KERNEL** | the only fire is the deliberate POS fixture; `lint kernel/` alone → `clean. (9 file(s) inspected)` `[EXIT=0]` | HELD |

**A1's fix, driven after:** an explicit empty path → `UNMEASURED` `[EXIT=2]` ("refusing to infer a
scope") · a real path → still `[EXIT=1]` · `kernel/` → still `[EXIT=0]`.

### The self-driven adversarial cases (this build)

| # | the case | the outcome |
|---|---|---|
| ADV-7 | a probe that would **HANG** (an unbounded `readline`) | measured at **600 s / 240 s / 600 s / 138 s** across four runs, then FIXED with `select()` + a deadline. After: 60–169 ms |
| ADV-8 | the fixture servers were **DEAF** (`readline()` strips the `\r\n\r\n` terminator) | the probe correctly returned `UNMEASURED` — the fail-closed law LOCATED the defect |
| ADV-9 | a **mislabeled control** (`always-empty` labelled POS when it is NEG) | the derivation printed "PASSES at +0.165"; reading the controls refuted it |

---

## PART 2 · THE HAPPY PATH, LAST

```
$ bash kernel/battery.sh
  PASS=16  FAIL=0  UNMEASURED=0
  ★ BATTERY GREEN
```

Every tier, every control, one command.

| the tier | the control | exit | the token |
|---|---|---|---|
| T0 POS | `fixtures/broken-probe.py` | 1 | `FACT-FIREWALL T0 BLOCK` |
| T0 NEG | `fixtures/clean-probe.py` | 0 | `clean. (1 file(s) inspected)` |
| T0 UNREAD | `/tmp/NOPE.py` | 2 | `T0 UNMEASURED ... is NOT a pass` |
| T0 SELF | `kernel/` | 0 | `clean. (9 file(s) inspected)` |
| T1a/b/c | the grounding controls | 0/1/2 | GROUNDED / UNGROUNDED / UNMEASURED |
| T4 ADV | lying / honest | 1/0 | `T4 BLOCK` x23 lies / `every advertised capability answered` |
| T5 | `fixtures/probe-controls.py` | 0 | `PROBE CONTROLS: 16/16` |
| THE BRAIN | `kernel/router.py` | 0 | `CASCADE ACCURACY: 8/8` |
| ST-403 | the return audit | 0/1/2 | ACCEPTED / REFUSED / UNMEASURED |
| T3 LEDGER | `wc -l ~/.omp/run/fact-firewall.jsonl` | — | rows carrying Pattern/State/Evidence |

---

## PART 3 · THE FOUR PROOF TIERS + T5

| tier | the artifact | the state |
|---|---|---|
| **T1 SCRIPT** | the battery's 16 rows, every one a tool result | **GREEN** |
| **T2 HOST/HARNESS** | the extension driven through a real `pi` (`@oh-my-pi/omptype/zod`): ST-401/402 at **7/7** | **PASS** |
| **T3 LEDGER** | `~/.omp/run/fact-firewall.jsonl` | **rows present** |
| **T4 ADVERSARIAL** | ADV-1 vs ADV-2, both tokens from tool output | **PASS** |
| **T5 INDEPENDENT AUDIT** | a read-only scout re-ran every claim | **8 CONFIRMED · 0 REFUTED · 0 UNVERIFIABLE** |

---

## PART 4 · THE TEST-ISOLATION AUDIT

| the question | the answer |
|---|---|
| does any test depend on `/tmp`? | **NO** — the control set lives in `fixtures/` (it was in `/tmp` twice, and bit twice — EN-120) |
| does any test depend on the cwd? | the lint's no-arg mode scans the cwd BY DESIGN; every control passes an explicit path |
| does any test depend on a network service? | the JUDGE (`:8090`) — Q3's derivation and the router's cascade call it. If the judge is down those two become UNMEASURABLE, never a pass |
| does any test write outside the repo? | `/tmp/jev-t4-*` (the probe's temp fixture, cleaned on every exit path) and the LEDGER (`~/.omp/run/`), which is the kernel's artifact |
| is any test order-dependent? | no — each drives its own subject |

## THE CARRIER ROUND — 2026-10-01, against the LIVE wire

The ADVERSARIAL LOOP's contract: every adversarial case, its verdict, and its tool output. This round
is the one that mattered — the previous rounds' controls sat on the wrong axis (they proved the
probe's LOGIC; the defect was in its BINDING), so this round drives the REGISTRATION CARRIER.

### ADV-01 · the lying server through the LIVE registration position (the headline case)

```
the live plutus-lsp entry temporarily pointed at fixtures/lying-server/server.ts,
then spawned through the INSTALLED command in /home/leviathan/.omp/agent/lsp.json:

  [EXIT=1]                                              expect 1
  BLOCK token in stdout: True
  FACT-FIREWALL T4 BLOCK: 23 advertised capabilities answered -32601 MethodNotFound.
                          The initialize reply is a FALSE CAPABILITY DECLARATION.
  ERR  FACT-FIREWALL T4: registration REFUSED — the server was NEVER EXECUTED.
```
**VERDICT: BLOCK — the PASS token present and the exit non-zero.** The refusal is by ABSENCE: no
process, no socket, no state, because the server was never exec'd.

### ADV-02 · THE PS TOKEN — count what did not start

```
ps -eo pid,cmd | grep -c '[s]erver.ts --stdio'
  before the spawn:  0
  after  the spawn:  0        expect 0
```
**VERDICT: PASS.** Enforcement by absence, measured by counting the processes that never existed.

### ADV-03 · the HONEST server through the same gate — the other polarity

```
fixtures/honest-server (declares 0) through the gate, from its own cwd:
  FACT-FIREWALL T4: every advertised capability answered.
  [EXIT=0]
```
**VERDICT: PASS-THROUGH.** The gate is not a blocker of servers; it is a blocker of LIES. A gate
never observed passing is as untrustworthy as one never observed biting.

### ADV-04 · THE LIVE WIRE — the REAL server, not a fixture path

```
the live plutus-lsp command+args and root read FROM the live registry, driven through the gate:
  [EXIT=0]
  IMPLEMENTED (1):  OK diagnosticProvider  textDocument/diagnostic  answered
  ★ LIES (0) — DECLARED BUT NOT IMPLEMENTED:
  FACT-FIREWALL T4: every advertised capability answered.
```
**VERDICT: PASS.** The premise of the whole section: *a probe that passes on fixtures and fails on
the live wire is the failure this round exists to catch.* The live server is honest and the gate
lets it through; the fixture server lies and the gate refuses it.

### ADV-05 · the ledger, both row shapes

```
T4_LSP_CAPABILITY_LIE   verdict=BLOCK  evidence_keys=[capability, code, method, pid, server, verdict_detail]
T4_LSP_CAPABILITY_OK    verdict=PASS   evidence_keys=[declared, implemented, pid, server]
```
**VERDICT: PASS — and the OK row is NOT VACUOUS.** It names its subject (`server: "honest-server"`,
`pid`, `declared: 0`, `implemented: 0`). A PASS that named nothing would be the vacuous-pass defect;
this one carries what passed.

### ADV-06 · the gate against ITSELF — the anchors

```
the exit codes, measured WITHOUT a pipeline mask:
  T1 POS    exit=1  ✓   T4 LYING  exit=1  ✓
  T1 NEG    exit=0  ✓   T4 HONEST exit=0  ✓
  T1 UNREAD exit=2  ✓
```
**VERDICT: 5/5.** The first measurement of this table read `[exit=0]` on the POS cases — because the
harness read `$?` after a pipe (EN-128). The gates were right; the INSTRUMENT was broken. Re-measured
with the status captured before formatting.

### THE CORPUS STATUS

The round's new failing class: **a gate bound to an event the runtime never emits** (EN-127).
It is a class, not an instance — `lsp_registration` was one name, and any synthesized name in any
extension is the same defect. The corpus is exhausted for THIS round when every gate in the kernel
has been re-checked for a real carrier. Two are confirmed real: `tool_call` and `tool_result` (bound
by live extensions elsewhere on the host and in this one). The LSP gate now binds to the COMMAND.

**THE HAPPY PATH, RUN LAST:** `bash kernel/battery.sh` → `PASS=16 FAIL=0 UNMEASURED=0 ★ BATTERY GREEN`.

---

## THE ANCHOR INDEX — where each case's claim is backed

- the acceptance criteria this round serves: `specs/DPL1_JEV_FACT_KERNEL.md:198`
- the probe whose carrier was replaced: `specs/DPL1_JEV_FACT_KERNEL.md:203`
- the tier that caught the motivating failure in 0.09 s: `context_management/EVIDENCE_STATE.md:14`
- the gate that demanded this log's floor: `.githooks/pre-commit:76`
- the CI gate carrying the checks: `.github/workflows/gates.yml:11`
- the seat record for the live wire: `context_management/RUNTIME_SEAT.md:1`

## WHAT THIS ROUND DID NOT DRIVE

Stated so a future reader does not mistake the table above for total coverage — the remainder, in
full, lives at `context_management/RUNTIME_SEAT.md:1` §7:

- **A real omp session spawning a gated LSP.** The gate was driven through the installed `lsp.json`
  command from a shell; omp's own LSP client did not perform the spawn. The next session that opens a
  `.ts` file exercises it, and the ledger row is the receipt.
- **`gi-lsp` and `jg-lsp` individually.** Both are gated and asserted in the registry; neither was
  driven through the gate on the live wire. Only `plutus-lsp` was.
- **The kill path under load.** Concurrency, a server hanging mid-probe, and the probe's own timeout
  were not exercised on the live wire.
