// tests/phantom-artifacts.test.ts — D-054/D-055/D-056: a refused run must leave NO artifact.
//
// Found by the second-operator drill, then reproduced here. The drill ran `index --in nosuchtarget
// --name zzz` (exit 2), then `query zzz --fts tombstone` — which answered at **exit 0 with zero
// rows**. The store said "index zzz exists and has no matches"; the previous command had said "your
// arguments are wrong". The same class as D-009 and D-028, on verbs that were fixed on the MCP
// surface and missed on the CLI.
//
// The mechanism is one line in every case: `openDb` CREATES the file, and it ran BEFORE the input
// was validated. So the rule this file pins is the general one:
//
//   A RUN THAT REFUSES ITS INPUT MUST NOT HAVE TOUCHED THE DISK.
//
// Each case asserts BOTH halves — the exit code (loud) and the artifact (absent) — because the
// original defect passed the first and failed the second.
import { describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const REPO = join(import.meta.dir, "..");
const CLI = [process.execPath, "run", "src/cli.ts"];

/** Run the CLI in a FRESH store with no key, and report the exit code plus what landed on disk. */
function run(args: string[], opts: { key?: boolean } = {}) {
  const home = mkdtempSync(join(tmpdir(), "jm-phantom-"));
  const corpus = join(home, "corpus");
  mkdirSync(corpus, { recursive: true });
  writeFileSync(join(corpus, "a.md"), "the ledger records every judge call");
  args = args.map((a) => (a === "__CORPUS__" ? corpus : a));
  const env: Record<string, string> = { ...process.env, JM_HOME: home, HOME: home } as Record<string, string>;
  if (opts.key === false) delete env.TYPESAFE_API_KEY;
  // HOME is redirected so `~/.config/typesafe/key` cannot resolve: "no key" must mean NO key.
  const r = Bun.spawnSync({ cmd: [...CLI, ...args], cwd: REPO, env, timeout: 30000 });
  const idxDir = join(home, "index");
  const created = existsSync(idxDir) ? readdirSync(idxDir) : [];
  rmSync(home, { recursive: true, force: true });
  // `corpusPath` is returned so a positive case can index a path that EXISTS: the first draft of
  // the happy-path case passed the relative string "corpus" with cwd=REPO, where no such directory
  // exists — and the engine correctly refused it with JM_TARGET_MISSING at exit 2. The test was
  // wrong, and the refusal it produced is the behaviour this file exists to protect.
  return { code: r.exitCode, created, corpusPath: corpus, out: r.stdout.toString() + r.stderr.toString() };
}

describe("a refused run leaves no artifact behind", () => {
  test("test_phantom_index_unknown_target — D-054: `--in <unknown> --name X` creates nothing", () => {
    const r = run(["index", "--in", "nosuchtarget", "--name", "zzz"], { key: false });
    expect(r.code).toBe(2);
    expect(r.out).toContain("JM_TARGET_UNKNOWN");
    expect(r.created).toEqual([]);                      // the half the original defect failed
  });

  test("test_phantom_read_verb_refuses_a_typo — D-056: filter/find do not create on a read", () => {
    // The worst instance: the phantom then answered at EXIT 0 with zero rows, so "no matches" and
    // "no such index" were indistinguishable again — the exact failure the read guard exists for.
    const f = run(["filter", "corpus", "--question", "is this about a ledger?"], { key: false });
    expect(f.code).toBe(2);
    expect(f.out).toContain("JM_INDEX_MISSING");
    expect(f.created).toEqual([]);

    const g = run(["find", "ledger", "--in", "corpus"], { key: false });
    expect(g.code).toBe(2);
    expect(g.out).toContain("JM_INDEX_MISSING");
    expect(g.created).toEqual([]);
  });

  test("test_phantom_keyless_judged_verb — D-055: no key means no store, for every judged verb", () => {
    // policy.ts: a missing key is fatal REGARDLESS of fail polarity, so a refused run has no work
    // to do. Before the fix each of these left `index/decisions.sqlite` — a permanent empty index
    // that reported healthy and answered every query with zero rows.
    for (const args of [
      ["route", "--task", "pick a tool"],
      ["calibrate"],
      ["decision-tree", "--rows", "/nonexistent-rows.jsonl", "--recipe", "/nonexistent-recipe.json"],
    ]) {
      const r = run(args, { key: false });
      expect(r.created).toEqual([]);                    // the artifact is the assertion that matters
      expect(r.code).not.toBe(0);
    }
  });

  test("test_phantom_happy_path_still_writes — the positive half", () => {
    // A real index must still create its store, or the fix would be indistinguishable from breaking
    // the product. The key is irrelevant to `index`, so this runs keyless and must succeed.
    const r = run(["index", "__CORPUS__", "--name", "real"], { key: false });
    expect(r.code).toBe(0);
    expect(r.out).toContain("JM_INDEX_OK");
    expect(r.created).toEqual(["real.sqlite"]);         // the store IS created when the input is good

    // and the negative twin, from the same helper: an absent path is LOUD and writes nothing
    const bad = run(["index", "/tmp/definitely-absent-xyz", "--name", "q"], { key: false });
    expect(bad.code).toBe(2);
    expect(bad.out).toContain("JM_TARGET_MISSING");
    expect(bad.created).toEqual([]);
  });
});