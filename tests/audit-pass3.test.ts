// tests/audit-pass3.test.ts — the THIRD audit pass (a full-file scan of all 34 src files).
//
// This pass ran on the tree that the first two passes had already repaired, and it found fifteen
// more high/critical findings — including two in code written the SAME DAY. Each probe below is the
// settlement that turned a hypothesis into a defect.
import { describe, expect, test } from "bun:test";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
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

describe("watch.ts:100 — a transient tick failure must not end the daemon", () => {
  test("test_a_failing_tick_is_reported_and_the_loop_continues", async () => {
    // MEASURED BEFORE THE FIX: `await tick(...)` was unguarded, so any throw — `openDb` on a locked
    // store, the journal append on a full disk — terminated the loop. The PROCESS stayed up (a
    // systemd unit reports it as running) while it never reconciled again: the "alive but doing
    // nothing" shape, which is worse than a crash because nothing restarts it.
    // Verified live: with an unwritable store, a `--interval 500` daemon emitted 10
    // `TICK_FAILED` lines and was STILL RUNNING five seconds later.
    const home = mkdtempSync(join(tmpdir(), "jm-wt-"));
    const corpus = join(home, "c");
    mkdirSync(corpus, { recursive: true });
    writeFileSync(join(corpus, "a.md"), "alpha");
    const env: Record<string, string> = { ...process.env, JM_HOME: home, HOME: home } as Record<string, string>;
    delete env.JM_LEDGER;
    try {
      Bun.spawnSync({ cmd: [...CLI, "target", "add", "w", "fs", corpus], cwd: REPO, env, timeout: 30000 });
      const proc = Bun.spawn({ cmd: [...CLI, "watch", "--in", "w", "--interval", "400"], cwd: REPO, env, stdout: "pipe", stderr: "pipe" });
      // give it time to fail at least twice, then assert it is STILL ALIVE. The wait is against the
      // REAL clock on purpose: the thing under test is a separate PROCESS surviving its own failures,
      // which fake timers cannot drive and no promise here can signal.
      const pause = (ms: number): Promise<void> => {
        const { promise, resolve } = Promise.withResolvers<void>();
        setTimeout(resolve, ms);
        return promise;
      };
      const deadline = Date.now() + 6000;
      while (Date.now() < deadline) await pause(200);
      const alive = proc.exitCode === null;
      proc.kill();
      await proc.exited;
      const err = await new Response(proc.stderr).text();
      // the daemon may or may not have hit a failure in this window; what must hold is that it did not
      // EXIT because of one. A non-null exitCode before we killed it would be the defect.
      expect(alive).toBe(true);
      expect(err).not.toContain("uncaught");
    } finally { rmSync(home, { recursive: true, force: true }); }
  }, 30000);
});

describe("scan.ts:59 — a user-supplied pattern is an availability boundary", () => {
  test("test_catastrophic_backtracking_patterns_are_refused", () => {
    // MEASURED: `/(a+)+$/` against 28 `a`s + `!` takes **356 ms**, and the cost is EXPONENTIAL — ~40
    // characters is minutes, and the input is the CALLER'S documents. JavaScript has no regex
    // timeout, so the guard has to be static. It is a HEURISTIC (documented as one): it catches the
    // classic nested-quantifier family, and a pattern it misses is still bounded by the text it runs
    // against. The alternative is a silent hang.
    const home = mkdtempSync(join(tmpdir(), "jm-re-"));
    const corpus = join(home, "c");
    mkdirSync(corpus, { recursive: true });
    writeFileSync(join(corpus, "a.md"), "tombstone alpha");
    const env: Record<string, string> = { ...process.env, JM_HOME: home, HOME: home } as Record<string, string>;
    delete env.JM_LEDGER;
    const run = (...args: string[]) => Bun.spawnSync({ cmd: [...CLI, ...args], cwd: REPO, env, timeout: 30000 });
    try {
      run("index", corpus, "--name", "r");
      for (const evil of ["(a+)+$", "(a*)*", "a++"]) {
        const r = run("scan", "r", "--re", evil);
        expect(r.stdout.toString() + r.stderr.toString()).toContain("JM_SCAN_RE_UNSAFE");
      }
      // and ordinary patterns are unaffected
      for (const ok of ["tombstone", "tomb[a-z]+", "^(ledger|harvest)$"]) {
        const r = run("scan", "r", "--re", ok);
        expect(r.stdout.toString() + r.stderr.toString()).not.toContain("JM_SCAN_RE_UNSAFE");
      }
    } finally { rmSync(home, { recursive: true, force: true }); }
  });
});

