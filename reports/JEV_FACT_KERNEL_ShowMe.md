# SHOW-ME · BLUEPRINT — THE JEV FACT KERNEL

Blueprint mode: the thing needs DESIGNED before anyone commits.
Ingredients loaded: ascii-diagrams · ascii-graph · ascii-visualize ·
ascii-simulator · trident-deep-planning.
Source: PLANNING_SUITE_JEV_FIVE_TIER_KERNEL.md (SPEC-AUDIT APPROVED 0/8).

---

## 1 · THE MASTER VIEW — the kernel in its runtime

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          THE OMP RUNTIME                                 │
│                                                                          │
│   ┌────────────┐   ┌────────────┐   ┌────────────┐   ┌────────────┐      │
│   │ LSP RUNTIME│   │ TOOL HOOK  │   │    TTSR    │   │  WORKER    │      │
│   │ (register) │   │ (call/rslt)│   │  (prose)   │   │  RETURN    │      │
│   └──────┬─────┘   └──────┬─────┘   └──────┬─────┘   └──────┬─────┘      │
│          │                │                │                │            │
└──────────┼────────────────┼────────────────┼────────────────┼────────────┘
           │                │                │                │
           ▼                ▼                ▼                ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                        THE FACT KERNEL                                   │
│                                                                          │
│   ┌──────────────────────────────────────────────────────────────────┐   │
│   │  T4  ADVERTISED-vs-DISK      deterministic probe, $0             │   │
│   │      CAP · FILE · TEST · SPEC · HASH · WIRE                      │   │
│   └──────────────────────────┬───────────────────────────────────────┘   │
│                              │ mismatch                                  │
│   ┌──────────────────────────▼───────────────────────────────────────┐   │
│   │  T0  INSTRUMENT LINT       the method's cost scales with output  │   │
│   │  T1  GROUNDING CHECK       the number is absent from tool output │   │
│   └──────────────────────────┬───────────────────────────────────────┘   │
│                              │ residue                                   │
│   ┌──────────────────────────▼───────────────────────────────────────┐   │
│   │  T2  COMPARATIVE JUDGE     Jev noul, claim vs METHOD, ~100ms     │   │
│   │      cut 0.683 DERIVED     gap +0.113 on the 8-case control set  │   │
│   └──────────────────────────┬───────────────────────────────────────┘   │
│                              │ probability                               │
│   ┌──────────────────────────▼───────────────────────────────────────┐   │
│   │  T3  POLICY + EVIDENCE     act → BLOCK · flag → DEMAND CONTROL   │   │
│   │      {Pattern, State, Evidence} — no triad, no block             │   │
│   └──────────────────────────┬───────────────────────────────────────┘   │
│                              │                                           │
└──────────────────────────────┼───────────────────────────────────────────┘
                               ▼
                   ┌───────────────────────────┐
                   │  ~/.omp/run/              │
                   │  fact-firewall.jsonl      │
                   │  append-only ledger       │
                   └───────────────────────────┘
```

## 2 · THE CORE MECHANISM — one sentence, one diagram

**THE MECHANISM:** take the CLAIMED SUBJECT, ask the DISK, let the MISMATCH be the finding.

```
     THE CLAIM                    THE PROBE                   THE FINDING
  ┌──────────────┐            ┌──────────────┐            ┌──────────────┐
  │ "I support   │            │ call every   │            │ -32601       │
  │  diagnostic  │───────────►│ declared     │───────────►│ MethodNot-   │
  │  Provider"   │            │ capability   │            │ Found        │
  │              │            │ method       │            │              │
  │  LSP init    │            │              │            │  THE LIE     │
  │  reply       │            │ the wire     │            │  named with  │
  │              │            │ answers      │            │  the code    │
  └──────────────┘            └──────────────┘            └──────────────┘
        │                            │                          │
        └──── the claim ─────────────┴──── the disk ────────────┘
                                                                    │
                                        the kernel never judges prose.
                                        it pairs a claim with a subject
                                        and MEASURES.
```

## 3 · THE T4 PROBE TREE (ascii-graph — the shape of the new code)

```
kernel/
├── tier0-instrument-lint.py          BUILT — both controls pass
├── tier4-lsp-capability-probe.py     BUILT — CAUGHT THE REAL LIE
├── ledger-schema.md                  the row contract
├── tier1-grounding.py                to build
├── tier2-comparative.py              to build (the Jev call)
├── tier4/
│   ├── cap.py                        the LSP capability probe (done)
│   ├── file.py                       stat the claimed artifact
│   ├── test.py                       run the suite, read exit + counts
│   ├── spec.py                       grep spec section vs implementation
│   ├── hash.py                       sha256sum vs the claimed hash
│   └── wire.py                       grep production consumers
└── fixtures/
    ├── control-set.json              8 cases — POS 2, NEG 6
    └── lying-server/                 declares 23, implements 0

extensions/fact-firewall/
├── index.js                    the tool hook + the LSP gate
└── index.ts.source

~/.omp/run/
└── fact-firewall.jsonl               the ledger, append-only
```

## 4 · MECHANISM PSEUDOCODE (ascii-visualize — control shape, no braces)

```
ON lsp registration:
    reply ← await initialize()
    FOR EACH capability IN reply.capabilities:
        IF capability NOT IN CAP_TO_METHOD:
            record UNPROBED(capability)        ← the hole, named not passed
            CONTINUE
        method, params ← CAP_TO_METHOD[capability]
        answer ← await call(method, params)
        IF answer.error.code == -32601:
            BLOCK "T4_LSP_CAPABILITY_LIE"
            REFUSE to register the server        ← no process starts
            ledger(Pattern, capability, method, -32601)
            RETURN
    register the server

