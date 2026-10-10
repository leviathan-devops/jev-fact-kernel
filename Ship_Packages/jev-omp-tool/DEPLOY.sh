#!/usr/bin/env bash
# DEPLOY.sh — install the jev OMP tool from this package onto a host.
# Usage: bash DEPLOY.sh            (installs to ~/.omp/agent/extensions/jev-manager/)
set -euo pipefail
PKG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="${OMP_AGENT_DIR:-$HOME/.omp/agent}/extensions/jev-manager"
CONFIG="${OMP_AGENT_DIR:-$HOME/.omp/agent}/config.yml"

echo "1 · installing the extension to $DEST"
mkdir -p "$DEST"
cp "$PKG_DIR/register/jev-manager/index.js" "$DEST/index.js"
cp "$PKG_DIR/register/jev-manager/index.ts.source" "$DEST/index.ts.source"
sha256sum "$DEST/index.js" | awk '{print "   installed sha256:", $1}'

echo "2 · ensuring the config.yml registration line"
if [ -f "$CONFIG" ] && grep -q "extensions/jev-manager/index.js" "$CONFIG"; then
  echo "   already registered in $CONFIG"
else
  echo "   ACTION REQUIRED: add this line under 'extensions:' in $CONFIG"
  echo "     - $DEST/index.js"
  echo "   (this script does not edit config.yml — YAML shape must not be guessed)"
fi

echo "3 · the runtime dependency (the jm CLI)"
if [ -x "$HOME/.local/bin/jm" ]; then
  echo "   jm found: $($HOME/.local/bin/jm --help 2>&1 | head -1)"
else
  echo "   WARNING: no jm at ~/.local/bin/jm — the tool will refuse JEV_CLI_MISSING."
  echo "   Install the JevManager project (the source ships in the checkpoint) or set JM_BIN."
fi

echo "4 · RESTART the OMP session (a running process never re-reads extension files)"
echo "5 · verify:  bash $PKG_DIR/register/verify-registration.sh"
echo "DEPLOY: done (steps 2 + 4 are the operator's)."
