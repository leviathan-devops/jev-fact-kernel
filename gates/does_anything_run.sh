#!/usr/bin/env bash
# does_anything_run.sh — GR-2_DOES_ANYTHING_RUN: the five questions.
# Every answer is derived FROM DISK, mechanically. ANY "no" -> exit 1.
# Usage: gates/does_anything_run.sh [repo-root]
set -uo pipefail

ROOT="${1:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$ROOT" || { echo "Q-ERROR:root-missing:$ROOT"; exit 2; }

FAIL=0
ask() { # ask <n> <label> <yes|no> <evidence>
  local n="$1" label="$2" verdict="$3" evidence="$4"
  printf 'Q%s:%s:%s:%s\n' "$n" "$verdict" "$label" "$evidence"
  [ "$verdict" = "NO" ] && FAIL=1
  return 0
}

# Q1 ENTRY POINT — a file that begins the process
if [ -f src/main.ts ]; then E1="src/main.ts"; V1=YES
elif [ -f src/runtime.ts ]; then E1="src/runtime.ts (no entry wrapper)"; V1=YES
else E1="no src/main.ts, no src/runtime.ts"; V1=NO; fi
ask 1 "entry-point" "$V1" "$E1"

# Q2 LOOP — something that owns time
LOOPS=$(grep -rlE 'setInterval|while \(true\)|for \(;;\)' src/ 2>/dev/null | wc -l | tr -d ' ')
if [ "$LOOPS" -gt 0 ]; then V2=YES; E2="$LOOPS file(s) with a repeating construct"
else V2=NO; E2="0 repeating constructs in src/"; fi
ask 2 "loop" "$V2" "$E2"

# Q3 NON-TEST CALLER — every module reachable outside tests/
# FAIL-CLOSED FALLBACK: orphan_scan.sh failing to produce a count is the gate
# being UNABLE to measure — test-importer lines are not an orphan count (they
# invert the verdict: N importers would report N orphans). Report NO instead.
ORPHANS=$(bash gates/orphan_scan.sh "$ROOT" 2>/dev/null | tail -1 | sed 's/^ORPHANS=//')
if [ -z "${ORPHANS}" ]; then ORPHANS=-1; E3="orphan_scan.sh produced no count (cannot measure)"; V3=NO
elif [ "$ORPHANS" = "0" ]; then V3=YES; E3="every module has a non-test caller"
else V3=NO; E3="$ORPHANS module(s) callable only from tests (see orphan_scan.sh)"; fi
ask 3 "non-test-caller" "$V3" "$E3"

# Q4 WIRE EXERCISED — evidence that the adapter spoke to the daemon.
# Non-empty like Q5: a 0-byte wire_capture.json (touched/truncated write)
# is not live adapter bytes and must not report YES.
if [ -s runtime/wire_capture.json ]; then V4=YES; E4="runtime/wire_capture.json present ($(wc -c < runtime/wire_capture.json | tr -d ' ') bytes)"
else V4=NO; E4="no runtime/wire_capture.json (the adapter has never carried live bytes)"; fi
ask 4 "wire-exercised" "$V4" "$E4"

# Q5 HEARTBEAT — a process ticked and left a row
if [ -s runtime/ticks.log ]; then
  ROWS=$(wc -l < runtime/ticks.log | tr -d ' ')
  V5=YES; E5="runtime/ticks.log has $ROWS row(s)"
else V5=NO; E5="no runtime/ticks.log (nothing has ever ticked)"; fi
ask 5 "heartbeat" "$V5" "$E5"

printf 'VERDICT:%s (fail=%s)\n' "$([ "$FAIL" -eq 0 ] && echo RUNS || echo DOES-NOT-RUN)" "$FAIL"
exit "$FAIL"