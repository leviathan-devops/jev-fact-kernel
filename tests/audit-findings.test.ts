// tests/audit-findings.test.ts — the code audit's findings, each pinned by the probe that settled it.
//
// The audit ran 103 distinct findings over the whole build on a live lane. These are the ones that
// CONFIRMED — each was a hypothesis until a probe settled it, and the probe is in the comment, so
// the next reader can re-run the settlement rather than trust this file.
import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openSource, rowsOf } from "../src/adapters/sqlite";
import { validateRecipe } from "../src/verbs/decision-tree";
import { safeName } from "../src/store/db";

const REPO = join(import.meta.dir, "..");

describe("H-2 — a table without a PRIMARY KEY must not collapse its rows", () => {
  test("test_sqlite_rows_without_a_pk_keep_their_identity", () => {
    // MEASURED BEFORE THE FIX: five rows in a PK-less table produced ONE indexed file at `#notes/0`
    // while the ingest reported `rows=5 changed=5`. `SELECT *` never returns `rowid`, so `pk` was
    // null for every row and the downstream ref collapsed to the constant "0" — silent data loss
    // reported as success.
    const dir = mkdtempSync(join(tmpdir(), "jm-h2-"));
    const path = join(dir, "nopk.sqlite");
    const w = new Database(path, { create: true });
    w.run("CREATE TABLE notes (title TEXT, body TEXT)");
    for (let i = 0; i < 5; i++) w.run("INSERT INTO notes VALUES (?, ?)", [`note-${i}`, `body ${i} tombstone`]);
    w.close();

    const src = openSource(path);
    const rows = [...rowsOf(src, ["notes"])];
    src.close();
    rmSync(dir, { recursive: true, force: true });

    expect(rows.length).toBe(5);                                    // every row is emitted…
    const pks = rows.map((r) => r.pk ?? "");
    const distinct = pks.filter((p, i) => pks.indexOf(p) === i).length;
    expect(distinct).toBe(5);                                       // …with FIVE DISTINCT identities
    expect(pks.includes("0")).toBe(false);                          // never the collapsed constant
    // and the synthetic rowid column must not leak into the indexed text
    expect(rows.every((r) => !r.text.includes("__jm_rowid"))).toBe(true);
    expect(rows.every((r) => r.text.includes("tombstone"))).toBe(true);
  });
});

describe("H-5 — policy.fail must be validated, or a typo silently degrades to fail-OPEN", () => {
  test("test_recipe_fail_policy_rejects_a_typo", () => {
    // MEASURED BEFORE THE FIX, at the function level against a dead judge endpoint:
    //   fail="closed" -> the run REFUSED;  fail="Closed" -> the run COMPLETED with a marked row.
    // Neither polarity check matched the typo, so the run degraded to FAIL-OPEN — the opposite of
    // the documented default, on the one field whose entire job is to decide what a failure MEANS.
    const mk = (fail: unknown) => ({ recipe: "t", version: 1, questions: { f: { type: "noul", instructions: "?" } }, policy: { act: 0.8, flag: 0.5, fail } });
    expect(validateRecipe(mk("closed") as never)).toBeTruthy();
    expect(validateRecipe(mk("open") as never)).toBeTruthy();
    for (const bad of ["Closed", "closed ", "opne", "", "OPEN", 1, null]) {
      expect(() => validateRecipe(mk(bad) as never)).toThrow(/JM_RECIPE_INVALID: policy\.fail/);
    }
  });
});
describe("M-H — safeName must be INJECTIVE, like safeTargetName", () => {
  test("test_index_names_that_sanitise_alike_stay_distinct", () => {
    // MEASURED BEFORE THE FIX: `jm index --name "my index"` and `--name "my/index"` both resolved to
    // `my_index.sqlite` — the second reported `JM_INDEX_OK ... changed=0` while writing into the
    // FIRST index's file, and `ls index/` showed one file for two names. The same class as D-027
    // (the target sanitiser) and D-008, in a second function. A value that becomes a KEY must map
    // one-to-one.
    const pairs: [string, string][] = [
      ["my index", "my/index"],
      ["a.b", "a/b"],
      ["x  y", "x__y"],
    ];
    for (const [a, b] of pairs) {
      expect(safeName(a)).not.toBe(safeName(b));       // distinct names, distinct keys
    }
    // an ALREADY-SAFE name is returned UNCHANGED, so existing indexes keep their filenames
    for (const safe of ["shadow", "all", "decisions", "my-index_v2.1"]) {
      expect(safeName(safe)).toBe(safe);
    }
    // deterministic: the same name always resolves the same way
    expect(safeName("my index")).toBe(safeName("my index"));
  });
});

