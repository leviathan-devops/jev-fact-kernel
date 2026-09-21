// tests/concurrency.test.ts — D-035: concurrent writers on ONE store.
// The store's opener had no `busy_timeout` while BOTH other openers in the codebase did, so two
// of four simultaneous `index --in all` runs died with `database is locked` at exit 1. This pin
// spawns real CLI processes: a lock error is only observable across PROCESSES.
import { test, expect, describe } from "bun:test";
import { join } from "node:path";
import { rmSync } from "node:fs";
import { makeSandbox, fill } from "./helpers.ts";

const CLI = join(import.meta.dir, "..", "src", "cli.ts");

/** Returns the exit code and whatever the process said — a bare code makes a failure undiagnosable. */
async function jm(args: string[], env: Record<string, string>): Promise<{ code: number; err: string }> {
  const p = Bun.spawn(["bun", CLI, ...args], { stdout: "pipe", stderr: "pipe", env: { ...process.env, ...env } });
  await new Response(p.stdout).text();
  const err = await new Response(p.stderr).text();
  return { code: await p.exited, err: err.trim().slice(0, 300) };
}

describe("D-035 concurrent writers", () => {
  test("test_four_indexers_on_one_index_all_succeed", async () => {
    const sb = makeSandbox();
    try {
      const files: Record<string, string> = {};
      for (let i = 0; i < 30; i++) files[`c/f${i}.md`] = `concurrent body ${i} tombstone`;
      fill(sb.root, files);
      const env = { JM_HOME: sb.home };
      expect((await jm(["target", "add", "c", "fs", join(sb.root, "c")], env)).code).toBe(0);

      // four PROCESSES, simultaneous — the boundary a single-process test cannot cross
      const runs = await Promise.all([
        jm(["index", "--in", "all", "--name", "race"], env),
        jm(["index", "--in", "all", "--name", "race"], env),
        jm(["index", "--in", "all", "--name", "race"], env),
        jm(["index", "--in", "all", "--name", "race"], env),
      ]);
      // stderr carries the cost line by design (D-017); a REAL failure is a non-zero code or an
      // error line, so the assertion filters the diagnostic out rather than demanding empty stderr
      const real = runs.filter((r) => r.code !== 0 || r.err.includes("JM_ERROR")).map((r) => `${r.code} ${r.err}`);
      expect(real).toEqual([]);
      // and the index is complete afterwards: 30 rows, all with text
      const check = Bun.spawn(["bun", CLI, "report", "race"], { stdout: "pipe", env: { ...process.env, ...env } });
      const out = await new Response(check.stdout).text();
      await check.exited;
      expect(out).toMatch(/files:\s+30 live/);
    } finally { sb.cleanup(); }
  }, 30_000);

  test("test_the_timeout_precedes_the_pragma_that_needs_it", async () => {
    // Order is load-bearing: with the timeout set AFTER `journal_mode = WAL`, one of four
    // simultaneous indexers still died — the one statement most likely to contend ran unprotected.
    // This pin reads the source to hold the ORDER, since the ordering is the fix.
    const src = await Bun.file(join(import.meta.dir, "..", "src", "store", "db.ts")).text();
    const timeoutAt = src.indexOf("PRAGMA busy_timeout");
    const walAt = src.indexOf("PRAGMA journal_mode = WAL");
    expect(timeoutAt).toBeGreaterThan(0);
    expect(walAt).toBeGreaterThan(0);
    expect(timeoutAt).toBeLessThan(walAt);
  });

  test("test_D038_the_meta_seed_is_atomic_not_check_then_insert", async () => {
    // Measured over six rounds of four simultaneous indexers: rounds 1-5 clean, ROUND 6 LOST A RUN
    // with `UNIQUE constraint failed: meta.key`. The schema_version seed read the row, and inserted
    // only when absent — four processes all read "absent", all four inserted, three died. A single
    // round would have called that green.
    const src = await Bun.file(join(import.meta.dir, "..", "src", "store", "db.ts")).text();
    expect(src).toContain("INSERT OR IGNORE INTO meta(key, value)");
    expect(src).not.toMatch(/if \(!row\) db\.run\("INSERT INTO meta/);
  }, 10_000);

  test("test_D038_repeated_races_do_not_lose_a_run", async () => {
    // the behavioral half: several rounds, because the race is INTERMITTENT — one round is not
    // evidence. Six rounds caught it once; the loop here runs enough rounds to be a real guard.
    const sb = makeSandbox();
    try {
      const files: Record<string, string> = {};
      for (let i = 0; i < 10; i++) files[`c/f${i}.md`] = `body ${i}`;
      fill(sb.root, files);
      const env = { JM_HOME: sb.home };
      expect((await jm(["target", "add", "c", "fs", join(sb.root, "c")], env)).code).toBe(0);
      const bad: string[] = [];
      for (let round = 0; round < 8; round++) {
        rmSync(join(sb.home, "index"), { recursive: true, force: true });
        const runs = await Promise.all([
          jm(["index", "--in", "all", "--name", "race"], env),
          jm(["index", "--in", "all", "--name", "race"], env),
          jm(["index", "--in", "all", "--name", "race"], env),
          jm(["index", "--in", "all", "--name", "race"], env),
        ]);
        for (const r of runs) if (r.code !== 0 || r.err.includes("JM_ERROR")) bad.push(`round ${round}: exit ${r.code} ${r.err}`);
      }
      expect(bad).toEqual([]);                             // 32 runs, zero losses
    } finally { sb.cleanup(); }
  }, 60_000);
});
