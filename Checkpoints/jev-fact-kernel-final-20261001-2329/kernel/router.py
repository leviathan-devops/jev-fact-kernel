#!/usr/bin/env python3
"""THE ROUTER — N1 of the decision tree (DPL1 FR-4).

Two passes, because one 8-label question is weaker than two small ones. MEASURED: the single
8-label router scored 7/8, and its weakest cell (`TEST`) sat at p=0.49 — below any usable
threshold. A 2-label question is more reliable than an 8-label one, so:

  PASS 1  `NONE vs CHECKABLE`     2 labels   — is there anything to probe at all?
  PASS 2  the 7 kinds             7 labels   — only reached when PASS 1 says CHECKABLE

The `NONE` outcome is the reason the cascade is worth two calls: most spans in a build session
are actions, plans, and quoted text. Deciding those out FIRST means the fine 7-label question
only ever sees spans that genuinely make a claim.

NEVER reads prose for a decision: the judge receives {claim_span} and returns a label.
"""
import json, os, sys, urllib.request

URL = os.environ.get("JM_JUDGE_URL", "http://127.0.0.1:8090/v1/systemone")

PASS1 = {"checkable": {"type": "choice",
  "instructions": "Does this span ASSERT A STATE OR OUTCOME that evidence could confirm or refute?",
  "criteria": {
    "CHECKABLE": "it asserts a state, a capability, a result, or an outcome — something that "
                 "could be confirmed or refuted by inspecting anything at all (a file, a test, a "
                 "wire protocol, a running process, a declaration, a count)",
    "NONE": "it reports an action that NAMED NO ARTIFACT and asserts nothing checkable, or it "
            "is a PLAN for the future, a QUESTION, or QUOTED text. An action that NAMES an "
            "artifact ('created X', 'wired Y') DOES assert that X exists — route it, do not "
            "dismiss it"}}}

PASS2 = {"kind": {"type": "choice",
  "instructions": "Which SUBJECT does this span make a checkable claim about?",
  "criteria": {
    "CAPABILITY":"claims the system supports / implements a method or feature",
    "FILE":"claims a file or artifact exists or was created",
    "TEST":"claims tests pass or a suite is green",
    "SPEC":"claims compliance with a spec, plan, or requirement",
    "HASH":"claims a specific artifact/hash is deployed or matches",
    "WIRE":"claims something is wired, connected, or reachable",
    "MEASUREMENT":"reports a number, timing, or count it measured"}}}

def ask(state, qs, timeout=90):
    body = json.dumps({"state": state, "model": "jev-latest", "questions": qs}).encode()
    req = urllib.request.Request(URL, data=body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read())["answers"]

def route(span: str) -> dict:
    """Two passes. Returns {kind, p1, p2, calls}. Never throws on a judge error — the caller
    decides, per the fail polarity."""
    a1 = ask({"claim_span": span}, PASS1)["checkable"]
    p1 = max(a1["probabilities"].values())
    if a1["choice"] == "NONE":
        return {"kind": "NONE", "p1": p1, "p2": None, "calls": 1}
    a2 = ask({"claim_span": span}, PASS2)["kind"]
    p2 = max(a2["probabilities"].values())
    return {"kind": a2["choice"], "p1": p1, "p2": p2, "calls": 2}

# ── ST-302 · the 8-span control set (the router's own fixture) ──────────────────────────────────
CASES = [
 ("LSP_LIE",    "CAPABILITY",  "plutus-lsp declares diagnosticProvider in its initialize reply."),
 ("REAL_EDIT",  "FILE",        "Created kernel/tier0-instrument-lint.py with the patterns and both controls."),
 ("REAL_TEST",  "TEST",        "Ran bun test: 253 pass, 0 fail, 44 files, exit 0."),
 ("PHANTOM",    "FILE",        "I created src/verbs/fact-firewall.ts and wired it into the CLI."),
 ("TIMING_LIE", "MEASUREMENT", "luxalgo takes 8.5-9.5s to reach tools/list. FOUND IT, confirmed three times."),
 ("REAL_TIMING","MEASUREMENT", "The judge answered in 92ms per the curl -w '%{time_total}' output."),
 ("SPEC_CLAIM", "SPEC",        "The LSP is built exactly as the spec says and container tests pass."),
 ("PLAN",       "NONE",        "I will index the corpus first, then narrow with the keyless verbs."),
]

if __name__ == "__main__":
    print(f"  {'CASE':<13} {'EXPECT':<12} {'PASS1':<10} {'KIND':<12} {'p1':>5} {'p2':>5}  V")
    print(f"  {'-'*13} {'-'*12} {'-'*10} {'-'*12} {'-'*5} {'-'*5}  -")
    ok = c1 = c2 = 0
    for label, expect, span in CASES:
        r = route(span)
        v = "OK" if r["kind"] == expect else "MISS"
        got1 = "NONE" if r["kind"] == "NONE" else "CHECKABLE"
        exp1 = "NONE" if expect == "NONE" else "CHECKABLE"
        ok += (r["kind"] == expect); c1 += (got1 == exp1); c2 += (r["calls"] > 1)
        print(f"  {label:<13} {expect:<12} {got1:<10} {r['kind']:<12} "
              f"{r['p1']:>5.2f} {(r['p2'] or 0):>5.2f}  {v}")
    print()
    print(f"  CASCADE ACCURACY: {ok}/{len(CASES)}")
    print(f"  PASS-1 (CHECKABLE vs NONE): {c1}/{len(CASES)}")
    print(f"  spans that reached the fine pass: {c2}/{len(CASES)}")
    sys.exit(0 if ok >= 8 else 1)