ON tool_call:
    hits ← tier0.lint(arguments.command)         ← ARGUMENTS, never prose
    IF hits: BLOCK with the named remedy
    FOR EACH claimed_artifact IN arguments:
        IF NOT tier4.file(claimed_artifact): BLOCK "T4_PHANTOM_ARTIFACT"

ON tool_result:
    numbers ← extract(result)
    tier1.mark_grounded(numbers)                 ← record only

ON worker_return:
    FOR EACH claim IN return:
        probe ← select_probe(claim.kind)         ← CAP|FILE|TEST|SPEC|HASH|WIRE
        IF probe: mismatch AND NOT probe.passes: REFUSE the return

THE STOP CONDITION (measured, never "good enough"):
    a probe ships ONLY when it has one POSITIVE and one NEGATIVE control,
    AND the control run is 100% correct.
    A tier ships ONLY when its false-positive count on the live tree is ZERO.
```

## 5 · RUNTIME TRACE (ascii-simulator — exact names, args, keys)

```
U0  the harness boots with plutus-lsp in lsp.json
A1  the LSP runtime spawns: bun scripts/plutus-lsp.ts --stdio
GATE the registration path sends initialize and HOLDS the reply
A2  reply.capabilities = { textDocumentSync:..., diagnosticProvider:{...} }
GATE T4-CAP iterates: textDocumentSync -> not in CAP_TO_METHOD -> UNPROBED
GATE T4-CAP calls textDocument/diagnostic with {textDocument:{uri}}
A3  the server answers {"jsonrpc":"2.0","id":102,
                        "error":{"code":-32601,"message":"Method not found"}}
GATE -32601 -> BLOCK "T4_LSP_CAPABILITY_LIE"
GATE REFUSE registration; the process is killed; no server registers
GATE ledger row written
OBS  ps -eo pid,cmd | grep -c '[p]lutus-lsp.ts --stdio'  ->  0
```

## 6 · INTERFACES (exports, contracts, calibration constants — named)

| export | signature | contract |
|---|---|---|
| `lintInstrument(src)` | `(str) -> Hit[]` | a Hit carries pattern id, why, remedy, file:line |
| `probeCapability(root, cmd)` | `(str, str[]) -> CapResult` | returns `{declared, oks, lies, unprobed}`; never throws |
| `probeFile(path)` | `(str) -> Verdict` | `PRESENT` or `T4_PHANTOM_ARTIFACT` |
| `probeHash(path, claimed)` | `(str, str) -> Verdict` | compares `sha256sum` prefix-16 |
| `probeWire(symbol, corpus)` | `(str, str) -> Verdict` | zero production consumers = refuse |
| `judge(claim, method)` | `(str, str) -> float` | the Jev noul; fail-closed |
| `policy(p, act, flag)` | `(float, float, float) -> Route` | `BLOCK` / `DEMAND_CONTROL` / `pass` |
| `ledger(row)` | `(Row) -> void` | append-only; one row per decision |

**CALIBRATION CONSTANTS (derived, never picked):**

| constant | value | derivation |
|---|---|---|
| `T2_ACT` | `0.683` | midpoint of pos_min 0.740 / neg_max 0.627 |
| `T2_FLAG` | `0.550` | below the closest true negative, above every clear negative |
| `FAIL_POLARITY` | `closed` for BLOCK · `open` for WARN | an outage must not pass a claim, nor stop a build |

## 7 · FAILURE MODES PER COMPONENT

| component | failure mode | the mechanical consequence |
|---|---|---|
| `tier0` | fires on legitimate code | a POS+NEG control per pattern; a pattern with one control does not ship |
| `tier4.cap` | a capability absent from the map is assumed clean | recorded UNPROBED — never PASS (measured: `textDocumentSync`) |
| `tier4.file` | a symlink or a relative path escapes | canonicalize before stat; refuse an unresolved path |
| `tier2` | the control set goes stale | re-derive at every widening; the set ships WITH the kernel |
| `ledger` | a write fails mid-run | the decision still applies; the row is retried; a lost row never becomes a pass |
| the hook | blocks legitimate build work | tier 0 reads ARGUMENTS; a `{block:true}` names the remedy verbatim |
| TTSR | starts gating prose | TTSR FILES ONLY — a candidate enters the queue, nothing blocks |

## 8 · OPEN DECISIONS (with defaults)

| # | the fork | default |
|---|---|---|
| D1 | T4-CAP refuses registration, or warns? | **REFUSE** — a lying server never injects |
| D2 | T2's 0.056 margin: more negatives, or a narrower surface? | widen the control set |
| D3 | every tool call, or sample? | every call — T0/T1/T4 are $0 |
| D4 | block the turn or the artifact? | the ARTIFACT; report the turn |
| D5 | ledger at `~/.omp/run/` or per-project? | `~/.omp/run/` (cross-project) |

## 9 · THE RESIDUAL (named, not claimed clean)

1. UNPROBED DECLARATIONS — `textDocumentSync` is a hole, neither clean nor a lie.
2. AMBIGUOUS-BUT-VALID — `{"diagnostics":[]}` always passes the mechanical probe.
3. THE UNPROBEABLE CLASS — a plan, an opinion, a judgement. Not policed, by design.
4. T2's margin 0.056 — the weakest joint.
5. T4's spillover unmeasured at scale — owed.
6. Three duplicate `plutus-lsp` processes — observed, unexplained.
