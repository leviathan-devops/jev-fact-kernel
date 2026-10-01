# EVIDENCE_STATE — the fact kernel (FINAL)

**Branch** feat/jev-fact-kernel · **HEAD** (see the checkpoint) · **The spec** sha16 1f0339511782204f

## BUILT AND DRIVEN — every row a tool result

| artifact | lines | the driving command | the measured result |
|---|---|---|---|
| `kernel/tier0-instrument-lint.py` | 122 | `... fixtures/broken-probe.py` | `FACT-FIREWALL T0 BLOCK`, exit 1 |
| " | " | `... fixtures/clean-probe.py` | `clean.`, exit 0 |
| " | " | `... /tmp/NOPE.py` | `UNMEASURED`, exit 2 |
| " | " | `... ''` (empty) | `UNMEASURED`, exit 2 — the AUDIT's A1 fix |
| `kernel/tier1-grounding.py` | 78 | the 3 controls | GROUNDED / UNGROUNDED / UNMEASURED |
| `kernel/tier4-lsp-capability-probe.py` | 200 | `... fixtures/lying-server` | BLOCK, 23 lies, exit 1 |
| " | " | `... fixtures/honest-server` | PASS, 0 lies, exit 0 |
| `kernel/tier4-probes.py` | 110 | the 16 controls | 16/16 |
| `kernel/router.py` | 88 | `python3 kernel/router.py` | cascade 8/8 |
| `kernel/audit-return.py` | 58 | the 3 drives | ACCEPTED / REFUSED / UNMEASURED |
| `kernel/ledger.py` | 44 | `python3 kernel/ledger.py` | rows on disk |
| `kernel/battery.sh` | 90 | `bash kernel/battery.sh` | **PASS=16 FAIL=0 UNMEASURED=0** |
| `extensions/fact-firewall/` | 157 src | the harness, both ways | ST-401/402 at 7/7 |
| `fixtures/probe-controls.py` | 66 | `python3 fixtures/probe-controls.py` | 16/16 |

## THE LEDGER

`~/.omp/run/fact-firewall.jsonl` — rows carrying {Pattern, State:{tier,verdict,confidence},
Evidence}.

## THE TEN DEBUG ENTRIES (EN-115..125)

Every one found by RUNNING a control. EN-124 (the empty-path scope surprise) was found by the
INDEPENDENT AUDITOR — the author never drove `''`.

## THE AUDIT

**8 CONFIRMED · 0 REFUTED · 0 UNVERIFIABLE.** The adversarial sweep: 5/6 held, A1 broke and was
fixed.
