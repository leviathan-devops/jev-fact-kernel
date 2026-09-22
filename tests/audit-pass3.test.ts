// tests/audit-pass3.test.ts — the THIRD audit pass (a full-file scan of all 34 src files).
//
// This pass ran on the tree that the first two passes had already repaired, and it found fifteen
// more high/critical findings — including two in code written the SAME DAY. Each probe below is the
// settlement that turned a hypothesis into a defect.
import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Database } from "bun:sqlite";
import { runPool } from "../src/pools/pool";

const REPO = join(import.meta.dir, "..");
const CLI = [process.execPath, "run", "src/cli.ts"];

describe("pool.ts:26 — a slot is judged by whether it was WRITTEN, not by its value", () => {
  test("test_pool_keeps_undefined_results_and_input_order", async () => {
    // MEASURED BEFORE THE FIX: `slots.filter((x): x is O => x !== undefined)` read a slot's VALUE to
    // decide whether the slot had been WRITTEN — different questions. A worker legitimately resolving
    // to `undefined` (valid whenever O is undefined/void/optional) had its slot dropped, so results
    // were LOST and the array stopped aligning with the input, breaking the documented "results are
    // returned in INPUT ORDER" guarantee.
    const r = await runPool([1, 2, 3], async (n: number) => (n === 2 ? undefined : `item-${n}`), { concurrency: 2 });
    expect(r.ok.length).toBe(3);                       // three items in, three slots out
    expect(r.ok[0]).toBe("item-1");
    expect(r.ok[1]).toBeUndefined();                   // the middle result SURVIVES as a value
    expect(r.ok[2]).toBe("item-3");                    // and index 2 still means item 2's neighbour

    // the ordinary case is unchanged
    const s = await runPool(["a", "b", "c"], async (v: string) => v.toUpperCase(), { concurrency: 3 });
    expect(s.ok).toEqual(["A", "B", "C"]);
  });
});

describe("ledger.ts:58 — the success-path check must not be swallowed by its own catch", () => {
  test("test_unrecorded_run_reports_once_and_clearly", () => {
    // MEASURED BEFORE THE FIX: the `throw` sat INSIDE the try, so the `catch` immediately below
    // caught it and re-wrapped it — the message came out DOUBLED
    // (`JM_LEDGER_FAILED: … (while reporting: Error: JM_LEDGER_FAILED: …)`). The behaviour was right
    // by accident; the mechanism was wrong. **The fix for a swallowed failure contained a swallowed
    // failure.** Now the check runs after the try/catch, so it reports once, in full.
    const home = mkdtempSync(join(tmpdir(), "jm-l58-"));
    const corpus = join(home, "c");
    mkdirSync(corpus, { recursive: true });
    writeFileSync(join(corpus, "a.md"), "alpha");
    const env: Record<string, string> = { ...process.env, JM_HOME: home, HOME: home, JM_LEDGER: "/proc/nonexistent/ledger.jsonl" } as Record<string, string>;
    const r = Bun.spawnSync({ cmd: [...CLI, "index", corpus, "--name", "lg"], cwd: REPO, env, timeout: 60000 });
    rmSync(home, { recursive: true, force: true });
    const out = r.stdout.toString() + r.stderr.toString();
    expect(r.exitCode).not.toBe(0);
    expect(out).toContain("the run COMPLETED but its ledger row was not written");
    expect(out).not.toContain("while reporting");      // the doubled, confusing form is GONE
    expect((out.match(/JM_LEDGER_FAILED/g) ?? []).length).toBe(1);
  });
});

