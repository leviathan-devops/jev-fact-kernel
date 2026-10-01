#!/usr/bin/env python3
"""THE PROBE CONTROL SET — ST-201..205 (DPL1 FR-5, FR-13).

Every probe is driven BOTH WAYS. The controls ship WITH the kernel because /tmp is not durable:
the FIRST probe's control file was deleted between runs and the control re-ran clean — an
instrument whose control can vanish is an instrument whose pass means nothing.

Each drive names its expected verdict. Exit 0 = all correct. A control failure is a PROBE defect
until proven otherwise (the ANTI-STOP law: fix the probe, not the fixture).
"""
import hashlib, pathlib, subprocess, sys, tempfile, os

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "kernel"))
spec = __import__("importlib.util").util.spec_from_file_location(
    "t4p", str(HERE.parent / "kernel" / "tier4-probes.py"))
m = __import__("importlib.util").util.module_from_spec(spec); spec.loader.exec_module(m)

results = []
def drive(label, want, got):
    ok = got["verdict"] == want
    results.append(ok)
    print(f"  {'PASS' if ok else 'FAIL'}  {label:<42} {got['verdict']:<11} {got['code']}")
    return ok

with tempfile.TemporaryDirectory() as td:
    tdp = pathlib.Path(td)
    # a REAL mini runner — `true` is not one: it prints no pass count, and a silent runner IS
    # UNMEASURED. That was the control defect this set exists to prevent.
    (tdp / "runner-ok.sh").write_text('#!/usr/bin/env bash\necho "3 pass"\necho "0 fail"\nexit 0\n')
    (tdp / "runner-bad.sh").write_text('#!/usr/bin/env bash\necho "1 pass"\necho "2 fail"\nexit 1\n')
    (tdp / "runner-ok.sh").chmod(0o755); (tdp / "runner-bad.sh").chmod(0o755)
    (tdp / "impl.py").write_text("def wired_symbol():\n    return 1\n\nwired_symbol()\n")
    (tdp / "spec.md").write_text("# SPEC\n\n## WIRED_SYMBOL_SECTION\ntext\n")

    print("── ST-201 · T4-FILE ──")
    drive("exists -> PASS", "PASS", m.probe_file(str(HERE.parent / "kernel" / "ledger.py")))
    drive("absent -> BLOCK", "BLOCK", m.probe_file(str(HERE.parent / "kernel" / "nope.ts")))

    print("── ST-204 · T4-HASH ──")
    lp = HERE.parent / "kernel" / "ledger.py"
    h = hashlib.sha256(lp.read_bytes()).hexdigest()
    drive("matching -> PASS", "PASS", m.probe_hash(str(lp), h[:16]))
    drive("mismatch -> BLOCK", "BLOCK", m.probe_hash(str(lp), "deadbeefdeadbeef"))
    drive("absent -> UNMEASURED", "UNMEASURED", m.probe_hash(str(HERE.parent / "nope.ts"), "abc"))

    print("── ST-202 · T4-TEST ──")
    drive("a passing runner -> PASS", "PASS", m.probe_test([str(tdp/"runner-ok.sh")], td))
    drive("a failing runner -> BLOCK", "BLOCK", m.probe_test([str(tdp/"runner-bad.sh")], td))
    drive("a count mismatch -> BLOCK", "BLOCK", m.probe_test([str(tdp/"runner-ok.sh")], td, 999))
    drive("a count match -> PASS", "PASS", m.probe_test([str(tdp/"runner-ok.sh")], td, 3))
    drive("a silent runner -> UNMEASURED", "UNMEASURED", m.probe_test(["true"], td))
    drive("a missing runner -> UNMEASURED", "UNMEASURED", m.probe_test(["/nope-xyz"], td))

    print("── ST-203 · T4-SPEC ──")
    drive("section cited -> PASS", "PASS", m.probe_spec(str(tdp/"spec.md"), "WIRED_SYMBOL_SECTION", td))
    drive("section absent -> BLOCK", "BLOCK", m.probe_spec(str(tdp/"spec.md"), "NEVER_WRITTEN", td))
    drive("no spec file -> UNMEASURED", "UNMEASURED", m.probe_spec("/nope-spec.md", "X", td))

    print("── ST-205 · T4-WIRE ──")
    drive("consumed -> PASS", "PASS", m.probe_wire("wired_symbol", td))
    drive("zero consumers -> BLOCK", "BLOCK", m.probe_wire("symbol_nobody_calls_zzz", td))

print()
print(f"  PROBE CONTROLS: {sum(results)}/{len(results)}")
sys.exit(0 if all(results) else 1)
