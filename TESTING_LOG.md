# TESTING_LOG — the fact kernel

## THE ADVERSE-FIRST ORDER

Every adversarial case ran BEFORE its happy path. The corpus is the fixtures plus the live host.

| # | the case | the command | the verdict |
|---|---|---|---|
| ADV-1 | a server declaring 23 capabilities, implementing 0 | `... fixtures/lying-server bun server.ts` | BLOCK, exit 1, 23 lies, 169ms |
| ADV-2 | a server declaring 0, answering everything | `... fixtures/honest-server bun server.ts` | PASS, exit 0, 0 lies, 60ms |
| ADV-3 | an unread path | `tier0-instrument-lint.py /tmp/NOPE.py` | UNMEASURED, exit 2 |
| ADV-4 | an unreadable file (chmod 000) | `tier0-instrument-lint.py /tmp/noread.py` | UNMEASURED, exit 2 |
| ADV-5 | the kernel's own source | `tier0-instrument-lint.py kernel/` | clean, exit 0 |
| ADV-6 | a probe that would HANG | (measured — the read is now bounded) | 60-169ms, no hang |
| ADV-7 | a deaf server (readline strips the terminator) | (measured) | UNMEASURED — the fail-closed law located it |

## THE HAPPY PATH, LAST

`bash kernel/battery.sh` → **PASS=10 FAIL=0 UNMEASURED=0**.

## THE FOUR DEFECTS FOUND BY RUNNING (EN-115..119)

| EN | the defect | the kill |
|---|---|---|
| 115 | the T0 pattern set was imagined — 4 of 5 patterns false-positived | the precision measurement per pattern |
| 116 | the cascade failed its first control at 5/8 | the question rewritten ×3 → 8/8 |
| 117 | the probe HUNG and my fixtures were DEAF | bounded reads + raw frame parsing |
| 118 | the Q3 rewrite failed the bar; a mislabeled control nearly published a false pass | the label corrected → +0.047, NOT adopted |
| 119 | the probe had been CRASHING since dc35064; the gate called the crash a finding | the call restored; a LIE needs its LIE lines |
