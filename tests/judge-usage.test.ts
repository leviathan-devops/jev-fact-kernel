// tests/judge-usage.test.ts — D-046: an UNMEASURED cost is not a zero.
//
// `resp.usage?.input_tokens ?? 0` billed a call with no `usage` block at $0 — and since the ledger
// and the USD budget both read that number, an absent accounting field silently disabled a guard.
// Measured: 50 such calls against a $0.0001 cap left `roomLeft === true`.
//
// The fix reports the gap (`usageMissing`) and the verbs treat it like any other judge failure
// under their own fail polarity — the same policy D-040/D-041 built.
import { test, expect, describe } from "bun:test";
import { echoJudge } from "./helpers";
import { makeSandbox } from "./helpers.ts";
import { openDb, indexPathFor } from "../src/store/db.ts";
import { Judge } from "../src/judge/client.ts";
import { decisionTree, validateRecipe } from "../src/verbs/decision-tree.ts";
import { Budget } from "../src/pools/budget.ts";

describe("D-046 usage accounting", () => {
  test("test_a_usage_less_response_is_REPORTED_not_billed_at_zero", async () => {
    const s = Bun.serve({ port: 0, fetch: echoJudge(() => ({ type: "noul", noul: 0.9 }), { usage: null }) });
    const sb = makeSandbox();
    const prev = process.env.JM_JUDGE_URL;
    process.env.JM_JUDGE_URL = `http://127.0.0.1:${s.port}/`;
    try {
      const db = openDb(indexPathFor("u"));
      const r = await new Judge(db, {}).ask({ q: 1 }, { flag: { type: "noul", instructions: "?" } }, "u@v1");
      expect(r.answers).toBeTruthy();            // the answer IS usable
      expect(r.usageMissing).toBe(true);         // ...and the accounting gap is REPORTED
      expect(r.costUsd).toBe(0);
      db.close();
    } finally {
      if (prev === undefined) delete process.env.JM_JUDGE_URL; else process.env.JM_JUDGE_URL = prev;
      s.stop(true); sb.cleanup();
    }
  }, 30_000);

  test("test_the_verbs_honour_the_policy_for_a_usage_less_judge", async () => {
    const s = Bun.serve({ port: 0, fetch() { return Response.json({ model: "m", answers: { flag: { type: "noul", noul: 0.9 } } }); } });
    const sb = makeSandbox();
    const prev = process.env.JM_JUDGE_URL;
    process.env.JM_JUDGE_URL = `http://127.0.0.1:${s.port}/`;
    try {
      const db = openDb(indexPathFor("u2"));
      const closed = validateRecipe({ recipe: "u", version: 1, questions: { flag: { type: "noul", instructions: "?" } }, policy: { act: 0.8, flag: 0.5, fail: "closed" } });
      const open = validateRecipe({ recipe: "u", version: 1, questions: { flag: { type: "noul", instructions: "?" } }, policy: { act: 0.8, flag: 0.5, fail: "open" } });

      // EACH PHASE GETS ITS OWN STATE. The first draft reused one rows file, and both recipes share
      // `recipe: "u"@v1` — the same fingerprint — so the fail-open phase was a CACHE HIT: no call,
      // therefore no `usageMissing`, and it decided normally on the cached 0.9. That is CORRECT
      // behaviour (a cache hit costs nothing to measure) and a WRONG test: the phase must make a
      // real call to exercise the policy.
      const rowsA = `${sb.root}/rows-a.jsonl`;
      await Bun.write(rowsA, JSON.stringify({ i: 1, title: "closed-phase", body: `a-${Date.now()}` }) + "\n");
      await expect(decisionTree({ db, rowsPath: rowsA, recipe: closed, concurrency: 1 }))
        .rejects.toThrow(/JM_JUDGE_USAGE_MISSING/);                            // fail-closed: REFUSE

      // AND FAIL-OPEN REFUSES TOO (the policy was UNIFIED — see the ruling below). This assertion
      // used to read `expect(r.bands.noop).toBe(1)` — "fail-open: MARKED". That enshrined a policy the
      // OTHER two verbs already contradicted: `filter` and `find` (via `fatalJudgeError`) treat an
      // unmeasured cost as fatal REGARDLESS of polarity, and `policy.ts` documents that function as
      // "THE JUDGE-FAILURE POLICY, IN ONE PLACE". `decision-tree` had TWO private copies of it, both
      // checking `JEV_NO_KEY` alone — so under `fail: "open"` a `JM_JUDGE_USAGE_MISSING` was swallowed
      // and the run COMPLETED on rows whose cost was never measured.
      //
      // THE RULING, and why refuse-regardless is the consistent rule: `fail: "open"` is the opt-in to
      // DEGRADE ON AN OUTAGE — a marked row whose cost is known to be zero. A judge that ANSWERED is
      // not an outage; it is broken ACCOUNTING, and the budget is the operator's guard against a
      // runaway loop. An unmeasurable quantity must therefore REFUSE the limit enforcement, not
      // satisfy it (D-046's own words), and a missing KEY is already fatal whichever polarity is set —
      // an unmeasured COST is the same class. All three verbs now agree.
      const rowsB = `${sb.root}/rows-b.jsonl`;
      await Bun.write(rowsB, JSON.stringify({ i: 1, title: "open-phase", body: `b-${Date.now()}` }) + "\n");
      await expect(decisionTree({ db, rowsPath: rowsB, recipe: open, concurrency: 1 }))
        .rejects.toThrow(/JM_JUDGE_USAGE_MISSING/);                            // fail-open: ALSO REFUSES
      const countRow = db.query("SELECT COUNT(*) AS n FROM decisions").get() as { n: number };   // named const: a bun:sqlite result is in-process, and the cast carries its reason here
      expect(countRow.n).toBe(0);                                              // NEITHER phase wrote a DECISION
      db.close();
    } finally {
      if (prev === undefined) delete process.env.JM_JUDGE_URL; else process.env.JM_JUDGE_URL = prev;
      s.stop(true); sb.cleanup();
    }
  }, 30_000);

  test("test_a_usd_cap_is_meaningless_without_measurement", () => {
    // the mechanism the defect defeated: a cap that can never fire
    const b = new Budget({ usd: 0.0001 });
    for (let i = 0; i < 50; i++) b.spend(0);      // 50 unmeasured calls
    expect(b.roomLeft()).toBe(true);              // <- why an unmeasured cost MUST refuse instead
  });
});