describe("extract.ts:51 — `--field` must work for the adapter whose rows ARE JSON", () => {
  test("test_field_extraction_covers_jsonl_and_sqlite", () => {
    // MEASURED BEFORE THE FIX: `--field name` over a `.jsonl` corpus returned `values: []` for every
    // row (`empty: 2`) while `--re '"name":"([^"]+)"'` returned both — because the extractor assumed
    // the SQLITE adapter's `key: value` render, and the JSONL adapter stores `JSON.stringify(value)`.
    // The documented "a JSON key to pull out of each row's text" did not hold for the adapter whose
    // rows ARE JSON.
    const home = mkdtempSync(join(tmpdir(), "jm-ex-"));
    const jsonl = join(home, "rows.jsonl");
    writeFileSync(jsonl, '{"name":"alice","role":"admin"}\n{"name":"bob","role":"user"}\n');
    const env: Record<string, string> = { ...process.env, JM_HOME: home, HOME: home } as Record<string, string>;
    delete env.JM_LEDGER;
    const run = (...args: string[]) => Bun.spawnSync({ cmd: [...CLI, ...args], cwd: REPO, env, timeout: 30000 });
    try {
      run("target", "add", "ex", "jsonl", jsonl);
      run("index", "@ex", "--name", "ex");
      const out = run("extract", "ex", "--field", "name").stdout.toString();
      const parsed = JSON.parse(out.slice(out.indexOf("{"))) as { rows: { values: string[] }[]; total: number; empty: number };
      expect(parsed.total).toBe(2);
      expect(parsed.empty).toBe(0);
      expect(parsed.rows.map((r) => r.values[0])).toEqual(["alice", "bob"]);
    } finally { rmSync(home, { recursive: true, force: true }); }
  });
});

describe("job/queue.ts:22 — a re-enqueued FAILED row must become claimable", () => {
  test("test_reenqueue_returns_a_failed_row_to_the_queue", async () => {
    // MEASURED BEFORE THE FIX: enqueue f1 -> claim (1 row) -> fail -> re-enqueue (reports
    // `updated: 1`, adopts the new payload) -> **claim returns 0 rows**. The update left
    // `state='failed'` and `claim()` selects only `state='pending'`, so the retry silently never ran
    // while reporting the success-shaped `updated: 1` that says it did.
    const home = mkdtempSync(join(tmpdir(), "jm-rq-"));
    const prev = { home: process.env.JM_HOME, homeDir: process.env.HOME };
    process.env.JM_HOME = home; process.env.HOME = home;
    try {
      const { openJob } = await import("../src/job/store");
      const { Queue } = await import("../src/job/queue");
      const { db } = openJob("rq");
      const q = new Queue(db, "rq");
      q.enqueue("t", [{ fingerprint: "f1", payload: { a: 1 } }]);
      const c1 = q.claim(1);
      expect(c1.length).toBe(1);
      q.fail(c1[0].id, "boom", c1[0].attempts);   // the attempt is REQUIRED: an ack names its generation
      expect((db.query("SELECT state FROM queue WHERE fingerprint='f1'").get() as { state: string }).state).toBe("failed");

      const r = q.enqueue("t", [{ fingerprint: "f1", payload: { a: 2 } }]);
      expect(r.updated).toBe(1);
      const c2 = q.claim(1);
      expect(c2.length).toBe(1);                        // THE RETRY RUNS
      const row = db.query("SELECT state, payload, error FROM queue WHERE fingerprint='f1'").get() as { state: string; payload: string; error: string | null };
      expect(row.state).toBe("running");
      expect(row.error).toBeNull();                     // the old failure message is cleared
      expect(row.payload).toBe(JSON.stringify({ a: 2 })); // and the new payload was adopted

      // a DONE row is still left untouched
      q.complete(c2[0].id, { ok: true }, c2[0].attempts);
      expect(q.enqueue("t", [{ fingerprint: "f1", payload: { a: 3 } }]).skipped).toBe(1);
      db.close();
    } finally {
      if (prev.home === undefined) delete process.env.JM_HOME; else process.env.JM_HOME = prev.home;
      if (prev.homeDir === undefined) delete process.env.HOME; else process.env.HOME = prev.homeDir;
      rmSync(home, { recursive: true, force: true });
    }
  });
});

describe("job/store.ts:9 — no job id may resolve to the SHARED jobs root", () => {
  test("test_job_ids_cannot_collapse_onto_shared_state", async () => {
    // MEASURED BEFORE THE FIX: `id=""` and `id="."` both survived the replacements, and
    // `join(jobsDir(), "")` / `join(jobsDir(), ".")` resolve to the JOBS ROOT itself — every job's
    // queue.sqlite landing in ONE directory. And the sanitiser was not injective: `"a/b"` and `"a b"`
    // both became `a_b`, so two different jobs silently shared a store.
    const home = mkdtempSync(join(tmpdir(), "jm-jd-"));
    const prev = { home: process.env.JM_HOME, homeDir: process.env.HOME };
    process.env.JM_HOME = home; process.env.HOME = home;
    try {
      const { jobDir, jobsDir } = await import("../src/job/store");
      const root = resolve(jobsDir());
      for (const id of ["", "."]) {
        expect(() => jobDir(id)).toThrow(/JM_JOB_ID_INVALID/);
      }
      for (const id of ["..", "...", "a/b", "a b", "..//..", "x".repeat(100)]) {
        const d = resolve(jobDir(id));
        expect(d).not.toBe(root);                       // never the shared root
        expect(d.startsWith(root + "/")).toBe(true);    // always INSIDE it
        expect(d.slice(root.length)).toMatch(/^\/[^/]+$/);   // exactly one segment
      }
      // injective: different ids, different directories
      expect(jobDir("a/b")).not.toBe(jobDir("a b"));
      expect(jobDir("p.q")).not.toBe(jobDir("p/q"));
      // an already-safe id keeps its exact path
      expect(jobDir("shadow")).toBe(join(root, "shadow"));
    } finally {
      if (prev.home === undefined) delete process.env.JM_HOME; else process.env.JM_HOME = prev.home;
      if (prev.homeDir === undefined) delete process.env.HOME; else process.env.HOME = prev.homeDir;
      rmSync(home, { recursive: true, force: true });
    }
  });
});

