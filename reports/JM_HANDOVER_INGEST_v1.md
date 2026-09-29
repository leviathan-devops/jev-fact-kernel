# JEV MANAGER — HANDOVER INGEST (the fresh-agent context, verified against disk)

**Ingested:** 2026-09-29 · the handover `docs/handovers/JEVMANAGER_CONTEXT_HANDOVER.md`
(1,115 L) + the read-order sources. **Method:** per §11 — evidence from DISK, not memory.

## §A THE CONFLICT RULE (copied, never re-derived)

```
If this handover conflicts with a BINDING spec on implementation DETAIL, BINDING wins.
If a BINDING spec conflicts with a SUPERSEDED spec, BINDING wins.
Dead paths OVERRIDE any superseded keep-alive/v1-daemon language.
Adjacent products are OTHER PRODUCTS. Never the drive.
```
BINDING order: 1 `README.md` (804 L, the operational contract) · 2 `Bibles/JM_BIBLE.md`
(769 L) · 3 `reports/JM_MASTER_BLUEPRINT.md` (220 L). Only ONE is binding by design.

## §B THE KICK PROMPT'S THREE EVIDENCE CHECKS (run, verbatim results)

```
1 · THE JUDGE IS THE ADAPTER
  $ curl -s http://127.0.0.1:8090/health
  {"ok": true, "model": "jevk5-4b-v0.2-Q8_0", "runtime": "gguf"}          ✓ MATCHES

  a 3-criteria `choice` → :8090/v1/systemone:
  {"choice":"THEATRICAL","probabilities":{"GENUINE":0.2305,"WEAK":0.2136,
   "THEATRICAL":0.5559}} · latency_ms 143                        ✓ choice WORKS

2 · CLASSIFICATION END TO END
  $ jm decision-tree --rows /tmp/rows.json --recipe /tmp/recipe.json --out /tmp/decisions.json
  JM_DECISIONS rows=10 decided=10 act=0 escalate=10 noop=0 calls=10 cached=0 requests=1
  the out: 10 records · route=escalate · choice=CODE            ✓ requests=1 (healthy)

3 · THE GATE PASS AND FAIL
  $ jm push-gate            → PUSH_GATE ALLOW exit=0 (5 pass, 1 skip)
  $ (flip one digit of the doc's TREE SHA) jm push-gate
  FAIL  Zero drift?  bundle=07c96789… stated=07c96789…          ✓ FAILS (exit 1)
  restored
```

## §C THE FINDINGS (measured against disk — 3 real, 1 cosmetic)

### ★ F-1 · THE TREE-SHA EXPRESSION IS LOCALE-DEPENDENT (a live gate defect)

The handover's §12 calls the seal + the gate "ONE contract — the same expression." The
EXPRESSION is byte-identical; the **RESULT is not**, because `sort` collates differently by
locale:

