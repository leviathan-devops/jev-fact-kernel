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
