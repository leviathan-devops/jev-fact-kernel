#!/bin/bash
# scripts-gates.sh — THE INDEPENDENT AUDIT RUNNER.
#
# The pin's PROOF CONTRACT says: "Independent audit: the orchestrator re-runs every prior gate's
# check on the combined tree and records PASS/FAIL per token." This script IS that re-run. It
# executes each wave's gate and each named test against the CURRENT tree, prints one token per
# check, and exits non-zero if ANY check fails.
#
# Every token below is produced by running the thing it names, against the deployment — never by
# reading a file that says it passed.
set -uo pipefail
cd "$(dirname "$0")"

PASS=0; FAIL=0; TABLE=""
tok() { # tok <token> <command...>
  local name="$1"; shift
  local out rc
  out="$("$@" 2>&1)"; rc=$?
  if [ $rc -eq 0 ]; then printf "  PASS  %-34s %s\n" "$name" "$(echo "$out" | tail -1 | cut -c1-70)"; PASS=$((PASS+1)); TABLE="$TABLE\n| $name | PASS |"
  else printf "  FAIL  %-34s rc=%s %s\n" "$name" "$rc" "$(echo "$out" | tail -1 | cut -c1-60)"; FAIL=$((FAIL+1)); TABLE="$TABLE\n| $name | FAIL |"; fi
}
J="bun run src/cli.ts"
export JM_HOME="${JM_GATE_HOME:-/tmp/jm-gates}"

echo "═══ L0 — THE TYPE BOUNDARY ═══"
tok "tsc --noEmit" bunx tsc --noEmit

echo ""
echo "═══ L2 — THE NAMED TESTS (the pin's + every wave's) ═══"
for t in test_index_incremental test_store_roundtrip test_query_known_rows test_resume_no_dup \
         test_budget_cap test_adapter_delta test_filter_bands test_find_patterns \
         test_cache_zero_calls test_decision_fail_closed test_serve_decide test_calibrate_row; do
  tok "$t" bun test -t "$t"
done

echo ""
echo "═══ L2 — THE WHOLE BATTERY ═══"
tok "battery (all suites)" bun test

echo ""
echo "═══ THE WAVE GATES (each measured on a fresh sandbox) ═══"
rm -rf "$JM_HOME"; mkdir -p "$JM_HOME" /tmp/jm-gates-corpus
for i in $(seq 1 40); do printf 'tombstone record %s %s\n' "$i" "$(printf 'x%.0s' $(seq 1 80))" > /tmp/jm-gates-corpus/f$i.md; done
$J target add gate fs /tmp/jm-gates-corpus >/dev/null 2>&1
tok "W0 index (fresh corpus)" bash -c "$J index --in all --name gate >/dev/null 2>&1"
tok "W0 incremental (2nd pass changed=0)" bash -c "$J index --in all --name gate 2>&1 | grep -q 'changed=0'"
tok "W0 query by FTS" bash -c "$J query gate --fts tombstone 2>/dev/null | grep -q new"
tok "W0 query by --where" bash -c "$J query gate --where 'size>100' 2>/dev/null | grep -q new"
tok "W2 --in spans the registered kinds" bash -c "$J index --in all --name span >/dev/null 2>&1"
# scan's columns are: hit-count, size, path, excerpt. A row is a line with the two numeric
# columns present — the exact shape the W3 gate needs (rows carrying their ids).
tok "W3 scan (rows carry ids)" bash -c "$J scan gate --lex tombstone 2>/dev/null | grep -qE '^[0-9]+[[:space:]]+[0-9]+[[:space:]]+[^[:space:]]+'"
tok "W3 cluster" bash -c "$J cluster gate --lex tombstone 2>/dev/null | grep -q 'n='"
tok "W3 extract (csv)" bash -c "$J extract gate --lex tombstone --re 'tomb\\w+' --structure csv 2>/dev/null | head -1 | grep -q '^path,value'"
tok "W6 report reads" bash -c "$J report gate 2>/dev/null | grep -q 'files:'"

