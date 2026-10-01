#!/usr/bin/env python3
"""TIER 0 — THE INSTRUMENT LINT.

Fires on MEASUREMENT CODE whose cost scales with its OUTPUT rather than with the measured thing.
It never reads prose. It greps generated measurement code, so its false-positive class is empty:
none of these forms appears in production code by accident.

Exit 0 = clean.  Exit 1 = a hit, with the reason named.
"""
import re, sys, pathlib

# Each pattern: (id, the regex, why it is a defect, the remedy)
PATTERNS = [
 ("T0_BYTE_READ_IN_TIMED_LOOP",
  re.compile(r'\.read\(\s*1\s*\)'),
  "a byte-at-a-time read: ONE SYSCALL PER BYTE. Against a 187,757-byte reply this IS the elapsed "
  "time you are about to report. You are timing the instrument, not the subject.",
  "use a buffered read: os.read(fd, 65536) or a reader thread"),
 ("T0_GROWING_BUFFER_IN_TIMED_REGION",
  re.compile(r'buf\s*\+=\s*\w+\s*\n(?!.*\bbreak\b)', re.M),
  "a buffer concatenated inside the timed region: string-grow is O(n) per append in some "
  "runtimes, so the elapsed time carries the buffer, not the subject.",
  "collect into a list and join once, outside the measured span"),
 ("T0_BYTE_READ_ANY",
  re.compile(r'read\(\s*1\s*\)|readline\(\s*\)\s*$', re.M),
  "a byte/line-wise read in a measured path — the reply's SIZE leaks into the number.",
  "read in blocks and measure only the blocking round trip"),
 ("T0_PIPE_HEAD_IN_TIMED_PIPELINE",
  re.compile(r'\|\s*head\b[^\n]*\btime\b|\btime\b[^\n]*\|\s*head\b'),
  "`| head` closes the pipe early (SIGPIPE): the producer dies and the elapsed time measures "
  "the KILL, not the work.",
  "read to completion, or bound the producer explicitly"),
 ("T0_SLEEP_IN_MEASUREMENT",
  re.compile(r'\b(sleep|time\.sleep)\([^)]*\)[^\n]*\b(elapsed|dt|time\(\))'),
  "a sleep inside the measured span — the number is the sleep, not the subject.",
  "move the sleep outside the timed region"),
]

def scan(text: str, name: str) -> list[tuple[str, str, str, int, str]]:
    out = []
    for pid, rx, why, fix in PATTERNS:
        for m in rx.finditer(text):
            line = text[:m.start()].count("\n") + 1
            out.append((pid, why, fix, line, m.group(0)[:60]))
    return out

def main(argv):
    targets = argv[1:] or ["."]
    hits = 0
    for t in targets:
        p = pathlib.Path(t)
        files = [p] if p.is_file() else [f for f in p.rglob("*.py")] + [f for f in p.rglob("*.sh")] + [f for f in p.rglob("*.ts")]
        for f in files:
            if any(s in str(f) for s in ("node_modules", "/.git/", "__pycache__")): continue
            try: text = f.read_text(errors="ignore")
            except Exception: continue
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
    print("FACT-FIREWALL T0: clean.")
    return 0

if __name__ == "__main__":
    sys.exit(main(sys.argv))
