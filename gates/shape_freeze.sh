#!/usr/bin/env bash
# shape_freeze.sh — GR-5 / GS-4: the PRE-WRITTEN test shapes are a contract.
# Freezes the test identifiers declared in the build package's spec and
# reports any drift between the frozen list and what the tree implements.
# Usage: gates/shape_freeze.sh [repo-root]
#   first run  : writes gates/shape_freeze.sha16 (the freeze) and prints the list
#   later runs : prints DRIFT tokens when the implemented set differs
set -uo pipefail

ROOT="${1:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$ROOT" || { echo "SHAPE-ERROR:root-missing"; exit 2; }

# FIXED 2026-09-23 (ocr round-4 HIGH): "../packages/..." resolved ABOVE ROOT
# (the repo root) — a host path the script could never read in CI, so DECLARED
# was always empty and the freeze never established. The spec is vendored
# IN-REPO, so it resolves from ROOT and measures everywhere.
SPEC="$ROOT/packages/jarvis-upper-tier/jarvis_upper_tier_DPL1_SPEC.md"
FREEZE="gates/shape_freeze.sha16"

# The pre-written identifiers: `-t <id>` names + the DT ids, read from the spec.
# The DT pattern is IDENTICAL on both sides (DECLARED here, IMPLEMENTED in
# DT_IDS below): DT[_-]?[0-9]+ catches DT1/DT-1/DT_1/DT4+ alike, and -t ids
# allow digits/hyphens (a bare [a-z_] silently drops `my-test-01`).
DECLARED=$(grep -oE '(bun test -t [a-z0-9_-]+|-t [a-z0-9_-]+|DT[_-]?[0-9]+)' "$SPEC" 2>/dev/null \
           | sed -E 's/.*-t //' | tr '_' '-' | sed -E 's/^DT-?([0-9]+)$/DT\1/' | sort -u)
if [ -z "$DECLARED" ]; then
  echo "SHAPE-ERROR:no declared test ids found in $SPEC"
  exit 2
fi

# IMPLEMENTED = the shapes the suite actually contains. Two sources, because a
# declared shape may be a TEST FILE (`-t dt_shapes`) or a shape id INSIDE a job's
# test (DT-1/DT-2/DT-3 live in the worker's jobs/*/tests). Normalize DT-1|DT_1|DT1
# to one token so the two sides of `comm` speak the same alphabet.
FACTORY=$(for f in tests/*.test.ts; do [ -e "$f" ] || continue; basename "$f" .test.ts; done | sort -u)
JOBS=$(for f in jobs/*/*.test.ts; do [ -e "$f" ] || continue; basename "$f" .test.ts; done | sort -u)
# A claimed job's shapes live in the WORKER'S worktree (the deliverable), not here.
# Discover every AO worktree so the default denominator is honest without an env var.
if [ -z "${DT_WORKTREE:-}" ]; then
  DT_WORKTREES=$(ls -d "$HOME"/.ao/data/worktrees/*/*/tests 2>/dev/null)
else
  DT_WORKTREES="${DT_WORKTREE}/tests"
fi
DT_IDS=$(grep -rhoE 'DT[_-]?[0-9]+' tests/ jobs/ $DT_WORKTREES 2>/dev/null \
         | tr '_' '-' | sed -E 's/^DT-?([0-9]+)$/DT\1/' | sort -u)
IMPL=$(printf '%s\n%s\n%s\n' "$FACTORY" "$JOBS" "$DT_IDS" | sed '/^$/d' | sort -u)

sha16() { printf '%s' "$1" | sha256sum | cut -c1-16; }
D_SHA=$(sha16 "$DECLARED")
I_SHA=$(sha16 "$IMPL")

echo "declared ($(printf '%s\n' "$DECLARED" | wc -l | tr -d ' ')): $(printf '%s ' $DECLARED)"
echo "implemented ($(printf '%s\n' "$IMPL" | wc -l | tr -d ' ')): $(printf '%s ' $IMPL)"

if [ ! -f "$FREEZE" ]; then
  printf '%s\n' "$D_SHA" > "$FREEZE"
  echo "FREEZE:wrote gates/shape_freeze.sha16=$D_SHA"
else
  F_SHA=$(cat "$FREEZE")
  if [ "$F_SHA" != "$D_SHA" ]; then
    echo "SHAPE-DRIFT:declared-set-changed frozen=$F_SHA now=$D_SHA"
  else
    echo "FREEZE:match=$D_SHA"
  fi
fi

DRIFT=$(comm -23 <(printf '%s\n' "$DECLARED") <(printf '%s\n' "$IMPL") | tr '\n' ' ')
if [ -n "${DRIFT// /}" ]; then
  for id in $DRIFT; do echo "TEST-SHAPE-DRIFT:$id (declared, not implemented)"; done
  exit 1
fi
echo "SHAPES:all declared ids implemented"
exit 0