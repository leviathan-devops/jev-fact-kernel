#!/usr/bin/env python3
"""TIER 1 — THE GROUNDING CHECK (DPL1 FR-7).

A NUMBER asserted in a claim must have a PRODUCER in the trace. This tier extracts every numeric
assertion from a claim and looks for it in the tool results that preceded it.

    ground(claim, corpus) -> {"verdict": GROUNDED|UNGROUNDED|UNMEASURED, "numbers": [...]}

THE HONEST BOUNDARY, MEASURED AND STATED: this tier does NOT catch the byte-read class. In the
motivating incident the number `9.99` WAS present in a tool output — the OUTPUT was wrong, not
absent. Tier 0 catches that one, before the number exists. Tier 1 catches the OTHER class: a
figure with NO producer anywhere in the trace.

A number that appears in the corpus is GROUNDED. A number that appears in NO tool result is
UNGROUNDED. A claim with no numbers is UNMEASURED — never a pass.
"""
import re, sys, json

# only ASSERTION-shaped numbers: a measure with a unit or a count with a noun. Years, versions,
# and ordinals are excluded — a rule that fires on "the 2026 build" is a rule that misfires.
NUM_RE = re.compile(
    r'(?<![\w-])'
    r'(\d+(?:[.,]\d+)?)\s*'
    r'(%|ms|s\b|sec|seconds|kb|mb|gb|bytes|lines|rows|tests|files|hits|pass|fail|passes|fails|x\b)',
    re.I)
BARE_RE = re.compile(r'(?<![\w.-])(\d{2,})(?![\w.-])')
EXCLUDE = re.compile(r'\b(20\d\d|v\d+\.\d+|\d+\.\d+\.\d+)\b')

def extract_numbers(claim: str) -> list[str]:
    out = []
    for m in NUM_RE.finditer(claim):
        out.append(m.group(1))
    for m in BARE_RE.finditer(claim):
        v = m.group(1)
        if EXCLUDE.search(m.group(0)):
            continue
        out.append(v)
    # dedupe, keep order
    seen, uniq = set(), []
    for v in out:
        if v not in seen:
            seen.add(v); uniq.append(v)
    return uniq

def ground(claim: str, corpus: str) -> dict:
    nums = extract_numbers(claim)
    if not nums:
        return {"verdict": "UNMEASURED", "numbers": [], "detail":
                "the claim asserts no number — nothing this tier can ground (NOT a pass)"}

    grounded, ungrounded = [], []
    for v in nums:
        # a number is grounded when it appears in the corpus, with either separator
        variants = {v, v.replace(".", ","), v.replace(",", ".")}
        if any(x in corpus for x in variants):
            grounded.append(v)
        else:
            ungrounded.append(v)

    if ungrounded:
        return {"verdict": "UNGROUNDED", "numbers": nums, "grounded": grounded,
                "ungrounded": ungrounded, "detail":
                f"{len(ungrounded)} number(s) appear in NO tool result: {', '.join(ungrounded)}"}
    return {"verdict": "GROUNDED", "numbers": nums, "grounded": grounded, "ungrounded": [],
            "detail": f"all {len(grounded)} number(s) have a producer in the trace"}

if __name__ == "__main__":
    # usage: tier1-grounding.py <corpus-file> <claim>   OR   <claim> (corpus read from stdin)
    if len(sys.argv) >= 3:
        corpus = open(sys.argv[1], errors="ignore").read()
        claim = " ".join(sys.argv[2:])
    else:
        claim = " ".join(sys.argv[1:])
        corpus = sys.stdin.read()
    r = ground(claim, corpus)
    print(f"FACT-FIREWALL T1: {r['verdict']}")
    print(f"  {r['detail']}")
    sys.exit({"GROUNDED": 0, "UNGROUNDED": 1, "UNMEASURED": 2}[r["verdict"]])
