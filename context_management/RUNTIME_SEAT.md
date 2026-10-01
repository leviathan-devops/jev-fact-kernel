# RUNTIME_SEAT — the fact kernel

**The seat is THIS HOST, not a bench.**

## THE MEASURED SEAT (the baseline turn)

| coordinate | the measured value |
|---|---|
| the judge | `http://127.0.0.1:8090` — `{"ok": true, "model": "jevk5-4b-v0.2-Q8_0", "runtime": "gguf", "backend": "llama:200"}` |
| the worktree | `/home/leviathan/JARVIS_WORKSPACE/worktrees/jev-fact-kernel` |
| the branch | `feat/jev-fact-kernel` |
| the anchor | `Shared_Workspace/jev-fact-kernel` → the worktree (ripwire is cwd-confined) |
| lsp.json | `~/.omp/agent/lsp.json` — carries `gi-lsp` and `plutus-lsp` |
| the live LSP processes | `ps -eo pid,cmd | grep -c '[p]lutus-lsp.ts --stdio'` → **0** |
| the ledger | `~/.omp/run/fact-firewall.jsonl` |
| the judge's backend | `llama:200` — the health reply GAINED a `backend` field since the pin |

## THE SEAT'S KNOWN TRAPS (measured)

- **ripwire is cwd-confined**: `RIPWIRE_PATH_DENIED` on the worktree until the anchor symlink
  exists in `Shared_Workspace/`. The anchor is created and recorded here.
- **the T4 probe spawns a server**: run against a directory that HAS `scripts/plutus-lsp.ts`, or
  it returns UNMEASURED (exit 2) — which is CORRECT, not a failure.
- **`/tmp` is not durable between runs**: the first probe's `/tmp/broken-probe.py` was deleted and
  the control re-ran clean. That is why the control set now ships in `fixtures/`.
