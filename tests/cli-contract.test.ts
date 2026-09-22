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

describe("recipe validation (D-020)", () => {
  test("test_bad_recipe_is_a_client_error_before_any_work", async () => {
    // A recipe with no `questions` used to run to completion: no question -> no judge call ->
    // every row noop, exit 0. A run that judged nothing reported a successful triage.
    const sb = makeSandbox();
    try {
      fill(sb.root, { "rows.jsonl": '{"i":1,"title":"x","body":"y"}\n' });
      const rows = join(sb.root, "rows.jsonl");
      const bad = [
        '{"recipe":"x"}',
        '{"recipe":"x","version":1}',
        '{"recipe":"x","version":1,"questions":{}}',
        '{"recipe":"x","version":1,"questions":{"q":{"type":"weird"}}}',
        '{"recipe":"x","version":1,"questions":{"q":{"type":"noul"}},"policy":{"flag":0.9,"act":0.2}}',
      ];
      let i = 0;
      for (const body of bad) {
        const p = join(sb.root, `bad-${i++}.json`);
        writeFileSync(p, body);
        const r = await jm(["decision-tree", "--rows", rows, "--recipe", p]);
        expect({ recipe: body, code: r.code }).toEqual({ recipe: body, code: 2 });
        expect(r.err).toMatch(/JM_RECIPE_INVALID/);
      }
      // the POSITIVE half: a well-formed recipe is ACCEPTED — it gets past validation and into
      // the work (the judge may answer with the host key or refuse with JEV_NO_KEY depending on
      // the environment; neither is a validation failure).
      const good = join(sb.root, "good.json");
      writeFileSync(good, JSON.stringify({ recipe: "r", version: 1, questions: { flag: { type: "noul", instructions: "?" } }, policy: { act: 0.8, flag: 0.5, fail: "closed" } }));
      const ok = await jm(["decision-tree", "--rows", rows, "--recipe", good]);
      expect(ok.err).not.toMatch(/JM_RECIPE_INVALID/);
      expect(ok.out + ok.err).toMatch(/JM_DECISIONS|JEV_NO_KEY/);     // it ran, or it hit the key wall
    } finally { sb.cleanup(); }
  });

  test("test_truth_and_usage_guards", async () => {
    // D-026 (a): a non-numeric --truth produced NaN, which SQLite compares as NULL, so a typo
    // silently matched nothing. (b): `calibrate` and `serve` were live verbs absent from the
    // usage dump — undiscoverable by an operator reading `jm`.
    const sb = await seeded();
    try {
      for (const bad of ["abc", "-1", "1.5"]) {
        const r = await jm(["calibrate", "--truth", bad]);
        expect({ truth: bad, code: r.code }).toEqual({ truth: bad, code: 2 });
        expect(r.err).toMatch(/JM_ARGS: --truth/);
      }
      // `--name c` TARGETS THE SEEDED INDEX. Without it this ran against the default `decisions`,
      // which does not exist in the sandbox — and it passed only because the old `--truth` path
      // CREATED that store on its way to failing, which is exactly the phantom the audit's A-1
      // finding removed (a `--truth` run UPDATEs a row; it can never insert one, so it must not
      // create the store). With the store present and the row absent, the refusal under test is the
      // right one: the caller named a row that is not there.
      const missing = await jm(["calibrate", "--name", "c", "--truth", "99999"]);
      expect(missing.code).toBe(2);                                 // a row that is not there: a CLIENT error
      expect(missing.err).toMatch(/JM_TRUTH_MISSING/);
      const help = await jm([]);
      expect(help.out).toContain("jm serve");
      expect(help.out).toContain("jm calibrate");
    } finally { sb.cleanup(); }
  });
});
