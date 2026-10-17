# BUILD_STATE — the fact kernel

**Spec:** specs/DPL1_JEV_FACT_KERNEL.md · sha256-16 `1f0339511782204f` (re-hashed this checkout;
the seed's hash still matches the file).
**Spec gate:** scripts-spec-gate.sh + .git-hooks/commit-msg — REFUSE on no FR, PASS on FR.
**Battery script:** `kernel/battery.sh`. It drives T0 (four controls), the T4 lying/honest pair,
the probe control set, the router cascade, T1 (three polarities), ST-403 (three polarities),
the ledger, and the spec gate both ways.
**The ledger path the kernel writes:** ~/.omp/run/fact-firewall.jsonl.
**The extension:** extensions/fact-firewall/index.js — registration refusal plus the `tool_call`
handler.

## Why this file was a failing gate

`test_canon_docs_present` reads this file and requires 20 lines. The wave-5 seed left it at 7
lines: a header, four pointers, and a checkpoint name. The pointers were also stale (`PASS=10`,
and a "not built" list that named files the tree already contains). A shorter threshold would
have made the gate pass without a document. The lines above are the document.

## What is not claimed here

This lane did not re-run `kernel/battery.sh`. The router and the Q3 control default to
`http://127.0.0.1:8090/v1/systemone`, and nothing in this lane connects there. The recorded
battery result lives in `TESTING_LOG.md` (`PASS=16 FAIL=0 UNMEASURED=0`) and is not repeated
here as a fresh result.

The bun suite is the run this lane did take: `bun test` on bun 1.4.3 printed `248 pass / 0 fail`
across 45 files. The guard against `127.0.0.1:8090` and `:18090` is `tests/no-live-judge.test.ts`.

## The operator skill

`skills/jev-manager-operator/SKILL.md` is the shipped skill. The named gate used to look for it
under `$HOME/.omp/agent/managed-skills/`, a path that exists only on the machine that minted
the file. The suite now reads the copy in the repo.
