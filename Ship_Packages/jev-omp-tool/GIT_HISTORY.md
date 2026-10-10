# GIT_HISTORY — the lineage of this package (2026-10-07)

## THE AUDIT SCRATCH REPO (/tmp/jev-audit-repo — the two-file changeset under review)
```
f2afbc1 refactor(jev-manager): r7 — flatten nested ternaries (review style rule)
f51ea0a fix(jev-manager): r6 — utf8 encoding, surrogate guard symmetry, target canonicalization, empty-output envelope, chars wording
927c0b7 fix(jev-manager): r5 — JM_BIN realpath+mode, json envelope consistency, stderr caps, low-surrogate guard, verify-after-write CAS, index target existence
ee309bd fix(jev-manager): r3 — caller-abort naming, async realpath canonicalization, json-mode in-band envelopes, JM_BIN X_OK, JUDGE_NEEDED derives from JUDGED_SET
478b7bf fix(jev-manager): r2 — abort-vs-outage, --json integrity, serialized activation, stat guards, pi-surface typeof checks, watch-once refusal, route question guard, 0-forwarding
7166fba fix(jev-manager): all qwen-code-audit 685c7e4d critical/high findings — buildArgs coverage, path/numeric guards, exit truth, truncation, judge-probe cleanup, single-flight activation
e5ddb8f feat(jev-manager): the hardened OMP tool registration — loadMode essential + both-branch activation receipts + before_agent_start re-assert
c667d5d fix(jev-manager): audit-scope marker (the changeset under review)
```
Each commit is the two-file changeset at that round's end; the scan range was HEAD~1..HEAD per
round. The packaged artifact == the f2afbc1 state == the live install (copied at seal).

## THE PROJECT (JevManager) — worktree state at packaging time
- The ship docs updated 2026-10-07 (EN-117 · F-24 · T-14 · SV-05; the manifest refreshed).
- The checkpoint `Checkpoints/jm-jev-omp-tool-registration-hardened-verified-20261007` sealed
  (Mode B — no chattr lock).
- The package itself: `Ship_Packages/jev-omp-tool/` (this directory). The ship commit/tag is the
  operator's call; nothing here is committed or pushed without that order.

## THE LIVE INSTALL
`~/.omp/agent/extensions/jev-manager/` carries the same bytes as register/jev-manager/ (the
installed sha re-verified at packaging: index.js `64d69fa2…`).