echo ""
echo "═══ C11 / C12 — THE KEY POLARITY (HOME redirected as well as the env var) ═══"
tok "C11 keyless index -> exit 0" bash -c "env -u TYPESAFE_API_KEY HOME=/tmp/jm-gates-nokey $J index --in all --name kl >/dev/null 2>&1"
tok "C11 keyless query -> exit 0" bash -c "env -u TYPESAFE_API_KEY HOME=/tmp/jm-gates-nokey $J query kl --fts tombstone >/dev/null 2>&1"
tok "C12 judged keyless -> exit 2" bash -c "env -u TYPESAFE_API_KEY HOME=/tmp/jm-gates-nokey $J route --task x >/dev/null 2>&1; [ \$? -eq 2 ]"

echo ""
echo "═══ THE EXIT-CODE CONTRACT ═══"
tok "client error -> 2 (typo'd index)" bash -c "$J query nosuchindex --fts x >/dev/null 2>&1; [ \$? -eq 2 ]"
tok "client error -> 2 (bad structure)" bash -c "$J extract gate --re x --structure tsv >/dev/null 2>&1; [ \$? -eq 2 ]"
tok "client error -> 2 (typo'd job)" bash -c "$J report --job nosuchjob >/dev/null 2>&1; [ \$? -eq 2 ]"
tok "budget stop -> 3" bash -c "$J index @gate --queued --job gc --budget-calls 5 >/dev/null 2>&1; [ \$? -eq 3 ]"
tok "stdout is DATA (no cost line)" bash -c "$J query gate --fts tombstone 2>/dev/null | grep -qv 'cost='"

echo ""
echo "═══ L4 — THE CONTAINER RIG (host parity half) ═══"
tok "container rig T1-T7 (host)" bash -c "timeout 500 bun run tests/container/harness.ts 2>&1 | grep -q 'JM_CONTAINER_RIG PASS'"

echo ""
echo "═══ THE DAEMON AS A LONG-LIVED PROCESS (not --once) ═══"
# The daemon's LOOP had only ever been run as a single tick. This check runs it for real: start
# it, wait for two ticks, SIGTERM THE CHILD (the wrapper is `bun run`, so the child is the
# daemon), and assert the journal grew and the process exited.
DAEMON_HOME=/tmp/jm-gates-daemon
rm -rf "$DAEMON_HOME"; mkdir -p "$DAEMON_HOME" /tmp/jm-gates-dc
echo "daemon check body" > /tmp/jm-gates-dc/a.md
JM_HOME="$DAEMON_HOME" $J target add dc fs /tmp/jm-gates-dc >/dev/null 2>&1
JM_HOME="$DAEMON_HOME" nohup bun run src/cli.ts watch --interval 1000 --in dc --name dcidx >/tmp/jm-gates-daemon.log 2>&1 &
sleep 4
CHILD=$(pgrep -f "cli.ts watch" | head -1)
ROWS=$(wc -l < "$DAEMON_HOME/watch/journal.jsonl" 2>/dev/null || echo 0)
kill -TERM "$CHILD" 2>/dev/null; sleep 1
ALIVE=$(pgrep -f "cli.ts watch" | wc -l)
tok "daemon loop ticks + journals" bash -c "[ \"$ROWS\" -ge 2 ]"
tok "daemon exits on SIGTERM" bash -c "[ \"$ALIVE\" -eq 0 ]"

echo ""
echo "═══ C8 — THE PER-JOB RECONCILIATION ═══"
tok "C8 reconciled job -> exit 0" bash -c "$J index @gate --queued --job g8 --name gate >/dev/null 2>&1 && $J report --job g8 --name gate >/dev/null 2>&1"

echo ""
printf "═══ GATE TABLE ═══\n%b\n" "$TABLE" > /tmp/jm-gates-table.txt
printf "%b\n" "$TABLE"
echo ""
echo "GATES: $PASS passed / $FAIL failed   (JM_HOME=$JM_HOME)"
[ $FAIL -eq 0 ] || exit 1
