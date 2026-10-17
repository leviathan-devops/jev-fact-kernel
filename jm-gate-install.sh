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
#
# ★ W4 (LEV-27) — THE THREE DEFECTS THIS VERSION CLOSES (each measured on Leviathan):
#   1. THE DORMANT HOOK. It wrote `$REPO/.git/hooks/pre-commit`, which git IGNORES when
#      core.hooksPath is set (JevManager sets `.githooks`). It now installs into the repo's
#      EFFECTIVE hooks dir: `git rev-parse --git-path hooks` (respects core.hooksPath and
#      linked worktrees, whose `.git` is a FILE and was refused by the old `-d .git` test).
#   2. THE WRONG REPO. The hook names the committing repo (JM_CALLER_ROOT = its toplevel) and
#      the jm shim judges THAT root instead of its own engine checkout.
#   3. THE PATH SKIP. A non-interactive shell has no ~/.local/bin on PATH, so `command -v jm`
#      found nothing and the hook printed JM_HOOK_SKIP. The ABSOLUTE jm path is resolved at
#      install time and baked into the hook; PATH and ~/.local/bin remain the fallbacks.
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

REPO_IN="${TARGET:-$PWD}"
if ! REPO="$(git -C "$REPO_IN" rev-parse --show-toplevel 2>/dev/null)" || [ -z "$REPO" ]; then
  echo "${RED}REFUSING:${RST} $REPO_IN is not inside a git work tree"
  exit 1
fi
# THE EFFECTIVE HOOKS DIR — the one git will actually run. Relative output is relative to $REPO.
HOOKS_DIR="$(cd "$REPO" && git rev-parse --git-path hooks)"
case "$HOOKS_DIR" in
  /*) ;;
  *) HOOKS_DIR="$REPO/$HOOKS_DIR" ;;
esac
HOOK="$HOOKS_DIR/pre-commit"

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

# RESOLVE jm TO AN ABSOLUTE PATH NOW (JM_BIN > PATH > ~/.local/bin), so the hook does not depend
# on the PATH of whatever shell later runs `git commit`.
JM_ABS="${JM_BIN:-}"
if [ -z "$JM_ABS" ]; then JM_ABS="$(command -v jm 2>/dev/null || true)"; fi
if [ -z "$JM_ABS" ] && [ -x "${HOME:-}/.local/bin/jm" ]; then JM_ABS="${HOME:-}/.local/bin/jm"; fi
if [ -n "$JM_ABS" ]; then
  case "$JM_ABS" in
    /*) ;;
    *) JM_ABS="$(cd "$(dirname "$JM_ABS")" && pwd)/$(basename "$JM_ABS")" ;;
  esac
fi
if [ -z "$JM_ABS" ] || [ ! -x "$JM_ABS" ]; then
  echo "${YEL}WARNING:${RST} jm was not found (JM_BIN, PATH, ~/.local/bin). The hook will SKIP (and say so) until it is."
  echo "  Install jm, or re-run with JM_BIN set to its absolute path."
fi

mkdir -p "$HOOKS_DIR"
{
cat <<'HOOKEOF'
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

HOOKEOF
printf '# the absolute jm path resolved at install time (PATH-independent)\nJM_BIN_INSTALLED=%q\n\n' "$JM_ABS"
cat <<'HOOKEOF'
# THE COMMITTING REPO, named explicitly: the jm shim runs its engine from its own checkout, so the
# root it must judge is handed to it (JM_CALLER_ROOT), never inferred from the engine's cwd.
if ! REPO_ROOT="$(git rev-parse --show-toplevel)" || [ -z "$REPO_ROOT" ]; then
  echo "JM_HOOK_REFUSE: cannot resolve the committing repo's root — the gate cannot tell what to judge." >&2
  exit 1
fi
export JM_CALLER_ROOT="$REPO_ROOT"

# jm resolution: JM_BIN (explicit) > the installed absolute path > PATH > ~/.local/bin.
JM_RUN="${JM_BIN:-}"
if [ -z "$JM_RUN" ] && [ -n "$JM_BIN_INSTALLED" ] && [ -x "$JM_BIN_INSTALLED" ]; then JM_RUN="$JM_BIN_INSTALLED"; fi
if [ -z "$JM_RUN" ]; then JM_RUN="$(command -v jm 2>/dev/null || true)"; fi
if [ -z "$JM_RUN" ] && [ -x "${HOME:-}/.local/bin/jm" ]; then JM_RUN="${HOME:-}/.local/bin/jm"; fi
if [ -z "$JM_RUN" ]; then
  echo "JM_HOOK_SKIP: jm was not found (JM_BIN, $JM_BIN_INSTALLED, PATH, ~/.local/bin) — the gate cannot run, so this commit is NOT gated." >&2
  echo "  install jm, or remove this hook deliberately: jm-gate-install.sh --remove" >&2
  exit 0   # an absent tool is not a failed gate; refusing here would brick every commit
fi

cd "$REPO_ROOT"
"$JM_RUN" push-gate
HOOKEOF
} > "$HOOK"

chmod +x "$HOOK"
echo "${GRN}installed${RST} $HOOK"
echo "  jm: ${JM_ABS:-<not found — the hook will SKIP>}"
echo ""
echo "  prove it with:  cd $REPO && git commit --allow-empty -m 'test the gate'"
echo "  the gate's six items print on every commit; a REFUSE blocks the commit with exit 1."
echo "  remove with:    $0 --remove $REPO"
