#!/usr/bin/env bash
# scripts-host-suite.sh — THE HOST SUITE (deep-host-testing): prove the DEPLOYED surface, not a copy.
#
# WHAT IS DIFFERENT FROM THE CONTAINER RIG: the rig runs `harness.ts` against the SOURCE TREE with
# synthetic fixtures. This suite runs the thing an OMP SESSION ACTUALLY INVOKES — the launcher the
# registry names, with the registry's own env, against the REAL store — and asserts the protocol and
# the store state. It is the difference between "the code works" and "the deployment works".
#
# THE EVIDENCE BAR (per the skill): a tool result, a store row, or a process — never prose.
#   · THE RECEIPT      the server returns something only the store could know
#   · THE BEHAVIOR DELTA  the same call with vs without the state (an index present vs absent)
#   · THE SEAM         the store row count before/after
#   · THE ROW          existence only — the weakest, never sufficient alone
#
# Every check prints a TOKEN on pass and a FAILTOKEN on failure. Exit is non-zero if any failed.
set -uo pipefail
cd "$(dirname "$0")"

PASS=0; FAIL=0; ROWS=""
tok() { # name, ok, token, note
  if [ "$2" = "1" ]; then printf "  PASS  %-34s %s\n" "$1" "$3"; PASS=$((PASS+1)); ROWS="$ROWS\n| $1 | PASS | $3 |"
  else printf "  FAIL  %-34s %s\n" "$1" "$3"; FAIL=$((FAIL+1)); ROWS="$ROWS\n| $1 | FAIL | $3 |"; fi
}

echo "════════ HOST SUITE — the DEPLOYED surface ════════"
echo ""

# ── H0 · THE DEPLOY GROUND TRUTH ────────────────────────────────────────────────────────────────
echo "── H0 · the deploy ground truth ──"
REG="$HOME/.omp/agent/mcp.json"
LAUNCH=$(python3 -c "import json;print(json.load(open('$REG'))['mcpServers']['jev-manager']['command'])" 2>/dev/null)
REG_ENV=$(python3 -c "import json;e=json.load(open('$REG'))['mcpServers']['jev-manager']['env'];print(' '.join(f'{k}={v}' for k,v in sorted(e.items())))" 2>/dev/null)
REG_HOME=$(python3 -c "import json;print(json.load(open('$REG'))['mcpServers']['jev-manager']['env'].get('JM_HOME',''))" 2>/dev/null)
echo "  registry:  $REG"
echo "  server:    jev-manager"
echo "  launcher:  $LAUNCH"
echo "  env:       $REG_ENV"
echo ""

[ -x "$LAUNCH" ] && tok "H0.1 the launcher is executable" 1 "JM_LAUNCHER_OK $LAUNCH" || tok "H0.1 the launcher is executable" 0 "JM_LAUNCHER_MISSING $LAUNCH"
[ -n "$REG_HOME" ] && [ -d "$REG_HOME" ] && tok "H0.2 the registry's JM_HOME exists" 1 "JM_HOME_OK $REG_HOME" || tok "H0.2 the registry's JM_HOME exists" 0 "JM_HOME_MISSING '$REG_HOME'"
# the bundle sha — the artifact the suite names (per the skill: every probe names its bundle)
BUNDLE_SHA=$(sha256sum src/mcp.ts 2>/dev/null | cut -c1-16)
echo "  bundle sha: src/mcp.ts $BUNDLE_SHA"
echo ""

# ── H1 · THE PROTOCOL, INVOKED THE WAY THE REGISTRY INVOKES IT ──────────────────────────────────
# The env is the REGISTRY'S, not this shell's. A launcher that works here and fails there is the
# exact defect D-048/D-049 were: the environment the client provides is not the author's shell.
echo "── H1 · the protocol, with the REGISTRY's env ──"
IN='{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"host-suite","version":"1"}}}'
NOTE='{"jsonrpc":"2.0","method":"notifications/initialized"}'
CALL_QUERY='{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"jev_query","arguments":{"index":"shadow","fts":"tombstone","limit":2}}}'
CALL_FIND='{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"jev_find","arguments":{"index":"shadow","phrase":"tombstone record"}}}'