describe("M-J — `reconciled` must implement C8, not a different property", () => {
  test("test_job_reconciliation_reports_the_DOCUMENTED_predicate", () => {
    // The spec's C8 is "rows == decisions + runs". The field computed `dup === 0 && running === 0`
    // — the DUP LAW, a real property but NOT the criterion its name claims — so a ledger holding a
    // row its own arithmetic could not explain still reported `reconciled: YES`. The two properties
    // are now computed and reported separately, with the OPERANDS shown so the equality is
    // checkable rather than trusted.
    const home = mkdtempSync(join(tmpdir(), "jm-mj-"));
    const corpus = join(home, "c");
    mkdirSync(corpus, { recursive: true });
    writeFileSync(join(corpus, "a.md"), "alpha");
    const env: Record<string, string> = { ...process.env, JM_HOME: home, HOME: home } as Record<string, string>;
    // `ledgerPath()` honours `JM_LEDGER` BEFORE `JM_HOME`, so an inherited one would send this job's
    // ledger to ANOTHER test's sandbox — which is exactly how this test failed once, reporting
    // `JM_QUEUED done=1` with no ledger in its own home. helpers.ts now restores the env on cleanup;
    // this line makes the case independent of that.
    delete env.JM_LEDGER;
    const J = [process.execPath, "run", "src/cli.ts"];
    const run = (...args: string[]) => Bun.spawnSync({ cmd: [...J, ...args], cwd: REPO, env, timeout: 60000 });

    // PROVE THE SETUP. The first draft asserted `reconciled: YES` here — which is ALSO what an
    // EMPTY ledger reports (0 === 0), so the assertion passed whether or not the job ran, and the
    // test only failed later on an ENOENT that looked like a mystery. Each step is now checked.
    const add = run("target", "add", "j", "fs", corpus);
    expect(add.exitCode).toBe(0);
    const idx = run("index", "@j", "--queued", "--job", "j1");
    expect(idx.exitCode).toBe(0);
    const lp = join(home, "ledger.jsonl");
    if (!existsSync(lp)) throw new Error(`the job wrote no ledger: idx.exit=${idx.exitCode} stdout=${idx.stdout.toString().trim().slice(0,120)} | home contents=[${readdirSync(home).join(" ")}]`);

    const ok = run("report", "--job", "j1", "--name", "j").stdout.toString();
    expect(ok).toMatch(/C8 operands:\s+rows=1 decisions=0 runs=1/);   // one run, no decisions
    expect(ok).toMatch(/reconciled:\s+YES/);

    // THE NEGATIVE HALF IS AN UNACCOUNTED KIND, not an empty ledger: emptying it gives
    // rows=0 decisions=0 runs=0 and 0 === 0 is vacuously reconciled — the honest reading of
    // "nothing in the ledger is unaccounted for". The failure C8 can catch is a row that names the
    // job and is NEITHER a decision NOR a run.
    const rows = readFileSync(lp, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as Record<string, unknown>);
    rows.push({ verb: "mystery", kind: "tool", status: "ok", cost_usd: 0, args: { job: "j1" } });
    writeFileSync(lp, rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
    const bad = run("report", "--job", "j1", "--name", "j").stdout.toString();
    rmSync(home, { recursive: true, force: true });
    expect(bad).toMatch(/C8 operands:\s+rows=2 decisions=0 runs=1/);   // the operands are SHOWN
    expect(bad).toMatch(/reconciled:\s+NO/);                          // and the predicate BITES
    expect(bad).toMatch(/dup clean:\s+YES/);                          // the other property is unchanged
  });
});
