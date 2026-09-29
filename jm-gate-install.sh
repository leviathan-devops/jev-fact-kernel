#!/usr/bin/env bash
# jm-gate-install.sh — install the JM push gate as a git pre-commit hook in ANY repo.
#
#   ./jm-gate-install.sh              # install in the current repo
#   ./jm-gate-install.sh /path/to/repo
#   ./jm-gate-install.sh --remove     # uninstall
#
# WHY A HOOK AND NOT A CI JOB: a hook refuses BEFORE the commit exists, so the bad commit never
# enters history and never needs rewriting. A CI job refuses after — which means the fix is a
# history rewrite or a revert commit. The hook is the cheapest place to enforce.
#
# WHAT IT CHECKS (six items, via `jm push-gate`):
#   spec component?     the named spec component exists          (SKIP when no --spec given)
#   built correctly?    tsconfig present + src files counted
#   tested correctly?   st-detect over the test tree, JUDGED     (legit/suspect/shitty)
#   not theatrical?     the judged theatricality score, JUDGED
#   Docs updated?       the ship docs are newer than the newest src file
#   Zero drift?         the tree sha matches the TREE SHA the canon docs state
set -euo pipefail

RED=$'\033[31m'; GRN=$'\033[32m'; YEL=$'\033[33m'; RST=$'\033[0m'

REMOVE=0
TARGET=""
for a in "$@"; do
  case "$a" in
    --remove|-r) REMOVE=1 ;;
    *) TARGET="$a" ;;
  esac
done

REPO="${TARGET:-$PWD}"
[ -d "$REPO/.git" ] || { echo "${RED}REFUSING:${RST} $REPO is not a git repository (no .git)"; exit 1; }
HOOK="$REPO/.git/hooks/pre-commit"

if [ "$REMOVE" = "1" ]; then
  if [ -f "$HOOK" ] && grep -q "THE JM PUSH GATE" "$HOOK" 2>/dev/null; then
    rm "$HOOK"; echo "${GRN}removed${RST} $HOOK"
  else
    echo "${YEL}nothing to remove${RST} — $HOOK is absent or is not a JM hook (not touching it)"
  fi
  exit 0
fi

if [ -f "$HOOK" ] && ! grep -q "THE JM PUSH GATE" "$HOOK" 2>/dev/null; then
  echo "${RED}REFUSING:${RST} $HOOK already exists and is NOT a JM hook."
  echo "  Back it up and remove it first, then re-run. Never silently overwrite another gate."
  exit 1
fi

command -v jm >/dev/null 2>&1 || {
  echo "${YEL}WARNING:${RST} jm is not on PATH. The hook will SKIP (and say so) until it is."
  echo "  Install jm, or set JM_BIN to its absolute path."
}

cat > "$HOOK" <<'HOOKEOF'
#!/usr/bin/env bash
# THE JM PUSH GATE — refuses a commit whose evidence does not hold.
# Installed by jm-gate-install.sh. Remove with: jm-gate-install.sh --remove
#
# THE ENDPOINT IS PINNED HERE, not inherited. A hook runs in a git-managed environment whose PATH
# and env the author does not control, and an UNSET JM_JUDGE_URL sends every judged call to the
# PUBLIC api — HTTP 402, terminal by design. A gate that cannot reach its judge must REFUSE for
# the named reason, never degrade into an unexplained pass.
export JM_JUDGE_URL="${JM_JUDGE_URL:-http://127.0.0.1:8090/v1/systemone}"

# `set -o pipefail` MATTERS. Piping jm into tee/head makes `$?` reflect the LAST command in the
# pipeline, so `jm push-gate | tee log` returns 0 even when the gate REFUSED. Measured. Without
# this line the hook would pass every commit it was installed to block.
set -o pipefail

JM_BIN="${JM_BIN:-$(command -v jm || true)}"
if [ -z "$JM_BIN" ]; then
  echo "JM_HOOK_SKIP: jm is not on PATH — the gate cannot run, so this commit is NOT gated." >&2
  echo "  install jm, or remove this hook deliberately: jm-gate-install.sh --remove" >&2
  exit 0   # an absent tool is not a failed gate; refusing here would brick every commit
fi

"$JM_BIN" push-gate
HOOKEOF

chmod +x "$HOOK"
echo "${GRN}installed${RST} $HOOK"
echo ""
echo "  prove it with:  cd $REPO && git commit --allow-empty -m 'test the gate'"
echo "  the gate's six items print on every commit; a REFUSE blocks the commit with exit 1."
echo "  remove with:    $0 --remove $REPO"