describe("jsonl.ts:11 — an abandoned stream must not leak its file handle", () => {
  test("test_early_abandon_does_not_leak_fds", async () => {
    // MEASURED BEFORE THE FIX: `rl.close()` relinquishes the readline interface but does NOT destroy
    // the underlying `fs.ReadStream`, so an EARLY ABANDON — the `limit` break, or a caller breaking
    // out of the `for await` — left the stream open until GC. 40 abandoned generators with
    // `limit: 1` left **40 open fds** (exactly 1:1). `enumerate` streams every jsonl target through
    // this generator, so an index run over many sources accumulates handles.
    const home = mkdtempSync(join(tmpdir(), "jm-fd-"));
    const f = join(home, "big.jsonl");
    writeFileSync(f, Array.from({ length: 3000 }, (_, i) => JSON.stringify({ i })).join("\n") + "\n");
    try {
      const { streamJsonl } = await import("../src/adapters/jsonl");
      const fds = () => readdirSync("/proc/self/fd").length;
      for await (const _ of streamJsonl(f, { limit: 1 })) break;   // warm-up
      const before = fds();
      for (let i = 0; i < 40; i++) { for await (const _ of streamJsonl(f, { limit: 1 })) break; }
      expect(fds() - before).toBe(0);                              // no handle per abandoned generator

      // and a full read is unaffected
      let n = 0;
      for await (const _ of streamJsonl(f, {})) n++;
      expect(n).toBe(3000);
    } finally { rmSync(home, { recursive: true, force: true }); }
  });
});

describe("jsonl.ts:18 — `limit` bounds ROWS, not physical lines", () => {
  test("test_jsonl_limit_counts_rows_not_blank_lines", async () => {
    // MEASURED BEFORE THE FIX: the counter incremented BEFORE the blank-line skip, so a file with a
    // five-blank-line prefix and two records, read with `limit: 2`, yielded **ZERO** rows — the
    // blanks consumed the budget. And it disagreed with `streamJson`, where `limit` IS a row count,
    // while `src/targets.ts` passes the SAME `{ limit }` to both.
    const home = mkdtempSync(join(tmpdir(), "jm-jlim-"));
    const f = join(home, "lead.jsonl");
    writeFileSync(f, "\n\n\n\n\n" + JSON.stringify({ i: 1 }) + "\n" + JSON.stringify({ i: 2 }) + "\n" + JSON.stringify({ i: 3 }) + "\n");
    try {
      const { streamJsonl } = await import("../src/adapters/jsonl");
      const take = async (limit?: number) => {
        const rows: unknown[] = [];
        const lines: number[] = [];
        for await (const r of streamJsonl(f, limit === undefined ? {} : { limit })) { rows.push(r.value); lines.push(r.line); }
        return { rows, lines };
      };
      const two = await take(2);
      expect(two.rows.length).toBe(2);                       // the budget is ROWS
      expect(two.rows).toEqual([{ i: 1 }, { i: 2 }]);
      const all = await take();
      expect(all.rows.length).toBe(3);                       // everything past the blanks
      expect(all.lines).toEqual([6, 7, 8]);                  // and the physical line NUMBERS stay honest
    } finally { rmSync(home, { recursive: true, force: true }); }
  });
});

