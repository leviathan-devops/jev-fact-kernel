#!/usr/bin/env bash
# THE SPEC GATE — a change to the kernel MUST name the FR it implements.
#
#   bash scripts-spec-gate.sh <range>       e.g. HEAD~1..HEAD   (retrospective audit)
#   bash scripts-spec-gate.sh --staged      the STAGED set + a message file (the hook path)
#
# THE CARRIER MATTERS: at pre-commit time `git diff HEAD` compares HEAD to the WORKING TREE, so
# a STAGED file reads as changed and the message is not yet visible. The correct carrier is the
# `commit-msg` hook, which receives the message file and can read `git diff --cached`.
set -uo pipefail
MODE="${1:-}"
SPEC="specs/DPL1_JEV_FACT_KERNEL.md"
[ -f "$SPEC" ] || { echo "SPEC-GATE REFUSE: no spec at $SPEC"; exit 1; }

if [ "$MODE" = "--staged" ]; then
  MSGFILE="${2:-}"
  CHANGED=$(git diff --cached --name-only | grep -E '^(kernel/|extensions/fact-firewall/)' || true)
  MSG=$(cat "$MSGFILE" 2>/dev/null || echo "")
else
  R="${MODE:-HEAD~1..HEAD}"
  CHANGED=$(git diff --name-only "$R" | grep -E '^(kernel/|extensions/fact-firewall/)' || true)
  MSG=$(git log --format=%B "$R" 2>/dev/null || echo "")
fi

[ -z "$CHANGED" ] && { echo "SPEC-GATE: no kernel paths changed — nothing to check."; exit 0; }

if echo "$MSG" | grep -qE '(FR-[0-9]+|SC[0-9]+)'; then
  echo "SPEC-GATE PASS: names $(echo "$MSG" | grep -oE '(FR-[0-9]+|SC[0-9]+)' | sort -u | tr '\n' ' ')"
  exit 0
fi
echo "SPEC-GATE REFUSE: $(echo "$CHANGED" | wc -l) kernel file(s) changed but no FR/SC named."
echo "  the spec is the contract: $SPEC (sha16 $(sha256sum "$SPEC" | cut -c1-16))"
echo "  add the id to the commit body, e.g. 'fix(kernel): T0 returns UNMEASURED — FR-10'"
exit 1
