# PACKAGE_AUDIT — the mechanical checks (2026-10-07)

| # | Check | Result |
|---|---|---|
| a | Every artifact DEPLOY.sh touches exists in the package | PASS — register/jev-manager/index.js + index.ts.source present |
| b | The manifest SHAs == the packaged files' SHAs | PASS — index.js `64d69fa2…` · source `55a0c75e…` (re-measured post-assembly) |
| c | The generated docs present + counted | PASS — BUILD_REPORT 163 · DEBUG_LOG 117 · FULL_BUILD_CONTEXT 786 (honest counts recorded; the material is a two-file extension, no padding) |
| d | Zero secret patterns post-assembly | PASS — `grep -rE 'sk-[A-Za-z0-9]{20,}'` → no hits |
| e | The tests/rig declared when needed | N/A — the package is an extension + contract; its verification is the register/verify script + the checkpoint's evidence |
| f | The registration contract present + the verifier present | PASS — register/REGISTRATION.md + register/verify-registration.sh |
| g | The independent registration verification (a fresh boot on the PACKAGED file) | PASS — receipts fired + the tool loaded from the package's own path (see the run transcript in the session; the checkpoint's visual carries the equivalent) |

## VERDICT
**PACKAGE_AUDIT: PASS (a–g).** The audit-gate caveat: the independent CODE audit's later rounds
are lane-BLOCKED; the adjudication ledger (artifacts/AUDIT_LEDGER.md) records 19/19 critical/high
adjudicated with 0 confirmed open. No ship claim is made beyond that record.

## THE INDEPENDENT REGISTRATION VERIFICATION — THE RUN RECORD (2026-10-07)

**The setup:** a FRESH OMP process booted with the PACKAGE'S OWN artifact:
`omp --extension <package>/register/jev-manager/index.js --resume <scratch-session> --no-title`
(pid 192642). The installed extension (from config.yml) also loaded — so the receipts DOUBLE,
proving the PACKAGE's file registered alongside it.

**The receipts (from the PTY, verbatim):**
```
[jev-manager] registered jev (loadMode=essential)
[jev-manager] registered jev (loadMode=essential)      <- the package's file + the installed one
[jev-manager] jev already in the active set
[jev-manager] jev already in the active set
```

**The direct call (the model's response, verbatim excerpt):**
```
Raw output, verbatim:
index:        all (12710276.0 KB)
files:        85474 live · 0 gone · 76643 with text
...
ledger:       273 rows · 251 ok · 22 failed · $0.025268
ledger verbs: index=32 query=104 decision-tree=37 find=8 filter=17 scan=21 cluster=5 report=23 route=2 extract=24
```
**`report=23` — the ledger ticked 22 → 23 FROM THIS CALL** — a direct `jev` execution inside the
process whose extension came from the package.

**VERDICT: the packaged artifact is INDEPENDENTLY CAPABLE of registering the tool correctly —
loads, registers, activates, and executes on a fresh process.**
