#!/bin/bash
# scripts-jm-watch.sh — the daemon launcher a service manager runs.
#
# `exec` IS THE POINT (runtime seat OP-17): `bun run src/cli.ts watch` produces a WRAPPER process
# plus a CHILD, and signalling the wrapper orphans the daemon. With `exec` the bun process REPLACES
# this shell, so the PID the service manager tracks IS the daemon and SIGTERM reaches it directly.
set -euo pipefail
cd "$(dirname "$0")"
exec "${JM_BUN:-$HOME/.bun/bin/bun}" run src/cli.ts watch --interval "${JM_WATCH_INTERVAL:-30000}" --in "${JM_WATCH_IN:-all}" --name "${JM_WATCH_INDEX:-all}"