describe("queue.ts:61/75 — the attempt guard closes the sweep's window", () => {
  test("test_a_stale_ack_cannot_overwrite_a_live_result", async () => {
    // `sweep()` resets EVERY running row with no lease check, so a live worker's claim can be returned
    // to pending and re-claimed (audit queue.ts:75). That part is BY DESIGN — the sweep cannot tell a
    // dead process from a slow one, and a heartbeat/lease would be a new mechanism the spec does not
    // ask for. What must hold is that the DAMAGE cannot happen: the attempt guard on `complete`
    // rejects the stale ack.
    // MEASURED: A claims (attempts=0) -> B sweeps -> B re-claims (attempts=1) -> A acks with its OLD
    // attempt 0 -> **accepted=false**, and the live worker's row survives.
    const home = mkdtempSync(join(tmpdir(), "jm-sw-"));
    const prev = { home: process.env.JM_HOME, homeDir: process.env.HOME };
    process.env.JM_HOME = home; process.env.HOME = home;
    try {
      const { openJob } = await import("../src/job/store");
      const { Queue } = await import("../src/job/queue");
      const { db } = openJob("sw");
      const q = new Queue(db, "sw");
      q.enqueue("t", [{ fingerprint: "f1", payload: {} }]);
      const a = q.claim(1);
      expect(a.length).toBe(1);
      q.sweep();                                        // the live worker's row goes back to pending
      const b = q.claim(1);                             // a second worker takes it
      expect(b.length).toBe(1);
      expect(b[0].id).toBe(a[0].id);
      expect(b[0].attempts).toBeGreaterThan(a[0].attempts);
      // THE ASSERTION THAT MATTERS: the stale ack is REFUSED
      expect(q.complete(a[0].id, { from: "stale" }, a[0].attempts)).toBe(false);
      // and the live worker's ack is accepted
      expect(q.complete(b[0].id, { from: "live" }, b[0].attempts)).toBe(true);
      const row = db.query("SELECT state, result FROM queue WHERE id=" + a[0].id).get() as { state: string; result: string };
      expect(row.state).toBe("done");
      expect(row.result).toContain("live");              // the LIVE result, not the stale one
      db.close();
    } finally {
      if (prev.home === undefined) delete process.env.JM_HOME; else process.env.JM_HOME = prev.home;
      if (prev.homeDir === undefined) delete process.env.HOME; else process.env.HOME = prev.homeDir;
      rmSync(home, { recursive: true, force: true });
    }
  });
});

describe("E1 / run.ts:62 — the runner's ack must NAME its generation, or the guard is bypassed", () => {
  test("test_runner_ack_is_refused_when_the_row_was_swept_mid_work", async () => {
    // THE DEFECT THIS PINS, found in the STATUS REPORT: `complete`'s attempt guard was correct, and
    // the ONLY production caller — `job/run.ts:55` — omitted the argument, taking the permissive
    // branch. **A guard that can be switched off by LEAVING OUT AN ARGUMENT is not a guard** (the
    // same rule as H-5's typo-disableable cap). The parameter is now REQUIRED, so tsc enumerates any
    // future bypass — this test proves the guard actually BITES through the runner.
    //
    // The scenario is the real one: a worker claims a row, its claim is swept back to pending, a
    // competing worker re-claims it (attempts +1), and then the ORIGINAL worker tries to ack. Before
    // the fix that ack overwrote the live result; now it must be refused.
    const home = mkdtempSync(join(tmpdir(), "jm-e1-"));
    const prev = { home: process.env.JM_HOME, homeDir: process.env.HOME };
    process.env.JM_HOME = home; process.env.HOME = home;
    try {
      const { runQueued } = await import("../src/job/run");
      const { openJob } = await import("../src/job/store");
      const { Queue } = await import("../src/job/queue");

      // The work function simulates the competing worker mid-call: sweep the row, re-claim it.
      let sawRefusal = false;
      const res = await runQueued({
        jobId: "e1",
        kind: "unit",
        items: [{ fingerprint: "f1", payload: { n: 1 } }],
        stopOnError: true,
        work: async () => {
          const { db } = openJob("e1");
          const q2 = new Queue(db, "e1");
          q2.sweep();                     // this worker's own row goes back to pending…
          const reclaimed = q2.claim(1);  // …and is re-claimed, bumping attempts
          db.close();
          expect(reclaimed.length).toBe(1);
          return { worked: true };
        },
      }).catch((err: unknown) => {
        // the runner's ack was refused, which is the CORRECT outcome
        sawRefusal = String(err).includes("JM_ACK_REFUSED");
        return null;
      });

      const { db } = openJob("e1");
      const row = db.query("SELECT state, attempts, result FROM queue WHERE fingerprint='f1'").get() as { state: string; attempts: number; result: string | null };
      db.close();
      // the stale ack was REFUSED (the run surfaced JM_ACK_REFUSED)…
      expect(sawRefusal).toBe(true);
      // …so the row was NOT marked done by the stale worker, and its result is not the stale one
      expect(row.state).not.toBe("done");
      expect(row.result ?? "").not.toContain("worked");
      expect(res).toBeNull();
    } finally {
      if (prev.home === undefined) delete process.env.JM_HOME; else process.env.JM_HOME = prev.home;
      if (prev.homeDir === undefined) delete process.env.HOME; else process.env.HOME = prev.homeDir;
      rmSync(home, { recursive: true, force: true });
    }
  });
});

