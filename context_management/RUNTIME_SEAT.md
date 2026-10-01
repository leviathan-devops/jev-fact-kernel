# RUNTIME SEAT — where the kernel was driven, and what the seat caught

**The author's bench is not the seat.** A probe that passes on fixtures and fails on the live wire is
the failure this file exists to catch. This records the live host surface, the measured evidence
produced there, and the finding the SEAT produced that the bench could not.

**This doc is not a plan. It is the record of what was DRIVEN, with the tool result for each claim.**

---

## 1 · THE SEAT ITSELF

| the seat | the live value | how it was read |
|---|---|---|
| the judge | `http://127.0.0.1:8090` → `{"ok":true,"model":"jevk5-4b-v0.2-Q8_0"}` | `curl -s :8090/health` |
| the LSP registry | `/home/leviathan/.omp/agent/lsp.json` | read, rewritten, re-validated |
| the gated servers | `gi-lsp` · `plutus-lsp` · `jg-lsp` | the registry's own `servers` map |
| the server that was driven | `plutus-lsp`'s real command + real root | read from the live entry's `command`/`args` |
| the gate | `worktrees/jev-fact-kernel/bin/lsp-gate` | installed INTO the live `command` position |
| the ledger | `~/.omp/run/fact-firewall.jsonl` | `tail -1` |
| the worktree | `/home/leviathan/JARVIS_WORKSPACE/worktrees/jev-fact-kernel` | `git rev-parse --abbrev-ref HEAD` → `feat/jev-fact-kernel` |

**The gated entry, after install** — the server became the gate's argv:

```json
"plutus-lsp": {
  "command": "/home/leviathan/JARVIS_WORKSPACE/worktrees/jev-fact-kernel/bin/lsp-gate",
  "args":    ["bun", "/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/PLUTUS-COMMON-SENSE-LSP/scripts/plutus-lsp.ts", "--stdio"],
  "fileTypes": [".ts", ".tsx", ".js"],
  "rootMarkers": ["MASTER_CONTEXT", ".omp/graph-intelligence", ".arsumbris", "tsconfig.json"],
  "warmupTimeoutMs": 8000
}
```

**The registry's real shape**, which cost one defect to learn: `{"idleTimeoutMs": …, "servers": {name: {command, args, …}}}` —
a `servers` MAP with **command and args SPLIT**. Not a top-level `command`.

---

## 2 · THE FINDING THE SEAT PRODUCED — a hook that was a no-op

### 2.1 · The symptom

The extension bound `pi.on("lsp_registration", …)` at `extensions/fact-firewall/index.js:60`. The gate
read as **DONE**: the harness drove it **5/5**, the `FACT-FIREWALL T4 BLOCK` token appeared, the exit
codes matched. Nothing about that evidence was false — and the gate was still a **no-op on the real host**.

### 2.2 · The measurement

```
grep -rl 'lsp_registration' <the shipped runtime>       ->  0 files
```

**THE PLUGIN HOOK UNION** — read from the authoritative type, `pi-coding-agent/dist/types/extensibility/`:

```
agent_start · agent_end · before_agent_start · before_provider_request · after_provider_response
message_start · message_end · message_update
session_start · session_stop · session_shutdown · session_switch
session_branch · session_compact · session_tree
tool_call · tool_result · ttsr_triggered
```

**Eighteen events. Not one is an LSP event.** The only `lsp` string in the plugin extensibility surface
is `lspServers?:` in the MARKETPLACE types (`plugins/marketplace/types.d.ts:57`) — a manifest field, not
a hook.

**A handler bound to a name the runtime never emits never fires.** The gate was inert.

### 2.3 · Why the bench could not see it

The harness **called the handler directly**. That tests the handler's *logic* — the probe's parsing, the
token's format, the exit code. It can never test the *binding*, because the harness IS the emitter.
**A harness that invokes the handler bypasses the only thing that can be wrong.**

This is the build's recurring class, stated once more: *a check that cannot fail on the real carrier is
not a check.* The LSP fixture had a POS and a NEG — both controls were on the wrong axis. They proved the
logic; the defect was in the wiring.

### 2.4 · The carrier that CAN see the subject

**THE CARRIER LAW:** *a check runs on the carrier that can see its subject.*

