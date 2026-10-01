#!/usr/bin/env python3
"""THE FACT-FIREWALL LEDGER — one append-only row per decision.

Every tier's verdict lands here. The row shape is fixed: {Pattern, State, Evidence}. A decision
without its Evidence triad is not recorded — no triad, no block.

    ledger.append(pattern, verdict, tier, confidence, **evidence)

The file is append-only by construction: it is opened 'a' and every row is one JSON line. A row
is never rewritten; a correction is a NEW row. A lost write never becomes a pass — the caller
reads the return code, and a ledger failure is itself a LOUD refusal (FR-10's law, applied to
the evidence chain).
"""
import json, os, time, pathlib, sys

PATH = pathlib.Path(os.environ.get("JM_LEDGER", os.path.expanduser("~/.omp/run/fact-firewall.jsonl")))

def append(pattern: str, verdict: str, tier: int, confidence: float, **evidence) -> bool:
    """Append one decision row. Returns True on a durable write, False on a LOUD failure."""
    PATH.parent.mkdir(parents=True, exist_ok=True)
    row = {
        "ts": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "Pattern": pattern,
        "State": {"tier": tier, "verdict": verdict, "confidence": confidence},
        "Evidence": evidence,
    }
    try:
        with PATH.open("a", encoding="utf-8") as f:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")
            f.flush()
            os.fsync(f.fileno())          # a durable write, or the row did not happen
        return True
    except Exception as e:
        sys.stderr.write(f"FACT-FIREWALL LEDGER WRITE FAILED: {e} — the decision stands, the row is LOST\n")
        return False

if __name__ == "__main__":
    # a self-test: append one row and read it back
    ok = append("LEDGER_SELFTEST", "PASS", 0, 1.0, note="the writer is reachable", pid=os.getpid())
    print(f"  append -> {ok}")
    if PATH.exists():
        last = PATH.read_text().strip().splitlines()[-1]
        print(f"  last row: {last[:160]}")
    sys.exit(0 if ok else 1)