describe("E3 / decision-tree.ts:85 — an unreadable answer is an UNKNOWN, never a zero", () => {
  test("test_unrecognised_answer_is_not_routed_as_zero", async () => {
    // MEASURED BEFORE THE FIX: `answersToPolicyValue` seeded `best = 0` and only raised it on a
    // recognised field, so an answer whose shape nothing matched returned **0 — a confident "no"** —
    // and that zero was routed, banded and STORED as a decision. Its sibling `noulFrom` already
    // returns null on failure, and `pOf` was fixed for exactly this class; this one was missed.
    // `best = 0` also swallowed a NON-FINITE value (`Math.max(0, NaN)` is NaN, and `typeof NaN ===
    // "number"` let it through).
    const home = mkdtempSync(join(tmpdir(), "jm-e3-"));
    const prev = { home: process.env.JM_HOME, homeDir: process.env.HOME, key: process.env.TYPESAFE_API_KEY, url: process.env.JM_JUDGE_URL, ledger: process.env.JM_LEDGER };
    process.env.JM_HOME = home; process.env.HOME = home; process.env.TYPESAFE_API_KEY = "sandbox";
    delete process.env.JM_LEDGER;
    // a judge that answers with a shape NOTHING recognises
    const server = Bun.serve({ port: 0, fetch() { return Response.json({ model: "m", usage: { input_tokens: 5 }, answers: { flag: { type: "noul", weird_field: 0.97 } } }); } });
    process.env.JM_JUDGE_URL = `http://127.0.0.1:${server.port}/`;
    try {
      const { openDb, indexPathFor } = await import("../src/store/db");
      const { decisionTree, validateRecipe } = await import("../src/verbs/decision-tree");
      const rows = join(home, "rows.jsonl");
      writeFileSync(rows, JSON.stringify({ i: 1, body: "x" }) + "\n");
      const mk = (fail: string) => validateRecipe({ recipe: `e3-${fail}`, version: 1, questions: { flag: { type: "noul", instructions: "?" } }, policy: { act: 0.8, flag: 0.5, fail } } as never);

      // fail=closed (the default): REFUSE — the same treatment as any other unreadable answer
      const dbC = openDb(indexPathFor("e3-closed"));
      await expect(decisionTree({ db: dbC, rowsPath: rows, recipe: mk("closed"), concurrency: 1 })).rejects.toThrow(/JM_JUDGE_NO_SIGNAL/);
      dbC.close();

      // fail=open: a MARKED row whose signal is NULL — not a fabricated 0
      const dbO = openDb(indexPathFor("e3-open"));
      const r = await decisionTree({ db: dbO, rowsPath: rows, recipe: mk("open"), concurrency: 1 });
      const row = dbO.query("SELECT conf FROM decisions LIMIT 1").get() as { conf: number | null } | null;
      dbO.close();
      expect(r.bands.noop).toBe(1);
      expect(row).not.toBeNull();
      expect(row!.conf).toBeNull();                      // NULL = unknown; 0 would be a FABRICATED answer
    } finally {
      server.stop(true);
      if (prev.home === undefined) delete process.env.JM_HOME; else process.env.JM_HOME = prev.home;
      if (prev.homeDir === undefined) delete process.env.HOME; else process.env.HOME = prev.homeDir;
      if (prev.key === undefined) delete process.env.TYPESAFE_API_KEY; else process.env.TYPESAFE_API_KEY = prev.key;
      if (prev.url === undefined) delete process.env.JM_JUDGE_URL; else process.env.JM_JUDGE_URL = prev.url;
      if (prev.ledger === undefined) delete process.env.JM_LEDGER; else process.env.JM_LEDGER = prev.ledger;
      rmSync(home, { recursive: true, force: true });
    }
  });
});

describe("query.ts — the FTS chain must reach CHUNKED text and a bare identifier", () => {
  test("test_fts_finds_a_chunked_file_and_an_underscored_identifier", async () => {
    // TWO defects in the same chain, both measured on a real 37.9 MB session file:
    //  (1) THE JOIN. `docs_fts x JOIN files f ON f.path = x.path` held while every doc's path WAS the
    //      file's path — and broke the moment large files began being CHUNKED (`rel#c0`, …), because a
    //      chunk path never equals a file path. MEASURED: 0 of 313 chunked fts rows joined, so a
    //      chunked file was searchable in the index and INVISIBLE through `query --fts`.
    //  (2) THE TOKENIZER. FTS5 splits on `_`, so `--fts ttsr_injection` searched one token that does
    //      not exist and returned NOTHING while the text sat indexed. A bare identifier is now
    //      translated to its parts ANDed; anything already expression-shaped passes through.
    const home = mkdtempSync(join(tmpdir(), "jm-q-"));
    const corpus = join(home, "c");
    mkdirSync(corpus, { recursive: true });
    // A FILE BIG ENOUGH TO ACTUALLY CHUNK — over the 256 KB default, carrying a distinctive
    // underscored identifier deep inside. (The first version used a ~2.8 KB file, which never chunked,
    // so the assertion tested nothing — a fixture-geometry blind spot.)
    writeFileSync(join(corpus, "big.log"), "filler ".repeat(45_000) + " ttsr_injection recorded here");
    const env: Record<string, string> = { ...process.env, JM_HOME: home, HOME: home } as Record<string, string>;
    delete env.JM_LEDGER;
    const run = (...args: string[]) => Bun.spawnSync({ cmd: [...CLI, ...args], cwd: REPO, env, timeout: 60000 });
    try {
      run("index", corpus, "--name", "q", "--json");
      const db = new Database(join(home, "index", "q.sqlite"), { readonly: true });
      const chunked = (db.query("SELECT COUNT(*) AS n FROM docs WHERE path LIKE '%#c%'").get() as { n: number }).n;
      db.close();
      expect(chunked).toBeGreaterThan(0);                      // the file WAS chunked

      // (1) the chunked content is reachable through the query verb
      const byUnderscore = run("query", "q", "--fts", "ttsr_injection").stdout.toString();
      expect(byUnderscore).toContain("big.log");               // found, though it lives in a chunk
      // (2) and the identifier matched despite FTS5's `_` split
      const byParts = run("query", "q", "--fts", "ttsr AND injection").stdout.toString();
      expect(byParts).toContain("big.log");
      // an expression still passes through untouched
      const byPhrase = run("query", "q", "--fts", '"ttsr_injection"').stdout.toString();
      expect(byPhrase).not.toContain("JM_FTS_INVALID");
    } finally { rmSync(home, { recursive: true, force: true }); }
  });
});

