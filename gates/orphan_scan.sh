#!/usr/bin/env bash
# orphan_scan.sh — GR-3: every module must have a NON-TEST caller, or be a
# declared entry point (main.ts / runtime.ts / cli.ts). Prints one line per
# orphan and a final `ORPHANS=<n>`.
# Usage: gates/orphan_scan.sh [repo-root]
set -uo pipefail

ROOT="${1:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$ROOT" || { echo "ORPHANS=-1"; exit 2; }

ENTRIES="main.ts runtime.ts cli.ts"
orphans=0

scan() { # scan <file>
  local f="$1" base refs
  base="$(basename "$f")"
  for e in $ENTRIES; do [ "$base" = "$e" ] && return 0; done
  # callers OUTSIDE tests/ (any .ts/.js/.sh/.json that names the module stem
  # as a whole word: -wF so `plan` no longer matches `explain`/`planned`).
  refs=$(grep -rlnwF --include='*.ts' --include='*.js' --include='*.sh' --include='*.json' \
         -- "$(basename "$f" .ts)" src/ ao-client/ gates/ scripts/ bin/ package.json 2>/dev/null \
         | grep -v "^$f$" | grep -v '^tests' | wc -l | tr -d ' ')
  if [ "$refs" = "0" ]; then
    printf 'ORPHAN:%s (0 non-test callers)\n' "$f"
    orphans=$((orphans + 1))
  fi
  return 0
}

for f in src/*.ts ao-client/*.ts; do
  [ -e "$f" ] || continue
  case "$f" in *gen/routes.ts) continue;; esac
  scan "$f"
done

printf 'ORPHANS=%s\n' "$orphans"
exit 0