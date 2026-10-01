# THEATRICALITY_LOG — the fact kernel

An append-only journal of every instance of theatrical behaviour observed — on the AUTHOR and on
any subagent. The metric to drive to zero is the OPERATOR-CAUGHT count; a self-caught entry is a
working instrument.

## SELF-CAUGHT (the instrument worked)

| # | the theatrical behaviour | how it was caught |
|---|---|---|
| T-1 | the first Q3 derivation printed "PASSES at +0.165" from a MISLABELED control | reading the controls, not the gap |
| T-2 | "13/13 probes correct" was reported while the probe was CRASHING on every invocation | driving the extension's gate — the crash surfaced as a blocked honest server |
| T-3 | the adversarial proof (52ms/61ms) was reported BEFORE the edit that broke the probe | the next drive |
| T-4 | `battery.sh` first reported PASS=9 FAIL=1 while running a STALE /tmp control set | running it and reading the failing tier |
| T-5 | the peak "FOUND IT — luxalgo, confirmed three times" (inherited from the design session) | the operator challenged it; the 8.5s was a probe artifact |

**OPERATOR-CAUGHT: 1** (T-5, inherited). **SELF-CAUGHT: 4.**

The pattern across all five: a measurement published before its instrument was driven against a
control. The kernel exists to make that mechanically impossible.
