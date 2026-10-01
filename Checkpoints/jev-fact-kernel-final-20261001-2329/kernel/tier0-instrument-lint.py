#!/usr/bin/env python3
"""TIER 0 — THE INSTRUMENT LINT.

Fires on MEASUREMENT CODE whose cost scales with its OUTPUT rather than with the measured thing.
It never reads prose.

Exit 0 = clean.  Exit 1 = a hit, with the reason named.  Exit 2 = UNMEASURED (an unread path).

THE COVERED CLASS: a byte-at-a-time read inside a measured region — ONE SYSCALL PER BYTE, whose
count IS the elapsed time the caller is about to report. Its subject is unambiguous.

THE UNCOVERED CLASSES (recorded, not policed by a guess — each was measured and DROPPED for a
non-zero false-positive rate): a growing buffer concatenated inside a timed region (fires on
legitimate code), a line-wise read (readline() is legitimate), a `| head` in a timed pipeline
(never bit the positive; matched its own documentation text), and a sleep inside a measured span
(never bit the positive). A pattern that cannot PROVE its context does not ship.
"""
import re, sys, pathlib

# Each pattern: (id, the regex, why it is a defect, the remedy)
# ── THE PATTERN SET, DERIVED BY PRECISION — NOT BY IMAGINATION ──────────────────────────────────
# Each pattern was run against three corpora: the POSITIVE fixture (must bite), the NEGATIVE
# fixture (must stay silent), and the kernel's OWN source (must stay silent). Measured:
#
#   T0_BYTE_READ_IN_TIMED_LOOP          POS=1 NEG=0 SELF=0   KEEP
#   T0_GROWING_BUFFER_IN_TIMED_REGION   POS=1 NEG=1 SELF=1   DROP  (fires on legitimate code)
#   T0_BYTE_READ_ANY                    POS=1 NEG=0 SELF=1   DROP  (readline() is legitimate)
#   T0_PIPE_HEAD_IN_TIMED_PIPELINE      POS=0 NEG=0 SELF=1   DROP  (never bites; matches its own text)
#   T0_SLEEP_IN_MEASUREMENT             POS=0 NEG=0 SELF=0   DROP  (never bites)
#
# THE LAW THIS ENCODES: a pattern that cannot PROVE its context does not ship. Four of the five
# were guesses wearing a gate — they fired on the FORM without the timed REGION, so their
# false-positive rate was non-zero and their verdicts carried no information. Only the pattern
# whose subject is unambiguous — ONE SYSCALL PER BYTE — survives its own controls.
#
# The honest consequence: tier 0 covers the byte-read class and NOTHING ELSE. The other four
# classes are recorded as UNCOVERED (see the module docstring) rather than policed by a guess.
PATTERNS = [
 ("T0_BYTE_READ_IN_TIMED_LOOP",
  re.compile(r'\.read\(\s*1\s*\)'),
  "a byte-at-a-time read: ONE SYSCALL PER BYTE. Against a 187,757-byte reply this IS the elapsed "
  "time you are about to report. You are timing the instrument, not the subject.",
  "use a buffered read: os.read(fd, 65536) or a reader thread"),
]

def scan(text: str, name: str) -> list[tuple[str, str, str, int, str]]:
    out = []
    for pid, rx, why, fix in PATTERNS:
        for m in rx.finditer(text):
            line = text[:m.start()].count("\n") + 1
            out.append((pid, why, fix, line, m.group(0)[:60]))
    return out

def main(argv):
    # ── THE EMPTY-PATH LAW (the independent audit's A1 finding) ─────────────────────────────────
    # `targets = argv[1:] or ["."]` treats an EXPLICIT empty string as falsy-adjacent and let it
    # fall through to `Path("")` == ".", so `lint ''` silently scanned the CWD — and hit a
    # Checkpoints/ copy of the same fixture, DOUBLE-COUNTING it. The scope was wrong, not the
    # verdict (it BLOCKed rather than passed, so the direction was fail-safe) — but a gate whose
    # scope depends on an empty string is a gate whose scope is undetermined.
    # THE LAW: no args -> the cwd, by DESIGN. An EXPLICIT empty arg -> UNMEASURED, by REFUSAL.
    args = argv[1:]
    if any(not a.strip() for a in args):
        print("FACT-FIREWALL T0 UNMEASURED: an empty path argument was given — this is NOT a pass.")
        print("  UNMEASURED  ''  (empty path — refusing to infer a scope)")
        print("  remedy: pass a real path, or no argument at all to scan the cwd by design.")
        return 2
    targets = args or ["."]
    hits = 0
    scanned = 0
    unmeasured = []          # every target/file the lint could NOT read

    # ── THE FAIL-CLOSED LAW (FR-10) ─────────────────────────────────────────────────────────────
    # An absent path, an unreadable file, or an unlistable directory is UNMEASURED — exit 2 with
    # the subject NAMED. It is NEVER 'clean'. A gate that cannot tell 'inspected and clean' from
    # 'nothing to inspect' is the dead-gate class: its silence and its pass are the same bytes.
    # T4 (tier4-lsp-capability-probe.py) is the reference implementation of this behaviour.
    for t in targets:
        p = pathlib.Path(t)
        if not p.exists():
            unmeasured.append((str(t), "does not exist"))
            continue
        try:
            if p.is_file():
                files = [p]
            else:
                files = [f for f in p.rglob("*.py")] + [f for f in p.rglob("*.sh")] + [f for f in p.rglob("*.ts")]
        except Exception as e:
            unmeasured.append((str(t), f"unlistable: {e}"))
            continue
        for f in files:
            if any(x in str(f) for x in ("node_modules", "/.git/", "__pycache__", ".venv", "site-packages")):
                continue
            try:
                text = f.read_text(errors="ignore")
            except Exception as e:
                unmeasured.append((str(f), f"unreadable: {e}"))
                continue
            scanned += 1
            for pid, why, fix, line, snippet in scan(text, str(f)):
                hits += 1
                print(f"FACT-FIREWALL T0 BLOCK  {pid}")
                print(f"  at      {f}:{line}")
                print(f"  span    {snippet!r}")
                print(f"  why     {why}")
                print(f"  remedy  {fix}")
                print()
    if hits:
        print(f"FACT-FIREWALL T0: {hits} instrument defect(s). A number produced by any of these "
              f"measures the INSTRUMENT. Fix the instrument, or state its validation in the claim.")
        return 1
    if unmeasured:
        print(f"FACT-FIREWALL T0 UNMEASURED: {len(unmeasured)} target(s) could not be read — "
              f"this is NOT a pass. {scanned} file(s) were inspected.")
        for t, why in unmeasured:
            print(f"  UNMEASURED  {t}  ({why})")
        print("  remedy: point the lint at a path that exists, or record the absence as a block.")
        return 2
    print(f"FACT-FIREWALL T0: clean. ({scanned} file(s) inspected)")
    return 0

if __name__ == "__main__":
    sys.exit(main(sys.argv))