Nothing in the plugin API sees an LSP registration. But `lsp.json` carries a **`command` that omp
spawns** — and that command **is** the registration. The native precedent already exists in the runtime:

```
pi-coding-agent/dist/types/lsp/lspmux.d.ts:35
  export interface LspmuxWrappedCommand { command: string; args: string[]; env?: Record<string,string>; }
  /** Wrap a server command to use lspmux client mode. */
```

**omp already wraps server commands.** `bin/lsp-gate` is that pattern, carrying a probe instead of a mux.

### 2.5 · The gate's contract

```
bin/lsp-gate <command> [args…]          run from the SERVER's cwd (LSP_GATE_ROOT overrides)

BLOCK  -> the ledger row + the message + exit NON-ZERO, and `exec` is NEVER reached
          ⇒ the server never runs ⇒ never completes `initialize` ⇒ NEVER REGISTERS
PASS   -> `exec "$@"` — this process BECOMES the server. Zero indirection, zero overhead.
UNREAD -> exit 2. An unread path is never a clean path. (FR-13, the fail-closed law.)
warn   -> FACT_FIREWALL_LSP=warn: the refusal is still ledgered, the registration proceeds.
```

**ENFORCEMENT BY ABSENCE.** A refused server leaves no process, no socket, no state — because it never
existed. There is nothing to clean up and nothing to bypass.

---

## 3 · THE EVIDENCE — every claim with its tool result

### T2 · a lying server in the LIVE registration position

```
the live plutus-lsp entry temporarily pointed at fixtures/lying-server/server.ts
then spawned through the INSTALLED command:

  [EXIT=1]                                             expect 1
  BLOCK token in stdout: True
  FACT-FIREWALL T4 BLOCK: 23 advertised capabilities answered -32601 MethodNotFound.
                          The initialize reply is a FALSE CAPABILITY DECLARATION.
  ERR  FACT-FIREWALL T4: registration REFUSED — the server was NEVER EXECUTED.

  THE PS TOKEN
  ps -eo pid,cmd | grep -c '[s]erver.ts --stdio'   ->   0     expect 0
```

### T3 · the ledger

```json
{ "ts": "2026-10-01T23:42:01+0400",
  "Pattern": "T4_LSP_CAPABILITY_LIE",
  "State":   { "tier": 4, "verdict": "BLOCK", "confidence": 1.0 },
  "Evidence":{ "capability": "colorProvider", "method": "textDocument/documentColor", "code": -32601 } }
```

All four required fields present: `Pattern`, `capability`, `method`, `code`.

**`confidence: 1.0` is not a threshold — nothing was judged.** It is a mechanical comparison: the server
*declared* 23 capabilities and *answered* 23 with `-32601`. A comparison with no judgment needs no
derived cut; a threshold would, and the derived-threshold law applies only then.

### The live wire · the REAL server through the gate

```
the live plutus-lsp, read from the live registry, driven through the gate from its real root:
  [EXIT=0]
  IMPLEMENTED (1):  OK diagnosticProvider  textDocument/diagnostic  answered
  ★ LIES (0) — DECLARED BUT NOT IMPLEMENTED:
  FACT-FIREWALL T4: every advertised capability answered.
```

**The live server is honest, and the gate passes it through.** The gate is not a blocker of work; it is a
blocker of lies. Both directions observed on the live carrier.

---

## 4 · A DEFECT IN MY OWN INSTALLER — caught by asserting its effect

The first install read `cfg["command"]` at the **top level** and printed:

```
gated: []
valid JSON, 2 servers
```

**A silent no-op that reported success.** The live shape is `{"servers": {…}}` with `command` and `args`
split. The installer now asserts its own effect and would refuse to report a green it did not produce:

```python
assert c["command"].endswith("lsp-gate"), name + " not gated"
assert c["args"], name + " lost its argv"
```

**The lesson is the kernel's own thesis:** an install that does not verify its effect is an install that
did not happen, wearing the output of one that did.

---

## 5 · THE REPLICATION RECIPE — driving this seat again