```
the same tree, the same expression, two environments:
  bash (my shell):        18bfbb0ea769ec2df5d427da5aa4ad3d
  the gate (execSync):    07c96789730595377891934f34152610   ← the doc's stated value
  with LC_ALL=C (both):   18bfbb0ea769ec2df5d427da5aa4ad3d

THE MECHANISM (measured): tests/adversarial.test.ts sorts to a DIFFERENT POSITION under
the two shells — `diff` shows ONLY that line moving (42d41 / 44a44). The changed ORDER
changes the concatenation → a different outer sha256.
```
**THE CONSEQUENCE:** the "Zero drift?" gate passes only because the gate's `execSync` env
happens to collate like the seal's. **Any tool computing the sha under a different locale
(a future seal run, another agent's shell, another host) flips the item** — and the doc's
`07c96789…` is not the C-locale value. **THE FIX:** pin `LC_ALL=C` in BOTH
`scripts-seal.sh:50` and `push-gate.ts:192`, then re-stamp the docs to `18bfbb0e…`.
This is the C-1 class (a gate whose two halves can disagree) in a NEW form.

### ★ F-2 · TWO TESTS FAIL ON THE CURRENT TREE (the handover claims 253 pass / 0 fail)

```
$ bun test        → 245 pass · 2 FAIL · Ran 247 tests across 44 files
the handover §5.3 → "253 tests"        §9 P-7 → "253 pass, 0 fail"
```
Both failures are **stale tests pinning the REVERTED behavior** — left un-updated by the
`ff2f490` fix (the guard's deletion + `instructions` becoming required):

| the test | what it asserts | why it fails |
|---|---|---|
| `tests/ladder-reason.test.ts` `test_D034_only_noul_is_accepted_because_only_noul_WORKS` | that `validateRecipe` THROWS `/accepts "noul" ONLY/` for choice/mcq | the noul-only guard was DELETED (D-1: 0 hits) — exactly the behavior the handover §13 #1 disproved |
| `tests/adversarial3.test.ts` `test_recipe_hostile_shapes` | its positive half expects `{type:"noul"}` (no `instructions`) to be ACCEPTED | the fix made `instructions` REQUIRED, matching the adapter — the minimal recipe now refuses |

**THE CLASS:** tests PINNING A DEFECT (the handover's own §6 "transcript signatures" and the
`04_ADJACENT` warning). The handover's §5.3 number is FALSE on the current tree.

### ★ F-3 · THE FREEZE/HEAD MISMATCH (a doc-anchor drift)

```
the handover §freeze:  ff2f490
EVIDENCE_STATE.md:     "TREE SHA: 07c96789… (git bf99c64)"
the actual HEAD:       02dfa1a  (docs(handovers) — 2 files, 1115 insertions)
```
The doc annotates the sha with `bf99c64`, which is an ANCESTOR of the fix `ff2f490`.
The annotation is stale (the sha 07c96789 was re-stamped post-fix; the "(git …)" label was
not). Harmless alone, but it is the doc-vs-disk drift class.

### F-4 · THE COSMETIC (the §12 `cut -c1-16` contract)

`grep -c "cut -c1-16" src/verbs/push-gate.ts` → **1**, not the expected 0 — but the match is
in a **COMMENT** documenting the fixed defect (`push-gate.ts:187`). The live expression is
`cut -c1-32` at `:192`. **The fix IS correct; the §12 contract's `expect: 0` is too strict**
(it counts the explanatory comment). No action beyond noting it.

## §D THE OPEN WORK (the handover's §8 — status measured, not assumed)

| # | the item | the disk truth |
|---|---|---|
| D-1 | the noul-only guard gone | ✓ `grep -c 'noul" ONLY'` → 0 |
| D-2 | criteria forwarded | ✓ `grep -c 'q.criteria'` → 2 |
| D-3 | the endpoint `:8090` | ✓ `grep -c 8090 ~/.omp/agent/mcp.json` → 1 |
| D-4 | the hook pins the endpoint | ✓ 2 hits |
| D-5 | no price language | to check |
| **B-1** | **the byte-budgeted chunk** | ★ **OPEN** — `grep -c 'CHUNK = 200'` → 1 (the defect's signature) |
| B-2..B-6 | hoisting · the warm-up · the cascade · claim-audit · forensics | not started |

**B-1 is the named open defect:** the claim loop's unit is 200 **ROWS**, and `criteria`
repeats per question, so a realistic payload overflows the 256 KB cap. The check: 10 rubrics
+ 1 KB excerpts must succeed at 658 rows without external chunking.

## §E THE RULINGS (copy into notes — never reopen)

- **R-01** the judge is LOCAL and FREE; `cost_usd` is a SAVINGS figure (the hosted rate ×
  tokens); nothing is billed.
- **R-02** JevK5 has ALL normal Jev functions — the noul-only guard was FALSE and is DELETED;
  `choice` and `score` work. Probe the ENDPOINT before believing a refusal.
- **R-03** fix core-infra blockers immediately.
- **R-04** an audit is a FIX pass, not a report.
- **R-05** the acceptance test is REAL work on a REAL corpus, not a green suite.

## §F THE LAW TO CARRY (the question-shape law + the controls)

```
1 ASK ONE THING.  "X or Y" blends → mid-range max → never clears a threshold.
2 SWEEP the threshold; read max + spread.  spread>0.25 discriminates; max<0.5 = a broken question.
3 A MAX BELOW 0.5 IS A QUESTION DEFECT, not a threshold problem. REWRITE IT.
4 EVERY NUMBER CARRIES ITS CONDITIONS (candidates, requests=1, warm/cold, the locale).
5 requests=1 for N items is the health check; requests=N = the canon fallback is carrying it.
6 THE JUDGE NARROWS; THE SOURCE PROVES.  A judge hit is a hypothesis; a file:line with the
  mechanism is a finding.
```

## §G THE SELF-CHECK (the handover's seven, verified)

1 ✓ the judge is `:8090/v1/systemone`, LOCAL, FREE; `:8008/v1/systemone` is a 404
2 ✓ `noul`/`choice`/`score`; the field is `criteria` (never `options`); ≥2 criteria; ≥2 levels
3 ✓ a gate is driven BOTH ways — push-gate PASS (exit 0) and FAIL (exit 1) both observed
4 ✓ `0 kept` is an alarm — the compound-question cap is the cause
5 ✓ `requests=1` for 10 rows — measured
6 ✓ the seal + the gate are ONE contract — **but the RESULT is locale-dependent (F-1)**
7 ✓ run the tool before reasoning — found F-1/F-2 by running, not reading

**THE RESIDUAL (what this ingest did NOT do):** no code was changed; B-1..B-6 remain open;
the §14 operator questions (Q-1..Q-5) remain unanswered; the 2 failing tests are DIAGNOSED,
not fixed.
