# WORKSPACE SETUP REPORT — the Jev fact kernel

**Worktree:** /home/leviathan/JARVIS_WORKSPACE/worktrees/jev-fact-kernel
**Branch:** feat/jev-fact-kernel
**Spec:** specs/DPL1_JEV_FACT_KERNEL.md — sha256-16 1f0339511782204f (SPEC-AUDIT APPROVED 0/8)

## TRACKABILITY

| need | the mechanism |
|---|---|
| every commit audited vs the spec | `scripts-spec-gate.sh` — a commit touching kernel/ MUST name an FR/SC |
| it runs automatically | `.git-hooks/pre-commit` via `core.hooksPath` |
| the spec cannot drift silently | `.trident/spec-fingerprint.json` pins the spec sha256-16 |
| state survives compaction | `context_management/` — 12 canon docs seeded |
| decisions are recorded | `RUNNING_DEBUG_LOG.md` + the kernel ledger |

## THE BUILT ARTIFACTS CARRIED IN

| file | lines | state |
|---|---|---|
| kernel/tier0-instrument-lint.py | 73 | BUILT — **has the fail-open defect (step 1)** |
| kernel/tier4-lsp-capability-probe.py | 139 | BUILT — caught the real -32601 |

## THE FIRST THREE COMMITS

1. `chore(workspace): seed the fact-kernel worktree` — this setup
2. `fix(kernel): T0 returns UNMEASURED on an unread path — FR-10` — step 1
3. `test(kernel): the control-set fixtures — FR-13` — step 2
