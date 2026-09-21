#!/bin/bash
# scripts-seal.sh — refresh the JM checkpoint seal. Idempotent: it REPLACES each sealed subtree
# rather than copying into it (a plain `cp -r X dest/X` nests, which is how the seal once ended up
# with 20 canon docs instead of 11).
set -euo pipefail
cd "$(dirname "$0")"

CP="${1:-Checkpoints/jm-v0-waves-green-a39afe8}"
[ -d "$CP" ] || { echo "no such checkpoint: $CP" >&2; exit 1; }

# 1. trees: remove then copy — never copy INTO a surviving directory
for d in src tests context_management artifacts recipes packages; do
  [ -e "$d" ] || continue
  rm -rf "$CP/$d"
  cp -r "$d" "$CP/$d"
done

# 2. the ship docs + the runner, flat
for f in TESTING_LOG.md FAILURE_LOG.md DEBUG_LOG.md BUILD_REPORT.md AUDIT_SUMMARY.md \
         README.md THEATRICALITY_LOG.md VIOLATION_LOG.md scripts-container-rig.sh \
         package.json tsconfig.json bunfig.toml; do
  [ -e "$f" ] && cp "$f" "$CP/$f"
done

# 3. the tree sha of exactly what is sealed
find src tests -name '*.ts' -type f | sort | xargs sha256sum | sha256sum | cut -c1-32 > "$CP/SOURCE_TREE.sha256"
SHA=$(cat "$CP/SOURCE_TREE.sha256")
GIT=$(git rev-parse --short HEAD 2>/dev/null || echo "no-git")

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
printf "  context_management: %s docs (expect 11; MORE means a nested copy)\n" "$(find "$CP/context_management" -name '*.md' | wc -l)"
printf "  ship docs: %s/7\n" "$(for f in BUILD_REPORT.md DEBUG_LOG.md FAILURE_LOG.md TESTING_LOG.md THEATRICALITY_LOG.md VIOLATION_LOG.md AUDIT_SUMMARY.md; do [ -f "$CP/$f" ] && echo x; done | wc -l)"
printf "  sha: %s\n" "$SHA"
