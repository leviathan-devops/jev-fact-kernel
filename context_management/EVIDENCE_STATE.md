# EVIDENCE_STATE — the fact kernel

**TREE SHA:** (see the checkpoint manifest)

## BUILT AND DRIVEN (every line carries its command + its exit code)

| artifact | lines | the driving command | the measured result |
|---|---|---|---|
| `kernel/tier0-instrument-lint.py` | 110 | `python3 kernel/tier0-instrument-lint.py fixtures/broken-probe.py` | `FACT-FIREWALL T0 BLOCK` ×1, `[EXIT=1]` |
| " | " | `... fixtures/clean-probe.py` | `clean. (1 file(s) inspected)`, `[EXIT=0]` |
| " | " | `... /tmp/NOPE.py` | `T0 UNMEASURED: 1 target(s) could not be read`, `[EXIT=2]` |
| " | " | `... kernel/` | `clean. (2 file(s) inspected)`, `[EXIT=0]` |
| `kernel/tier4-lsp-capability-probe.py` | 162 | `... . bun scripts/plutus-lsp.ts --stdio` (live) | `T4: []`, `[EXIT=2]` — UNMEASURED, no server in the worktree |
| `kernel/ledger.py` | 44 | `python3 kernel/ledger.py` | `append -> True`, 1 row on disk |
| `fixtures/broken-probe.py` | 13 | the POS control for T0 | bites: 1 block |
| `fixtures/clean-probe.py` | 21 | the NEG control for T0 | clean: 0 blocks |
| `fixtures/lying-server/server.ts` | 41 | declares 23 capabilities, implements 0 | proof PENDING |
| `fixtures/honest-server/server.ts` | 28 | declares 0, answers everything | proof PENDING |
| `SPEC.md` | 40 | the fence v2 format for jarvis-upper | written |
| `scripts-spec-gate.sh` + `.git-hooks/commit-msg` | 40 | the spec gate | REFUSE on no-FR, PASS on FR — driven both ways |

## THE COMMITS

```
adf7429  feat(kernel): the ledger writer + the fence SPEC.md — FR-13
2ad3a7a  fix(kernel): T0 returns UNMEASURED on an unread path + the pattern set reduced by precision — FR-10
d90fc87  chore(workspace): seed the fact-kernel worktree — FR-13
```

**Every commit passed `scripts-spec-gate.sh` through the `commit-msg` hook.**

## EN-115 — THE PRECISION REDUCTION (the pattern set was imagined, not measured)

Five T0 patterns; only ONE survived its own controls:

```
  T0_BYTE_READ_IN_TIMED_LOOP          POS=1 NEG=0 SELF=0   KEEP
  T0_GROWING_BUFFER_IN_TIMED_REGION   POS=1 NEG=1 SELF=1   DROP
  T0_BYTE_READ_ANY                    POS=1 NEG=0 SELF=1   DROP
  T0_PIPE_HEAD_IN_TIMED_PIPELINE      POS=0 NEG=0 SELF=1   DROP  (matched its OWN text)
  T0_SLEEP_IN_MEASUREMENT             POS=0 NEG=0 SELF=0   DROP
```

## WHAT IS NOT BUILT

- `kernel/tier4/{file,test,spec,hash,wire}.py` — designed (FR-5), not written.
- `kernel/tier2-comparative.py` + `kernel/router.py` — designed (FR-4/FR-6), not written.
- `extensions/fact-firewall/` — the LSP-registration gate, designed (FR-8), not written.
- The Q3 rewrite (FR-6a) — the question is measured at gap-below-threshold and WARN-only.
- T1 (grounding) — designed, not written.
