# CURRENT_STATE — the Jev fact kernel

**The mission:** a false claim is mechanically detectable and blockable at the moment it is made,
and a lying LSP server cannot register.

**The mechanism:** take the CLAIMED SUBJECT, ask the DISK, let the MISMATCH be the finding. The
kernel NEVER reads prose. A local Jev judge enters only where a machine cannot answer.

**The branch:** feat/jev-fact-kernel. **The spec:** specs/DPL1_JEV_FACT_KERNEL.md (sha16
`1f0339511782204f`, re-hashed on this checkout).

## What is on disk

| piece | path | lines |
|---|---|---|
| T0 lint | `kernel/tier0-instrument-lint.py` | 123 |
| T1 grounding | `kernel/tier1-grounding.py` | 83 |
| T4 capability probe | `kernel/tier4-lsp-capability-probe.py` | 200 |
| T4 probes | `kernel/tier4-probes.py` | 133 |
| router | `kernel/router.py` | 88 |
| return audit | `kernel/audit-return.py` | 58 |
| ledger | `kernel/ledger.py` | 44 |
| battery | `kernel/battery.sh` | 114 |
| extension | `extensions/fact-firewall/index.js` | 158 |

The extension binds `tool_call` at `extensions/fact-firewall/index.js` (the `pi.on("tool_call"`
handler). T1 is `kernel/tier1-grounding.py`. Both were listed as unbuilt by the 17-line seed of
this file. They are in the tree.

The five ship docs are at the repo root: `BUILD_REPORT.md`, `DEBUG_LOG.md`, `FAILURE_LOG.md`,
`TESTING_LOG.md`, `THEATRICALITY_LOG.md`.

## What this file previously claimed, and the file that refutes it

The wave-5 seed (`a444fb9`) rewrote this doc to 17 lines and stopped. `test_canon_docs_present`
requires each canon doc to be a real document (20 lines or more). `CURRENT_STATE.md` was 17
lines, so the gate failed on the first file in its list. `BUILD_STATE.md` was 7 lines and would
have failed next. The seed also said the battery was `PASS=10` and that FR-8's tool_call half,
T1, and the ship docs were unbuilt. The paths in the table above are the correction.

## What this lane did not re-drive

`kernel/router.py` and `kernel/q3-control.py` default `JM_JUDGE_URL` to
`http://127.0.0.1:8090/v1/systemone`. `kernel/battery.sh` calls both. This lane does not open
that port. The last battery result written into `TESTING_LOG.md` is `PASS=16 FAIL=0
UNMEASURED=0`. That is a record of an earlier run, not a measurement taken here.

## The hermetic suite

`bun test` is rooted at `tests/` (`bunfig.toml`). It must not connect to `127.0.0.1:8090` or
`:18090`. A judge call in that suite goes to a mock bound with `port: 0`, or to `JM_MOCK_DIR`,
which reads canned files and does not open a socket.

Which checkout is canonical — this repo, the `jev-fact-kernel` worktree, or
`Shared_Workspace/JevManager` — is an owner decision. This file does not pick one.
