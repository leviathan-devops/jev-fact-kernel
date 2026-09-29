#!/usr/bin/env bash
# jm-triage.sh — narrow a directory BEFORE an agent reads it.
#
#   ./jm-triage.sh <dir> "<question>" [fts-terms] [min-p] [limit]
#
#   ./jm-triage.sh ./reports "does this describe a shipping failure?" "failure crash" 0.6 30
#
# WHY THIS EXISTS: an agent that reads 300 files to find the 3 that matter has spent its
# context window on 297 irrelevant documents. This narrows on LOCAL hardware first — the judge
# reads the candidates, the agent reads the verdicts. The bulk reading never enters the context.
#
# OUTPUT: JSON on stdout, one object per KEPT candidate with its probability — directly
# consumable by an agent (pipe it into a file and hand over the path).
#
# EXIT: 0 = at least one candidate kept · 1 = none kept (a NAMED outcome, not a silent empty)
set -euo pipefail

DIR="${1:?usage: jm-triage.sh <dir> \"<question>\" [fts] [min-p] [limit]}"
QUESTION="${2:?usage: jm-triage.sh <dir> \"<question>\" [fts] [min-p] [limit]}"
FTS="${3:-}"
MINP="${4:-0.5}"
LIMIT="${5:-50}"

# A SCRATCH JM_HOME. Indexing into the operator's real store is a documented failure mode
# (EN-101: 310 MB of probe indexes); a triage run is a probe.
export JM_HOME="${JM_TRIAGE_HOME:-/tmp/jm-triage-$$}"
export JM_JUDGE_URL="${JM_JUDGE_URL:-http://127.0.0.1:8090/v1/systemone}"
mkdir -p "$JM_HOME"
trap 'rm -rf "$JM_HOME"' EXIT

jm index "$DIR" --name triage >/dev/null

# --min-p is the decision threshold. 0.5 is a WIDE net (review more, miss less); 0.8 is the
# find-chain default (narrow, higher precision). The right number depends on what a miss costs.
if [ -n "$FTS" ]; then
  jm filter triage --question "$QUESTION" --fts "$FTS" --min-p "$MINP" --limit "$LIMIT" --json
else
  jm filter triage --question "$QUESTION" --min-p "$MINP" --limit "$LIMIT" --json
fi
