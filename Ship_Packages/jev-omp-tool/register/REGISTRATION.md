# THE REGISTRATION CONTRACT — how the `jev` OMP tool must be registered

This file is the LAW of this package. A fresh OMP install that follows it WILL register the `jev`
tool correctly, top-level, on every session. It was verified by a clean-room boot on 2026-10-07.

## 1 · THE EXTENSION FILE
Place `jev-manager/index.js` (the bundle) at:
`~/.omp/agent/extensions/jev-manager/index.js`
(`index.ts.source` is the readable source twin; the bundle is what loads.)

## 2 · THE CONFIG LINE
In `~/.omp/agent/config.yml`, under `extensions:`, add:
```yaml
  - /home/<user>/.omp/agent/extensions/jev-manager/index.js
```
(The path must be ABSOLUTE and the file must EXIST at load time — a config line pointing at a
missing file is silently inert.)

## 3 · THE REGISTRATION LAW (inside the file — do not regress)
```js
pi.registerTool({
  name: "jev",
  label: "jev",
  loadMode: "essential",      // <- REQUIRED: without it the tool is only an xd:// device
  defaultInactive: false,     // <- REQUIRED: force-included into the initial active set
  description: "...",
  parameters: z.object({ ... }),
  async execute(...) { ... },
});
```
OMP source anchors (pi-coding-agent):
- `src/sdk.ts:2984-2997` — `!defaultInactive` extension tools are ALWAYS included in
  `initialToolNames` at session construction.
- `src/tools/xdev.ts:81-84` — `isMountableUnderXdev` mounts ONLY `loadMode === "discoverable"`;
  `essential` ships top-level.
- A live session's wire set is FROZEN at construction; later `setActiveToolsByName` calls (e.g.
  goal mode's `[...previousTools, "goal"]`) can strip a late tool — hence the extension's own
  activation handlers.

## 4 · THE ACTIVATION LAW (inside the file — do not regress)
- `session_start` handler: if `jev` is absent from `getActiveTools()`, add it — and LOG BOTH
  branches (`activated…` / `already in the active set…`). A silent conditional add is
  undebuggable.
- `before_agent_start` handler: idempotent re-assert (one `includes()` per prompt), serialized
  through a promise chain, with a verify-after-write retry (CAS).
- Receipts go to `console.error` (never stdout — stdout can be a protocol channel).

## 5 · THE VERIFICATION (run this — do not trust prose)
```bash
bash register/verify-registration.sh
```
It boots a FRESH OMP process against the PACKAGE's own extension file and asserts:
(a) the boot receipts fire; (b) a direct `jev` tool call executes; (c) the tool is callable
top-level. Exit 0 = registered correctly. Exit non-zero = read the named failure.

## 6 · THE KNOWN TRAPS (measured, 2026-10-07)
1. **The stale process trap:** a running OMP never re-reads extension files. After ANY change to
   the extension or config, RESTART the session. Check: `stat -c %y <file>` vs `ps -o lstart <pid>`.
2. **The model self-report trap:** a model saying "not in my tool list" is NOT evidence. The
   evidence is `/dump` (the wire schema) or the session transcript's toolCalls.
3. **The silent-handler trap:** an activation handler that only logs when it ACTS hides the case
   where the tool was present-then-stripped. Log both branches.
4. **The xd:// fallback:** if `loadMode` regresses to `discoverable` (or is missing), the tool
   still EXECUTES via `write xd://jev {...}` — a working call is not proof of top-level
   registration. Verify with the wire schema.
