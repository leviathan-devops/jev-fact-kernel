#!/bin/bash
# scripts-seal.sh — refresh the JM checkpoint seal. Idempotent: it REPLACES each sealed subtree
# rather than copying into it (a plain `cp -r X dest/X` nests, which is how the seal once ended up
# with 20 canon docs instead of 11).
set -euo pipefail
cd "$(dirname "$0")"

CP="${1:-Checkpoints/jm-v0-waves-green-a39afe8}"
# THE DESTRUCTIVE PATH IS GUARDED, and the guard is a NAMED REFUSAL, not a warning. Step 1 below
# runs `rm -rf "$CP/$d"` for src/tests/context_management/artifacts/recipes/packages, so a caller who
# passes a path resolving to the LIVE TREE (`./scripts-seal.sh .`, `..`, `/`) would delete the source
# tree and then fail at the copy, with `set -e` aborting and the tree already gone. Validating only
# `[ -d "$CP" ]` accepted every one of those. Found by the audit (H-1).
case "$CP" in
  Checkpoints/*) : ;;
  *) echo "REFUSING: the seal writes only under Checkpoints/ (got '$CP'); it removes each subtree before copying it" >&2; exit 1 ;;
esac
[ -d "$CP" ] || { echo "no such checkpoint: $CP" >&2; exit 1; }

# 1. trees: remove then copy — never copy INTO a surviving directory
for d in src tests context_management artifacts recipes packages; do
  [ -e "$d" ] || continue
  rm -rf "$CP/$d"
  cp -r "$d" "$CP/$d"
done

# 2. the ship docs + the runner, flat
for f in TESTING_LOG.md FAILURE_LOG.md DEBUG_LOG.md BUILD_REPORT.md AUDIT_SUMMARY.md \
         README.md THEATRICALITY_LOG.md VIOLATION_LOG.md \
         scripts-container-rig.sh scripts-gates.sh scripts-jm-mcp.sh scripts-real-corpus.sh \
         scripts-jm-watch.sh \
         package.json tsconfig.json bunfig.toml; do
  [ -e "$f" ] && cp "$f" "$CP/$f"
done

# 3. the tree sha of exactly what is sealed
find src tests -name '*.ts' -type f | sort | xargs sha256sum | sha256sum | cut -c1-32 > "$CP/SOURCE_TREE.sha256"
SHA=$(cat "$CP/SOURCE_TREE.sha256")
GIT=$(git rev-parse --short HEAD 2>/dev/null || echo "no-git")

# 3b. every canon doc's TREE SHA line + BUILD_STATE's inventories — synced to THIS seal, so the
#     docs and the seal can never disagree (that divergence happened twice before it was scripted).
python3 - "$CP" "$SHA" "$GIT" <<'PY2'
import re, sys, os, pathlib
cp, sha, git = sys.argv[1], sys.argv[2], sys.argv[3]
root = pathlib.Path("context_management")
line = ("**TREE SHA: `" + sha + "` (git " + git + ")** - every canon doc that carries this line "
        "carries THIS sha; a disagreement means one is stale. Re-derive with ./scripts-seal.sh")
n = 0
for f in sorted(root.glob("*.md")):
    s = f.read_text(encoding="utf-8")
    if "TREE SHA:" not in s:
        continue
    s = re.sub(r"\*\*TREE SHA: .*\n", "", s)
    # IDEMPOTENT INSERTION. The old form was `[parts[0], "", line] + parts[1:]`, which re-emitted the
    # doc's ORIGINAL blank line 2 as well as the new one, so every run added a blank between the TREE
    # SHA line and the body: the script was documented as idempotent and was not. It is visible in the
    # tree — CURRENT_STATE.md had accumulated 42 leading blanks and NEXT_STEPS.md 43. Strip EVERY
    # leading blank, then insert exactly one. Found by the audit (H-4).
    lines = s.split("\n")
    body = lines[1:]
    while body and body[0].strip() == "":
        body.pop(0)
    out = [lines[0], "", line] + body
    f.write_text("\n".join(out), encoding="utf-8")
    n += 1
print(f"  canon docs re-synced to {sha}: {n}")
PY2

# 3c. BUILD_STATE's two inventories — regenerated from the live tree for the same reason.
python3 - <<'PY3'
import os, re, pathlib
def inv(d):
    rows = []
    for root, _, fs in os.walk(d):
        for f in sorted(fs):
            if f.endswith(".ts"):
                p = os.path.join(root, f); rows.append((p, sum(1 for _ in open(p, encoding="utf-8"))))
    rows.sort()
    return rows, "\n".join("| `" + r + "` | " + str(n) + " |" for r, n in rows)
srows, sinv = inv("src"); trows, tinv = inv("tests")
p = pathlib.Path("context_management/BUILD_STATE.md")
s = p.read_text(encoding="utf-8")
s = re.sub(r"## THE MODULE INVENTORY \(src/, \d+ files\)\n\n\| file \| lines \|\n\|------\|-------\|\n(\|.*\n)+",
           "## THE MODULE INVENTORY (src/, " + str(len(srows)) + " files)\n\n| file | lines |\n|------|-------|\n" + sinv + "\n", s)
s = re.sub(r"## THE TEST INVENTORY \(tests/, \d+ files\)\n\n\| file \| lines \|\n\|------\|-------\|\n(\|.*\n)+",
           "## THE TEST INVENTORY (tests/, " + str(len(trows)) + " files)\n\n| file | lines |\n|------|-------|\n" + tinv + "\n", s)
p.write_text(s, encoding="utf-8")
print("  BUILD_STATE inventories: src=" + str(len(srows)) + " tests=" + str(len(trows)))
PY3

# 4. the manifest's volatile lines
python3 - "$CP" "$SHA" "$GIT" <<'PY'
import re, sys, pathlib
cp, sha, git = sys.argv[1], sys.argv[2], sys.argv[3]
p = pathlib.Path(cp) / "CHECKPOINT_MANIFEST.md"
s = p.read_text(encoding="utf-8")
s = re.sub(r"git: branch master @ [0-9a-f]+", f"git: branch master @ {git}", s)
s = re.sub(r"source tree sha256: `[0-9a-f]+`", f"source tree sha256: `{sha}`", s)
s = re.sub(r"battery \(run from THIS COPY\): \*\*\d+ pass / 0 fail / \d+ expects / \d+ files\*\*",
           "battery (run from THIS COPY): **RECHECK BY RUNNING IT**", s)
p.write_text(s, encoding="utf-8")
print(f"manifest: sha={sha} git={git}")
PY

# 5. verify FROM THE COPY — the only check that matters
echo "== battery, from the copy =="
( cd "$CP" && bun test tests/ 2>&1 | tail -3 )
echo "== container rig, from the copy =="
( cd "$CP" && bun run tests/container/harness.ts 2>&1 | tail -2 )

# 6. the structure gate
echo "== structure =="
printf "  src: %s files (live %s)\n" "$(find "$CP/src" -name '*.ts' | wc -l)" "$(find src -name '*.ts' | wc -l)"
printf "  tests: %s files (live %s)\n" "$(find "$CP/tests" -name '*.ts' | wc -l)" "$(find tests -name '*.ts' | wc -l)"
# the canon is the 11 NAMEED docs; anything else is reported BY NAME rather than by count, so a
# deliberate addition (RUNTIME_SEAT, the P4 seat doc) is distinguishable from a nested copy.
CANON11="CURRENT_STATE NEXT_STEPS DECISION_CHAIN EVIDENCE_STATE BUILD_STATE COMPACTION_SURVIVAL POST-COMPACTION_PROMPT CHANGELOG TASK_QUEUE RUNNING_BUILD_LOG RUNNING_DEBUG_LOG"
missing=0; for n in $CANON11; do [ -f "$CP/context_management/$n.md" ] || { echo "  CANON MISSING: $n.md"; missing=1; }; done
extras=$(find "$CP/context_management" -name '*.md' -printf '%f\n' | sed 's/\.md$//' | grep -vxF "$(echo $CANON11 | tr ' ' '\n')" | tr '\n' ' ')
printf "  context_management: 11 canon %s%s\n" "$([ $missing -eq 0 ] && echo present || echo INCOMPLETE)" "$([ -n "$extras" ] && echo " + extras: $extras")"
[ $missing -eq 0 ] || exit 1
printf "  ship docs: %s/7\n" "$(for f in BUILD_REPORT.md DEBUG_LOG.md FAILURE_LOG.md TESTING_LOG.md THEATRICALITY_LOG.md VIOLATION_LOG.md AUDIT_SUMMARY.md; do [ -f "$CP/$f" ] && echo x; done | wc -l)"
printf "  sha: %s\n" "$SHA"
