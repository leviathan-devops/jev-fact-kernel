// tests/cli-contract.test.ts — the CLI's OUTPUT and EXIT contract, tested by SPAWNING the real
// binary. Two defects found by verifying the operating contract live here:
//   D-017 the cost line went to STDOUT, so `extract --structure csv > out.csv` wrote a corrupted
//         csv and `query --json > out.json` wrote unparseable json
//   D-018 the same class of error returned 1 from one verb and 2 from another
import { test, expect, describe } from "bun:test";
import { join } from "node:path";
import { writeFileSync } from "node:fs";
import { makeSandbox, fill } from "./helpers.ts";
import { saveTargets } from "../src/store/db.ts";

const CLI = join(import.meta.dir, "..", "src", "cli.ts");

async function jm(args: string[]): Promise<{ code: number; out: string; err: string }> {
  const p = Bun.spawn(["bun", CLI, ...args], { stdout: "pipe", stderr: "pipe", env: { ...process.env } });
  const [out, err] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text()]);
  const code = await p.exited;
  return { code, out, err };
}

async function seeded() {
  const sb = makeSandbox();
  fill(sb.root, { "c/a.md": "alpha tombstone body" });
  saveTargets([{ name: "c", kind: "fs", root: join(sb.root, "c") }]);
  await jm(["index", "--in", "c", "--name", "c"]);
  return sb;
}

describe("CLI contract", () => {
  test("test_cost_line_never_pollutes_stdout", async () => {
    // D-017: stdout is DATA. Every structure must survive a redirect.
    const sb = await seeded();
    try {
      const csv = await jm(["extract", "c", "--lex", "tombstone", "--re", "tomb\\w+", "--structure", "csv"]);
      expect(csv.code).toBe(0);
      expect(csv.out.startsWith("path,value")).toBe(true);          // header is line 1, not the cost line
      expect(csv.out).not.toContain("cost=$");
      expect(csv.err).toContain("cost=$");                          // the diagnostic still reports

      const json = await jm(["query", "c", "--fts", "tombstone", "--json"]);
      expect(json.code).toBe(0);
      expect(() => JSON.parse(json.out)).not.toThrow();             // a piped payload parses
      expect(json.err).toContain("cost=$");
    } finally { sb.cleanup(); }
  });

  test("test_exit_code_policy_is_uniform", async () => {
    // D-018: 2 = client error (bad arguments / no key), 1 = runtime, 0 = ok — for EVERY verb.
    const sb = await seeded();
    try {
      const client: string[][] = [
        ["query", "no-such-index", "--fts", "x"],
        ["report", "no-such-index"],
        ["scan", "no-such-index"],
        ["extract", "c", "--re", "x", "--structure", "tsv"],
        ["scan", "c", "--re", "(["],
        ["target", "rm", "not-a-target"],
        ["target", "add", "x", "fs", "/definitely/not/here"],
        ["nosuchverb"],
      ];
      for (const args of client) {
        const r = await jm(args);
        expect({ args: args.join(" "), code: r.code }).toEqual({ args: args.join(" "), code: 2 });
      }
      const ok = await jm(["target", "ls"]);
      expect(ok.code).toBe(0);
    } finally { sb.cleanup(); }
  });

  test("test_keyless_judged_fails_closed_with_2", async () => {
    // C12's polarity at the CLI boundary: no key -> exit 2, nothing written, zero decisions.
    const sb = await seeded();
    try {
      const nokeyHome = join(sb.home, "nokey");
      const p = Bun.spawn(["bun", CLI, "route", "--task", "x"], {
        stdout: "pipe", stderr: "pipe",
        env: { ...process.env, TYPESAFE_API_KEY: "", HOME: nokeyHome },
      });
      const err = await new Response(p.stderr).text();
      const code = await p.exited;
      expect(code).toBe(2);
      expect(err).toMatch(/JEV_NO_KEY/);
    } finally { sb.cleanup(); }
  });

  test("test_usage_on_a_bare_invocation", async () => {
    const r = await jm([]);
    expect(r.code).toBe(2);                                        // a bare `jm` is a client error
    expect(r.out).toContain("jm index");
    expect(r.out).toContain("jm watch");
  });
});
