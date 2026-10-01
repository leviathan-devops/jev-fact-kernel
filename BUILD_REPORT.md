# BUILD_REPORT — the Jev fact kernel

## BUILD SUMMARY

The five-tier fact kernel: a false claim becomes mechanically detectable and blockable at the
moment it is made, and a lying LSP server cannot register.

**Branch** feat/jev-fact-kernel · **Spec** specs/DPL1_JEV_FACT_KERNEL.md (sha16 1f0339511782204f,
SPEC-AUDIT APPROVED 0/8) · **Battery** PASS=10 FAIL=0 UNMEASURED=0 · **Commits** 10, every one
FR-cited and gate-passed.

## WHAT WAS BUILT

| artifact | lines | state |
|---|---|---|
| `kernel/tier0-instrument-lint.py` | 110 | the instrument lint — byte-read class, exit 2 on unread |
| `kernel/tier4-lsp-capability-probe.py` | 196 | the capability probe — bounded reads, raw labels |
| `kernel/tier4-probes.py` | 141 | FILE · TEST · SPEC · HASH · WIRE |
| `kernel/router.py` | 96 | the two-pass cascade — 8/8 |
| `kernel/q3-control.py` | 84 | the ambiguity question — measured, WARN-only |
| `kernel/ledger.py` | 44 | the append-only ledger with fsync |
| `kernel/battery.sh` | ~70 | every proof tier in one command |
| `extensions/fact-firewall/` | 113 src / 4.2 KB bundle | the LSP-registration gate + the fact-check tool |
| `fixtures/` | 4 dirs + 3 controls | the control set, IN THE REPO |
| `scripts-spec-gate.sh` + `.git-hooks/commit-msg` | 40 | the spec gate |

## THE PROOF TIERS

```
T1 SCRIPT      T0's four controls: POS exit 1 · NEG exit 0 · UNREAD exit 2 · SELF exit 0
T3 LEDGER      ~/.omp/run/fact-firewall.jsonl — rows carrying Pattern/State/Evidence
T4 ADVERSARIAL lying (declares 23) -> BLOCK exit 1, token FACT-FIREWALL T4 BLOCK, LIES x23
               honest (declares 0)  -> PASS  exit 0, 0 lies
T5 PROBES      16/16 controls
THE BRAIN      the cascade 8/8, PASS-1 8/8
```

## KNOWN ISSUES

- Q3 is BELOW the +0.10 block bar (+0.047) and is WARN-only. Not adopted.
- T0 covers the byte-read class and nothing else; four pattern classes were DROPPED for non-zero
  false-positive rates and are recorded as UNCOVERED.
- FR-8's `tool_call` half is not wired.

## DEPLOYMENT NOTES

The judge is a host service at :8090. The extension goes to
`~/.omp/agent/extensions/fact-firewall/` and needs a harness restart. The ledger lives at
`~/.omp/run/fact-firewall.jsonl`.
