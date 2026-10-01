# NEXT_STEPS — the fact kernel

## DONE

- **FR-10** — T0 returns UNMEASURED (exit 2) on an unread path; the pattern set reduced to the
  one pattern whose controls are POS=1 NEG=0 SELF=0. Commit `2ad3a7a`.
- **FR-13 (part)** — the ledger writer (`kernel/ledger.py`, driven); the fence `SPEC.md`; the
  spec gate (`.git-hooks/commit-msg`) driven both ways. Commit `adf7429`.

## NEXT (the build order, steps 3-8)

1. **FR-13 (the other half)** — drive `fixtures/lying-server` (declares 23) to BLOCK and
   `fixtures/honest-server` (declares 0) to PASS. Both tokens from tool output.
2. **FR-13 (litter)** — verify the sample.ts fix: run the T4 probe and confirm NO `sample.ts`
   in the cwd and NO `/tmp/jev-t4-*` residue.
3. **FR-5** — `kernel/tier4/{file,test,spec,hash,wire}.py`, each with a POS and a NEG control.
4. **FR-6a** — rewrite Q3 as the two-run comparison question; widen the control set; re-derive
   until the gap >= 0.10.
5. **FR-4** — the router cascade: `NONE vs CHECKABLE` (2 labels), then the 7 kinds.
6. **FR-8** — wire T4-CAP into LSP registration (D1 must be ruled: default REFUSE); wire T0 +
   T4-FILE/HASH into `tool_call`; wire T4 into the worker-return path.
7. **FR-12** — the full battery: every SC green with its named token.

## THE ENROLLMENT (the APPEND)

`jarvis-upper` is present and active; `projects.json` is ABSENT at `$K`. The enrollment needs
`O=<owner>` and `R=<repo>` — **the worktree has NO git remote**, so the target is UNKNOWABLE
without a ruling.
