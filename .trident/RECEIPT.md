# THE RECEIPT — JevManager production grade (the legal-stop record)
**Date:** 2026-09-23 · **commit:** c4267ba · **the checkpoint:** Checkpoints/jm-production-grade-55dc761/

## 1 · THE BASELINE DIFF (what the pin claimed vs what was measured)
| the pin said | the re-measurement |
|---|---|
| repo @ d3bf4a2 | **e30c412 at first reply** (the terminal-gate spec commit landed after the pin) |
| src 34 files / 4857 lines | 34/4857 ✓ |
| tests 44 files / 5909 lines | 44/5909 ✓ |
| bundle 6092f398c2264134 | ✓ |
| battery 233 pass / 0 fail | 233/0 ✓ |
| flake 0/20 (concurrency=1) | ✓ |
| skill 155 lines · host suite 12/12 · store 4.0G | ✓ |

## 2 · THE BATTERY (verbatim, this session)
```
$ bun test          -> 237 pass / 0 fail · 1209 expect() · 43 files · 40.96s
$ bunx tsc --noEmit -> exit 0
$ ./scripts-host-suite.sh -> PASS 12 · FAIL 0 (the DEPLOYED launcher, the registry's env)
$ bun run scripts-recovery-proof.ts -> exit 0 (SIGKILL: 16 done/576 pending/8 running -> 600 done, dup=0)
```

## 3 · THE AUDIT VERDICT
```
AUDIT GATE: BLOCKED — PROVIDER_QUOTA_EXHAUSTED (429 on all 6 attempts)
BLOCKED IS NEVER PASS. No ship-ready claim rests on this run.
Retry: re-fire `qwen-code-audit action=review from=d3bf4a2 to=HEAD` when quota resets.
```

## 4 · THE RUNTIME LEDGER
`RL-01` — the account hit `HTTP 402 billing_error` mid-build. **The mechanism was in the DESIGN, not
the provider:** nothing bounded REQUEST FREQUENCY; `Budget` is per-invocation and resets every run.
That finding BECAME W3 (the rate limiter, `test_limiter_caps_concurrency` peak<=2 under 20 callers).
`.trident/runtime-ledger.md` carries the verbatim evidence.

## 5 · THE OPERATOR TRANSCRIPTS (the terminal gate)
`.trident/operator-gate/OperatorC-result.md` — TASK B, 37m43s, FIRST ATTEMPT.
```
 Operator 1 (this session)  the reference operations
 Operator 2 (OperatorA)     TASK A completed
 Operator 3 (OperatorC)     TASK B completed: blocks exit 1 (noul 0.8777), allows exit 0
                            (commit cb03dac), negative controls pass, FAIL-CLOSED proven,
                            AND it iterated its own recipe (v1 false-allowed at 0.464 -> v2 0.8777)
```
**GATE-3OP: MET.**

## 6 · THE CHECKPOINT
`Checkpoints/jm-production-grade-55dc761/` — Mode B (no-lock) · src 36 files/5183 lines · tests 46
files · canon 12 · the 6 ship docs · the spec package · the CI gate · the host suite · the recovery
proof · `.trident/` · `CHECKPOINT_MANIFEST.md` with 5 HONEST GAPS.

## 7 · WHAT CHANGED THIS BUILD (the defects found and killed)
```
 EN-107 THE BATCH PATH        98 requests -> 1 (measured: n=400 in 2.39s, time flat in n)
 EN-108 decision-tree batched + the claim loop (a refund frees room for the next chunk)
 EN-109 the fd flake          20% failure rate -> 0/20 (jsonl awaits 'close')
 EN-110 the port flake        three hardcoded ports -> port: 0
 EN-111 the env-race flake    concurrency = 1 (22 files mutate process.env)
 EN-112 the local judge       decider-2b v10 on GPU (:8008, ~1s/question, ECE 0.037)
 W3 the rate limiter          a chokepoint + bounded retry + 402-terminal
 W4 the recovery PROOF        kill -9 -> resume, dup=0, 600/600
 W5 the CI gate               .github/workflows/gate.yml (adverse-first)
 RL-01 the 402                the runtime ledger's first entry
 F-22 six duplicate jobs      read the registry before firing
 T-12 a flake rate without its conditions
```

## 8 · THE HONEST REMAINDER (what this receipt does NOT claim)
1. **The audit gate is BLOCKED**, not passed — the code audit could not run.
2. **The CI gate is authored, not REQUIRED** — branch protection is an operator-owned remote setting.
3. **The container round** — the tool was not mounted this session; the host suite (12/12, the
   deployed launcher) is the deployed proof.
4. **The decider server is not supervised** — a nohup; the restart command is in DEBUG_LOG EN-112.
5. **decider-2b's thresholds may need re-tuning** — its honest calibration (route p=0.371 where kev
   said 0.97) means JM's policy bands were tuned against a different scale.
