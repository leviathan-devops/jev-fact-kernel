# jev-omp-tool — the Jev decision engine as a first-class OMP tool (SHIP PACKAGE)

**What it is.** The `jev` OMP host extension: the local Jev decision engine exposed as a native
tool (sibling to bash/grep/read) — keyless verbs (index/query/scan/cluster/extract/report) for
free narrowing, judged verbs (filter/find/decision-tree/route/evaluate) against the LOCAL judge,
and mechanical gates (push-gate/st-detect/spec-audit). No MCP process, no schema tax beyond one
tool, a pinned local endpoint.

**Deployment fingerprint (the packaged artifact):**
```
register/jev-manager/index.js         sha256 64d69fa2938e5ec5feefbed2b9eed37dab63d19e67cecb238a52bfede117af4b
register/jev-manager/index.ts.source  sha256 55a0c75e33e6d470b2bda42b4320522bc5d2b3ab52c38f4225cac581a009094d
```

**Deploy in one line.** `bash DEPLOY.sh` (then add the config.yml line it prints, restart the
session, and run `bash register/verify-registration.sh`).

**Contents.**
| Path | What |
|---|---|
| `register/jev-manager/` | the extension (bundle + source) — the deployable artifact |
| `register/REGISTRATION.md` | THE REGISTRATION CONTRACT (the law + the measured traps) |
| `register/verify-registration.sh` | the independent registration verifier (fresh-boot receipts + parse) |
| `DEPLOY.sh` | the installer + the operator checklist |
| `BUILD_REPORT.md` | the build record (what/why/how/evidence) |
| `DEBUG_LOG.md` | the bug chain: the registration saga + the audit arc (EN-115..117) |
| `FULL_BUILD_CONTEXT.md` | the cold-start context: architecture, the contract, the traps, recovery |
| `artifacts/AUDIT_LEDGER.md` | the 19-finding adjudication table (15 fixed · 3 declined · 1 probe-error) |
| `artifacts/wire-schema-dump.json` | the clean-room /dump proving jev top-level (23 tools) |
| `SHIP_MANIFEST.md` | the SHA table + stats + test summary |
| `MASTER_INDEX.md` | the generated index (counts read from disk) |
| `PACKAGE_AUDIT.md` | the mechanical package checks |
| `GIT_HISTORY.md` | the lineage (the audit-repo commits + the project git state) |

**The runtime dependency.** The `jm` CLI (the JevManager project) — `~/.local/bin/jm`, or `JM_BIN`.
The tool refuses `JEV_CLI_MISSING` by name when absent.

**Verification.** The registration is proven by a fresh boot (receipts) + a wire-schema read
(`/dump` → `"name":"jev"` among the tools). The guard surface is proven by the named refusals
(`JEV_NEED_EVAL_ARGS`, `JEV_NEED_QUESTION`, `JEV_WATCH_NEEDS_ONCE`, `JEV_FILE_MISSING`). See
`artifacts/AUDIT_LEDGER.md` for the independent audit's adjudication.