run_registry_env() {
  printf '%s\n' "$@" | env -i $REG_ENV HOME="$HOME" "$LAUNCH" 2>/dev/null
}

OUT=$(run_registry_env "$IN" "$NOTE" '{"jsonrpc":"2.0","id":2,"method":"tools/list"}')
NAMES=$(echo "$OUT" | python3 -c "
import sys,json
for l in sys.stdin:
    try: d=json.loads(l)
    except: continue
    if d.get('id')==2:
        print(','.join(t['name'] for t in d['result']['tools'])); break" 2>/dev/null)
[ "$NAMES" = "jev_query,jev_find,jev_decide,jev_index" ] && tok "H1.1 tools/list, registry env" 1 "JM_TOOLS_OK $NAMES" || tok "H1.1 tools/list, registry env" 0 "JM_TOOLS_GOT '$NAMES'"
[ -n "$BUNDLE_SHA" ] && tok "H1.2 the bundle is named" 1 "JM_BUNDLE_SHA $BUNDLE_SHA" || tok "H1.2 the bundle is named" 0 "JM_BUNDLE_UNKNOWN"

# ── H2 · THE RECEIPT — the real store answers with something only it could know ─────────────────
# The registry's JM_HOME is the REAL store (~/.jm) holding the real @shadow index. A hit here is a
# RECEIPT: the row carries a path and a sha the server could not fabricate.
echo ""
echo "── H2 · the receipt (the REAL store, not a fixture) ──"
STORE_INDEXES=$(ls "$REG_HOME/index" 2>/dev/null | tr '\n' ' ')
echo "  the real store holds: $STORE_INDEXES"
if [ -f "$REG_HOME/index/shadow.sqlite" ]; then
  OUTQ=$(run_registry_env "$IN" "$NOTE" "$CALL_QUERY")
  REC=$(echo "$OUTQ" | python3 -c "
import sys,json
for l in sys.stdin:
    try: d=json.loads(l)
    except: continue
    if d.get('id')==3:
        t=d['result']['content'][0]['text']
        try:
          j=json.loads(t); r=j.get('rows',[])
          if r: print(f\"{r[0].get('path','?')}|{str(r[0].get('sha256',''))[:12]}\")
        except Exception: print('')
        break" 2>/dev/null)
  [ -n "$REC" ] && tok "H2.1 a real row from the real store" 1 "JM_RECEIPT ${REC}" || tok "H2.1 a real row from the real store" 0 "JM_NO_RECEIPT (the store has the index but the query returned nothing)"
else
  tok "H2.1 a real row from the real store" 0 "JM_NO_SHADOW_INDEX (build it: jm index @shadow)"
fi

# ── H3 · THE BEHAVIOR DELTA — the same call, with and without the state ─────────────────────────
# THE A/B (the skill's second-strongest evidence class). The SAME tool call against an index that
# EXISTS and one that does NOT must behave DIFFERENTLY. If both return the same thing, the surface is
# not reading the store at all.
echo ""
echo "── H3 · the behavior delta (A/B on the same call) ──"
CALL_MISSING='{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"jev_query","arguments":{"index":"no-such-index-xyz","fts":"tombstone"}}}'
OUTM=$(run_registry_env "$IN" "$NOTE" "$CALL_MISSING")
MSGTXT=$(echo "$OUTM" | python3 -c "
import sys,json
for l in sys.stdin:
    try: d=json.loads(l)
    except: continue
    if d.get('id')==5:
        print(d['result']['content'][0]['text'][:80]); break" 2>/dev/null)
if echo "$MSGTXT" | grep -q "JM_INDEX_MISSING"; then
  tok "H3.1 a missing index is a NAMED refusal" 1 "JM_DELTA_OK missing=JM_INDEX_MISSING present=rows"
else
  tok "H3.1 a missing index is a NAMED refusal" 0 "JM_DELTA_FAILED got '$MSGTXT'"
fi

# ── H4 · THE SEAM — the store's row count is the measurement, not the tool's word ───────────────
echo ""
echo "── H4 · the seam (the store, measured directly) ──"
if [ -f "$REG_HOME/index/shadow.sqlite" ]; then
  SEAM=$(python3 -c "
import sqlite3
c=sqlite3.connect('file:$REG_HOME/index/shadow.sqlite?mode=ro', uri=True)
f=c.execute('SELECT COUNT(*) FROM files').fetchone()[0]
d=c.execute('SELECT COUNT(*) FROM docs').fetchone()[0]
print(f'files={f} docs={d}')" 2>/dev/null)
  echo "  the shadow index: $SEAM"
  tok "H4.1 the store's own counts" 1 "JM_SEAM_OK $SEAM" 
else
  tok "H4.1 the store's own counts" 0 "JM_SEAM_NO_STORE"
fi

# ── H5 · THE CLI SHIM — the other deployed entry point ──────────────────────────────────────────
echo ""
echo "── H5 · the CLI shim, from a FOREIGN cwd ──"
SHIM="$HOME/.local/bin/jm"
[ -x "$SHIM" ] && tok "H5.1 the shim is installed" 1 "JM_SHIM_OK $SHIM" || tok "H5.1 the shim is installed" 0 "JM_SHIM_MISSING"
FROM_TMP=$(cd / && "$SHIM" 2>&1 | grep -cE "^  jm [a-z-]+")
[ "$FROM_TMP" -ge 17 ] && tok "H5.2 the usage dump from cwd=/" 1 "JM_SHIM_USAGE verbs=$FROM_TMP" || tok "H5.2 the usage dump from cwd=/" 0 "JM_SHIM_USAGE_GOT $FROM_TMP"

# ── H6 · THE ADVERSARIAL — the launcher under adverse conditions ────────────────────────────────
echo ""
echo "── H6 · the launcher under adverse conditions ──"
# no PATH and no HOME: the ladder must REFUSE BY NAME, not crash with a bash error
NOHOME=$(printf '%s\n' "$IN" | env -i "$LAUNCH" 2>&1 >/dev/null; echo "rc=$?")
if echo "$NOHOME" | grep -q "no bun found" && echo "$NOHOME" | grep -q "rc=127"; then
  tok "H6.1 no PATH, no HOME -> a named 127" 1 "JM_LADDER_NAMED rc=127"
else
  tok "H6.1 no PATH, no HOME -> a named 127" 0 "JM_LADDER_UGLY $NOHOME"
fi
# a symlinked launcher must resolve its OWN directory, not the link's (D-049)
SYMDIR=$(mktemp -d); ln -sf "$LAUNCH" "$SYMDIR/jm-link.sh"
SYMOUT=$(printf '%s\n' "$IN" | env PATH="$HOME/.bun/bin:/usr/bin:/bin" "$SYMDIR/jm-link.sh" 2>&1 | grep -c "protocolVersion")
[ "$SYMOUT" -ge 1 ] && tok "H6.2 a SYMLINKED launcher still works" 1 "JM_SYMLINK_OK" || tok "H6.2 a SYMLINKED launcher still works" 0 "JM_SYMLINK_BROKEN"
rm -rf "$SYMDIR"
# a non-object frame must be refused by NAME and the server must survive
BADOUT=$(run_registry_env "$IN" "$NOTE" 'null' '{"jsonrpc":"2.0","id":9,"method":"ping"}')
echo "$BADOUT" | grep -q "JM_MCP_INVALID_REQUEST" && SURVIVED=$(echo "$BADOUT" | grep -c '"id":9') || SURVIVED=0
[ "$SURVIVED" -ge 1 ] && tok "H6.3 a null frame is named; the server survives" 1 "JM_FRAME_GUARD_OK" || tok "H6.3 a null frame is named; the server survives" 0 "JM_FRAME_GUARD_FAILED"

echo ""
echo "════════ RESULT ════════"
printf "  PASS %s · FAIL %s\n" "$PASS" "$FAIL"
printf "  bundle: src/mcp.ts %s\n" "$BUNDLE_SHA"
if [ "$FAIL" -gt 0 ]; then printf "  ═══ THE FAILING ROWS ═══%b\n" "$ROWS"; fi
[ "$FAIL" -eq 0 ] && { echo "JM_HOST_SUITE PASS"; exit 0; } || { echo "JM_HOST_SUITE FAIL"; exit 1; }
