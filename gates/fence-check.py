#!/usr/bin/env python3
"""fence-check.py — Plan B spec-gate helper (CI step: `python3 gates/fence-check.py <sha>`).

The fence must hold a PASS row for the PR head sha in the verdict ledger.

THE EXIT CONTRACT (each code is DISTINCT — the CI switches on them explicitly):
  exit 0 = a PASS row exists for <sha>   -> FENCE:<sha>:PASS
  exit 1 = a ledger exists but holds no PASS row for <sha>
                                     -> FENCE:<sha>:NO-PASS-ROW
  exit 2 = cannot measure (bad args, or the ledger file is unreadable/unparseable)
           — the unmeasured case is never a pass.
  exit 3 = NO LEDGER EXISTS (a fresh CI checkout carries no host ledger)
                                     -> FENCE:<sha>:NO-LEDGER-SKIP
           SKIP is a NAMED, ACKNOWLEDGED state, NEVER a silent pass: the CI
           (.github/workflows/gates.yml) handles 3 explicitly and prints the
           reason. It was exit 0 before 2026-09-24, which made a skip
           indistinguishable from a real PASS row to an exit-code-only caller.
           The fail-closed fence enforcement lives where the ledger EXISTS: the
           kernel's verify() (a fence PASS row + a head binding) and
           .githooks/pre-commit (G-SEAL).
A ledger row counts for <sha> when its verdict is PASS and the first
|-segment of its evidence field is a prefix of <sha> (the fence records
16-hex evidence prefixes; CI passes the full 40-hex head sha).
"""
import json
import os
import re
import sys


def main(argv: list) -> int:
    if len(argv) != 2 or not argv[1].strip():
        print("FENCE-ERROR:usage:expected one git sha argument")
        return 2
    sha = argv[1].strip()
    # FIXED (ocr audit medium): the sha was only checked non-empty — a malformed
    # argument fell through to NO-PASS-ROW (exit 1), conflating a bad invocation
    # with a measured fail. A git sha is 7..40 hex.
    if not re.fullmatch(r"[0-9a-fA-F]{7,40}", sha):
        print(f"FENCE-ERROR:bad-args:not a git sha: {sha[:40]}")
        return 2
    needle = sha.lower()
    # FIXED (ao-review-4 finding): three different ledger defaults existed
    # (here .trident/verdicts.jsonl, G-SEAL $HOME/.../b6, verdict.ts LEDGER_DEFAULT).
    # Unified on ONE env var — FENCE_LEDGER (FENCE2_LEDGER a back-compat alias) —
    # and the SAME canonical default as src/verdict.ts: the fence2 ledger.
    ledger = (os.environ.get("FENCE_LEDGER") or os.environ.get("FENCE2_LEDGER")
              or os.path.join(os.path.expanduser("~"), "JARVIS_WORKSPACE", "Shared_Workspace",
                              "JARVIS-CORE", "b6", "verdicts.jsonl"))
    if not os.path.exists(ledger):
        # ADJUDICATED (ao-review-4 round 2 finding, two-sided): the reviewer asked
        # for exit 2 on an absent ledger (fail-closed). APPLIED and MEASURED: it
        # reddens the CI's spec-gate, because the ledger is a HOST artifact
        # (gitignored) that a CI checkout legitimately lacks — the fail-closed
        # enforcement lives where the ledger EXISTS: the KERNEL's verify() requires
        # a fence PASS row + a head binding, and .githooks/pre-commit runs this
        # check against the host ledger. In CI the absent ledger is a named SKIP,
        # never a pass-with-evidence claim.
        # FIXED (ocr audit high): SKIP and PASS BOTH returned 0, and the CI checks
        # only the exit code — so a fresh checkout passed spec_gate with ZERO fence
        # evidence. They are now DISTINCT: 0 = a real PASS row; 3 = a named SKIP.
        # The CI handles 3 EXPLICITLY (an acknowledged skip, not a pass).
        print(f"FENCE:{sha}:NO-LEDGER-SKIP (CI has no host ledger at {ledger}; the fence row is checked on the host)")
        return 3
    try:
        fh = open(ledger, "r", encoding="utf-8")
    except OSError as exc:
        print(f"FENCE-ERROR:ledger-unreadable:{ledger}:{exc.strerror or exc}")
        return 2
    # FIXED (ocr audit high): the iteration ran OUTSIDE any guard, so a mid-read
    # OSError or a UnicodeDecodeError escaped as an unhandled traceback (exit 1,
    # colliding with NO-PASS-ROW) instead of the documented exit 2.
    try:
        lines = fh.read().splitlines()
    except (OSError, UnicodeDecodeError) as exc:
        print(f"FENCE-ERROR:ledger-read-failed:{ledger}:{exc}")
        return 2
    finally:
        fh.close()
    for line in lines:
        line = line.strip()
        if not line:
            continue
        try:
            row = json.loads(line)
        except ValueError:
            continue
        if not isinstance(row, dict) or row.get("verdict") != "PASS":
            continue
        # FIXED (ocr audit medium): `str(row.get("evidence"))` widened a non-string
        # (e.g. a JSON number of 16 decimal digits) into a value that passed the
        # 16-hex test. A real string is required.
        ev = row.get("evidence")
        if not isinstance(ev, str):
            continue
        first = ev.split("|")[0].strip().lower()
        # FIXED (ao-review-4 round 3 finding): the prefix match had no minimum
        # length or hex-shape check — a 1-char prefix matched 1 in 16 shas by
        # chance, so a planted short row passed. The docstring promises 16-hex;
        # that is now ENFORCED (a non-16-hex evidence prefix is not a fence row).
        if not re.fullmatch(r"[0-9a-f]{16}", first):
            continue
        if needle.startswith(first):
            print(f"FENCE:{sha}:PASS")
            return 0
    print(f"FENCE:{sha}:NO-PASS-ROW")
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
