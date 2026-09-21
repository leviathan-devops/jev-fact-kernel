#!/bin/bash
# scripts-jm-mcp.sh — the MCP stdio server launcher an MCP client (OMP included) invokes.
# It pins the working directory so `bun run src/cli.ts` resolves, and it keeps JM_HOME overridable.
#
# BUN RESOLUTION IS A LADDER, and the first rung is the one the MCP registry actually provides
# (VIOLATION_LOG §C14: the registry entry passes env.PATH containing .bun/bin). The old single
# fallback was `$HOME/.bun/bin/bun`, which fails whenever HOME is redirected — under a service
# manager, in a container, or in a test that sandboxes HOME — and that is precisely the failure
# mode a REGISTERED launcher must not have: it is invoked by absolute path, in an environment the
# author does not control.
set -euo pipefail
cd "$(dirname "$0")"
BUN="${JM_BUN:-}"
[ -n "$BUN" ] || BUN="$(command -v bun 2>/dev/null || true)"
[ -n "$BUN" ] || BUN="$HOME/.bun/bin/bun"
[ -x "$BUN" ] || { echo "scripts-jm-mcp.sh: no bun found (tried JM_BUN, PATH, \$HOME/.bun/bin)" >&2; exit 127; }
exec "$BUN" run src/cli.ts mcp
