# MASTER_INDEX — jev-omp-tool (generated 2026-10-07, counts read from disk)

## THE PACKAGE AT A GLANCE
- **Artifact:** register/jev-manager/index.js (sha256 64d69fa2938e5ec5feefbed2b9eed37dab63d19e67cecb238a52bfede117af4b)
- **Source twin:** register/jev-manager/index.ts.source (sha256 55a0c75e33e6d470b2bda42b4320522bc5d2b3ab52c38f4225cac581a009094d)
- **Deploy:** `bash DEPLOY.sh` → config line → restart → `bash register/verify-registration.sh`

## DOC LINE COUNTS (wc -l, read from disk)
| Doc | Lines |
|---|---|
| README.md | 41 |
| BUILD_REPORT.md | 163 |
| DEBUG_LOG.md | 117 |
| FULL_BUILD_CONTEXT.md | 786 |
| SHIP_MANIFEST.md | 30 |
| MASTER_INDEX.md | (this file) |
| register/REGISTRATION.md | 66 |
| register/verify-registration.sh | 51 |
| DEPLOY.sh | 27 |
| artifacts/AUDIT_LEDGER.md | 37 |

## THE FULL CONTENTS LISTING
```
jev-omp-tool/
├── README.md                      the package entry (fingerprint + contents + deploy)
├── DEPLOY.sh                      the installer + the operator checklist
├── SHIP_MANIFEST.md               the SHA table + stats + the test summary
├── BUILD_REPORT.md                the build record (what/why/how/evidence)
├── DEBUG_LOG.md                   the bug chain (the saga + the audit arc)
├── FULL_BUILD_CONTEXT.md          the cold-start context (with the full source embedded)
├── MASTER_INDEX.md                this index
├── PACKAGE_AUDIT.md               the mechanical package checks + verdict
├── GIT_HISTORY.md                 the lineage (audit-repo commits + project git state)
├── register/
│   ├── REGISTRATION.md            THE REGISTRATION CONTRACT (the law + the traps)
│   ├── verify-registration.sh     the independent registration verifier
│   └── jev-manager/
│       ├── index.js               THE ARTIFACT (the deployed bundle)
│       └── index.ts.source        the source twin
└── artifacts/
    ├── AUDIT_LEDGER.md            the 19-finding adjudication table
    └── wire-schema-dump.json      the clean-room /dump proving jev top-level (1.7MB)
```

## THE VERIFICATION COMMANDS (all mechanical)
```
bun build register/jev-manager/index.js --target=node --outfile=/tmp/chk.js   # parse: 0 errors
bash register/verify-registration.sh                                          # fresh-boot receipts
# the wire schema (in a booted session):  /dump  → grep '"name":"jev"' /tmp/omp-llm-request-*.json
```
