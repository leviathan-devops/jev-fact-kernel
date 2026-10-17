// tests/jm-hook-fix.test.ts — ★ W4 (LEV-27): THE JM PUSH-GATE HOOK, PROVEN IN SCRATCH REPOS.
//
// The three measured defects, each pinned here end to end (real git, the real installer, the real
// bin/jm shim, the real `jm push-gate`; only the judge's network seam is the repo's own JM_MOCK_DIR):
//
//   1. THE DORMANT HOOK — the installer wrote .git/hooks/pre-commit, which git IGNORES under
//      core.hooksPath. It must install into `git rev-parse --git-path hooks`.
//   2. THE WRONG REPO   — the shim cd'd into its engine checkout and push-gate judged THAT tree
//      (src_files=40 from an empty repo). It must judge the COMMITTING repo.
//   3. THE PATH SKIP    — under a non-interactive PATH (no ~/.local/bin) the hook printed
//      JM_HOOK_SKIP. The installed hook must carry an absolute jm path.
//
// HERMETIC: every repo lives under JM_SCRATCH_ROOT (default: the OS tmpdir), HOME / JM_HOME / git's
// global config are scratch, and JM_JUDGE_URL is a dead port — no live judge is ever contacted.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const JM = join(ROOT, "bin", "jm");
const INSTALL = join(ROOT, "jm-gate-install.sh");
const BUN = process.execPath;
const SCRATCH_PARENT = process.env.JM_SCRATCH_ROOT ?? tmpdir();

let scratch = "";
beforeAll(() => {
  mkdirSync(SCRATCH_PARENT, { recursive: true });
  scratch = mkdtempSync(join(SCRATCH_PARENT, "jm-hook-fix-"));
  mkdirSync(join(scratch, "home"), { recursive: true });
  writeFileSync(join(scratch, "gitconfig"), "[user]\n\tname = jm-hook-test\n\temail = jm-hook-test@example.invalid\n[init]\n\tdefaultBranch = main\n");
});
afterAll(() => { if (scratch) rmSync(scratch, { recursive: true, force: true }); });

/** A mock judge dir whose every call answers `genuine` with the given noul. */
function mockJudge(name: string, noul: number): string {
  const d = join(scratch, `mock-${name}`);
  mkdirSync(d, { recursive: true });
  for (let i = 0; i < 20; i++) {
    writeFileSync(join(d, `call-${i}.json`), JSON.stringify({ model: "mock", answers: { genuine: { type: "noul", noul } }, usage: { input_tokens: 1, output_tokens: 0 } }));
  }
  return d;
}

/** The NON-INTERACTIVE environment class: PATH has neither ~/.local/bin nor bun. */
function env(name: string, noul = 0.9, extra: Record<string, string> = {}): Record<string, string> {
  return {
    PATH: "/usr/bin:/bin",
    HOME: join(scratch, "home"),
    GIT_CONFIG_GLOBAL: join(scratch, "gitconfig"),
    GIT_CONFIG_NOSYSTEM: "1",
    JM_REPO: ROOT,
    JM_BUN: BUN,
    JM_HOME: join(scratch, `jm-home-${name}`),
    JM_MOCK_DIR: mockJudge(name, noul),
    JM_JUDGE_URL: "http://127.0.0.1:9/v1/systemone",
    TYPESAFE_API_KEY: "hermetic-placeholder-not-a-real-key",
    ...extra,
  };
}

function sh(cmd: string[], cwd: string, e: Record<string, string>) {
  const r = Bun.spawnSync({ cmd, cwd, env: e, timeout: 60_000 });
  return { code: r.exitCode, out: r.stdout.toString() + r.stderr.toString() };
}

