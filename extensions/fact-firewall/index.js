// @bun
// ../../../../../tmp/ff.ts
import { existsSync, writeFileSync, mkdtempSync, rmSync } from "fs";
import { resolve, dirname } from "path";
import { execFile } from "child_process";
import { tmpdir } from "os";
var KERNEL = process.env.FACT_FIREWALL_KERNEL || "/home/leviathan/JARVIS_WORKSPACE/worktrees/jev-fact-kernel/kernel";
var MODE = (process.env.FACT_FIREWALL_LSP || "refuse").toLowerCase();
var TOOLCALL = (process.env.FACT_FIREWALL_TOOLCALL || "refuse").toLowerCase();
function run(cmd, timeoutMs = 120000) {
  return new Promise((res) => {
    execFile(cmd[0], cmd.slice(1), { timeout: timeoutMs, maxBuffer: 8000000 }, (e, out, err) => res({ code: e?.code ?? 0, out: out || "", err: err || "" }));
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
    return { ok: true, exit: 0 };
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
      if (MODE === "warn") {
        console.error(`FACT-FIREWALL T4 WARN: ${r.refused} (LSP mode=warn, registering anyway)`);
        return;
      }
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
      const { out } = await run(["python3", resolve(KERNEL, "tier4-probes.py"), p.kind, p.subject, p.claimed || ""]);
      return { content: [{ type: "text", text: out || "(no output)" }], details: { kind: p.kind } };
    }
  });
}
export {
  ff_default as default,
  lintInstrument,
  probeCapabilities
};