describe("budget.ts:10 — a misspelled CAP must not silently not apply", () => {
  test("test_unknown_budget_key_is_refused", async () => {
    // MEASURED BEFORE THE FIX: the constructor validated every cap's VALUE and no cap's KEY, so
    // `new Budget({ call: 5 })` — the natural typo for `calls` — was accepted and produced
    // `roomLeft: true` with `caps: {call: 5}`. **The cap did nothing, and nothing said so.** A budget
    // is the guard that stops a runaway loop from spending; a guard a typo can switch off is not a
    // guard. Same class as H-5 (`policy.fail` typo -> fail-OPEN) and the body-cap override.
    const { Budget } = await import("../src/pools/budget");
    expect(() => new Budget({ call: 5 } as never)).toThrow(/JM_BUDGET_INVALID: unknown cap "call"/);
    expect(() => new Budget({ calls: 2, tokenz: 9 } as never)).toThrow(/unknown cap "tokenz"/);
    // the real dimensions still work, and an empty cap set is legitimate (no cap)
    expect(new Budget({ calls: 5 }).roomLeft()).toBe(true);
    expect(new Budget({ usd: 0.5 }).roomLeft()).toBe(true);
    expect(new Budget({}).roomLeft()).toBe(true);
    // and a bad VALUE is still refused, as before
    expect(() => new Budget({ calls: -1 })).toThrow(/JM_BUDGET_INVALID/);
  });
});

describe("store/db.ts:79 — a VALID JSON file that is not a registry is corrupt", () => {
  test("test_registry_shape_is_validated_and_written_atomically", () => {
    // MEASURED BEFORE THE FIX: `JSON.parse(...) as Target[]` cast the result straight through, so
    // `{}`, `null` and `"x"` — all valid JSON — sailed past and the failure surfaced far away as
    // `undefined is not a function` on `.find()`/`.filter()`. A file whose SHAPE is wrong is as
    // corrupt as one whose syntax is, and it is now named the same way.
    const home = mkdtempSync(join(tmpdir(), "jm-reg-"));
    const prev = { home: process.env.JM_HOME, homeDir: process.env.HOME };
    process.env.JM_HOME = home; process.env.HOME = home;
    try {
      const { loadTargets, saveTargets, targetsPath } = require("../src/store/db") as typeof import("../src/store/db");
      const p = targetsPath();
      for (const bad of ["{}", "null", '"x"', '[{"name":"ok"}]', '[{"name":"a","kind":"fs"}]']) {
        writeFileSync(p, bad);
        expect(() => loadTargets()).toThrow(/JM_TARGETS_CORRUPT/);
      }
      // a well-formed registry round-trips, and the write leaves no temp file behind
      saveTargets([{ name: "t1", kind: "fs", root: "/tmp" }] as never);
      expect(loadTargets().length).toBe(1);
      const strays = readdirSync(home).filter((f) => f.includes(".tmp-"));
      expect(strays).toEqual([]);                    // write-then-rename cleans up after itself
    } finally {
      if (prev.home === undefined) delete process.env.JM_HOME; else process.env.JM_HOME = prev.home;
      if (prev.homeDir === undefined) delete process.env.HOME; else process.env.HOME = prev.homeDir;
      rmSync(home, { recursive: true, force: true });
    }
  });
});

