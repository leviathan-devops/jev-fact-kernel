# CHECKPOINT — jev-fact-kernel

**sealed:** 2026-10-01T23:44:42+04:00
**tree sha:** `6a108e1d48871ab44a7d3d8283c7e816`

## BATTERY
```
  PASS=16  FAIL=0  UNMEASURED=0
  ★ BATTERY GREEN
```

## THE PROOF TIERS
| tier | the command | the token | verdict |
|---|---|---|---|
| T1 POS | tier0-instrument-lint.py fixtures/broken-probe.py | `FACT-FIREWALL T0 BLOCK` + exit 1 | PASS |
| T1 NEG | ... fixtures/clean-probe.py | `FACT-FIREWALL T0: clean.` + exit 0 | PASS |
| T1 UNREAD | ... /tmp/NOPE.py | exit 2, no clean line | PASS |
| T2 LIVE | the lying server through the INSTALLED lsp.json command | `FACT-FIREWALL T4 BLOCK` + exit 1 | PASS |
| T2 PS | ps -eo pid,cmd \| grep -c '[s]erver.ts --stdio' | 0 | PASS |
| T3 | tail -1 ~/.omp/run/fact-firewall.jsonl | T4_LSP_CAPABILITY_LIE + capability + method + code | PASS |
| T4 | fixtures/lying-server vs fixtures/honest-server | BLOCK vs every-capability-answered | PASS |

## THE LIVE DELIVERABLE
`bin/lsp-gate` installed as the `command` of gi-lsp, plutus-lsp, jg-lsp in
`~/.omp/agent/lsp.json`. A lying server pointed at through a gated entry never execs,
so it never registers. Enforcement by absence.

## WHAT THIS CHECKPOINT DOES NOT COVER
See `context_management/RUNTIME_SEAT.md` §7: a real omp session spawning a gated LSP;
gi-lsp and jg-lsp individually driven; the kill path under load.
