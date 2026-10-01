# PLANNING_SUITE — THE JEV FIVE-TIER FACT-KERNEL

**Class:** ARCHITECTURAL (a new enforcement subsystem across four runtime surfaces)
**Author:** the session that committed the derailment this kernel exists to kill.
**Status:** design complete; awaiting the build pass.

## THE READ RECEIPT (the five source skills)

- **brainstorming**: READ — the law I carry is the HARD GATE (no implementation action until the
  intent is approved) and the spike/bounded/architectural classification.
- **blueprinting**: READ — the law I carry is MOVE 2 (the DIFFERENTIAL; the `does NOT` column IS
  the spec) and MOVE 5 (**never ask the agent to BE better — name the instrument that REPORTS the
  deficiency mechanically**).
- **focus**: READ — the law I carry is the ratio (measure >> write) and "read the artifact, never
  the status field".
- **fable-plan**: READ — the law I carry is the parallel evidence fan-out in ONE batch, and the
  decision gate (task-shaped+reversible → proceed; ambiguous → present and STOP).
- **trident-problem-solving**: READ — the law I carry is the hard bound: 3 failed fix-verify
  cycles, then hand back with the diagnosis.

---

## 0 · THE CLASSIFICATION

**ARCHITECTURAL.** A new enforcement subsystem spanning four runtime surfaces (LSP registration,
the tool hook, TTSR, the worker-return path) with a persistent ledger and five tiers of decision.
Not a spike (the mechanisms are already proven — see §4). Not bounded (it adds a kernel, not a
change to existing code).

**THE INTENT, RESTATED:** convert the four-tier fact-kernel into a **five-tier** kernel by adding
**T4 — the advertised-vs-disk reconcile**, and wire it so that a false capability declaration
cannot reach the runtime. The operator's words: *"all filthy lies mechanically impossible forever."*

**THE HONEST SCOPE OF THAT PHRASE.** "Mechanically impossible" is achievable for every claim whose
subject is CHECKABLE, because T4 does not read prose — it takes a *claimed subject* and asks the
disk. It is NOT achievable for claims whose subject cannot be probed (a plan, a design opinion, a
judgement). §10 names that residual rather than claiming totality — claiming totality is the very
failure class this kernel exists to kill.

---

## 1 · THE DIFFERENTIAL (what exists, and what each thing does NOT do)

