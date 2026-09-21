// tests/judge-outage.test.ts — D-040: the fail polarity under a JUDGE OUTAGE.
//
// The check was `includes("JEV_NO_KEY")` alone, so a judge 500, 429 or timeout produced a `noop`
// DECISION ROW and exit 0 — a run that could not reach the judge reported itself as having decided.
// The spec says exit 2 means "refused/fail-closed"; the code returned 0 and wrote an artifact.
//
// This suite runs a CONTROLLED endpoint (JM_JUDGE_URL) so the outage paths are reachable: with the
// endpoint hard-coded the only way to fail the judge was to make the request oversized, which is
// what produced the D-037 false lead.
import { test, expect, describe, beforeAll, afterAll } from "bun:test";
import { join } from "node:path";
import { makeSandbox, fill } from "./helpers.ts";
import { openDb, indexPathFor, saveTargets } from "../src/store/db.ts";
import { decisionTree, validateRecipe, type Recipe } from "../src/verbs/decision-tree.ts";

const PORT = 7893;
let server: ReturnType<typeof Bun.serve>;

beforeAll(() => {
  server = Bun.serve({
    port: PORT,
    async fetch(req) {
      const u = new URL(req.url);
      if (u.pathname === "/err500") return new Response('{"detail":"boom"}', { status: 500 });
      if (u.pathname === "/err429") return new Response('{"detail":"slow down"}', { status: 429 });
      return Response.json({ model: "flaky", answers: { flag: { type: "noul", noul: 0.9 } }, usage: { input_tokens: 10, output_tokens: 2 } });
    },
  });
});
afterAll(() => server.stop(true));

const RECIPE_CLOSED: Recipe = validateRecipe({ recipe: "fo", version: 1, questions: { flag: { type: "noul", instructions: "?" } }, policy: { act: 0.8, flag: 0.5, fail: "closed" } });
const RECIPE_OPEN: Recipe = validateRecipe({ recipe: "fo", version: 1, questions: { flag: { type: "noul", instructions: "?" } }, policy: { act: 0.8, flag: 0.5, fail: "open" } });

async function runWith(endpoint: string, policy: Recipe, nonce: string) {
  const sb = makeSandbox();
  const rows = join(sb.root, `rows-${nonce}.jsonl`);
  await Bun.write(rows, JSON.stringify({ i: 1, title: nonce, body: `nonce-${nonce}` }) + "\n");
  const db = openDb(indexPathFor("fo"));
  const prev = process.env.JM_JUDGE_URL;
  process.env.JM_JUDGE_URL = endpoint;
  let err: string | null = null;
  let res: Awaited<ReturnType<typeof decisionTree>> | null = null;
  try { res = await decisionTree({ db, rowsPath: rows, recipe: policy, concurrency: 1 }); }
  catch (e) { err = String(e); }
  finally { if (prev === undefined) delete process.env.JM_JUDGE_URL; else process.env.JM_JUDGE_URL = prev; }
  const written = (db.query("SELECT COUNT(*) AS n FROM decisions").get() as { n: number }).n;
  db.close();
  sb.cleanup();
  return { err, res, written };
}

describe("D-040 judge outage", () => {
  test("test_fail_closed_propagates_every_outage_not_just_a_missing_key", async () => {
    for (const path of ["err500", "err429"]) {
      const r = await runWith(`http://127.0.0.1:${PORT}/${path}`, RECIPE_CLOSED, `${path}-${Date.now()}`);
      expect({ path, threw: r.err !== null }).toEqual({ path, threw: true });
      expect(r.err).toMatch(/JM_JUDGE_HTTP_(500|429)/);
      expect({ path, written: r.written }).toEqual({ path, written: 0 });   // ZERO decisions
    }
  }, 30_000);

  test("test_fail_open_degrades_with_a_MARKED_row", async () => {
    const r = await runWith(`http://127.0.0.1:${PORT}/err500`, RECIPE_OPEN, `open-${Date.now()}`);
    expect(r.err).toBeNull();                                  // the run completes
    expect(r.written).toBe(1);                                 // with a row...
    expect(r.res!.bands.noop).toBe(1);                          // ...that is a noop
  }, 30_000);

  test("test_a_healthy_endpoint_still_decides", async () => {
    const r = await runWith(`http://127.0.0.1:${PORT}/ok`, RECIPE_CLOSED, `ok-${Date.now()}`);
    expect(r.err).toBeNull();
    expect(r.res!.calls).toBe(1);                              // a REAL judge call was made
    expect(r.res!.bands.act).toBe(1);                           // p=0.9 -> act
  }, 30_000);
});