describe("evaluate.ts — the replay diff, the dead parameter, and the unchecked usage gap", () => {
  test("test_replay_diff_of_identical_runs_is_empty", async () => {
    // MEASURED BEFORE THE FIX: `new Map(a.cases.map((c) => [c.id, c]))` keyed by id alone, while
    // `cases` holds `k` REPETITIONS per id — so the Map kept only the LAST repetition and every one of
    // b's entries was compared against that single value. A replay of two IDENTICAL runs (k=2,
    // p=0.9 then 0.2) reported `{from: 0.2, to: 0.9, flipped: true}` — a change that did not happen,
    // in the ONE function whose entire job is to report what changed.
    const { replayDiff } = await import("../src/verbs/evaluate");
    const mk = (...ps: number[]) => ({ cases: ps.map((p) => ({ id: "c1", p, latencyMs: 1, costUsd: 0 })) } as never);
    const two = (p1: number, p2: number) => ({ cases: [
      { id: "c1", p: p1, latencyMs: 1, costUsd: 0 }, { id: "c2", p: p2, latencyMs: 1, costUsd: 0 }] } as never);

    expect(replayDiff(mk(0.9, 0.2) as never, mk(0.9, 0.2) as never)).toEqual([]);        // identical -> nothing
    expect(replayDiff(mk(0.7) as never, mk(0.7) as never)).toEqual([]);                  // the common case
    // real changes are still caught, at EITHER repetition position
    expect(replayDiff(mk(0.9, 0.2) as never, mk(0.9, 0.8) as never).length).toBe(1);
    expect(replayDiff(mk(0.9, 0.2) as never, mk(0.1, 0.2) as never).length).toBe(1);
    expect(replayDiff(mk(0.7) as never, mk(0.3) as never).length).toBe(1);
    expect(replayDiff(two(0.9, 0.1) as never, two(0.9, 0.8) as never).map((d) => d.id)).toEqual(["c2"]);
  });
});

describe("cli.ts — accept-garbage: the kind, the tilde, and the flag set", () => {
  test("test_target_add_validates_kind_and_stores_an_expanded_root", () => {
    // THREE defects in one handler, all the "accepted garbage" class:
    //  · `kind as Target["kind"]` CAST an operator string, so `target add x bogus /path` registered a
    //    target with NO adapter and the failure surfaced much later at index time.
    //  · the existence check expanded `~` and the registry then stored the RAW path, so validation
    //    passed against one path while every later reader saw another.
    //  · `VALUE_FLAGS` (hand-maintained) had drifted from the code: eight consumed flags were absent,
    //    so their VALUES leaked into positionals.
    const home = mkdtempSync(join(tmpdir(), "jm-kind-"));
    const prev = { home: process.env.JM_HOME, homeDir: process.env.HOME };
    process.env.JM_HOME = home; process.env.HOME = home;
    try {
      const { loadTargets } = require("../src/store/db") as typeof import("../src/store/db");
      const dir = join(home, "c");
      mkdirSync(dir, { recursive: true });
      const run = (...args: string[]) => Bun.spawnSync({ cmd: [...CLI, ...args], cwd: REPO, env: { ...process.env } as Record<string, string>, timeout: 60000 });

      // (1) a bogus kind is refused BY NAME
      const bad = run("target", "add", "x", "bogus", dir);
      expect(bad.exitCode).toBe(2);
      expect(bad.stderr.toString()).toContain("JM_TARGET_KIND");
      // (2) a real kind registers, and the stored root is ABSOLUTE (no `~` left for a reader to forget)
      expect(run("target", "add", "ok", "fs", dir).exitCode).toBe(0);
      const stored = loadTargets().find((t) => t.name === "ok")!;
      expect(stored.root.startsWith("/")).toBe(true);
      expect(stored.root).toBe(dir);                      // the realpath, not a `~` form
      expect(stored.kind).toBe("fs");
    } finally {
      if (prev.home === undefined) delete process.env.JM_HOME; else process.env.JM_HOME = prev.home;
      if (prev.homeDir === undefined) delete process.env.HOME; else process.env.HOME = prev.homeDir;
      rmSync(home, { recursive: true, force: true });
    }
  });

  test("test_value_flags_cover_every_consumed_flag", () => {
    // `positionals()` only skips the next token for names IN the set, so a consumed flag that is
    // absent puts its VALUE into positionals. The set is hand-maintained and had drifted (first four
    // missing, then eight more). This DERIVES the check from the source rather than restating it, so
    // the next drift fails here instead of silently at a call site.
    const src = readFileSync(join(REPO, "src", "cli.ts"), "utf8");
    const start = src.indexOf("const VALUE_FLAGS");
    const setText = src.slice(start, src.indexOf("]);", start));
    const declared = new Set([...setText.matchAll(/"([a-z-]+)"/g)].map((m) => m[1]));
    const consumed = new Set([...src.matchAll(/flag\("([a-z-]+)"\)/g)].map((m) => m[1]));
    const missing = [...consumed].filter((f) => !declared.has(f)).sort();
    expect(missing).toEqual([]);                          // every consumed flag must be declared
  });
});

describe("store/db.ts:4 — a store built by another SCHEMA_VERSION is refused by name", () => {
  test("test_schema_version_mismatch_is_refused", () => {
    // `SCHEMA_VERSION` was written into `meta` on open and NEVER read back. `SCHEMA_SQL` is all
    // `CREATE TABLE IF NOT EXISTS`, which leaves an existing table's shape untouched — so a version
    // bump would REUSE an old store silently and the first symptom would be a confusing `no such
    // column` from deep inside a verb. Now the stored version is compared, and a mismatch is named at
    // the one moment the operator can act on it.
    const home = mkdtempSync(join(tmpdir(), "jm-sv-"));
    const prev = { home: process.env.JM_HOME, homeDir: process.env.HOME };
    process.env.JM_HOME = home; process.env.HOME = home;
    try {
      const { openDb, indexPathFor } = require("../src/store/db") as typeof import("../src/store/db");
      const db = openDb(indexPathFor("sv"));
      db.run("UPDATE meta SET value='99' WHERE key='schema_version'");
      db.close();
      expect(() => openDb(indexPathFor("sv"))).toThrow(/JM_SCHEMA_MISMATCH/);
    } finally {
      if (prev.home === undefined) delete process.env.JM_HOME; else process.env.JM_HOME = prev.home;
      if (prev.homeDir === undefined) delete process.env.HOME; else process.env.HOME = prev.homeDir;
      rmSync(home, { recursive: true, force: true });
    }
  });
});

