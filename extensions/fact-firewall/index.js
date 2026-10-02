// @bun
// ../../../../../tmp/ff.ts
import { existsSync, writeFileSync, mkdtempSync, rmSync } from "fs";
import { resolve, dirname } from "path";
import { execFile } from "child_process";
import { tmpdir } from "os";
var KERNEL = process.env.FACT_FIREWALL_KERNEL || "/home/leviathan/JARVIS_WORKSPACE/worktrees/jev-fact-kernel/kernel";
// THE DOWNGRADE IS GONE FROM BOTH CARRIERS (the zero-trust audit's F-A). bin/lsp-gate lost its
// FACT_FIREWALL_LSP=warn bypass; THIS FILE KEPT ITS OWN — a fix applied to one of two carriers and
// reported as done. An environment inherited by the gated subject must not be able to neuter its
// own gate: `lsp.json`'s `env` block, a shell export, or a dotfile could set warn and pass a liar.
// The repair path is an edit to `command` in lsp.json — the operator's hand on a file the server
// does not write. Fail-closed is not a mode.
var MODE = "refuse";
var TOOLCALL = "refuse";
function run(cmd, timeoutMs = 120000) {
  return new Promise((res) => {
    execFile(cmd[0], cmd.slice(1), { timeout: timeoutMs, maxBuffer: 8000000 }, (e, out, err) => {
      // THE DEFECT THIS REPLACES: `code: e?.code ?? 0`. On a TIMEOUT or a SIGNAL kill, `e.code`
      // is null and the reason lives in `e.signal`/`e.killed` — so `?? 0` mapped a probe that
      // never finished to exit 0, and every caller reads 0 as ok:true. A timed-out probe was
      // ATTESTING capability. A real numeric code survives; every abnormal exit gets -1.
      const code = e ? (typeof e.code === "number" ? e.code : -1) : 0;
      res({ code, out: out || "", err: err || "", signal: e?.signal ?? null, killed: e?.killed ?? false });
    });
  });
}
async function probeCapabilities(serverRoot, argv) {
  const probe = resolve(KERNEL, "tier4-lsp-capability-probe.py");
  if (!existsSync(probe)) {
    return { ok: false, refused: "T4_PROBE_MISSING", detail: `no probe at ${probe}` };
  }
  const { code, out, err } = await run(["python3", probe, serverRoot, ...argv]);
  if (code === 2) {
    return { ok: false, refused: "T4_UNMEASURED", detail: out.trim().slice(0, 400), exit: code };
  }
  if (code === 1) {
    const lies = (out.match(/^\s+LIE\s+/gm) || []).length;
    if (lies === 0) {
      return {
        ok: false,
        refused: "T4_PROBE_CRASHED",
        detail: (err || out).trim().slice(0, 400),
        exit: code
      };
    }
    return { ok: false, refused: "T4_LSP_CAPABILITY_LIE", lies, detail: out.trim().slice(0, 1200), exit: code };
  }
  // EVERY non-zero code is a refusal. This is the guard MY OWN FIX to run() exposed: run() now
  // returns -1 for a timeout/signal kill, and the old tail here (`return { ok: true, ... }`) caught
  // -1, 127, 3 — anything that was not exactly 1 or 2 — and reported ok:true. A probe that NEVER
  // RAN was attesting capability. The default must be REFUSE, never ok.
  if (code !== 0) {
    return { ok: false, refused: "T4_PROBE_FAILED", detail: (err || out).trim().slice(0, 400), exit: code };
  }
  return { ok: true, detail: out.trim().slice(0, 200), exit: code };
}
async function lintInstrument(command) {
  const lint = resolve(KERNEL, "tier0-instrument-lint.py");
  if (!existsSync(lint))
    return { ok: false, refused: "T0_LINT_MISSING", detail: lint };
  const d = mkdtempSync(resolve(tmpdir(), "ff-t0-"));
  const f = resolve(d, "cmd.py");
  try {
    writeFileSync(f, command);
    const { code, out } = await run(["python3", lint, f]);
    if (code === 1)
      return { ok: false, refused: "T0_INSTRUMENT_DEFECT", detail: out.trim().slice(0, 800), exit: code };
    if (code === 2)
      return { ok: false, refused: "T0_UNMEASURED", detail: out.trim().slice(0, 400), exit: code };
    // SAME GAP, SAME FIX as probeCapabilities: the old tail returned `{ ok: true, exit: 0 }` —
    // hardcoding 0 — so a lint that timed out (-1), failed to spawn (127), or died on a signal was
    // reported as a CLEAN instrument. An unread path must never read as clean.
    if (code !== 0)
      return { ok: false, refused: "T0_LINT_FAILED", detail: out.trim().slice(0, 400), exit: code };
    return { ok: true, exit: code };
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
}
function ff_default(pi) {
  const z = pi.zod;
  pi.setLabel(`fact firewall (LSP mode: ${MODE})`);
  if (typeof pi.on === "function") {
    pi.on("lsp_registration", async (e) => {
      const ev = e;
      if (!ev?.root || !ev?.argv)
        return;
      const r = await probeCapabilities(ev.root, ev.argv);
      if (r.ok)
        return;
      // the warn branch is DELETED (F-A) — MODE is a constant now, so this was dead either way.
      throw new Error(`FACT-FIREWALL T4 BLOCK: ${r.refused}. ${r.lies ? `${r.lies} advertised capabilities answered -32601. ` : ""}` + `The initialize reply is a FALSE CAPABILITY DECLARATION. Implement the method, or remove the ` + `capability from the reply. (Set FACT_FIREWALL_LSP=warn to register anyway.)`);
    });
  }
  if (typeof pi.on === "function") {
    pi.on("tool_call", async (e) => {
      const ev = e;
      const tool = ev?.toolName || "";
      const input = ev?.input || {};
      if (tool === "bash" && typeof input.command === "string") {
        const r = await lintInstrument(input.command);
        if (r.ok)
          return;
        if (r.refused === "T0_UNMEASURED")
          return;
        const msg = `FACT-FIREWALL T0 BLOCK: ${r.refused}. ${r.detail || ""} ` + `A number produced by this measurement would measure the INSTRUMENT. ` + `Use a buffered read, or state the instrument's validation in the claim.`;
        if (TOOLCALL === "warn") {
          console.error(msg + " (toolcall mode=warn)");
          return;
        }
        throw new Error(msg);
      }
      if ((tool === "write" || tool === "edit") && typeof input.path === "string") {
        const parent = dirname(resolve(input.path));
        if (!existsSync(parent)) {
          const msg = `FACT-FIREWALL T4 BLOCK: T4_PHANTOM_ARTIFACT. The parent directory of ` + `${input.path} does not exist (${parent}). Create it, or correct the path.`;
          if (TOOLCALL === "warn") {
            console.error(msg + " (toolcall mode=warn)");
            return;
          }
          throw new Error(msg);
        }
      }
      return;
    });
  }
  pi.registerTool({
    name: "fact-check",
    label: "fact-check",
    description: "Run the Jev fact kernel against a subject: a claimed artifact (T4-FILE), a hash (T4-HASH), " + "a capability wire (T4-CAP), a suite (T4-TEST), a spec section (T4-SPEC), a symbol's " + "consumers (T4-WIRE), or a command's measurement code (T0). Use BEFORE asserting a claim.",
    parameters: z.object({
      i: z.string().describe("one line: the claim being checked"),
      kind: z.enum(["FILE", "HASH", "CAP", "TEST", "SPEC", "WIRE", "T0"]).describe("which subject"),
      subject: z.string().describe("the path, symbol, root, or command"),
      claimed: z.string().optional().describe("HASH: the claimed value. TEST: the claimed pass count")
    }),
    async execute(_id, p) {
      const { code, out, err, signal } = await run(["python3", resolve(KERNEL, "tier4-probes.py"), p.kind, p.subject, p.claimed || ""]);
      // THE CALLER GAP, THIRD SITE. This destructured only `out` and returned `out || "(no output)"`,
      // so a crashed or timed-out probe read as a BENIGN check result — and the agent would assert an
      // unchecked claim believing the kernel had spoken. A check that cannot fail is not a check.
      if (code !== 0) {
        const why = (err || out || "").trim().slice(0, 300) || "no diagnostic output";
        return {
          content: [{ type: "text", text: `FACT-CHECK FAILED (exit ${code}${signal ? ", signal " + signal : ""}): the kernel did not complete — the claim is UNCHECKED. ${why}` }],
          details: { kind: p.kind, code, signal, failed: true }
        };
      }
      return { content: [{ type: "text", text: out || "(no output)" }], details: { kind: p.kind, code: 0 } };
    }
  });
}
export {
  ff_default as default,
  lintInstrument,
  probeCapabilities
};
