#!/usr/bin/env bash
# FIXED (ship gate HIGH): the hardening below is BASH-only (shopt/unset). Under sh/dash
# every `shopt ... || true` silently no-ops AND dash's `*` never matches dotfiles — so a
# hidden worktree bypassed the scan with a FALSE PASS. Refuse to run under anything but bash.
if [ -z "${BASH_VERSION:-}" ]; then
  echo "REJECT(G-RT): this gate requires bash (BASH_VERSION unset) — refusing to PASS unverified" >&2
  exit 1
fi
# G-RT — the runtime-artifact pre-flight (the common-sense firewall)
# Prevents: a session proceeding with a dead runtime (3 sessions ran with
# the AO daemon stopped and the publisher unwired, and nobody noticed).
# Usage: bash gates/rt-preflight.sh  (run at session start)
# exit 0 = the runtime is reachable + greenable; exit 1 = REJECT (named)
set -uo pipefail

FAIL=0

# 1. the AO daemon (the kernel's data source)
if curl -sf localhost:3001/healthz >/dev/null 2>&1; then
  echo "G-RT: AO daemon UP (:3001 -> 200)"
else
  echo "REJECT(G-RT): AO daemon DOWN on :3001 — start it:" >&2
  echo "  hub start ao-daemon (or: /usr/lib/agent-orchestrator/resources/daemon/ao daemon &)" >&2
  FAIL=1
fi

# 2. the kernel service (the tick loop + the publisher)
if systemctl --user is-active jarvis-upper >/dev/null 2>&1; then
  echo "G-RT: the kernel service is active"
else
  echo "REJECT(G-RT): the kernel service is DOWN — restart it:" >&2
  echo "  systemctl --user restart jarvis-upper.service" >&2
  FAIL=1
fi

# 3. the publisher is ARMED (the token is present)
# FIXED (the W15 ship gate MEDIUM): these two bare $HOME uses aborted under `set -u`
# BEFORE the later ${HOME:-...} fallback could run.
if [ -f "${HOME:-/home/leviathan}/.config/jarvis-upper.env" ] && grep -q '^GH_TOKEN=' "${HOME:-/home/leviathan}/.config/jarvis-upper.env" 2>/dev/null; then
  echo "G-RT: the publisher token is present (out-of-band)"
else
  echo "REJECT(G-RT): the publisher token is ABSENT — the kernel cannot POST factory/*" >&2
  echo "  write GH_TOKEN=<token> to ~/.config/jarvis-upper.env (mode 600)" >&2
  FAIL=1
fi

# 4. the fence can go green (the recipe works — the fixture proof)
FENCE="${HOME:-/home/leviathan}/JARVIS_WORKSPACE/Shared_Workspace/JARVIS-CORE/b6/fence2.py"
FIXTURE="/tmp/fence-green/job"
if [ -f "$FENCE" ] && [ -d "$FIXTURE" ]; then
  if python3 "$FENCE" adjudicate "$FIXTURE" \
    --expect-spec-sha "$(python3 "$FENCE" invariant-sha "$FIXTURE" 2>/dev/null)" \
    >/dev/null 2>&1; then
    echo "G-RT: the fence goes GREEN on the fixture (the recipe works)"
  else
    echo "REJECT(G-RT): the fence cannot go green on the fixture — the recipe is broken" >&2
    FAIL=1
  fi
else
  echo "G-RT: the fence fixture absent (not fatal — build it if the fence is needed)"
fi

# 5. the session worktrees carry a fence job (R7, red-team audit): the kernel
# adjudicates every session worktree, and one with NO SPEC.md makes every PR post
# factory/fence2=failure forever with nobody told why. A worktree that exists but
# carries no fence job is a NAMED refusal. (No worktrees yet = nothing to fence.)
# FIXED (the W14 ship gate LOW x2): `set -u` + an unset HOME aborted BEFORE any named
# REJECT; and the default root hardcoded "jarvis-upper" while src/main.ts derives it from
# UPPER_REPO — so a daemon on another repo adjudicated a tree this gate never scanned.
WORKTREE_ROOT="${UPPER_WORKTREE_ROOT:-${HOME:-/home/leviathan}/.ao/data/worktrees/${UPPER_REPO:-jarvis-upper}}"
# FIXED (ship-gate MEDIUM): an EXPLICIT-but-missing override silently disabled the gate —
# `UPPER_WORKTREE_ROOT=/nonexistent` took the else branch and passed as "nothing to fence
# yet" while real worktrees under the default root went unfenced. Fail closed.
# FIXED (the W15 ship gate MEDIUM): a RELATIVE override resolves against THIS gate's cwd
# while the daemon resolves it against its own (systemd) cwd — the gate could scan a
# different tree and PASS. Require an absolute override.
if [ -n "${UPPER_WORKTREE_ROOT:-}" ] && [ "${UPPER_WORKTREE_ROOT#/}" = "$UPPER_WORKTREE_ROOT" ]; then
  echo "REJECT(G-RT): UPPER_WORKTREE_ROOT=$UPPER_WORKTREE_ROOT is RELATIVE — the daemon resolves it against a different cwd; refusing to PASS unverified" >&2
  FAIL=1
