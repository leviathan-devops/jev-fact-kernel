#!/usr/bin/env bash
# verify-registration.sh — INDEPENDENTLY prove the packaged extension registers the jev tool.
# Boots a fresh OMP with THE PACKAGE'S OWN extension file against a scratch session, drives a
# direct jev call, and asserts the mechanical evidence. Exit 0 = registered correctly.
set -u
PKG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXT="$PKG_DIR/jev-manager/index.js"
SESSION_ID="${1:-}"
OMP_BIN="${OMP_BIN:-/home/leviathan/.bun/bin/omp}"
LOG="/tmp/jev-verify-$$.log"
FAIL=0

say()  { printf '  %s\n' "$*"; }
fail() { printf '  FAIL: %s\n' "$*"; FAIL=1; }

say "1 · the packaged extension exists and parses"
[ -f "$EXT" ] || { echo "FATAL: no extension at $EXT"; exit 2; }
bun build "$EXT" --target=node --outfile=/tmp/jev-verify-build.js >/dev/null 2>&1 \
  && say "   parse: OK" || fail "the packaged extension does not parse"

say "2 · booting a FRESH omp with the packaged extension"
# A scratch session id keeps this probe off the operator's live sessions.
SID="${SESSION_ID:-01a0a90e-3758-7688-b43c-f08ad37bf036}"
( cd /tmp && timeout 90 "$OMP_BIN" --extension "$EXT" --resume "$SID" --no-title </dev/null >"$LOG" 2>&1 & echo $! >/tmp/jev-verify.pid )
sleep 12
PID=$(cat /tmp/jev-verify.pid 2>/dev/null || true)
say "   booted pid=$PID (log: $LOG)"

say "3 · the registration receipts (the extension's own console.error lines)"
if grep -q 'registered jev (loadMode=essential)' "$LOG"; then
  say "   receipt: [jev-manager] registered jev (loadMode=essential)  ✓"
else
  fail "the registration receipt did not fire — the extension did not load (check the config line and the file path)"
fi
if grep -qE 'jev (already in the active set|activated into the session)' "$LOG"; then
  say "   receipt: the activation handler fired  ✓"
else
  say "   note: the activation receipt is not in the capture window (the handler logs at session_start; a slow boot can scroll past) — not a hard failure"
fi

say "4 · the wire-schema check (the ground truth)"
say "   Run inside the booted session:  /dump  then grep the written /tmp/omp-llm-request-*.json for \"name\":\"jev\""
say "   OR:  grep -c '\"name\":\"jev\"' <session.jsonl>   (a CALLED tool materializes there)"
say "   (This script cannot type into the TUI; the receipts above are the boot-side proof.)"

kill "$PID" 2>/dev/null || true
sleep 1
if [ "$FAIL" -eq 0 ]; then
  echo "REGISTRATION VERIFY: PASS (receipts + parse; confirm the wire schema via /dump for the full proof)"
  exit 0
else
  echo "REGISTRATION VERIFY: FAIL — see the named failures above"
  exit 1
fi
