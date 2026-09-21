#!/bin/bash
# scripts-real-corpus.sh — the ONLY test that runs against the REAL corpora.
#
# The W2 gate's literal wording is "query spans @shadow + @ocdb end-to-end; C11 green". Every other
# suite in this repo runs on fixtures; this script runs on the host's actual opencode storage
# (11,831 files) and the actual opencode SQLite databases (~33 GB across four files).
#
# It proves three things a fixture cannot:
#   1. the engine survives a REAL 19 GB source (sampled, not copied),
#   2. one query returns rows from BOTH kinds in a single result set,
#   3. the sqlite sources are READ-ONLY — verified by comparing size+mtime, which is the only
#      evidence that matters for a claim about not writing to someone's database.
#
# Usage: ./scripts-real-corpus.sh [JM_HOME]      (default /tmp/jm-real)
set -uo pipefail
cd "$(dirname "$0")"

JM_HOME="${1:-/tmp/jm-real}"
export JM_HOME
OCDB="${OCDB_DIR:-$HOME/.local/share/opencode}"
STORAGE="${SHADOW_DIR:-$HOME/.local/share/opencode/storage}"
J="bun run src/cli.ts"

echo "═══ THE REAL-CORPUS RIG (JM_HOME=$JM_HOME) ═══"
[ -d "$STORAGE" ] || { echo "FAIL: no shadow corpus at $STORAGE"; exit 1; }
[ -d "$OCDB" ] || { echo "FAIL: no ocdb directory at $OCDB"; exit 1; }

rm -rf "$JM_HOME"; mkdir -p "$JM_HOME"

# 1. the sources' state BEFORE anything touches them
python3 - "$OCDB" > /tmp/jm-real-before.json <<'PY'
import glob, json, os, sys
out = {}
for p in sorted(glob.glob(os.path.join(sys.argv[1], "*.db"))):
    out[p] = [os.path.getsize(p), os.path.getmtime(p)]
print(json.dumps(out))
PY

# 2. register the targets: @shadow + every real DB, each bounded so a 19GB source cannot stall
python3 - "$JM_HOME" "$OCDB" "$STORAGE" <<'PY'
import glob, json, os, sys
home, ocdb, storage = sys.argv[1], sys.argv[2], sys.argv[3]
targets = [{"name": "shadow", "kind": "fs", "root": storage, "opts": {"include": ["*.json", "*.jsonl"]}}]
for p in sorted(glob.glob(os.path.join(ocdb, "*.db"))):
    name = "ocdb-" + os.path.basename(p).replace("opencode", "").replace(".db", "").strip("-") or "main"
    targets.append({"name": name, "kind": "sqlite", "root": p, "opts": {"limitPerTable": 300}})
json.dump(targets, open(os.path.join(home, "targets.json"), "w"), indent=2)
print("registered:", [t["name"] for t in targets])
PY

# 3. index everything into ONE index
echo "--- indexing the real corpora (this takes ~40s; the 19GB DB is SAMPLED, never copied) ---"
time $J index --in all --name real 2>&1 | tail -8
RC=${PIPESTATUS[0]}
[ $RC -eq 0 ] || { echo "FAIL: the ingest exited $RC"; exit 1; }

# 4. the sources' state AFTER — the read-only law
python3 - "$OCDB" /tmp/jm-real-before.json <<'PY'
import glob, json, os, sys
before = json.load(open(sys.argv[2]))
ok = True
for p in sorted(glob.glob(os.path.join(sys.argv[1], "*.db"))):
    now = [os.path.getsize(p), os.path.getmtime(p)]
    same = before.get(p) == now
    ok = ok and same
    print(f"  {'UNCHANGED' if same else 'CHANGED!!!'}  {os.path.basename(p)}")
print("READ-ONLY LAW:", "HOLDS" if ok else "VIOLATED")
sys.exit(0 if ok else 1)
PY
[ $? -eq 0 ] || { echo "FAIL: a source database was modified"; exit 1; }

# 5. ONE query spanning both kinds (the gate's literal requirement)
echo "--- the cross-kind query ---"
$J query real --fts "theatrical" --json 2>/dev/null | python3 -c '
import json, sys
rows = json.load(sys.stdin)
kinds = {}
for r in rows: kinds[r["kind"]] = kinds.get(r["kind"], 0) + 1
fs = [r["path"] for r in rows if "#" not in r["path"]]
db = [r["path"] for r in rows if "#" in r["path"]]
print("  rows:", len(rows), "| kinds:", kinds)
print("  an fs row:", fs[0] if fs else "(none)")
print("  a db row :", db[0] if db else "(none)")
print("  CROSS-KIND:", "YES" if fs and db else "NO")
sys.exit(0 if (fs and db) else 1)'
[ $? -eq 0 ] || { echo "FAIL: the query did not span both kinds"; exit 1; }

echo ""
echo "REAL-CORPUS RIG: PASS — @shadow + @ocdb indexed together, the sources unchanged, one query spanning both."
