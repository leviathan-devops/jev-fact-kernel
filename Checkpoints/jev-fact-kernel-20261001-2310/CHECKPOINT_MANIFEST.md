# CHECKPOINT MANIFEST — jev-fact-kernel

**Token:** jev-fact-kernel-20261001-2310
**Branch:** feat/jev-fact-kernel
**HEAD:** d8192e9
**The kernel tree sha (kernel/ + fixtures/):** `d632d25e05dc4cede844986f38eada63`
**The spec sha256-16:** 1f0339511782204f

## THE BATTERY (this checkpoint)

| probe | the command | the measured result |
|---|---|---|
| T0 POS | `python3 kernel/tier0-instrument-lint.py fixtures/broken-probe.py` | 1 block, exit 1 |
| T0 NEG | `... fixtures/clean-probe.py` | clean, exit 0 |
| T0 UNREAD | `... /tmp/NOPE.py` | UNMEASURED, exit 2 |
| T4 dishonest | `... fixtures/lying-server bun server.ts` | BLOCK, exit 1, 23 lies, 61ms |
| T4 honest | `... fixtures/honest-server bun server.ts` | PASS, exit 0, 0 lies, 52ms |
| T4 probes | the 13 controls | 13/13 |
| the router | `python3 kernel/router.py` | cascade 8/8, PASS-1 8/8 |
| Q3 | `python3 kernel/q3-control.py` | gap +0.047 — BELOW the bar, NOT adopted |
| the ledger | `wc -l ~/.omp/run/fact-firewall.jsonl` | rows written per verdict |

## THE COMMITS AT THIS CHECKPOINT

d8192e9 feat(kernel): the five T4 probes — file/test/spec/hash/wire, each driven both ways — FR-5
dc35064 test(kernel): FR-6a — the Q3 rewrite FAILED the bar and is NOT adopted; the label defect fixed — FR-6a
86f8645 fix(kernel): T4's read bounded (no hang) + the fixture servers parse raw frames + the ledger wired — FR-13
d1f1708 feat(kernel): the router cascade — 8/8, three measured question rewrites — FR-4, FR-6a
adf7429 feat(kernel): the ledger writer + the fence SPEC.md — FR-13
2ad3a7a fix(kernel): T0 returns UNMEASURED on an unread path + the pattern set reduced by precision — FR-10
d90fc87 chore(workspace): seed the fact-kernel worktree — FR-13
852456f fix(N2): the JM hygiene — the 2 stale tests, the locale determinism, the self-verifying seal

## WHAT IS NOT BUILT (the honest gap)

- FR-8 (the wiring: LSP registration, tool_call, worker-return) — **BLOCKED on D1**
- FR-12 (the full battery as one runner)
- T1 (grounding) and T2's code path
- the jarvis-upper enrollment — **BLOCKED on the GitHub target**
