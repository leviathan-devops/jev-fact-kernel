#!/usr/bin/env bash
# kernel/battery.sh — THE FACT KERNEL'S BATTERY (DPL1 FR-12).
#
# Runs EVERY proof tier and prints its tool-result token. Exit 0 == every tier green.
# A tier that cannot run is UNMEASURED (exit 2), never a pass — the fail-closed law.
set +e
cd "$(dirname "$0")/.." || exit 2
W="$PWD"
PASS=0; FAIL=0; UNM=0

t() {  # t <name> <want-exit> <cmd...>
  local name="$1" want="$2"; shift 2
  local out; out=$(timeout 300 "$@" 2>&1); local e=$?
  if [ "$e" = "$want" ]; then printf "  PASS  %-46s exit=%s\n" "$name" "$e"; PASS=$((PASS+1))
  elif [ "$e" = "2" ]; then printf "  UNM   %-46s exit=%s (UNMEASURED)\n" "$name" "$e"; UNM=$((UNM+1))
  else printf "  FAIL  %-46s exit=%s want=%s\n" "$name" "$e" "$want"; FAIL=$((FAIL+1)); fi
  printf '%s' "$out" > /tmp/batt-out
}

echo "═══ THE FACT KERNEL BATTERY ═══"
echo ""
echo "── T1 SCRIPT · T0's three controls (ST-101..103) ──"
t "T0 POS  fixtures/broken-probe.py"   1 python3 kernel/tier0-instrument-lint.py fixtures/broken-probe.py
printf "        token: %s\n" "$(grep -c 'FACT-FIREWALL T0 BLOCK' /tmp/batt-out)"
t "T0 NEG  fixtures/clean-probe.py"    0 python3 kernel/tier0-instrument-lint.py fixtures/clean-probe.py
t "T0 UNREAD /tmp/NOPE.py"             2 python3 kernel/tier0-instrument-lint.py /tmp/NOPE.py
t "T0 SELF kernel/"                    0 python3 kernel/tier0-instrument-lint.py kernel/
echo ""
echo "── T4 ADVERSARIAL · the lying/honest pair (adversarial FIRST) ──"
t "T4 ADV  lying (declares 23)"        1 python3 kernel/tier4-lsp-capability-probe.py fixtures/lying-server bun server.ts
printf "        token: FACT-FIREWALL T4 BLOCK x%s  LIES x%s\n" "$(grep -c 'FACT-FIREWALL T4 BLOCK' /tmp/batt-out)" "$(grep -c '^    LIE' /tmp/batt-out)"
t "T4 ADV  honest (declares 0)"        0 python3 kernel/tier4-lsp-capability-probe.py fixtures/honest-server bun server.ts
echo ""
echo "── T5 THE PROBES · the control set (ST-201..205) ──"
OUT=$(python3 fixtures/probe-controls.py 2>&1); E=$?
printf "  %s  %-46s exit=%s\n" "$([ "$E" = 0 ] && echo PASS || echo 'FAIL*')" "the five probes, the control set" "$E"
printf "        %s\n" "$(echo "$OUT" | tail -1)"
[ "$E" = 0 ] && PASS=$((PASS+1)) || { [ "$E" = 2 ] && UNM=$((UNM+1)) || FAIL=$((FAIL+1)); }
echo ""
echo "── THE BRAIN · the router cascade (ST-302) ──"
t "the cascade, 8 spans"               0 python3 kernel/router.py
printf "        %s\n" "$(tail -2 /tmp/batt-out | head -1)"
echo ""
echo "── T1 GROUNDING · the number-producer check ──"
cat > /tmp/t1c.txt <<'CORP'
PASS=13  FAIL=0  UNMEASURED=0
265 rows
CASCADE ACCURACY: 8/8
LIES (23)
CORP
python3 kernel/tier1-grounding.py /tmp/t1c.txt "it reports 13 pass, 0 fail, 265 rows and 8/8" >/dev/null 2>&1
[ $? = 0 ] && { printf "  PASS  %-46s numbers present -> GROUNDED\n" "T1a"; PASS=$((PASS+1)); } || { printf "  FAIL  T1a\n"; FAIL=$((FAIL+1)); }
python3 kernel/tier1-grounding.py /tmp/t1c.txt "it found 417 defects in 92 files" >/dev/null 2>&1
[ $? = 1 ] && { printf "  PASS  %-46s phantom numbers -> UNGROUNDED\n" "T1b"; PASS=$((PASS+1)); } || { printf "  FAIL  T1b\n"; FAIL=$((FAIL+1)); }
python3 kernel/tier1-grounding.py /tmp/t1c.txt "everything works" >/dev/null 2>&1
[ $? = 2 ] && { printf "  PASS  %-46s no number -> UNMEASURED\n" "T1c"; PASS=$((PASS+1)); } || { printf "  FAIL  T1c\n"; FAIL=$((FAIL+1)); }