const TSCONFIG = JSON.stringify({ compilerOptions: { strict: true, module: "esnext", target: "esnext" } });
const SRC_ADD = 'export function add(a: number, b: number): number {\n  if (Number.isNaN(a) || Number.isNaN(b)) throw new Error("NaN");\n  return a + b;\n}\n';
const SRC_SUB = "export const sub = (a: number, b: number): number => a - b;\n";
const TEST_ADD = 'import { expect, test } from "bun:test";\nimport { add } from "../src/add";\ntest("adds", () => { expect(add(1, 2)).toBe(3); });\ntest("rejects NaN", () => { expect(() => add(NaN, 1)).toThrow(); });\n';

/** A scratch repo with core.hooksPath=.githooks (the JevManager shape) and the JM gate installed. */
function gatedRepo(name: string, files: Record<string, string>, e: Record<string, string>, hooksPath = ".githooks") {
  const repo = join(scratch, name);
  mkdirSync(repo, { recursive: true });
  expect(sh(["git", "init", "-q"], repo, e).code).toBe(0);
  if (hooksPath) expect(sh(["git", "config", "core.hooksPath", hooksPath], repo, e).code).toBe(0);
  for (const [p, c] of Object.entries(files)) {
    mkdirSync(join(repo, p, ".."), { recursive: true });
    writeFileSync(join(repo, p), c);
  }
  const inst = sh(["bash", INSTALL, repo], repo, { ...e, JM_BIN: JM });
  expect(inst.code).toBe(0);
  return { repo, inst };
}
const commitCount = (repo: string, e: Record<string, string>) =>
  Number(sh(["git", "rev-list", "--all", "--count"], repo, e).out.trim() || "0");

describe("1 · the installer writes the EFFECTIVE hooks dir", () => {
  test("core.hooksPath=.githooks -> .githooks/pre-commit (not .git/hooks), with the absolute jm baked in", () => {
    const e = env("inst-hp");
    const { repo, inst } = gatedRepo("inst-hp", {}, e);
    expect(sh(["git", "rev-parse", "--git-path", "hooks"], repo, e).out.trim()).toBe(".githooks");
    expect(existsSync(join(repo, ".githooks", "pre-commit"))).toBe(true);
    expect(existsSync(join(repo, ".git", "hooks", "pre-commit"))).toBe(false);
    expect(inst.out).toContain(join(repo, ".githooks", "pre-commit"));
    const hook = readFileSync(join(repo, ".githooks", "pre-commit"), "utf8");
    expect(hook).toContain("THE JM PUSH GATE");
    expect(hook).toContain(`JM_BIN_INSTALLED=${JM}`);
  });
  test("no core.hooksPath -> .git/hooks/pre-commit", () => {
    const e = env("inst-plain");
    const { repo } = gatedRepo("inst-plain", {}, e, "");
    expect(existsSync(join(repo, ".git", "hooks", "pre-commit"))).toBe(true);
  });
  test("a linked worktree (.git is a FILE) is accepted and gets its effective hooks dir", () => {
    const e = env("inst-wt");
    const { repo } = gatedRepo("inst-wt-main", { "README.txt": "x\n" }, e);
    expect(sh(["git", "add", "-A"], repo, e).code).toBe(0);
    expect(sh(["git", "-c", "core.hooksPath=/dev/null", "commit", "-q", "-m", "seed"], repo, e).code).toBe(0);
    const wt = join(scratch, "inst-wt-linked");
    expect(sh(["git", "worktree", "add", "-q", wt], repo, e).code).toBe(0);
    const r = sh(["bash", INSTALL, wt], wt, { ...e, JM_BIN: JM });
    expect(r.code).toBe(0);
    expect(existsSync(join(wt, ".githooks", "pre-commit"))).toBe(true);
  });
  test("an existing NON-JM hook in the effective dir is never overwritten (named refusal)", () => {
    const e = env("inst-foreign");
    const repo = join(scratch, "inst-foreign");
    mkdirSync(join(repo, ".githooks"), { recursive: true });
    sh(["git", "init", "-q"], repo, e);
    sh(["git", "config", "core.hooksPath", ".githooks"], repo, e);
    writeFileSync(join(repo, ".githooks", "pre-commit"), "#!/bin/sh\necho other-gate\n");
    const r = sh(["bash", INSTALL, repo], repo, { ...e, JM_BIN: JM });
    expect(r.code).toBe(1);
    expect(r.out).toContain("is NOT a JM hook");
    expect(readFileSync(join(repo, ".githooks", "pre-commit"), "utf8")).toContain("other-gate");
  });
  test("--remove deletes the JM hook from the effective dir", () => {
    const e = env("inst-rm");
    const { repo } = gatedRepo("inst-rm", {}, e);
    const r = sh(["bash", INSTALL, "--remove", repo], repo, e);
    expect(r.code).toBe(0);
    expect(existsSync(join(repo, ".githooks", "pre-commit"))).toBe(false);
  });
});

