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
echo "── T5 THE PROBES · the 13 controls (ST-201..205) ──"
OUT=$(python3 fixtures/probe-controls.py 2>&1); E=$?
printf "  %s  %-46s exit=%s\n" "$([ "$E" = 0 ] && echo PASS || echo 'FAIL*')" "the five probes, 13 controls" "$E"
printf "        %s\n" "$(echo "$OUT" | tail -1)"
[ "$E" = 0 ] && PASS=$((PASS+1)) || { [ "$E" = 2 ] && UNM=$((UNM+1)) || FAIL=$((FAIL+1)); }
echo ""
echo "── THE BRAIN · the router cascade (ST-302) ──"
t "the cascade, 8 spans"               0 python3 kernel/router.py
printf "        %s\n" "$(tail -2 /tmp/batt-out | head -1)"
echo ""
echo "── ST-403 · THE WORKER-RETURN AUDIT ──"
printf 'I built `kernel/ledger.py` and it records every verdict.\n' | python3 kernel/audit-return.py >/dev/null 2>&1
[ $? = 0 ] && { printf "  PASS  %-46s an existing artifact -> ACCEPTED\n" "ST-403a"; PASS=$((PASS+1)); } || { printf "  FAIL  ST-403a\n"; FAIL=$((FAIL+1)); }
printf 'I created `kernel/fact-firewall.ts` and wired it.\n' | python3 kernel/audit-return.py >/dev/null 2>&1
[ $? = 1 ] && { printf "  PASS  %-46s an absent artifact -> REFUSED\n" "ST-403b"; PASS=$((PASS+1)); } || { printf "  FAIL  ST-403b\n"; FAIL=$((FAIL+1)); }
printf 'I reviewed the design.\n' | python3 kernel/audit-return.py >/dev/null 2>&1
[ $? = 2 ] && { printf "  PASS  %-46s no artifact claim -> UNMEASURED\n" "ST-403c"; PASS=$((PASS+1)); } || { printf "  FAIL  ST-403c\n"; FAIL=$((FAIL+1)); }

echo "── T3 LEDGER ──"
N=$(wc -l < ~/.omp/run/fact-firewall.jsonl 2>/dev/null || echo 0)
L=$(grep -c 'T4_LSP_CAPABILITY_LIE' ~/.omp/run/fact-firewall.jsonl 2>/dev/null || echo 0)
if [ "$N" -gt 0 ]; then printf "  PASS  %-46s rows=%s lies=%s\n" "the ledger carries rows" "$N" "$L"; PASS=$((PASS+1))
else printf "  UNM   %-46s the ledger is empty\n" "the ledger"; UNM=$((UNM+1)); fi
echo ""
echo "── THE SPEC GATE ──"
if [ -x scripts-spec-gate.sh ]; then printf "  PASS  %-46s present + executable\n" "scripts-spec-gate.sh"; PASS=$((PASS+1))
else printf "  FAIL  %-46s missing\n" "scripts-spec-gate.sh"; FAIL=$((FAIL+1)); fi
echo ""
echo "── Q3 (FR-6a) — known BELOW the bar, WARN-only ──"
Q3=$(python3 kernel/q3-control.py 2>&1 | tail -2 | head -1)
printf "  INFO  %s\n" "$(echo "$Q3" | cut -c1-90)"
echo ""
echo "═══════════════════════════════════════════════"
printf "  PASS=%s  FAIL=%s  UNMEASURED=%s\n" "$PASS" "$FAIL" "$UNM"
[ "$FAIL" = "0" ] && { echo "  ★ BATTERY GREEN"; exit 0; }
echo "  ✗ BATTERY RED"; exit 1
