// tests/audit-findings.test.ts — the code audit's findings, each pinned by the probe that settled it.
//
// The audit ran 103 distinct findings over the whole build on a live lane. These are the ones that
// CONFIRMED — each was a hypothesis until a probe settled it, and the probe is in the comment, so
// the next reader can re-run the settlement rather than trust this file.
import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openSource, rowsOf } from "../src/adapters/sqlite";
import { validateRecipe } from "../src/verbs/decision-tree";

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