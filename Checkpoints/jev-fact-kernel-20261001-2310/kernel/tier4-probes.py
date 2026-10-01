#!/usr/bin/env python3
"""THE T4 PROBES — the advertised-vs-disk reconcile, five subjects (DPL1 FR-5).

ONE mechanism, five instantiations: take the CLAIMED SUBJECT, ask the DISK, let the MISMATCH be
the finding. Each probe is DETERMINISTIC — no judge enters. The judge is reached only when a probe
returns AMBIGUOUS (a valid-but-empty result), which is N1/N3's job, not this module's.

    probe_file(path)                  stat the claimed artifact
    probe_test(suite_cmd, cwd)        run the suite; read the exit code + the counts
    probe_spec(spec_path, section)    grep the spec section; grep the implementation
    probe_hash(path, claimed)         sha256sum vs the claimed hash
    probe_wire(symbol, corpus)        grep production consumers

POLARITY (the law): every probe returns a NAMED verdict. An unread or unspawnable subject is
UNMEASURED — never PASS. The fail-closed law, applied to each subject.
"""
import hashlib, os, pathlib, re, subprocess, sys

VERDICT_PASS = "PASS"
VERDICT_BLOCK = "BLOCK"
VERDICT_UNMEASURED = "UNMEASURED"

def _v(verdict, code, **ev):
    return {"verdict": verdict, "code": code, **ev}

# ── T4-FILE ─────────────────────────────────────────────────────────────────────────────────────
def probe_file(path: str) -> dict:
    """The claim: 'the file exists / I created X'. The disk: stat."""
    p = pathlib.Path(path)
    if p.exists():
        return _v(VERDICT_PASS, "T4_FILE_PRESENT", path=str(p), kind="file" if p.is_file() else "dir",
                  bytes=p.stat().st_size if p.is_file() else None)
    return _v(VERDICT_BLOCK, "T4_PHANTOM_ARTIFACT", path=str(p), detail="the claimed artifact is absent")

# ── T4-HASH ─────────────────────────────────────────────────────────────────────────────────────
def probe_hash(path: str, claimed: str) -> dict:
    """The claim: 'this artifact is deployed / matches <hash>'. The disk: sha256sum."""
    p = pathlib.Path(path)
    if not p.exists():
        return _v(VERDICT_UNMEASURED, "T4_HASH_UNMEASURED", path=str(p), detail="cannot hash an absent file")
    try:
        h = hashlib.sha256(p.read_bytes()).hexdigest()
    except Exception as e:
        return _v(VERDICT_UNMEASURED, "T4_HASH_UNMEASURED", path=str(p), detail=f"unreadable: {e}")
    c = re.sub(r"[^0-9a-f]", "", claimed.lower())
    if not c:
        return _v(VERDICT_UNMEASURED, "T4_HASH_UNMEASURED", detail="the claimed value carries no hex")
    if h.startswith(c) or h[:16] == c[:16]:
        return _v(VERDICT_PASS, "T4_ARTIFACT_HASH_MATCH", path=str(p), sha16=h[:16], claimed=c[:16])
    return _v(VERDICT_BLOCK, "T4_ARTIFACT_HASH_MISMATCH", path=str(p), actual=h[:16], claimed=c[:16])

# ── T4-TEST ─────────────────────────────────────────────────────────────────────────────────────
def probe_test(cmd: list[str], cwd: str = ".", claimed_pass: int | None = None) -> dict:
    """The claim: 'the tests pass / N pass'. The disk: run the suite; read the exit + the counts."""
    try:
        r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=600)
    except Exception as e:
        return _v(VERDICT_UNMEASURED, "T4_TEST_UNMEASURED", cmd=" ".join(cmd), detail=str(e))
    out = (r.stdout or "") + (r.stderr or "")
    pm = re.search(r"(\d+)\s+pass", out, re.I)
    fm = re.search(r"(\d+)\s+fail", out, re.I)
    passed = int(pm.group(1)) if pm else None
    failed = int(fm.group(1)) if fm else None
    ev = dict(cmd=" ".join(cmd), exit=r.returncode, passed=passed, failed=failed)
    if r.returncode != 0 or (failed or 0) > 0:
        return _v(VERDICT_BLOCK, "T4_TEST_RESULT_MISMATCH", **ev)
    if claimed_pass is not None and passed is not None and passed != claimed_pass:
        return _v(VERDICT_BLOCK, "T4_TEST_COUNT_MISMATCH", claimed=claimed_pass, **ev)
    if passed is None:
        return _v(VERDICT_UNMEASURED, "T4_TEST_UNMEASURED", detail="the runner reported no pass count", **ev)
    return _v(VERDICT_PASS, "T4_TEST_RESULT_MATCH", **ev)

# ── T4-SPEC ─────────────────────────────────────────────────────────────────────────────────────
def probe_spec(spec_path: str, section: str, impl_corpus: str) -> dict:
    """The claim: 'it matches the spec'. The disk: the spec section EXISTS and something cites it."""
    sp = pathlib.Path(spec_path)
    if not sp.exists():
        return _v(VERDICT_UNMEASURED, "T4_SPEC_UNMEASURED", spec=str(sp), detail="no spec at that path")
    try:
        text = sp.read_text(errors="ignore")
    except Exception as e:
        return _v(VERDICT_UNMEASURED, "T4_SPEC_UNMEASURED", detail=f"unreadable: {e}")
    if not re.search(re.escape(section), text):
        return _v(VERDICT_BLOCK, "T4_SPEC_SECTION_ABSENT", spec=str(sp), section=section,
                  detail="the claimed section is not in the spec")
    # a spec section with NO citation in the implementation is a section nobody implemented
    try:
        g = subprocess.run(["grep", "-rIl", section, impl_corpus], capture_output=True, text=True, timeout=60)
    except Exception as e:
        return _v(VERDICT_UNMEASURED, "T4_SPEC_UNMEASURED", detail=f"grep failed: {e}")
    hits = [l for l in g.stdout.splitlines() if l.strip()]
    if not hits:
        return _v(VERDICT_BLOCK, "T4_SPEC_SECTION_UNIMPLEMENTED", spec=str(sp), section=section,
                  corpus=impl_corpus, detail="no code cites this spec section")
    return _v(VERDICT_PASS, "T4_SPEC_CITED", spec=str(sp), section=section, cited_in=len(hits))

# ── T4-WIRE ─────────────────────────────────────────────────────────────────────────────────────
def probe_wire(symbol: str, corpus: str) -> dict:
    """The claim: 'it is wired'. The disk: production consumers of the symbol."""
    try:
        g = subprocess.run(["grep", "-rIn", symbol, corpus], capture_output=True, text=True, timeout=60)
    except Exception as e:
        return _v(VERDICT_UNMEASURED, "T4_WIRE_UNMEASURED", detail=f"grep failed: {e}")
    lines = [l for l in g.stdout.splitlines()
             if l.strip() and not l.split(":")[0].endswith(("_test.py", ".test.ts", ".spec.ts"))
             and "README" not in l.split(":")[0]]
    if not lines:
        return _v(VERDICT_BLOCK, "T4_ZERO_CONSUMERS", symbol=symbol, corpus=corpus,
                  detail="zero production consumers — the symbol is defined and never called")
    return _v(VERDICT_PASS, "T4_WIRED", symbol=symbol, consumers=len(lines))
