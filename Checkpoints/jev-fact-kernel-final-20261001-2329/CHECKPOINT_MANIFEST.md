# CHECKPOINT MANIFEST — jev-fact-kernel (FINAL)

**Token:** jev-fact-kernel-final-20261001-2329
**Branch:** feat/jev-fact-kernel · **HEAD:** 3f4e3ec
**The kernel tree sha (kernel+fixtures+extensions, sha256-16):** `6efd82667653793e4ee877bf3bfaa4d1`
**The spec sha256-16:** `1f0339511782204f`

## THE BATTERY AT THIS CHECKPOINT

```
═══════════════════════════════════════════════
  PASS=16  FAIL=0  UNMEASURED=0
  ★ BATTERY GREEN
```

## THE INDEPENDENT AUDIT — 8 CONFIRMED · 0 REFUTED · 0 UNVERIFIABLE

| id | the claim | the verdict |
|---|---|---|
| C1 | T0 returns UNMEASURED (exit 2) on an unread path | CONFIRMED |
| C2 | T4 blocks a server declaring 23, implementing 0 | CONFIRMED |
| C3 | T4 passes an honest server that declares 0 | CONFIRMED |
| C4 | the probes carry 16 controls, all passing | CONFIRMED |
| C5 | the router cascade scores 8/8 | CONFIRMED |
| C6 | the ledger records every verdict | CONFIRMED |
| C7 | the spec gate REFUSES an un-FR'd kernel commit | CONFIRMED (closed by a staging verifier) |
| C8 | Q3 is below the block bar and not adopted | CONFIRMED |

**Adversarial sweep: 5/6 held.** A1 BROKE — an EMPTY path scanned the cwd instead of returning
UNMEASURED — and was FIXED. A2-A6 held (no hangs).

## THE COMMITS

```
3f4e3ec docs(audit): C7 CLOSED — the independent audit reaches 8/8 CONFIRMED — FR-13
a924d3d docs(debug-log): the nine EN entries assembled VERBATIM — FR-13
74946f1 docs(ship): the ship docs expanded from the EN entries — FR-13
57801ab fix(kernel): A1 — the empty-path scope surprise, found by the INDEPENDENT AUDIT — FR-10
ee9fbda feat(kernel): T1 — the grounding check, with its boundary proven — FR-7
2ab67d4 feat(kernel): the worker-return audit — W4 complete, ST-401/402/403 — FR-8
06c6b22 feat(kernel): the tool_call guard + the block is a THROW — ST-401/402 at 7/7 — FR-8
a444fb9 docs(canon+ship): the canon at wave 5 and the five ship docs SEEDED — FR-13
569d818 test(kernel): the battery + the control set moves into fixtures/ — BATTERY GREEN — FR-12, FR-13
279ca88 feat(kernel): the LSP-registration gate + a crash is not a finding — ST-401 PASSES — FR-8
ac4d248 docs(checkpoint): the jev-fact-kernel checkpoint + the canon at wave 3 — FR-13
d8192e9 feat(kernel): the five T4 probes — file/test/spec/hash/wire, each driven both ways — FR-5
dc35064 test(kernel): FR-6a — the Q3 rewrite FAILED the bar and is NOT adopted; the label defect fixed — FR-6a
86f8645 fix(kernel): T4's read bounded (no hang) + the fixture servers parse raw frames + the ledger wired — FR-13
d1f1708 feat(kernel): the router cascade — 8/8, three measured question rewrites — FR-4, FR-6a
adf7429 feat(kernel): the ledger writer + the fence SPEC.md — FR-13
2ad3a7a fix(kernel): T0 returns UNMEASURED on an unread path + the pattern set reduced by precision — FR-10
d90fc87 chore(workspace): seed the fact-kernel worktree — FR-13
852456f fix(N2): the JM hygiene — the 2 stale tests, the locale determinism, the self-verifying seal
d573fa8 feat(jev): the native OMP tool + WARHEADS 45/46 + the ship package
```

## THE FIVE TIERS, ALL IN CODE

T0 instrument-lint · T1 grounding · T2 the comparative (router + probes) · T3 policy+ledger ·
T4 advertised-vs-disk (the six probes). Plus audit-return.py, battery.sh, the extension, the
fixtures, the spec gate.

## WHAT IS NOT DONE (the honest gap)

- **THE ENROLLMENT** — the dry-run returns ok:true; the owner is leviathan-devops; the repo does
  not exist. An outward action awaiting a ruling.
- **THE SHIP DOC FLOORS** — BUILD_REPORT 331/500 · DEBUG_LOG 534 · TESTING_LOG 29 · FAILURE_LOG 16 ·
  THEATRICALITY_LOG 20. Expanded from real material, never padded.
- **Q3** stays WARN-only at +0.047 (bar +0.10).
- **NO CONTAINER ROUND** — the proving surface was the host + the harness.
