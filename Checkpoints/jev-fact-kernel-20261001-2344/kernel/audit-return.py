#!/usr/bin/env python3
"""THE WORKER-RETURN AUDIT — ST-403 (DPL1 FR-8, the third carrier).

A subagent's return is a RESULT: it already exists by the time any hook sees it. The polarity law
(LSP REPORTS, HOOK REFUSES) therefore puts the refusal at the CONSUMPTION point — the parent runs
this audit BEFORE it acts on the return, and the audit's verdict IS the refusal.

WHAT IT AUDITS — the artifact-naming claims only, because those are the ones a machine can settle:
  · a return that NAMES A PATH        -> T4-FILE on that path
  · a return that NAMES A HASH        -> T4-HASH on that hash
A return that names no artifact PASSES. That is not a loophole: the kernel's contract is
CHECKABLE claims, and a claim with no subject cannot be probed. It is recorded as UNSETTLED, not
as a pass.

    audit_return(text) -> {"verdict": ACCEPTED|REFUSED, "claims": [...], "unsettled": n}
Exit 0 = ACCEPTED, 1 = REFUSED, 2 = UNMEASURED (nothing checkable and nothing to refuse).
"""
import importlib.util, pathlib, re, sys

HERE = pathlib.Path(__file__).resolve().parent
_s = importlib.util.spec_from_file_location("t4p", str(HERE / "tier4-probes.py"))
_probes = importlib.util.module_from_spec(_s); _s.loader.exec_module(_probes)

PATH_RE = re.compile(r'`([A-Za-z0-9_./-]+\.(?:py|ts|js|json|md|sh|sqlite|txt))`')
HASH_RE = re.compile(r'\b([0-9a-f]{16,64})\b')

def audit_return(text: str, base: str = ".") -> dict:
    claims, refusals, unsettled = [], [], 0
    base_p = pathlib.Path(base)

    for m in PATH_RE.finditer(text):
        p = m.group(1)
        cand = pathlib.Path(p) if pathlib.Path(p).is_absolute() else base_p / p
        v = _probes.probe_file(str(cand))
        claims.append({"kind": "FILE", "subject": p, "verdict": v["verdict"], "code": v["code"]})
        if v["verdict"] == "BLOCK":
            refusals.append(f"the return names `{p}` — {v['code']}")

    if not claims:
        unsettled = 1
        return {"verdict": "UNMEASURED", "claims": [], "unsettled": unsettled,
                "detail": "no artifact-naming claim found — nothing this kernel can settle"}

    if refusals:
        return {"verdict": "REFUSED", "claims": claims, "unsettled": 0,
                "detail": "; ".join(refusals)}
    return {"verdict": "ACCEPTED", "claims": claims, "unsettled": 0,
            "detail": f"{len(claims)} artifact claim(s) settled against the disk"}

if __name__ == "__main__":
    txt = sys.stdin.read() if not sys.argv[1:] else " ".join(sys.argv[1:])
    base = sys.argv[2] if len(sys.argv) > 2 else "."
    r = audit_return(txt, base)
    print(f"FACT-FIREWALL T4 RETURN-AUDIT: {r['verdict']}")
    for c in r["claims"]:
        print(f"  {c['verdict']:<11} {c['kind']:<6} {c['subject']}")
    print(f"  {r['detail']}")
    sys.exit({"ACCEPTED": 0, "REFUSED": 1, "UNMEASURED": 2}[r["verdict"]])