describe("index.ts:74 — a filter narrows the WALK, it does not delete", () => {
  test("test_include_does_not_tombstone_the_excluded_files", () => {
    // MEASURED BEFORE THE FIX: `jm index <dir> --include '*.md'` marked the previously indexed
    // `b.txt` gone AND PURGED its text — the third instance of one over-broad rule ("not seen this
    // run means deleted"), after D-060 (another target's namespace) and D-061 (a capped walk).
    // **"Not seen this run" is only evidence of deletion if the run WOULD have seen it.**
    const home = mkdtempSync(join(tmpdir(), "jm-inc-"));
    const corpus = join(home, "c");
    mkdirSync(corpus, { recursive: true });
    writeFileSync(join(corpus, "a.md"), "alpha");
    writeFileSync(join(corpus, "b.txt"), "beta");
    writeFileSync(join(corpus, "c.md"), "gamma");
    const env: Record<string, string> = { ...process.env, JM_HOME: home, HOME: home } as Record<string, string>;
    delete env.JM_LEDGER;
    const run = (...args: string[]) => Bun.spawnSync({ cmd: [...CLI, ...args], cwd: REPO, env, timeout: 60000 });
    const states = () => {
      const db = new Database(join(home, "index", "inc.sqlite"), { readonly: true });
      const rows = db.query("SELECT path, state FROM files ORDER BY path").all() as { path: string; state: string }[];
      db.close();
      return rows;
    };
    try {
      run("index", corpus, "--name", "inc");
      const filtered = run("index", corpus, "--name", "inc", "--include", "*.md");
      const afterFilter = states();
      expect(filtered.stdout.toString()).toContain("gone=0");                 // nothing tombstoned
      expect(afterFilter.every((r) => r.state === "new")).toBe(true);         // b.txt survives

      // and a REAL deletion the filter WOULD admit is still swept
      rmSync(join(corpus, "a.md"));
      const swept = run("index", corpus, "--name", "inc", "--include", "*.md");
      const afterDelete = states();
      expect(swept.stdout.toString()).toContain("gone=1");
      expect(afterDelete.find((r) => r.path === "a.md")?.state).toBe("gone");
      expect(afterDelete.find((r) => r.path === "c.md")?.state).toBe("new");
    } finally { rmSync(home, { recursive: true, force: true }); }
  });
});
describe("decision-tree.ts:121 — a degraded row must not leak its budget claim", () => {
  test("test_fail_open_rows_refund_their_claim", async () => {
    // `budget.claim()` increments `pending` (counted by `roomLeft()`) and only `settle()` releases
    // it — but BOTH degraded-return sites returned WITHOUT settling, so every fail-open row
    // permanently consumed a slot. MEASURED BEFORE THE FIX: a run that hit a judge outage under
    // `fail: "open"` leaked one claim per row and then stopped with a FALSE "budget exhausted" —
    // the degradation path silently became a budget failure. A claim producing no measured call is
    // refunded, and `finally` is the only shape covering every exit including a rethrow.
    const home = mkdtempSync(join(tmpdir(), "jm-bt-"));
    const prev = { home: process.env.JM_HOME, homeDir: process.env.HOME, key: process.env.TYPESAFE_API_KEY, url: process.env.JM_JUDGE_URL, ledger: process.env.JM_LEDGER };
    process.env.JM_HOME = home; process.env.HOME = home; process.env.TYPESAFE_API_KEY = "sandbox";
    process.env.JM_JUDGE_URL = "http://127.0.0.1:9/";      // a dead port: every call fails
    delete process.env.JM_LEDGER;
    try {
      const { openDb, indexPathFor } = await import("../src/store/db");
      const { decisionTree, validateRecipe } = await import("../src/verbs/decision-tree");
      const rows = join(home, "rows.jsonl");
      writeFileSync(rows, Array.from({ length: 6 }, (_, i) => JSON.stringify({ i, body: `row ${i}` })).join("\n") + "\n");
      const recipe = validateRecipe({ recipe: "bt", version: 1, questions: { f: { type: "noul", instructions: "?" } }, policy: { act: 0.8, flag: 0.5, fail: "open" } } as never);
      // `budgetCalls` IS THE PARAMETER — my first version passed `budget`, an unknown property the
      // verb IGNORED, so the assertion ran with no cap at all and passed vacuously. tsc caught it
      // (`'budget' does not exist in type …`), which is exactly why the boundary is typed.
      const db = openDb(indexPathFor("bt"));
      const r = await decisionTree({ db, rowsPath: rows, recipe, concurrency: 2, budgetCalls: 3 });   // cap 3, 6 rows
      db.close();
      expect(r.decisions).toBe(6);                        // ALL rows attempted — no leaked claims
      expect(r.bands.noop).toBe(6);                       // and every one is a MARKED degradation
      expect(r.budgetStopped).toBe(false);                // the cap was NOT falsely exhausted
    } finally {
      if (prev.home === undefined) delete process.env.JM_HOME; else process.env.JM_HOME = prev.home;
      if (prev.homeDir === undefined) delete process.env.HOME; else process.env.HOME = prev.homeDir;
      if (prev.key === undefined) delete process.env.TYPESAFE_API_KEY; else process.env.TYPESAFE_API_KEY = prev.key;
      if (prev.url === undefined) delete process.env.JM_JUDGE_URL; else process.env.JM_JUDGE_URL = prev.url;
      if (prev.ledger === undefined) delete process.env.JM_LEDGER; else process.env.JM_LEDGER = prev.ledger;
      rmSync(home, { recursive: true, force: true });
    }
  });
});