describe("2+3 · the hook RUNS under hooksPath + a bare PATH and judges the COMMITTING repo", () => {
  test("BAD commit (no tsconfig) is REFUSED — and the evidence is the scratch repo's, not the engine's", () => {
    const e = env("bad-build");
    const { repo } = gatedRepo("bad-build", { "src/add.ts": SRC_ADD, "tests/add.test.ts": TEST_ADD }, e);
    sh(["git", "add", "-A"], repo, e);
    const before = commitCount(repo, e);
    const r = sh(["git", "commit", "-m", "feat: bad"], repo, e);
    expect(r.code).not.toBe(0);
    expect(r.out).not.toContain("JM_HOOK_SKIP");
    expect(r.out).toContain("PUSH_GATE REFUSE");
    expect(r.out).toContain("tsconfig=ABSENT src_files=1");   // THIS repo: 1 src file, no tsconfig
    expect(r.out).toContain("ST_DETECT files=1 ");             // THIS repo's single test file
    expect(commitCount(repo, e)).toBe(before);                 // the commit never entered history
  });
  test("BAD commit (judged theatrical, noul=0.1) is REFUSED with JUDGED_FAIL", () => {
    const e = env("bad-judged", 0.1);
    const { repo } = gatedRepo("bad-judged", { "tsconfig.json": TSCONFIG, "src/add.ts": SRC_ADD, "tests/add.test.ts": TEST_ADD }, e);
    sh(["git", "add", "-A"], repo, e);
    const r = sh(["git", "commit", "-m", "feat: theatrical"], repo, e);
    expect(r.code).not.toBe(0);
    expect(r.out).toContain("PUSH_GATE REFUSE");
    expect(r.out).toContain("JUDGED_FAIL");
    expect(commitCount(repo, e)).toBe(0);
  });
  test("GOOD commit PASSES the gate and lands — judged on the scratch repo's 2 src files", () => {
    const e = env("good", 0.9);
    const { repo } = gatedRepo("good", { "tsconfig.json": TSCONFIG, "src/add.ts": SRC_ADD, "src/sub.ts": SRC_SUB, "tests/add.test.ts": TEST_ADD }, e);
    sh(["git", "add", "-A"], repo, e);
    const r = sh(["git", "commit", "-m", "feat: good"], repo, e);
    expect(r.out).not.toContain("JM_HOOK_SKIP");
    expect(r.out).toContain("PUSH_GATE ALLOW");
    expect(r.out).toContain("tsconfig=present src_files=2");
    expect(r.code).toBe(0);
    expect(commitCount(repo, e)).toBe(1);
  });
  test("jm push-gate OUTSIDE any git repo refuses BY NAME (exit 2) instead of judging the engine", () => {
    const e = env("nogit");
    const dir = join(scratch, "not-a-repo");
    mkdirSync(dir, { recursive: true });
    const r = sh([JM, "push-gate"], dir, { ...e, GIT_CEILING_DIRECTORIES: scratch });
    expect(r.code).toBe(2);
    expect(r.out).toContain("not inside a git repository");
  });
});
