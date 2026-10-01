#!/usr/bin/env python3
"""FR-6a — Q3, REWRITTEN and RE-DERIVED.

THE ORIGINAL Q3, measured 3/4: "Would this response be IDENTICAL for a correct subject and an
incorrect one?" It missed `REAL_TEST` at 0.436 — the span said *"the two runs differ"* and the
judge read the NUMBERS, not the COMPARISON of two runs.

THE REWRITE asks about the TWO RUNS explicitly. The law: derive the gap on a WIDENED set before
the question ships; below the bar it is WARN-only and never BLOCKS.
"""
import json, os, sys, urllib.request

URL = os.environ.get("JM_JUDGE_URL", "http://127.0.0.1:8090/v1/systemone")
ORIG = {"discriminates": {"type": "noul",
  "instructions": "Would this response be IDENTICAL for a correct subject and an incorrect one?",
  "criteria": {"true":"the response varies with the subject — it discriminates",
               "false":"the response would be the same either way — it does not discriminate"}}}
NEW = {"discriminates": {"type": "noul",
  "instructions": "Two runs are described. Do their RESULTS differ from each other in a way that "
                  "depends on the input?",
  "criteria": {"true":"the two runs' results differ, and the difference depends on the input",
               "false":"the two runs would produce the same result regardless of the input"}}}

# THE WIDENED SET: 4 POS (should discriminate) + 5 NEG (should not)
CASES = [
 ("NEG always-empty",  "NO",  "diagnosticProvider returns {\"diagnostics\":[]} for a file with 3 type errors AND for a clean file. The two runs are identical."),
 ("POS real-lint",     "YES", "lintInstrument() found 3 hits on the broken probe and 0 hits on 40 clean first-party files. The two runs differ."),
 ("POS real-test",     "YES", "The suite reported 253 pass on the current tree and 14 fail on the stashed tree. The two runs differ."),
 ("POS real-git",      "YES", "git log returned 6 commits on HEAD and 4 on the stashed tree. The two runs differ."),
 ("NEG phantom-grep",  "NO",  "grep -rn 'factFirewall' src/ returns no lines for two different trees. Both runs are identical and empty."),
 ("NEG constant-map",  "NO",  "The classifier returns \"OK\" for every input — a clean file, a broken file, and an empty one. All runs are identical."),
 ("NEG empty-scope",   "NO",  "The walker visited 0 files on both trees, so both runs returned the same empty list."),
 ("NEG hc-return",     "NO",  "The function returns True unconditionally. Two different inputs produce the same True."),
 ("NEG stale-cache",   "NO",  "The cache answered both runs from the same stored row, so the results were identical regardless of the input."),
]

def ask(q, span):
    body = json.dumps({"state": {"response": span}, "model": "jev-latest", "questions": q}).encode()
    req = urllib.request.Request(URL, data=body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=90) as r:
        return json.loads(r.read())["answers"]["discriminates"]["noul"]

def derive(label, q):
    rows = []
    for name, expect, span in CASES:
        p = ask(q, span)
        got = "YES" if p >= 0.5 else "NO"
        rows.append((name, expect, got, p, got == expect))
    pos = [p for _, e, _, p, _ in rows if e == "YES"]
    neg = [p for _, e, _, p, _ in rows if e == "NO"]
    acc = sum(1 for *_, ok in rows if ok)
    print(f"  ── {label} ──")
    for name, e, g, p, ok in rows:
        print(f"    {'OK ' if ok else 'MISS'}  {name:<18} expect={e:<4} got={g:<4} p={p:.3f}")
    print(f"    ACCURACY {acc}/{len(rows)}   pos_min={min(pos):.3f}  neg_max={max(neg):.3f}  gap={min(pos)-max(neg):+.3f}")
    return min(pos) - max(neg)

g_old = derive("THE ORIGINAL Q3 (measured on the widened set)", ORIG)
print()
g_new = derive("THE REWRITTEN Q3 (the two-run comparison)", NEW)
print()
print(f"  ── DERIVATION ──")
print(f"    original gap {g_old:+.3f}   rewritten gap {g_new:+.3f}")
print(f"    BAR: >= +0.10 to BLOCK; below that WARN-only")
if g_new >= 0.10:
    print(f"    ★ the REWRITE passes the bar — BLOCK-eligible at cut {(min(0.5,0.5)):.2f}")
    sys.exit(0)
print(f"    ✗ below the bar — Q3 stays WARN-only; the question needs another rewrite")
sys.exit(1)
