// tests/audit-phantom-surfaces.test.ts — the phantom class on the TWO SURFACES.
//
// The invariant is stated in the README and enforced on the CLI: **a run that refuses its input must
// not have touched the disk.** `openDb` CREATES, so anywhere it runs before the input is validated,
// a refused request leaves an index behind — and a phantom index then answers every read at exit 0
// with zero rows, making "no such index" indistinguishable from "no matches".
//
// The CLI was fixed for this twice (D-054/D-055/D-056 on the verbs; D-028 on the read guard). These
// two cases are the SAME invariant on the surfaces that were left behind: the MCP tool dispatcher and
// the HTTP router. Both were found by the deeper audit pass and both MEASURED.
import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const REPO = join(import.meta.dir, "..");
const LAUNCHER = join(REPO, "scripts-jm-mcp.sh");

describe("mcp:134 — a REFUSED jm_index must create no index", () => {
  test("test_mcp_refused_tool_call_leaves_no_artifact", () => {
    // MEASURED BEFORE THE FIX: `tools/call jm_index` with NO arguments created `all.sqlite` and then
    // threw `JM_ARGS: in required` — the store was opened before the branch validated its arguments.
    const home = mkdtempSync(join(tmpdir(), "jm-mcpi-"));
    const lines = [
      '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"t","version":"1"}}}',
      '{"jsonrpc":"2.0","method":"notifications/initialized"}',
      '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"jm_index","arguments":{}}}',
    ].join("\n") + "\n";
    const r = Bun.spawnSync({
      cmd: [LAUNCHER],
      stdin: Buffer.from(lines),
      cwd: "/",
      env: { ...process.env, JM_HOME: home, HOME: home, PATH: process.env.PATH ?? "" } as Record<string, string>,
      timeout: 30000,
    });
    const created = existsSync(join(home, "index"));
    rmSync(home, { recursive: true, force: true });
    expect(r.stdout.toString()).toContain("JM_ARGS: in required");
    expect(created).toBe(false);                       // the half the defect failed
  });
});

describe("serve:94 — an unknown route must create no store", () => {
  test("test_http_unknown_route_leaves_no_artifact", async () => {
    // MEASURED BEFORE THE FIX: `GET /nonexistent` returned 404 AND created `decisions.sqlite` — the
    // store was opened before the route was validated.
    const home = mkdtempSync(join(tmpdir(), "jm-srvi-"));
    const port = 7900 + Math.floor(Math.random() * 90);
    const env: Record<string, string> = { ...process.env, JM_HOME: home, HOME: home } as Record<string, string>;
    delete env.JM_LEDGER;
    const proc = Bun.spawn({ cmd: [process.execPath, "run", "src/cli.ts", "serve", "--port", String(port)], cwd: REPO, env, stdout: "pipe", stderr: "pipe" });
    // READINESS BY POLLING THE PORT, against the REAL clock — the deliberate exception to the
    // no-test-timers rule: the thing being awaited is an EXTERNAL PROCESS binding a socket, which
    // fake timers cannot drive and no promise in this process can signal. The poll asserts the
    // condition (a 200) rather than guessing a duration, so a slow start is slow, not wrong.
    const pause = (ms: number): Promise<void> => {
      const { promise, resolve } = Promise.withResolvers<void>();
      setTimeout(resolve, ms);
      return promise;
    };
    let up = false;
    for (let i = 0; i < 60 && !up; i++) {
      try { const res = await fetch(`http://127.0.0.1:${port}/health`); up = res.status === 200; } catch { /* not yet */ }
      if (!up) await pause(250);
    }
    let bad = 0;
    let good = 0;
    try {
      expect(up).toBe(true);
      bad = (await fetch(`http://127.0.0.1:${port}/nonexistent`)).status;
      good = (await fetch(`http://127.0.0.1:${port}/jobs`)).status;
    } finally {
      proc.kill();
      await proc.exited;
    }
    const created = existsSync(join(home, "index"));
    rmSync(home, { recursive: true, force: true });
    expect(bad).toBe(404);
    expect(good).toBe(200);                            // the real route is unaffected
    expect(created).toBe(false);                       // and the refused one created nothing
  }, 120000);
});
describe("mcp:199 — a valid JSON value that is not an OBJECT is still an invalid request", () => {
  test("test_non_object_frame_is_refused_not_fatal", () => {
    // MEASURED BEFORE THE FIX: `JSON.parse("null")` SUCCEEDS, so it sailed past the parse guard and
    // `handle` dereferenced `req.id` on `null` — killing the server with a raw JS error and NO
    // JSON-RPC frame, so the client saw a dead pipe rather than an error it could act on. The parse
    // guard covered SYNTAX; this covers SHAPE.
    const home = mkdtempSync(join(tmpdir(), "jm-nul-"));
    const init = '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"t","version":"1"}}}';
    const note = '{"jsonrpc":"2.0","method":"notifications/initialized"}';
    for (const bad of ["null", '"a string"', "42", "[]"]) {
      const r = Bun.spawnSync({
        cmd: [LAUNCHER],
        stdin: Buffer.from([init, note, bad, '{"jsonrpc":"2.0","id":9,"method":"ping"}'].join("\n") + "\n"),
        cwd: "/",
        env: { ...process.env, JM_HOME: home, HOME: home, PATH: process.env.PATH ?? "" } as Record<string, string>,
        timeout: 30000,
      });
      const out = r.stdout.toString();
      expect(out).toContain("JM_MCP_INVALID_REQUEST");     // a NAMED frame, not a crash
      expect(out).not.toContain("is not an object");       // and not the raw JS error
      expect(out).toContain('"id":9');                     // the server SURVIVED and answered the next one
    }
    rmSync(home, { recursive: true, force: true });
  });
});