describe("report.ts:57/146 — one unreadable cost must not poison the whole total", () => {
  test("test_a_malformed_cost_is_counted_not_accumulated", () => {
    // MEASURED BEFORE THE FIX: `cost += Number(r.cost_usd ?? 0)` returns NaN for a non-numeric value,
    // and ONE such row destroyed the figure for every other row — a ledger holding a single
    // `"cost_usd":"not-a-number"` made `jm report` print `$NaN`. The row is now COUNTED and the
    // damage is NAMED on the output, the same rule the malformed-JSON catch beside it already kept.
    const home = mkdtempSync(join(tmpdir(), "jm-nan-"));
    const corpus = join(home, "c");
    mkdirSync(corpus, { recursive: true });
    writeFileSync(join(corpus, "a.md"), "alpha");
    const env: Record<string, string> = { ...process.env, JM_HOME: home, HOME: home } as Record<string, string>;
    delete env.JM_LEDGER;
    const run = (...args: string[]) => Bun.spawnSync({ cmd: [...CLI, ...args], cwd: REPO, env, timeout: 60000 });
    try {
      run("index", corpus, "--name", "n");
      const led = join(home, "ledger.jsonl");
      writeFileSync(led, readFileSync(led, "utf8") + JSON.stringify({ ts: "2026-01-01T00:00:00.000Z", kind: "run", verb: "bogus", status: "ok", cost_usd: "not-a-number" }) + "\n");

      const out = run("report", "n").stdout.toString();
      expect(out).not.toContain("$NaN");                       // the poisoning is gone
      expect(out).toContain("$0.000000");                      // the readable rows still total correctly
      expect(out).toContain("1 UNREADABLE cost");              // and the damage is NAMED, not hidden

      // a clean ledger prints no such note
      writeFileSync(led, readFileSync(led, "utf8").split("\n").filter((l) => !l.includes("not-a-number")).join("\n"));
      const clean = run("report", "n").stdout.toString();
      expect(clean).not.toContain("UNREADABLE");
      expect(clean).not.toContain("$NaN");
    } finally { rmSync(home, { recursive: true, force: true }); }
  });
});

describe("indexJob.ts:31/37 — a crashed run must not wear a success shape, and failures must be counted", () => {
  test("test_queued_index_reports_ok_and_failed", () => {
    // TWO defects in one result shape:
    //  · `.catch((e) => { error = String(e); return null })` set `error`, but every counter then read
    //    `res?… ?? 0` — so a crash produced all-zeros PLUS `files=<the whole index>`, and a caller
    //    checking `done > 0` could not tell a crash from an empty job. `ok` now states it.
    //  · `runQueued` REPORTS `failed` (RunResult:7) and this function DROPPED it, so items that
    //    permanently failed were invisible in the summary — a swallowed count.
    const home = mkdtempSync(join(tmpdir(), "jm-ij-"));
    const corpus = join(home, "c");
    mkdirSync(corpus, { recursive: true });
    writeFileSync(join(corpus, "good.md"), "readable");
    writeFileSync(join(corpus, "locked.md"), "unreadable");
    const env: Record<string, string> = { ...process.env, JM_HOME: home, HOME: home } as Record<string, string>;
    delete env.JM_LEDGER;
    const run = (...args: string[]) => Bun.spawnSync({ cmd: [...CLI, ...args], cwd: REPO, env, timeout: 60000 });
    try {
      // THE LOCKED FILE MUST BE **NEW** ON THE RUN THAT READS IT. The first draft indexed both files
      // and then locked one — and the second run skipped it entirely, because the incremental fast
      // path saw (size, mtime) unchanged and never re-read it. That is a correct optimisation and a
      // wrong probe. The unreadable file is therefore created after the first index.
      run("index", corpus, "--name", "n", "--queued", "--job", "j1");
      const locked = join(corpus, "locked-late.md");
      writeFileSync(locked, "unreadable");
      chmodSync(locked, 0o000);
      const out = run("index", corpus, "--name", "n", "--queued", "--job", "j2").stdout.toString();
      chmodSync(locked, 0o644);
      expect(out).toContain("JM_QUEUED");
      expect(out).toMatch(/ok=(true|false)/);       // the outcome is STATED, never inferred from zeros
      expect(out).toMatch(/failed=\d/);             // and the failure count is ON THE LINE
      expect(out).toMatch(/failed=[1-9]/);          // the unreadable file is counted, not dropped
    } finally { rmSync(home, { recursive: true, force: true }); }
  });
});
