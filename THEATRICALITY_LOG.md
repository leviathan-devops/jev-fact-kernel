# THEATRICALITY_LOG — the Jev fact kernel

**An append-only journal of every instance of theatrical behaviour observed — on the AUTHOR and on
any subagent.**

The metric to drive to zero is the **OPERATOR-CAUGHT** count. A **SELF-CAUGHT** entry is a working
instrument; an operator-caught entry is a missing one.

---

## THE ENTRIES

| # | the theatrical behaviour | how it was caught | disposition |
|---|---|---|---|
| T-1 | the first Q3 derivation printed **"rewritten gap +0.165 — PASSES"** from a MISLABELED control | reading the CONTROLS, not the gap | SELF-CAUGHT — corrected to +0.047, NOT adopted |
| T-2 | **"13/13 probes correct"** was reported while the probe was CRASHING on every invocation | driving the extension's gate — the crash surfaced as a blocked HONEST server | SELF-CAUGHT — the call restored (EN-119) |
| T-3 | the adversarial proof (52 ms / 61 ms) was reported **BEFORE the edit that broke the probe** | the next drive | SELF-CAUGHT — the timeline corrected in the commit |
| T-4 | `battery.sh` reported **PASS=9 FAIL=1** while running a STALE `/tmp` control set | running it and reading the failing tier | SELF-CAUGHT — the controls moved into the repo (EN-120) |
| T-5 | **"FOUND IT — luxalgo, CONFIRMED THREE TIMES"** — the 8.5 s was a byte-at-a-time read artifact; the true latency was 0.28 s | **THE OPERATOR** challenged it: "why is this causing a slow load? this shouldnt" | **OPERATOR-CAUGHT** (inherited from the design session) |
| T-6 | the T4 probe's ledger row for a FIXTURE carried `"server":"plutus-lsp"` — a hardcoded label | reading the ledger's own output | SELF-CAUGHT — the label now derives from the subject |
| T-7 | the battery's T5 header said **"the 13 controls"** while the body counted 16/16 | **THE INDEPENDENT AUDITOR** | caught by the audit — the label now states no count |
| T-8 | `lint ''` **scanned the CWD** instead of returning UNMEASURED, and double-counted a Checkpoints copy | **THE INDEPENDENT AUDITOR** (A1) | caught by the audit — FIXED (EN-124) |

## THE COUNTS

```
OPERATOR-CAUGHT       1        (T-5, inherited)
AUDITOR-CAUGHT        2        (T-7, T-8)
SELF-CAUGHT           5        (T-1, T-2, T-3, T-4, T-6)
```

**AUDITOR-CAUGHT is the new column, and it exists because the author is never the auditor.**
T-7 and T-8 were invisible to the author: one was a cosmetic drift the author's eye skipped, the
other a path the author never thought to drive. **An independent agent with no stake in the claims
found both in one sweep.**

## THE PATTERN ACROSS ALL EIGHT

A measurement published before its instrument was driven against a control. Every single one.

**The kernel exists to make that mechanically impossible** — and the two AUDITOR-CAUGHT entries
prove the corollary: even a kernel built to catch this needs a second pair of eyes on ITSELF.
