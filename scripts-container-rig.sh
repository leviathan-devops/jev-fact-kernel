#!/bin/bash
# scripts-container-rig.sh — run the spec §9 container rig (T1-T7 + the additive T10). Host parity + the container.
# Usage: ./scripts-container-rig.sh [host|container]
set -euo pipefail
cd "$(dirname "$0")"
MODE="${1:-host}"
if [ "$MODE" = "host" ]; then
  echo "== HOST PARITY RUN =="
  bun run tests/container/harness.ts
else
  echo "== CONTAINER RUN =="
  echo "1. pack:   tar -czf /tmp/jm-ct-src.tgz src tests/container package.json tsconfig.json recipes scripts-jm-mcp.sh"
  echo "2. cp:     container-testing cp  local=/tmp/jm-ct-src.tgz dest=/jm/"
  echo "3. unpack + run:"
  echo "           container-testing exec containerName=jm-ct-rig command='cd /jm && tar -xzf jm-ct-src.tgz && bun run tests/container/harness.ts'"
  echo "(the sanctioned path: raw docker is blocked by the container gate)"
fi