elif [ -n "${UPPER_WORKTREE_ROOT:-}" ] && [ ! -d "$UPPER_WORKTREE_ROOT" ]; then
  # FIXED (the W14 ship gate LOW): `[ ! -d ]` is also true for a regular file / broken
  # symlink, so the message blamed a MISSING path for a WRONG-TYPE one.
  if [ -e "$UPPER_WORKTREE_ROOT" ] || [ -L "$UPPER_WORKTREE_ROOT" ]; then
    echo "REJECT(G-RT): UPPER_WORKTREE_ROOT=$UPPER_WORKTREE_ROOT exists but is not a directory — refusing to PASS with an unverifiable worktree root" >&2
  else
    echo "REJECT(G-RT): UPPER_WORKTREE_ROOT=$UPPER_WORKTREE_ROOT does not exist — refusing to PASS with an unverifiable worktree root" >&2
  fi
  FAIL=1
# FIXED (ship gate MEDIUM): a root that EXISTS but is not a LISTABLE directory (a regular
# file, a broken symlink, a dir missing +r/+x) fell through to "nothing to fence yet" and
# PASSed without verifying anything. Fail closed on an unverifiable root.
# FIXED (ship gate MEDIUM): `-e` is FALSE for a dangling symlink, so a broken-symlink root
# skipped both this REJECT and the `-d` branch and fell through to PASS. `-L` covers it.
elif { [ -e "$WORKTREE_ROOT" ] || [ -L "$WORKTREE_ROOT" ]; } && { [ ! -d "$WORKTREE_ROOT" ] || [ ! -r "$WORKTREE_ROOT" ] || [ ! -x "$WORKTREE_ROOT" ]; }; then
  echo "REJECT(G-RT): the worktree root $WORKTREE_ROOT is not a listable directory — refusing to PASS unverified" >&2
  FAIL=1