| adjacent thing | what it DOES | what it does NOT do (→ the spec of the new thing) |
|---|---|---|
| `push-gate` (`src/verbs/push-gate.ts`) | six mechanical items at COMMIT time: spec present, built, tested, not-theatrical, docs current, zero drift | does NOT run at RUNTIME; does NOT probe a live server's declarations; does NOT see the agent's prose claims as they are made |
| the `ABIDE` gates (measured: fired 6× on this session's doc writes) | judges prose for claim-without-evidence | **misfires on prose it cannot see the evidence for** — a false positive on a test fixture, on a plan, on quoted text |
| the `omp-ct` CT-claim lexicon (in the logs: `[CT CLAIM] FABRICATED`) | flags a claim with no ring evidence | lexicon-only; no judge; no disk probe; no per-surface enforcement |
| the `graph-intelligence` GI bash lockdown | blocks a read-verb carrying a write payload | one narrow class; no capability check; no ledger |
| an LSP client (`lsp.json` + the omp LSP runtime) | spawns the server, sends `initialize`, consumes diagnostics | **TRUSTS the capability reply** — never calls the declared methods to verify them |
| `spec-audit` (the tool) | 8 mechanical gates on a SPEC DOCUMENT | does not run at runtime; does not read the disk |
| a unit test suite | proves the paths the tests exercise | is authored by the same agent as the code — **the author is never the auditor** |

**THE EMPTY CELL, AND THEREFORE THE SPEC:** nothing compares a RUNTIME CAPABILITY DECLARATION
against the RUNTIME IMPLEMENTATION. `plutus-lsp` replies `diagnosticProvider: {...}` and answers
`textDocument/diagnostic` with `-32601 MethodNotFound` — measured, 0.09 s, this session. No
existing component would ever have asked.

---

## 2 · THE REDUCED CORE (ONE mechanism)

**ONE mechanism: take the CLAIMED SUBJECT, ask the DISK, and let the MISMATCH be the finding.**

That is the whole kernel. Every tier is one instantiation of it against a different claimed subject:

| tier | the claimed subject | the disk question | cost |
|---|---|---|---|
| T0 | a measurement's METHOD | does its cost scale with the OUTPUT? | $0, lint |
| T1 | a NUMBER in a claim | does it appear in a tool result? | $0, substring |
| T2 | a claim + its METHOD | does the method time the instrument? | Jev, ~100 ms |
| T3 | the policy | act / flag / pass + the evidence triad | $0, code |
| **T4** | **a CAPABILITY, FILE, TEST, HASH, or WIRING** | **does the disk agree?** | **$0, deterministic probe** |

**THE DERIVED LAWS (three lines):**
1. A claim is never false in isolation — it is false in RELATION to what produced it.
2. Therefore the kernel never judges prose; it pairs a claim with its subject and measures.
3. A tier whose fire condition cannot be bounded does not ship — it is dropped (T2's second
   question measured gap −0.023 and was DROPPED, not averaged in).

---

## 3 · THE DESIGN

### 3.1 THE FIVE TIERS

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ T0 · INSTRUMENT LINT        MECHANICAL · $0 · fires BEFORE the number exists  │
│   measurement code whose cost scales with its OUTPUT                          │
│   BUILT AND TESTED: kernel/tier0-instrument-lint.py                            │
│   POS CONTROL: 3 hits on the broken probe · NEG CONTROLS: 0 hits across       │
│   10,464 first-party files (all 64 raw hits are vendored site-packages)       │
├──────────────────────────────────────────────────────────────────────────────┤
│ T1 · GROUNDING CHECK        MECHANICAL · $0                                   │
│   a NUMBER in a claim absent from every tool result in the trace              │
│   HONEST: does NOT catch the luxalgo class (the number WAS in an output)      │
├──────────────────────────────────────────────────────────────────────────────┤
│ T2 · COMPARATIVE JUDGE      JEV · ~100 ms · LOCAL · $0                        │
│   claim vs METHOD, one sharp noul                                             │
│   MEASURED: pos_min 0.740 · neg_max 0.627 · gap +0.113 · act 0.683 DERIVED   │
├──────────────────────────────────────────────────────────────────────────────┤
│ T3 · POLICY + EVIDENCE TRIAD  CODE · $0                                       │
│   act → BLOCK · flag → DEMAND THE CONTROL · else pass                         │
│   every decision writes {Pattern, State, Evidence: span+turn+tool+id}         │
│   no triad, no block                                                          │
├──────────────────────────────────────────────────────────────────────────────┤
│ T4 · ADVERTISED-vs-DISK     MECHANICAL · $0 · ★ THE NEW TIER                  │
│   the claim names a SUBJECT; the kernel probes the SUBJECT; the mismatch IS   │
│   the finding. Never reads prose.                                             │
│   BUILT: kernel/tier4-lsp-capability-probe.py — CAUGHT THE REAL LIE           │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 T4'S SIX PROBES (the claim-vs-disk classes)

| id | claim class | the probe | the finding |
|---|---|---|---|
| **T4-CAP** | "I support X" | parse `initialize` → for each declared capability, call its spec method → `-32601`? | `T4_LSP_CAPABILITY_LIE` |
| **T4-FILE** | "the file exists / I created X" | `stat` the path | `T4_PHANTOM_ARTIFACT` |
| **T4-TEST** | "the tests pass" | run the suite; read exit + counts | `T4_TEST_RESULT_MISMATCH` |
| **T4-SPEC** | "exactly as the spec says" | grep the spec section; grep the implementation | `T4_SPEC_SECTION_UNIMPLEMENTED` |
| **T4-HASH** | "it is deployed" | `sha256sum` the deployed thing vs the claimed hash | `T4_ARTIFACT_HASH_MISMATCH` |
| **T4-WIRE** | "it is wired" | `grep -rn '<symbol>' <corpus>` production consumers | `T4_ZERO_CONSUMERS` |

**Every probe is a deterministic command.** The judge only enters when a probe returns AMBIGUOUS
(an empty-but-valid result — e.g. a `diagnosticProvider` that answers `{"diagnostics":[]}` always).

### 3.3 T4-CAP — THE LSP PROBE, PROVEN THIS SESSION

```
$ python3 kernel/tier4-lsp-capability-probe.py <root> bun scripts/plutus-lsp.ts --stdio

  ADVERTISED CAPABILITIES: 2
    · textDocumentSync
    · diagnosticProvider
  ★ LIES (1) — DECLARED BUT NOT IMPLEMENTED:
    LIE  diagnosticProvider    textDocument/diagnostic    -32601 MethodNotFound
FACT-FIREWALL T4 BLOCK: the initialize reply is a FALSE CAPABILITY DECLARATION.
```

**0.09 s.** The agent building it reported *"everything works, container tests pass, exactly as the
spec says."* The wire says otherwise, and the wire is checkable.

**THE PROBE'S OWN GAP, NAMED:** `textDocumentSync` was declared and is not in the capability→method
map — recorded as an UNPROBED declaration, not assumed clean. See §10.

### 3.4 THE ENFORCEMENT WIRING (six surfaces, one kernel)

| surface | runs | polarity |
|---|---|---|
| **LSP registration** | T4-CAP on the `initialize` reply, BEFORE the server is trusted | **REFUSE to register** — the lie never injects a diagnostic |
| **tool hook** `tool_call` | T0 on the arguments, T4-FILE/T4-HASH on claimed artifacts | `{block:true, reason}` before execution |
| **tool hook** `tool_result` | T1 on the result; the ledger row | record only |
| **TTSR** `text`,`thinking` | the claim-SHAPE detector — files a CANDIDATE | **never blocks** |
| **edit surface (LSP)** | T4 reports as diagnostics | **REPORTS, never blocks** (the polarity law) |
| **worker-return path** | T4 on the worker's completion claim | the return is REFUSED until the disk agrees |
| **ship gate** | T4 on every claim in the report | `push-gate` REFUSES |

**THE POLARITY LAW, STATED ONCE:** the LSP REPORTS; the HOOK REFUSES. The editor never blocks a
write; the kernel never gates prose directly.

### 3.5 THE LEDGER

`~/.omp/run/fact-firewall.jsonl`, one row per decision, append-only:

```json
{"ts":"…","Pattern":"T4_LSP_CAPABILITY_LIE","State":{"tier":4,"verdict":"BLOCK","confidence":1.0},
 "Evidence":{"capability":"diagnosticProvider","method":"textDocument/diagnostic",
             "code":-32601,"server":"plutus-lsp","pid":711671}}
```

---

## 4 · THE EVIDENCE (cited)

| finding | the citation |
|---|---|
| the LSP lie is real and mechanical | `kernel/tier4-lsp-capability-probe.py` run → `-32601`, 0.09 s |
| T0 catches the luxalgo class | `kernel/tier0-instrument-lint.py` on the broken probe → 3 hits; on 10,464 first-party files → 0 hits (`vendor/…/site-packages` excluded) |
| T2 separates, and by how much | 8-case control set: pos_min 0.740 / neg_max 0.627 → cut 0.683 |
| the naive span design FAILS | 4 dimensions measured on 3 false claims vs 6 real-work spans: gaps −0.11, +0.01, −0.51, −0.05 |
| `plutus-lsp` is registered and running | `~/.omp/agent/lsp.json` → `plutus-lsp`; `ps` shows 3 live `scripts/plutus-lsp.ts --stdio` processes |
| the existing gates misfire | the ABIDE gate fired 6× on this session's doc writes, each a false positive |
| the push-gate's zero-drift item was dead | `bundle=bb9b6d2e` vs `stated=b1822142` — two different hash scopes; fixed, verified both directions |

---

## 5 · THE APPROACHES

**A · T4 AS A STANDALONE PROBE SUITE (chosen).** A set of deterministic probe scripts + a ledger,
wired to the six surfaces. Each probe is independently runnable, independently provable, and
independently shippable. **Trade-off:** more wiring surfaces to maintain.

**B · T4 FOLDED INTO THE PUSH-GATE.** Add the probes as push-gate items. **Rejected:** the
push-gate runs at COMMIT time; the LSP lie must be caught at REGISTRATION, or the server injects
diagnostics all session. A commit-time gate is structurally too late.

**C · T4 AS AN MCP SERVER.** **Rejected:** an MCP server is itself a spawned process with its own
capability declaration — the kernel would need to police itself, and a lying MCP would be
indistinguishable from a working one.

**THE CHOSEN APPROACH IS A.** Rationale: MOVE 5 — name the instrument that REPORTS the deficiency.
Each T4 probe is such an instrument, runnable standalone, and the ledger makes every decision
auditable after the fact.

---

## 6 · SUCCESS CRITERIA (mechanical, command-checkable)

SC1 — the capability probe proves the lie, then proves the fix. The criterion names a RUNNING
process: the LSP server must be refused at registration so its process never starts.

    python3 kernel/tier4-lsp-capability-probe.py <plutus-lsp> bun scripts/plutus-lsp.ts --stdio
    BEFORE the fix: exit 1, "LIE diagnosticProvider … -32601"
    AFTER  the fix: exit 0, "every advertised capability answered"

SC2 — the instrument lint stays clean on first-party code (a passing library is not enough; the
RUN must exit 0 on the live tree).

    python3 kernel/tier0-instrument-lint.py src/ tests/ ; test $? -eq 0

SC3 — the instrument lint still bites, so a clean run means something.

    python3 kernel/tier0-instrument-lint.py /tmp/broken-probe.py ; test $? -eq 1

SC4 — the ledger records every decision, one row per tool call. This criterion reads a TICK count:
a kernel that runs on a sample writes fewer rows than there were calls.

    wc -l ~/.omp/run/fact-firewall.jsonl

SC5 — the judge separates at the derived cut, 8/8 on the control set that ships WITH the kernel.
A run below 8/8 fails, so the threshold can never drift silently.

SC6 — no LSP server REGISTERS with an unhonoured capability. The count is a MONITOR: any new row
is a new lie, and the criterion fails the moment one appears.

    grep -c 'T4_LSP_CAPABILITY_LIE' ~/.omp/run/fact-firewall.jsonl

SC7 — all six enforcement surfaces have a registered probe.

    grep -cE 'T4-(CAP|FILE|TEST|SPEC|HASH|WIRE)' kernel/ledger-schema.md

SC8 — THE RUNNING PROCESS. This criterion reads the PROCESS TABLE, not a file. A kernel that
exists on disk but never runs — a library — satisfies every other criterion and fails this one.

    ps -eo pid,cmd | grep -c '[p]lutus-lsp.ts --stdio'
    BEFORE: 3   (the lying server is running — measured this session)
    AFTER : 0   (refused at registration; no process exists to lie)

SC9 — THE LIVE SOCKET. The served surface must answer, proving the kernel's own calls route
through a listener rather than a stub.

    curl -s -X POST http://127.0.0.1:8090/v1/systemone -H 'Content-Type: application/json' \
      -d '{"state":{"claim":"diagnosticProvider is implemented"},"questions":{"q":{"type":"noul","instructions":"is this backed by a passing T4-CAP probe?"}}}'

SC10 — THE DAEMON is UP for the duration of a session: the kernel process must appear in the
process table and its heartbeat tick must advance. A daemon that started and silently exited
passes SC1-SC9 on the bench and fails here.

    ps -eo pid,cmd | grep -c '[f]act-firewall'
    wc -l < ~/.omp/run/fact-firewall.jsonl   # the tick must GROW between two reads

SC11 — the port the kernel listens on must ACCEPT and ANSWER. A listener that accepts a
connection and returns nothing is a dead listener.

    ss -lntp 2>/dev/null | grep -c '127.0.0.1:81'

SC12 — the loop terminates: the kernel must not spin. Two consecutive ledger reads five seconds
apart must show a bounded delta, not an unbounded one.

**THE PROCESS-ARTIFACT RULE (why SC8/SC10/SC11 exist):** every file-level criterion can be
satisfied by a LIBRARY — code on disk that nothing invokes. SC8 reads the process table, SC10
reads a heartbeat that must advance, SC11 reads a live port. A kernel that exists but never fires
satisfies SC1-SC7 and fails SC8 — **which is exactly the shape-without-reachability defect this
kernel exists to kill, turned on the kernel itself.**

## 7 · THE EXECUTION PLAN

| # | step | the gate |
|---|---|---|
| 1 | ship `tier4-lsp-capability-probe.py` as the CAP probe | SC1 exit 1 on the real server |
| 2 | add T4-FILE, T4-TEST, T4-HASH, T4-WIRE probes (same shape: claim → disk → mismatch) | each has a POS and a NEG control |
| 3 | add T4-SPEC (the spec-section grep) | POS: a spec section with no implementation · NEG: an implemented one |
| 4 | write the ledger schema + the writer | SC4 |
| 5 | wire T4-CAP into the LSP registration path | a lying server is REFUSED at registration |
| 6 | wire T4-FILE/T4-HASH into the `tool_call` hook | a phantom artifact blocks the call |
| 7 | wire T4 into the worker-return path | a false completion claim is refused |
| 8 | the T2 control set ships as a fixture | SC5 |
| 9 | re-derive T2's thresholds on the widened set | the cut is recomputed, never carried |
| 10 | the full battery + the ledger review | every gate green |

**The first three steps are independently shippable.** A partial kernel that catches the LSP class
is strictly better than none, and it is honest about what it does not yet catch.

---

## 8 · THE ANTI-PATTERNS (this design's own failure classes + their detection)

| anti-pattern | how it would appear here | the detection |
|---|---|---|
| **THE UNVALIDATED INSTRUMENT** | the kernel's own probes are wrong and report lies that are not there | every probe ships a POSITIVE and a NEGATIVE control; a probe with one control does not ship (T0's gap this session: I published a probe error) |
| **THE UNBOUNDED FIRE** | T4 blocks legitimate work | each probe's fire condition is a deterministic mismatch; a probe whose negatives are not enumerated does not ship |
| **THE PROMISE OF TOTALITY** | "all lies mechanically impossible forever" read literally | §10 names the unprotected classes; a plan claiming totality is refused |
| **THE PROSE GATE** | the kernel starts judging the agent's sentences | the TTSR surface FILES ONLY; the hook inspects ARGUMENTS; the judge sees only claim+method pairs |
| **THE SELF-POLICING KERNEL** | the kernel's own claims go unchecked | the kernel's probes are run against the kernel (SC2/SC3) |
| **THE AUTHOR-AS-AUDITOR** | the agent that built the LSP writes the probe that judges it | the probe is EXTERNAL (this session's probe caught a server its author had declared working) |
| **THE STALE CONTROL SET** | thresholds carried from a prior corpus | T2 re-derives on every widened set (step 9) |
| **THE SILENT GAP** | an unprobed declaration assumed clean | `textDocumentSync` is recorded as UNPROBED, not passed |

**ADVERSARIAL FIRST.** Before this kernel is trusted: feed it a server that declares EVERY capability
and implements NONE (SC1's shape, 23 capabilities), and a server that declares nothing and implements
everything (the negative). A kernel that catches the first and passes the second is discriminating.

---

## 9 · OPEN DECISIONS

| # | the fork | the default if unruled | the operator's ruling |
|---|---|---|---|
| D1 | Does T4-CAP REFUSE registration, or WARN and register? | **REFUSE** — a lying server never injects | *pending* |
| D2 | Is the T2 margin (0.056) widened by more negatives, or by a narrower fire surface behind T1? | widen the control set (a narrow surface can hide a class) | *pending* |
| D3 | Does the kernel run on EVERY tool call, or sample? | every call — T0/T1/T4 are $0 and deterministic | *pending* |
| D4 | Does a T4 fire block the TURN or the ARTIFACT? | block the ARTIFACT; report the turn (the polarity law) | *pending* |
| D5 | Where does the ledger live — `~/.omp/run/` or the project? | `~/.omp/run/fact-firewall.jsonl` (cross-project) | *pending* |

---

## 10 · THE RESIDUAL (named, not claimed clean)

1. **UNPROBED DECLARATIONS.** `textDocumentSync` is declared by `plutus-lsp` and is not in the
   capability→method map. It is UNPROBED — neither clean nor a lie. Every capability absent from
   the map is a hole until mapped.
2. **AMBIGUOUS-BUT-VALID RESULTS.** A `diagnosticProvider` answering `{"diagnostics":[]}` for every
   input passes the mechanical probe. Catching THAT requires a judged question ("does this response
   discriminate?") and a control set — not yet built.
3. **THE UNPROBEABLE CLASS.** A design opinion, a plan, a judgement: T4 cannot ask the disk. **These
   are not policed and the design says so.** Claiming otherwise is the failure class.
4. **T2'S THIN MARGIN.** The closest true negative is 0.627 against a cut of 0.683 — 0.056. On a
   wider corpus this may close; it is re-derived at step 9, and until then T2 is the weakest joint.
5. **THE KERNEL'S OWN SPILLOVER IS UNMEASURED AT SCALE.** T0 measured 0 hits across 10,464
   first-party files. T4's six probes have NOT been measured across a large corpus — only against
   their individual controls. **That measurement is owed.**
6. **THE THREE DUPLICATE `plutus-lsp` PROCESSES** are observed and unexplained. A spawn-source
   question, not a kernel question, but it is open.

---

## 11 · THE HANDOFF

**The next artifact:** a DPL1 build spec per T4 probe plus the wiring — one spec per surface (LSP
registration, the tool hook, the worker-return path, the ship gate).

**The owner skill:** **trident-deep-planning** (the DPL1 per probe) → then **build-package** to mint
the dispatchable package.

**Terminal state:** create-planning hands off to the planning/build path. **It never implements.**
The build pass owns steps 1-10 of §7.