echo ""
echo "── ST-403 · THE WORKER-RETURN AUDIT ──"
printf 'I built `kernel/ledger.py` and it records every verdict.\n' | python3 kernel/audit-return.py >/dev/null 2>&1
[ $? = 0 ] && { printf "  PASS  %-46s an existing artifact -> ACCEPTED\n" "ST-403a"; PASS=$((PASS+1)); } || { printf "  FAIL  ST-403a\n"; FAIL=$((FAIL+1)); }
printf 'I created `kernel/fact-firewall.ts` and wired it.\n' | python3 kernel/audit-return.py >/dev/null 2>&1
[ $? = 1 ] && { printf "  PASS  %-46s an absent artifact -> REFUSED\n" "ST-403b"; PASS=$((PASS+1)); } || { printf "  FAIL  ST-403b\n"; FAIL=$((FAIL+1)); }
printf 'I reviewed the design.\n' | python3 kernel/audit-return.py >/dev/null 2>&1
[ $? = 2 ] && { printf "  PASS  %-46s no artifact claim -> UNMEASURED\n" "ST-403c"; PASS=$((PASS+1)); } || { printf "  FAIL  ST-403c\n"; FAIL=$((FAIL+1)); }

echo "── T3 LEDGER ──"
N=$(wc -l < ~/.omp/run/fact-firewall.jsonl 2>/dev/null); N=${N:-0}
# `grep -c` on a MISSING file PRINTS 0 and EXITS 1 — so `|| echo 0` appended a SECOND 0 and the
# variable became "0\n0". PROVEN: L=[0<newline>0]. Any later `[ "$L" -gt ... ]` then errors or
# mis-reads. Assign, then default. (The gate-audit's battery.sh:68 finding.)
L=$(grep -c 'T4_LSP_CAPABILITY_LIE' ~/.omp/run/fact-firewall.jsonl 2>/dev/null); L=${L:-0}
if [ "$N" -gt 0 ]; then printf "  PASS  %-46s rows=%s lies=%s\n" "the ledger carries rows" "$N" "$L"; PASS=$((PASS+1))
else printf "  UNM   %-46s the ledger is empty\n" "the ledger"; UNM=$((UNM+1)); fi
echo ""
echo "── THE SPEC GATE ──"
# RAN, NOT COUNTED (the gate-audit finding). This checked `-x` PRESENCE and called it PASS — a
# gate that is never executed cannot fail, and a check that cannot fail is documentation.
# The gate's predicate needs a STAGED KERNEL PATH, so the drive stages a throwaway and unstages it.
# (My first attempt at this fix compared exit 0 to exit 0 with NOTHING staged — a theatrical check
# of the same class it was fixing. Caught before it landed.)
if [ -x scripts-spec-gate.sh ]; then
  PROBE="kernel/.batt-spec-probe"
  : > "$PROBE" && git add "$PROBE" 2>/dev/null
  printf 'chore(kernel): the battery probe — no id\n' > /tmp/batt-neg.txt
  bash scripts-spec-gate.sh --staged /tmp/batt-neg.txt >/dev/null 2>&1; NG=$?
  printf 'chore(kernel): the battery probe — FR-12\n' > /tmp/batt-pos.txt
  bash scripts-spec-gate.sh --staged /tmp/batt-pos.txt >/dev/null 2>&1; PS=$?
  git reset -q -- "$PROBE" 2>/dev/null; rm -f "$PROBE" /tmp/batt-neg.txt /tmp/batt-pos.txt
  if [ "$NG" -eq 1 ] && [ "$PS" -eq 0 ]; then
    printf "  PASS  %-46s driven both ways (no-id exit 1, FR-12 exit 0)\n" "scripts-spec-gate.sh"; PASS=$((PASS+1))
  else
    printf "  FAIL  %-46s did not bite both ways (no-id=%s want 1, FR-12=%s want 0)\n" "scripts-spec-gate.sh" "$NG" "$PS"; FAIL=$((FAIL+1))
  fi
else printf "  FAIL  %-46s missing\n" "scripts-spec-gate.sh"; FAIL=$((FAIL+1)); fi
echo ""
echo "── Q3 (FR-6a) — known BELOW the bar, WARN-only ──"
Q3=$(python3 kernel/q3-control.py 2>&1 | tail -2 | head -1)
printf "  INFO  %s\n" "$(echo "$Q3" | cut -c1-90)"
echo ""
echo "═══════════════════════════════════════════════"
printf "  PASS=%s  FAIL=%s  UNMEASURED=%s\n" "$PASS" "$FAIL" "$UNM"
# THE VERDICT — fail-closed (the gate-audit CRITICAL). The defect this replaces was
# `[ "$FAIL" = "0" ] && GREEN`: UNM was NEVER consulted, so PASS=0 FAIL=0 UNM=16 exited 0 — the
# battery measured NOTHING and reported GREEN, against this file's own header "UNMEASURED never a
# pass — fail-closed". PROVEN ADVERSARIALLY before the fix: a 16-row all-UNMEASURED battery was GREEN.
if [ "$FAIL" -gt 0 ]; then echo "  ✗ BATTERY RED"; exit 1; fi
if [ "$UNM" -gt 0 ]; then
  echo "  ✗ BATTERY UNMEASURED — $UNM tier(s) could not be measured."
  echo "    fail-closed: an unmeasured tier is not a pass. exit 2 distinguishes this from RED."
  exit 2
fi
if [ "$PASS" -eq 0 ]; then echo "  ✗ BATTERY MEASURED NOTHING (fail-closed)"; exit 2; fi
echo "  ★ BATTERY GREEN"; exit 0
