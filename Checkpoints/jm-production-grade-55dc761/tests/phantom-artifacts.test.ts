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
  // `opts.key === true` plants a key FILE in the sandbox home, so a case can exercise a refusal
  // that is NOT the key one without reaching a live judge.
  if (opts.key === true) {
    const cfg = join(home, ".config", "typesafe");
    mkdirSync(cfg, { recursive: true });
    writeFileSync(join(cfg, "key"), "sandbox-key-not-used\n");
    delete env.TYPESAFE_API_KEY;
  }
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
    //
    // WITH A KEY, so the refusal under test is the INDEX one. (The keyless case is a different
    // refusal — see test_phantom_filter_refuses_keyless — and the ordering between them is itself
    // pinned: a judged verb checks the key FIRST, consistently, because a keyless run cannot do
    // work and must not touch the store. The first version of this test asserted the index error for
    // both verbs and went red when `find`'s guard was hoisted, which is how the inconsistency
    // between `filter` and `find` was found.)
    const f = run(["filter", "corpus", "--question", "is this about a ledger?"], { key: true });
    expect(f.code).toBe(2);
    expect(f.out).toContain("JM_INDEX_MISSING");
    expect(f.created).toEqual([]);

    const g = run(["find", "ledger", "--in", "corpus"], { key: true });
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

  // THE FOUR THE AUDIT FOUND IN THE FIRST VERSION OF THIS FILE'S OWN FIX. Each is the same
  // invariant one level deeper, and each was invisible to the suite: the mock-transport tests carry
  // a real key, so the guard's mock-mode regression never fired.

  test("test_phantom_truth_is_not_a_write — A-1: `--truth` UPDATEs, it cannot INSERT", () => {
    // `recordTruth` runs `UPDATE decisions SET context_ref …`, so a `--truth` run against an absent
    // store created a schema-initialised file and THEN failed with JM_TRUTH_MISSING.
    const r = run(["calibrate", "--name", "typo", "--truth", "5"], { key: false });
    expect(r.code).toBe(2);
    expect(r.out).toMatch(/JM_(INDEX_MISSING|TRUTH_MISSING)/);
    expect(r.created).toEqual([]);
  });

  test("test_phantom_filter_refuses_keyless — A-2: a judged verb is judged even at zero candidates", () => {
    // Without the guard, a keyless run whose candidate query returns ZERO rows never reaches the
    // judge and exits 0 with kept=0 — "no key" indistinguishable from "no matches".
    const home = mkdtempSync(join(tmpdir(), "jm-a2-"));
    const corpus = join(home, "corpus");
    mkdirSync(corpus, { recursive: true });
    writeFileSync(join(corpus, "a.md"), "the ledger records every judge call");
    const env: Record<string, string> = { ...process.env, JM_HOME: home, HOME: home } as Record<string, string>;
    delete env.TYPESAFE_API_KEY;
    Bun.spawnSync({ cmd: [...CLI, "index", corpus, "--name", "f"], cwd: REPO, env, timeout: 30000 });
    // the query that matches NOTHING is the one that used to slip past the judge entirely
    const r = Bun.spawnSync({ cmd: [...CLI, "filter", "f", "--question", "anything", "--fts", "zzzznomatch"], cwd: REPO, env, timeout: 30000 });
    rmSync(home, { recursive: true, force: true });
    expect(r.exitCode).toBe(2);
    expect(r.stdout.toString() + r.stderr.toString()).toContain("JEV_NO_KEY");
  });

  test("test_phantom_find_refuses_before_mkdir — A-3: no artifact home on a refused run", () => {
    const home = mkdtempSync(join(tmpdir(), "jm-a3-"));
    const corpus = join(home, "corpus");
    mkdirSync(corpus, { recursive: true });
    writeFileSync(join(corpus, "a.md"), "the ledger records every judge call");
    const env: Record<string, string> = { ...process.env, JM_HOME: home, HOME: home } as Record<string, string>;
    delete env.TYPESAFE_API_KEY;
    Bun.spawnSync({ cmd: [...CLI, "index", corpus, "--name", "g"], cwd: REPO, env, timeout: 30000 });
    const r = Bun.spawnSync({ cmd: [...CLI, "find", "ledger", "--in", "g"], cwd: REPO, env, timeout: 30000 });
    const madeFindDir = existsSync(join(home, "find"));
    rmSync(home, { recursive: true, force: true });
    expect(r.exitCode).toBe(2);
    expect(r.stderr.toString()).toContain("JEV_NO_KEY");
    expect(madeFindDir).toBe(false);           // the mkdir ran BEFORE the key check, once
  });

  test("test_phantom_mock_mode_is_not_refused — A-4: JM_MOCK_DIR is a legitimate keyless mode", () => {
    // `Judge.requireKey()` returns "mock" when JM_MOCK_DIR is set and the transport short-circuits
    // to canned fixtures. A guard consulting only resolveKey() refuses a run the judge would serve.
    const home = mkdtempSync(join(tmpdir(), "jm-a4-"));
    mkdirSync(join(home, "mock"), { recursive: true });
    const rows = join(home, "rows.jsonl");
    writeFileSync(rows, JSON.stringify({ i: 1, title: "x", body: "a body" }) + "\n");
    const recipe = join(home, "recipe.json");
    writeFileSync(recipe, JSON.stringify({ recipe: "r", version: 1, questions: { flag: { type: "noul", instructions: "?" } }, policy: { act: 0.8, flag: 0.5, fail: "closed" } }));
    const env: Record<string, string> = { ...process.env, HOME: home, JM_HOME: home, JM_MOCK_DIR: join(home, "mock") } as Record<string, string>;
    delete env.TYPESAFE_API_KEY;
    const r = Bun.spawnSync({ cmd: [...CLI, "decision-tree", "--rows", rows, "--recipe", recipe], cwd: REPO, env, timeout: 30000 });
    rmSync(home, { recursive: true, force: true });
    const out = r.stdout.toString() + r.stderr.toString();
    // it must get PAST the key guard: the mock transport fails on its own terms, never with JEV_NO_KEY
    expect(out).not.toContain("JEV_NO_KEY");
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