elif [ -d "$WORKTREE_ROOT" ]; then
  WT_N=0; WT_NO_SPEC=0
  # FIXED (ship-gate LOW): the `*/` glob skips dot-directories, so a hidden worktree
  # bypassed the gate while still being adjudicated. dotglob makes the glob complete.
  # FIXED (ship-gate LOW): an unconditional `shopt -u` clobbered the CALLER's option state.
  # Save + restore it.
  # FIXED (the W14 ship gate LOW): only dotglob was saved. A caller-exported failglob made
  # an empty root raise `no match`; nullglob/GLOBIGNORE could FILTER entries (a hidden
  # bypass). Save + clear them all.
  DOTGLOB_WAS=$(shopt -p dotglob 2>/dev/null || true)
  FAILGLOB_WAS=$(shopt -p failglob 2>/dev/null || true)
  NULLGLOB_WAS=$(shopt -p nullglob 2>/dev/null || true)
  # FIXED (the W15 ship gate HIGH): GLOBIGNORE (not a shopt) ALSO filters the glob — a
  # caller-exported GLOBIGNORE='*' made the loop see zero entries -> a false PASS.
  GLOBIGNORE_WAS="${GLOBIGNORE:-}"
  unset GLOBIGNORE
  shopt -s dotglob 2>/dev/null || true
  shopt -u failglob 2>/dev/null || true
  shopt -u nullglob 2>/dev/null || true
  # FIXED (the W15 ship gate HIGH x2): the OLD glob `"$ROOT"/*/` expands to DIRECTORIES ONLY
  # (bash filters non-dirs), so a non-directory entry was invisible — and an EMPTY root left
  # the pattern LITERAL, which then hit the non-dir check and became a permanent REJECT.
  # A bare `/*` matches every entry; `[ -e ] || [ -L ]` skips the literal (empty root).
  for wt in "$WORKTREE_ROOT"/*; do
    { [ -e "$wt" ] || [ -L "$wt" ]; } || continue     # the unexpanded literal (an empty root)
    if [ ! -d "$wt" ]; then
      # FIXED (the W24 ship gate MEDIUM): a hard FAIL on ANY non-directory blocked every
      # session on a stray file (.DS_Store, a lock, a socket). The daemon enumerates the DB
      # and resolves WORKTREE_ROOT/<session> — it never adjudicates a stray file. WARN, do not block.
      echo "G-RT: note: $wt is not a directory (ignored — the daemon adjudicates only DB sessions)" >&2
      continue
    fi
    WT_N=$((WT_N + 1))
    # FIXED (ship-gate MEDIUM): -f was weaker than the fence's own readability check, so an
    # unreadable/empty SPEC.md passed here and still failed as FENCE-NO-SPEC. Require readable
    # AND non-empty.
    # FIXED (ship-gate LOW): -r/-s are true for a DIRECTORY, so require -f too; and
    # `basename --` stops a dash-prefixed name being parsed as an option.
    # FIXED (ship gate LOW): -s passes a whitespace-only file (a single newline). Require
    # non-BLANK content (grep -q for a non-space char), matching the fence's own refusal.
    # FIXED (ship gate HIGH): a readable non-blank SPEC.md still PASSed here while the
    # fence REFUSED it (verdict.ts requires an `artifact:` line + a committed, byte-identical
    # artifact -> FENCE-NO-ARTIFACT). Require the SAME shape the fence requires.
    # NOTE (W25 SIMPLIFICATION): W24 tried to REPLICATE the fence here (resolving the
    # artifact, checking it is committed + byte-identical). That diverged from the fence's own
    # rules in BOTH directions (it rejected relative artifact values the fence ACCEPTS, and it
    # kept trailing comments the fence strips) — two false-REJECT classes. A PREFLIGHT is a
    # PRE-check: its job is to catch the FENCE-NO-SPEC class (a worktree the fence will refuse
    # on EVERY PR). The fence's `artifactBoundToHead` is the AUTHORITY for the rest.
    if [ ! -f "$wt/SPEC.md" ] || [ ! -r "$wt/SPEC.md" ] || [ ! -s "$wt/SPEC.md" ] || ! grep -q -e '[^[:space:]]' -- "$wt/SPEC.md" 2>/dev/null || ! grep -qE '^[[:space:]]*artifact:[[:space:]]*[^[:space:]]' -- "$wt/SPEC.md" 2>/dev/null; then
      # FIXED (ship-gate LOW): `basename --` is GNU-only (fails on BSD/macOS). Strip in-shell.
      WT_NAME="${wt%/}"; WT_NAME="${WT_NAME##*/}"
      echo "REJECT(G-RT): the worktree $WT_NAME has NO readable, non-empty SPEC.md — the fence would answer FENCE-NO-SPEC on every PR" >&2
      echo "  fix: write a SPEC.md naming a COMMITTED artifact (see .trident/remediation-pkg/)" >&2
      WT_NO_SPEC=$((WT_NO_SPEC + 1))
    fi
  done
  if [ -n "$DOTGLOB_WAS" ]; then eval "$DOTGLOB_WAS"; else shopt -u dotglob 2>/dev/null || true; fi
  # FIXED (the W15 ship gate LOW): symmetric restore (the -s/-u mutation must be undone even
  # if the save was empty, so a SOURCED gate never leaks its option state).
  if [ -n "$FAILGLOB_WAS" ]; then eval "$FAILGLOB_WAS"; else shopt -u failglob 2>/dev/null || true; fi
  if [ -n "$NULLGLOB_WAS" ]; then eval "$NULLGLOB_WAS"; else shopt -u nullglob 2>/dev/null || true; fi
  # FIXED (the W20 ship gate LOW): `export` ADDED an attribute the caller may not have had.
  # A plain assignment (or an unset) restores the attribute too.
  if [ -n "$GLOBIGNORE_WAS" ]; then GLOBIGNORE="$GLOBIGNORE_WAS"; else unset GLOBIGNORE; fi
  if [ "$WT_NO_SPEC" -gt 0 ]; then   # FIXED: BAD_N was dead (non-dirs now warn, not count)
    FAIL=1
  elif [ "$WT_N" -eq 0 ]; then
    echo "G-RT: the worktree root exists but holds no session worktree (nothing to fence yet)"
  else
    echo "G-RT: $WT_N session worktree(s) carry a fence job"
  fi
else
  echo "G-RT: no worktree root at $WORKTREE_ROOT (nothing to fence yet)"
fi

if [ "$FAIL" -eq 1 ]; then
  echo "G-RT: FAIL (a named check above failed — fix it before starting the session)" >&2
  exit 1
fi
echo "G-RT: PASS (the runtime is reachable + greenable)"
exit 0
