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

# THE RUNNER KEEPS ITS OWN OUTPUT. A gate that reports only a summary is undiagnosable after the
# fact: a one-off "40 passed / 1 failed" with no failing row leaves nothing to investigate, which
# is exactly what happened once. Every run now tees to a log, and the failing rows are re-printed
# at the end so the LAST thing on screen is the thing that is wrong.
LOG="${JM_GATE_LOG:-/tmp/jm-gates-run.log}"
exec > >(tee "$LOG") 2>&1

PASS=0; FAIL=0; TABLE=""; FAILED_ROWS=""
tok() { # tok <token> <command...>
  local name="$1"; shift
  local out rc
  out="$("$@" 2>&1)"; rc=$?
  if [ $rc -eq 0 ]; then printf "  PASS  %-34s %s\n" "$name" "$(echo "$out" | tail -1 | cut -c1-70)"; PASS=$((PASS+1)); TABLE="$TABLE\n| $name | PASS |"
  else printf "  FAIL  %-34s rc=%s %s\n" "$name" "$rc" "$(echo "$out" | tail -1 | cut -c1-60)"; FAIL=$((FAIL+1)); TABLE="$TABLE\n| $name | FAIL |"; FAILED_ROWS="$FAILED_ROWS\n  FAIL  $name  (rc=$rc)\n        $(echo "$out" | tail -3 | tr '\n' '|' | cut -c1-200)"; fi
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
# `grep -qv 'cost='` was VACUOUS: it succeeds as soon as ANY line lacks `cost=`, which is almost
# always true — so a `cost=` line on stdout went undetected and the "data only" guarantee was not
# checked at all. The assertion must be "NO line carries a cost line": `! grep -q`. Audit M-D.
tok "stdout is DATA (no cost line)" bash -c "! $J query gate --fts tombstone 2>/dev/null | grep -q 'cost='"

echo ""
echo "═══ L4 — THE CONTAINER RIG (host parity half) ═══"
tok "container rig T1-T7 (host)" bash -c "timeout 500 bun run tests/container/harness.ts 2>&1 | grep -q 'JM_CONTAINER_RIG PASS'"

echo ""
echo "═══ THE REDACTION PATH (D-037: a quadratic regex + a wrong-marker order) ═══"
cat > /tmp/jm-gates-redact.ts <<'EOF'
import { redact } from "JMDIR/src/judge/cache.ts";
const t0 = Date.now();
redact({ body: "y".repeat(4_000_000) });           // must be LINEAR now, not quadratic
const ms = Date.now() - t0;
const hex = String(redact("hash 0123456789abcdef0123456789abcdef here"));
const ok = ms < 3000 && hex === "hash [hex] here";
console.log(`  4MB redact=${ms}ms  hex -> ${JSON.stringify(hex)}`);
process.exit(ok ? 0 : 1);
EOF
sed -i "s|JMDIR|$(pwd)|" /tmp/jm-gates-redact.ts
tok "redaction is linear + hex has no survivor" bash -c "bun /tmp/jm-gates-redact.ts"

echo ""
echo "═══ THE HTTP SURFACE UNDER AN OVERSIZED BODY (D-036) ═══"
# With no body cap, a 2 MB POST /decide BLOCKED THE WHOLE SURFACE — /health and /jobs stopped
# answering while it was in flight, so a watchdog would judge the service dead. This check asserts
# the cap refuses it FAST and that the surface stays responsive.
SRV_HOME=/tmp/jm-gates-serve
rm -rf "$SRV_HOME"; mkdir -p "$SRV_HOME"
JM_HOME="$SRV_HOME" $J serve --port 7877 >/tmp/jm-gates-serve.log 2>&1 &
# readiness by POLLING THE PORT, not by sleeping and hoping (the same flake class as the daemon)
DEADLINE=$((SECONDS + 20))
while [ $SECONDS -lt $DEADLINE ]; do
  (exec 3<>/dev/tcp/127.0.0.1/7877) 2>/dev/null && { exec 3<&- 3>&-; break; }
  sleep 0.3
done
python3 -c "import json; open('/tmp/jm-gates-big.json','w').write(json.dumps({'state':{'pad':'y'*2000000},'questions':{'m':{'type':'noul','instructions':'?'}}}))"
BIG=$(curl -s -o /dev/null -w '%{http_code}' -m 20 -X POST http://127.0.0.1:7877/decide -d @/tmp/jm-gates-big.json)
HEALTH=$(curl -s -o /dev/null -w '%{http_code}' -m 10 http://127.0.0.1:7877/health)
JOBS=$(curl -s -o /dev/null -w '%{http_code}' -m 10 http://127.0.0.1:7877/jobs)
# CLEANUP WITH pgrep + kill, NOT pkill. This host's `pkill` is version 0.2.0, not procps: measured,
# it returns exit 2 and kills NOTHING (the daemon check below carries the same note). A serve left
# alive holds port 7877, so the NEXT run's serve cannot bind, its readiness poll times out, and this
# check fails for a reason that has nothing to do with the code under test. That is the shape of the
# one-off "40 passed / 1 failed" this runner produced before it kept a log.
for p in $(pgrep -f "cli.ts serve --port 7877"); do kill -TERM "$p" 2>/dev/null; done
# and WAIT for the port to actually free, so the next run starts from a clean state
DEADLINE=$((SECONDS + 10))
while [ $SECONDS -lt $DEADLINE ]; do
  pgrep -f "cli.ts serve --port 7877" >/dev/null || break
  sleep 0.3
done
tok "an oversized body is refused (413)" bash -c "[ \"$BIG\" = '413' ]"
tok "the surface survives it (health+jobs up)" bash -c "[ \"$HEALTH\" = '200' ] && [ \"$JOBS\" = '200' ]"

echo ""
echo "═══ CONCURRENT WRITERS ON ONE INDEX (D-035) ═══"
# The store had NO busy_timeout while both other openers did, so simultaneous CLI runs failed with
# `database is locked`. This check runs four indexers at once and requires ALL FOUR to exit 0.
CONC_HOME=/tmp/jm-gates-conc
rm -rf "$CONC_HOME"; mkdir -p "$CONC_HOME" /tmp/jm-gates-conc-corpus
for i in $(seq 1 40); do echo "concurrent body $i tombstone" > /tmp/jm-gates-conc-corpus/f$i.md; done
JM_HOME="$CONC_HOME" $J target add conc fs /tmp/jm-gates-conc-corpus >/dev/null 2>&1
# EXPLICIT PIDS, NOT A BARE `wait`: a bare `wait` waits for EVERY background job the script has
# started — including the HTTP server a section earlier — so the gate hung for 900s once the two
# sections coexisted. (Found by timing the sections; the concurrency section runs in 1s alone.)
# FOUR ROUNDS, because the meta-seed race (D-038) is INTERMITTENT — one round called it green five
# times before losing a run on the sixth.
CONC_FAILS=0
for round in 1 2 3 4; do
  rm -rf "$CONC_HOME/index"
  CONC_PIDS=""
  for i in 1 2 3 4; do
    ( JM_HOME="$CONC_HOME" $J index --in all --name race >"/tmp/jm-gates-conc-$round-$i.out" 2>&1; echo $? > "/tmp/jm-gates-conc-$round-$i.rc" ) &
    CONC_PIDS="$CONC_PIDS $!"
  done
  for pid in $CONC_PIDS; do wait "$pid" 2>/dev/null || true; done
  BAD=$(cat /tmp/jm-gates-conc-$round-*.rc | grep -cv '^0$' || true)
  [ "$BAD" -gt 0 ] && CONC_FAILS=$((CONC_FAILS + BAD))
done
# ONE ASSIGNMENT, ONE PATTERN SET. There were TWO consecutive `FAILS=` lines: the first matched
# "database is locked\|UNIQUE constraint" and the second overwrote it with "database is locked"
# alone — so the UNIQUE-constraint half was DEAD CODE, and the D-038 meta-seed race (a
# `UNIQUE constraint` error under concurrency) could never fail this gate. `-lh` was also
# contradictory: `-h` suppresses the filenames that `-l` exists to produce. `-E` takes the
# alternation, and the gate now checks what its name says it checks. Found by the audit (C-1).
FAILS=$(grep -lE "database is locked|UNIQUE constraint" /tmp/jm-gates-conc-*.out 2>/dev/null | wc -l)
tok "4 concurrent indexers, no lock errors" bash -c "[ \"$FAILS\" -eq 0 ]"
tok "4 concurrent indexers all exit 0 (x4 rounds)" bash -c "[ \"$CONC_FAILS\" -eq 0 ]"
# the row count is on the `files:` line — the first line's number is the index size in KB
ROWS=$(JM_HOME="$CONC_HOME" $J report race 2>/dev/null | grep '^files:' | grep -oE '[0-9]+' | head -1)
tok "the race left a complete index ($ROWS files)" bash -c "[ \"$ROWS\" -eq 40 ]"

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
# POLL TO A DEADLINE, never a fixed sleep. `sleep 4` against `--interval 1000` left a ~2-second
# margin for two ticks, so a loaded machine produced one tick and the gate failed for a reason that
# had nothing to do with the daemon — a flake with a schedule. The assertion is unchanged (>= 2
# ticks); only the WAIT is now a deadline, so a slow host is slow rather than wrong.
DEADLINE=$((SECONDS + 25))
ROWS=0
while [ $SECONDS -lt $DEADLINE ]; do
  ROWS=$(wc -l < "$DAEMON_HOME/watch/journal.jsonl" 2>/dev/null || echo 0)
  [ "$ROWS" -ge 2 ] && break
  sleep 0.5
done
# SIGNAL EVERY MATCHING PID, not `| head -1`: `bun run` is a WRAPPER plus a CHILD (runtime seat
# OP-17), and killing whichever pgrep listed first can leave the other ticking — which made this
# gate fail intermittently while the same commands typed by hand passed.
# pgrep + kill, NOT pkill: this host's `pkill` reports itself as version 0.2.0 and its -f pattern
# handling differs from procps — measured: it returned exit 2 (syntax) and killed nothing, which
# made this gate fail while the identical command typed in a shell worked. `pgrep` finds the pids
# reliably, and `kill` acts on exactly those.
for p in $(pgrep -f "cli.ts watch"); do kill -TERM "$p" 2>/dev/null; done
# POLL FOR THE EXIT rather than sleeping a fixed 2s: the assertion is "it exits on SIGTERM", and a
# slow shutdown on a loaded host is slow, not wrong.
DEADLINE=$((SECONDS + 15))
ALIVE=1
while [ $SECONDS -lt $DEADLINE ]; do
  ALIVE=$(pgrep -f "cli.ts watch" | wc -l)
  [ "$ALIVE" -eq 0 ] && break
  sleep 0.3
done
tok "daemon loop ticks + journals" bash -c "[ \"$ROWS\" -ge 2 ]"
tok "daemon exits on SIGTERM" bash -c "[ \"$ALIVE\" -eq 0 ]"

echo ""
echo "═══ C8 — THE PER-JOB RECONCILIATION ═══"
tok "C8 reconciled job -> exit 0" bash -c "$J index @gate --queued --job g8 --name gate >/dev/null 2>&1 && $J report --job g8 --name gate >/dev/null 2>&1"

echo ""
printf "═══ GATE TABLE ═══\n%b\n" "$TABLE" > /tmp/jm-gates-table.txt
printf "%b\n" "$TABLE"
echo ""
if [ $FAIL -gt 0 ]; then printf "═══ THE FAILING ROWS ═══%b\n" "$FAILED_ROWS"; fi
echo "GATES: $PASS passed / $FAIL failed   (JM_HOME=$JM_HOME, log $LOG)"
[ $FAIL -eq 0 ] || exit 1
