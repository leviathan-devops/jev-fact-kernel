// tests/concurrency.test.ts — D-035: concurrent writers on ONE store.
// The store's opener had no `busy_timeout` while BOTH other openers in the codebase did, so two
// of four simultaneous `index --in all` runs died with `database is locked` at exit 1. This pin
// spawns real CLI processes: a lock error is only observable across PROCESSES.
import { test, expect, describe } from "bun:test";
import { join } from "node:path";
import { makeSandbox, fill } from "./helpers.ts";

const CLI = join(import.meta.dir, "..", "src", "cli.ts");

async function jm(args: string[], env: Record<string, string>): Promise<number> {
  const p = Bun.spawn(["bun", CLI, ...args], { stdout: "pipe", stderr: "pipe", env: { ...process.env, ...env } });
  await new Response(p.stdout).text();
  await new Response(p.stderr).text();
  return await p.exited;
}

describe("D-035 concurrent writers", () => {
  test("test_four_indexers_on_one_index_all_succeed", async () => {
    const sb = makeSandbox();
    try {
      const files: Record<string, string> = {};
      for (let i = 0; i < 30; i++) files[`c/f${i}.md`] = `concurrent body ${i} tombstone`;
      fill(sb.root, files);
      const env = { JM_HOME: sb.home };
      expect(await jm(["target", "add", "c", "fs", join(sb.root, "c")], env)).toBe(0);

      // four PROCESSES, simultaneous — the boundary a single-process test cannot cross
      const codes = await Promise.all([
        jm(["index", "--in", "all", "--name", "race"], env),
        jm(["index", "--in", "all", "--name", "race"], env),
        jm(["index", "--in", "all", "--name", "race"], env),
        jm(["index", "--in", "all", "--name", "race"], env),
      ]);
      expect(codes).toEqual([0, 0, 0, 0]);
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
});