```bash
K=/home/leviathan/JARVIS_WORKSPACE/worktrees/jev-fact-kernel
LSPJSON=/home/leviathan/.omp/agent/lsp.json

# 1 · the judge is the substrate; if it is cold, warm it
curl -s http://127.0.0.1:8090/health

# 2 · the gate, both ways, on fixtures
cd "$K"
LSP_GATE_ROOT=fixtures/lying-server  ./bin/lsp-gate bun server.ts --stdio ; echo "expect 1"
LSP_GATE_ROOT=fixtures/honest-server ./bin/lsp-gate bun server.ts --stdio ; echo "expect exec"

# 3 · the live wire — the REAL server, read from the live registry, not a fixture path
python3 -c "
import json,subprocess
c=json.load(open('$LSPJSON'))['servers']['plutus-lsp']
print(subprocess.run([c['command']]+c['args'],capture_output=True,text=True,
      cwd='/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/PLUTUS').stdout[-400:])"

# 4 · the installed direction — a lie through the LIVE registration position
#     (back up the registry first; restore when done)
cp "$LSPJSON" /tmp/lsp.bak

# 5 · the ledger
tail -1 ~/.omp/run/fact-firewall.jsonl
```

---

## 6 · THE SEAT'S STANDING RULES

1. **A fixture pass is a logic pass, never a wiring pass.** Drive the real carrier or the claim is open.
2. **Read the registry's real SHAPE before rewriting it.** `{"servers": {name: {command, args}}}` — a
   wrong shape produces a silent no-op that reports success.
3. **Back up the live registry before any rewrite, restore after.** The gate is safe to install
   permanently; a *fixture* pointed at through the live entry is not.
4. **A gate's `ps` token is the absence of a process.** Enforcement by absence is proven by counting
   what did not start.
5. **When no hook can see the subject, the carrier is the COMMAND.**

---

## 7 · WHAT THIS SEAT DOES NOT YET COVER

Stated so a bench pass is never mistaken for it:

- **A real omp session spawning a gated LSP.** The gate was driven through the installed `lsp.json`
  command from a shell — the registry, the command, the args and the root are live, but omp's own LSP
  client did not perform the spawn. The next session that opens a `.ts` file exercises it; the ledger
  row will be the receipt.
- **`gi-lsp` and `jg-lsp` individually driven.** Both are gated (asserted in the registry) and neither
  was driven through the gate on the live wire; only `plutus-lsp` was.
- **The kill path under load.** Concurrency, a server that hangs mid-probe, and the probe's own
  timeout were not exercised on the live wire.

---

## 8 · THE ANCHOR INDEX — where each claim in this file is backed

Every anchor below is a real file:line in this tree or its contract, cited in the classes W-9 counts.

- the contract this seat serves: `specs/DPL1_JEV_FACT_KERNEL.md:198` (FR-12 acceptance criteria)
- the probe command the contract fixes: `specs/DPL1_JEV_FACT_KERNEL.md:203`
- the motivating failure, measured in 0.09 s at exit 1: `specs/DPL1_JEV_FACT_KERNEL.md:40`
- the tier that caught it: `context_management/EVIDENCE_STATE.md:14`
- the CI gate that carries the checks: `.github/workflows/gates.yml:11`
- the commit gate that demanded this floor: `.githooks/pre-commit:76`

### THE GATE'S OWN DEFECT, FOUND WHILE SATISFYING IT

W-9's anchor predicate is: `grep -cE '[a-zA-Z0-9_/.-]+\.(ts|md|json|sh|yml):[0-9]+'`

**Two defects in one line, both the artifact-class kind the enrollment's own header warns about:**

1. **The extension alternation omits `py` and `js`.** This kernel's ENTIRE source is Python
   (`kernel/tier4-lsp-capability-probe.py`, `kernel/router.py`, `kernel/ledger.py`) and its extension
   is `extensions/fact-firewall/index.js`. **Not one can serve as an anchor.** A Python or JS project
   must cite *other* files to prove its own claims — the gate measures the wrong anchor class.
2. **`grep -c` counts LINES, not occurrences.** Two anchors on one line count once. A doc can carry
   five anchors and read as two.

**Neither is fatal to the gate's intent — both are worth naming** (the W-1 pattern: *a predicate that
fires on the wrong artifact class is exempt where it should bite and bites where it shouldn't*). The
fix is the alternation plus `grep -o … | wc -l`; it is the enrollment's file, so this seat records the
defect rather than editing a gate it does not own.
