#!/bin/bash
# scripts-jm-mcp.sh — the MCP stdio server launcher an MCP client (OMP included) invokes.
# It pins the working directory so `bun run src/cli.ts` resolves, and it keeps JM_HOME overridable.
set -euo pipefail
cd "$(dirname "$0")"
exec "${JM_BUN:-$HOME/.bun/bin/bun}" run src/cli.ts mcp
