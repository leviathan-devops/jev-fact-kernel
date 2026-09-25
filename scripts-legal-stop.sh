#!/usr/bin/env bash
# scripts-legal-stop.sh — THE MECHANICAL PREDICATE for the pin's STOP condition.
# Exits 0 ONLY when every legal-stop condition has current-state evidence on disk.
# Exits 1 naming the unmet condition(s) otherwise. A prevention with an EXIT TEST.
set -uo pipefail
cd "$(dirname "$0")"
FAIL=0
chk() { # name, ok(0/1), evidence
  if [ "$2" = "0" ]; then printf "  PASS  %-40s %s\n" "$1" "$3"
  else printf "  FAIL  %-40s %s\n" "$1" "$3"; FAIL=1; fi
}

echo "═══ THE LEGAL-STOP PREDICATE ═══"

# 1 · the battery
OUT=$(timeout 900 bun test 2>&1 | tail -4)
echo "$OUT" | grep -q "^ *0 fail" \
  && chk "the battery: 0 fail" 0 "$(echo "$OUT" | grep -oE '[0-9]+ pass / 0 fail|[0-9]+ pass' | head -1)" \
  || chk "the battery: 0 fail" 1 "$OUT"

# 2 · tsc
bunx tsc --noEmit 2>/dev/null && chk "tsc --noEmit" 0 "exit 0" || chk "tsc --noEmit" 1 "nonzero"

# 3 · the host suite (the DEPLOYED launcher)
SUITE=$(timeout 400 ./scripts-host-suite.sh 2>&1 | grep "JM_HOST_SUITE")
echo "$SUITE" | grep -q "PASS" && chk "the host suite (deployed)" 0 "$SUITE" || chk "the host suite (deployed)" 1 "$SUITE"

# 4 · the recovery proof (the SIGKILL contract)
REC=$(timeout 600 bun run scripts-recovery-proof.ts 2>&1 | grep -E "^PASS|^FAIL")
echo "$REC" | grep -q "^PASS" && chk "recovery: kill -9, dup=0" 0 "$REC" || chk "recovery: kill -9, dup=0" 1 "$REC"

# 5 · the decider server (the local judge)
MODELS=$(curl -s -m 5 http://127.0.0.1:8008/v1/models 2>/dev/null)
echo "$MODELS" | grep -qiE "jevk5|decider" && chk "the local judge (jevk5 on GPU)" 0 "$(echo "$MODELS" | head -c 60)" || chk "the local judge (jevk5 on GPU)" 1 "DOWN"

# 6 · the W2 gate (all four judged verbs, requests=1)
export JM_HOME=/tmp/jm-legal-$$
export JM_JUDGE_URL=http://127.0.0.1:8008/v1/systemone
rm -rf "$JM_HOME" /tmp/legal-corpus; mkdir -p /tmp/legal-corpus/m
echo "JM_INDEX_MISSING test" > /tmp/legal-corpus/m/f0.md
jm index /tmp/legal-corpus --name legal >/dev/null 2>&1
RT=$(jm route --task "find a missing credential" 2>/dev/null | head -1)
echo "$RT" | grep -q "requests=1" && chk "W2 gate: route requests=1" 0 "$(echo "$RT" | grep -oE 'requests=[0-9]+')" || chk "W2 gate: route requests=1" 1 "$RT"
rm -rf "$JM_HOME" /tmp/legal-corpus

# 7 · the operator gate (the transcripts on disk)
[ -f .trident/operator-gate/OperatorC-result.md ] && chk "the operator gate (the transcripts)" 0 "OperatorC-result.md on disk" || chk "the operator gate (the transcripts)" 1 "ABSENT"

# 8 · the checkpoint (the seal)
CKPT=$(ls -d Checkpoints/jm-production-grade-* 2>/dev/null | head -1)
[ -n "$CKPT" ] && [ -f "$CKPT/CHECKPOINT_MANIFEST.md" ] && chk "the checkpoint (the seal)" 0 "$CKPT" || chk "the checkpoint (the seal)" 1 "ABSENT"

# 9 · the receipt
[ -f .trident/RECEIPT.md ] && chk "the receipt" 0 ".trident/RECEIPT.md" || chk "the receipt" 1 "ABSENT"

# 10 · the AUDIT GATE line (it must EXIST — BLOCKED is honest, ABSENT is not)
grep -q "AUDIT GATE:" TESTING_LOG.md && chk "the AUDIT GATE line exists" 0 "$(grep 'AUDIT GATE:' TESTING_LOG.md | tail -1 | cut -c1-40)" || chk "the AUDIT GATE line exists" 1 "ABSENT"

echo ""
if [ "$FAIL" = "0" ]; then
  echo "LEGAL STOP: every condition has current-state evidence. The goal is MET."
  exit 0
else
  echo "LEGAL STOP: $FAIL condition(s) unmet. The goal is NOT complete."
  exit 1
fi
