# EVIDENCE_STATE — the fact kernel

**TREE:** the kernel tree sha is in the checkpoint manifest.

## BUILT AND DRIVEN — every row carries its command and its measured result

| artifact | lines | the driving command | the result |
|---|---|---|---|
| `kernel/tier0-instrument-lint.py` | 110 | `... fixtures/broken-probe.py` | `FACT-FIREWALL T0 BLOCK`, `[EXIT=1]` |
| " | " | `... fixtures/clean-probe.py` | `clean. (1 file(s) inspected)`, `[EXIT=0]` |
| " | " | `... /tmp/NOPE.py` | `T0 UNMEASURED`, `[EXIT=2]` |
| `kernel/tier4-lsp-capability-probe.py` | 196 | `... fixtures/lying-server bun server.ts` | `T4 BLOCK`, 23 lies, `[EXIT=1]`, **61ms** |
| " | " | `... fixtures/honest-server bun server.ts` | `T4: every advertised capability answered`, `[EXIT=0]`, **52ms** |
| `kernel/tier4-probes.py` | 141 | the 13 controls (ST-201..205) | **13/13** |
| `kernel/router.py` | 96 | `python3 kernel/router.py` | cascade **8/8**, PASS-1 **8/8** |
| `kernel/q3-control.py` | 84 | `python3 kernel/q3-control.py` | gap **+0.047** — BELOW the +0.10 bar |
| `kernel/ledger.py` | 44 | `python3 kernel/ledger.py` | `append -> True`, rows on disk |
| `fixtures/lying-server/server.ts` | 41 | declares 23, implements 0 | BLOCK |
| `fixtures/honest-server/server.ts` | 28 | declares 0, answers everything | PASS |
| `SPEC.md` | 40 | the fence v2 format | written |
| `scripts-spec-gate.sh` + `.git-hooks/commit-msg` | 40 | driven both ways | REFUSE / PASS |

## THE LEDGER (T3's artifact)

`~/.omp/run/fact-firewall.jsonl` — **25 rows**: 23 `T4_LSP_CAPABILITY_LIE` + 1 `T4_LSP_CAPABILITY_OK`
+ 1 `LEDGER_SELFTEST`. Each row carries {Pattern, State:{tier,verdict,confidence}, Evidence}.

## THE SEVEN COMMITS (every one gate-passed)

```
d8192e9  feat(kernel): the five T4 probes — file/test/spec/hash/wire — FR-5
dc35064  test(kernel): FR-6a — the Q3 rewrite FAILED the bar and is NOT adopted — FR-6a
86f8645  fix(kernel): T4's read bounded (no hang) + the fixture servers parse raw frames — FR-13
d1f1708  feat(kernel): the router cascade — 8/8, three measured question rewrites — FR-4, FR-6a
adf7429  feat(kernel): the ledger writer + the fence SPEC.md — FR-13
2ad3a7a  fix(kernel): T0 returns UNMEASURED on an unread path + precision reduction — FR-10
d90fc87  chore(workspace): seed the fact-kernel worktree — FR-13
```

## THE FOUR DEBUG ENTRIES

- **EN-115** — the pattern set was imagined, not measured. 4 of 5 patterns dropped.
- **EN-116** — the cascade failed its first control (5/8). Fixed by rewriting the QUESTION ×3 → 8/8.
- **EN-117** — the probe HUNG (no bound on its read) and my fixtures were DEAF (readline strips
  the terminator). A fail-closed probe located the deaf fixtures; a fail-open one would not have.
- **EN-118** — the Q3 rewrite failed the bar, and a mislabeled control nearly published a false
  pass (+0.165). Corrected: +0.047, BELOW the bar, NOT adopted.
