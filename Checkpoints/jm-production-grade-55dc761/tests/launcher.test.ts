// tests/launcher.test.ts — the REGISTERED MCP launcher as a SURFACE.
//
// `scripts-jm-mcp.sh` is what an MCP client executes, by ABSOLUTE PATH, in an environment its
// author does not control. The rig's T10 angle covers the protocol from a foreign CWD; these cases
// cover the ENVIRONMENT and the PATH the launcher is invoked by — the two places a registered
// entry point actually breaks. Each case below is a defect that was FOUND by probing, not imagined:
//
//   P1 · HOME unset        -> under `set -u`, `$HOME` aborted the script at that line with a raw
//                             bash "unbound variable" error, so the named 127 message never printed.
//   P5 · invoked via a     -> `dirname "$0"` yields the LINK's directory, so `cd` went to the wrong
//        SYMLINK              place and the server died with `Module not found "src/cli.ts"`.
//
// The positive half (each rung of the ladder resolves) and the negative half (nothing resolves ->
// a NAMED exit 127) are both here, because a launcher that fails silently is worse than one that
// fails loudly: the client sees a dead server and no reason.
import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const LAUNCHER = join(import.meta.dir, "..", "scripts-jm-mcp.sh");
const INIT = '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"t","version":"1"}}}\n';

/** Run the launcher with EXACTLY the given environment (env -i semantics) and return the result. */
function run(env: Record<string, string>, launcher = LAUNCHER) {
  const r = Bun.spawnSync({
    cmd: [launcher],
    stdin: Buffer.from(INIT),
    env,
    cwd: "/",
    timeout: 20000,
  });
  return { code: r.exitCode, out: r.stdout.toString(), err: r.stderr.toString() };
}

describe("the registered launcher's environment ladder", () => {
  test("test_launcher_path_rung — the rung the MCP registry actually provides", () => {
    // VIOLATION_LOG §C14: the registry entry passes env.PATH containing .bun/bin.
    const home = process.env.HOME ?? "";
    const r = run({ PATH: `${home}/.bun/bin:/usr/bin:/bin` });
    expect(r.code).toBe(0);
    expect(r.out).toContain('"protocolVersion"');
    expect(r.out).toContain('"name":"jm"');
  });

  test("test_launcher_home_rung — the HOME fallback still resolves when PATH has no bun", () => {
    const home = process.env.HOME ?? "";
    const r = run({ HOME: home });
    expect(r.code).toBe(0);
    expect(r.out).toContain('"name":"jm"');
  });

  test("test_launcher_no_bun_is_a_NAMED_refusal — P1: an unset HOME must not be a bash crash", () => {
    // The negative half. Before the fix this exited 1 with `line 15: HOME: unbound variable` and
    // printed nothing useful; the operator's client would see a dead server with no reason.
    const r = run({});
    expect(r.code).toBe(127);
    expect(r.err).toContain("no bun found");
    expect(r.err).toContain("JM_BUN");           // the message names every rung it tried
    expect(r.err).not.toContain("unbound variable");
  });

  test("test_launcher_bad_JM_BUN_names_the_rungs — an explicit override that does not resolve", () => {
    const r = run({ JM_BUN: "/etc/hostname", PATH: "/usr/bin:/bin" });
    expect(r.code).toBe(127);
    expect(r.err).toContain("no bun found");
  });

  test("test_launcher_survives_a_SYMLINK — P5: the ordinary way to put a launcher on PATH", () => {
    const dir = mkdtempSync(join(tmpdir(), "jm-sym-"));
    const link = join(dir, "jm-link.sh");
    symlinkSync(LAUNCHER, link);
    const home = process.env.HOME ?? "";
    const r = run({ PATH: `${home}/.bun/bin:/usr/bin:/bin` }, link);
    rmSync(dir, { recursive: true, force: true });
    expect(r.code).toBe(0);
    expect(r.out).toContain('"name":"jm"');
    expect(r.err).not.toContain("Module not found");
  });

  test("test_launcher_ignores_extra_argv — a registered launcher's arguments are fixed", () => {
    // The registry passes args: []. Anything a caller appends must not reach the CLI as a verb.
    const home = process.env.HOME ?? "";
    const r = Bun.spawnSync({
      cmd: [LAUNCHER, "--evil", "/etc/passwd"],
      stdin: Buffer.from(INIT),
      env: { PATH: `${home}/.bun/bin:/usr/bin:/bin` },
      cwd: "/",
      timeout: 20000,
    });
    expect(r.exitCode).toBe(0);
    expect(r.stdout.toString()).toContain('"name":"jm"');
  });
});