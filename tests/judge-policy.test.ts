// tests/judge-policy.test.ts — D-041: ONE judge-failure policy, honoured by every judging verb.
//
// Three verbs (decision-tree, filter, find) each decided for itself what a judge failure meant,
// and all three checked `JEV_NO_KEY` ONLY. A missing key aborted a run; a 500, a 429 or a timeout
// produced a SILENT EMPTY RESULT — `filter` returning `kept=0` and `find` returning `0 patterns`,
// both indistinguishable from a considered answer to a question the judge never saw.
//
// This suite runs its OWN controlled endpoint, so a judge outage is reachable by construction.
import { test, expect, describe, beforeAll, afterAll } from "bun:test";
import { join } from "node:path";
import { makeSandbox, fill } from "./helpers.ts";
import { openDb, indexPathFor, saveTargets } from "../src/store/db.ts";
import { ingestAll } from "../src/targets.ts";
import { filterIndex } from "../src/verbs/filter.ts";
import { find } from "../src/verbs/find.ts";
import { fatalJudgeError } from "../src/judge/policy.ts";

const PORT = 7894;
let server: ReturnType<typeof Bun.serve>;

beforeAll(() => {
  server = Bun.serve({
    port: PORT,
    fetch(req) {
      const u = new URL(req.url);
      if (u.pathname === "/err500") return new Response('{"detail":"boom"}', { status: 500 });
      return Response.json({
        model: "flaky",
        answers: { match: { type: "noul", noul: 0.9 }, is_instance: { type: "noul", noul: 0.9 }, flag: { type: "noul", noul: 0.9 } },
        usage: { input_tokens: 10, output_tokens: 2 },
      });
    },
  });
});
afterAll(() => server.stop(true));

async function seeded() {
  const sb = makeSandbox();
  const files: Record<string, string> = {};
  for (let i = 0; i < 4; i++) files[`c/f${i}.md`] = `body ${i} tombstone`;
  fill(sb.root, files);
  process.env.JM_HOME = sb.home;
  saveTargets([{ name: "c", kind: "fs", root: join(sb.root, "c") }]);
  const db = openDb(indexPathFor("all"));
  await ingestAll(db, "all");
  return { sb, db };
}

describe("D-041 the judge-failure policy", () => {
  test("test_fatalJudgeError_is_one_rule", () => {
    // the policy itself: any error is fatal unless failOpen; a missing key is ALWAYS fatal
    expect(fatalJudgeError([], {})).toBeNull();
    expect(fatalJudgeError([{ error: "JM_JUDGE_HTTP_500: boom" }], {})).toMatch(/HTTP_500/);
    expect(fatalJudgeError([{ error: "JM_JUDGE_HTTP_500: boom" }], { failOpen: true })).toBeNull();
    expect(fatalJudgeError([{ error: "JEV_NO_KEY: none" }], { failOpen: true })).toMatch(/JEV_NO_KEY/);
    expect(fatalJudgeError([{ error: "JEV_NO_KEY: none" }], {})).toMatch(/JEV_NO_KEY/);
  });

  test("test_filter_refuses_a_judge_outage", async () => {
    const { sb, db } = await seeded();
    const prev = process.env.JM_JUDGE_URL;
    process.env.JM_JUDGE_URL = `http://127.0.0.1:${PORT}/err500`;
    try {
      // FAIL-CLOSED (the default): a refusal, not an empty result
      await expect(filterIndex(db, { fts: "tombstone", question: "?", minP: 0.8, limit: 4 }))
        .rejects.toThrow(/JM_JUDGE_HTTP_500/);
      // failOpen is the explicit opt-in, and the lapse is VISIBLE (judged < candidates)
      const degraded = await filterIndex(db, { fts: "tombstone", question: "?", minP: 0.8, limit: 4, failOpen: true });
      expect(degraded.candidates).toBeGreaterThan(degraded.judged);
    } finally {
      if (prev === undefined) delete process.env.JM_JUDGE_URL; else process.env.JM_JUDGE_URL = prev;
      db.close(); sb.cleanup();
    }
  }, 30_000);

  test("test_find_refuses_a_judge_outage", async () => {
    const { sb, db } = await seeded();
    const prev = process.env.JM_JUDGE_URL;
    process.env.JM_JUDGE_URL = `http://127.0.0.1:${PORT}/err500`;
    try {
      await expect(find(db, { phrase: "tombstone", common: 2 })).rejects.toThrow(/JM_JUDGE_HTTP_500/);
    } finally {
      if (prev === undefined) delete process.env.JM_JUDGE_URL; else process.env.JM_JUDGE_URL = prev;
      db.close(); sb.cleanup();
    }
  }, 30_000);

  test("test_a_healthy_judge_still_works_for_both", async () => {
    const { sb, db } = await seeded();
    const prev = process.env.JM_JUDGE_URL;
    process.env.JM_JUDGE_URL = `http://127.0.0.1:${PORT}/ok`;
    try {
      const f = await filterIndex(db, { fts: "tombstone", question: "?", minP: 0.8, limit: 4 });
      expect(f.kept).toBe(4);                       // p=0.9 clears the bar for every row
      expect(f.calls).toBe(4);
      const r = await find(db, { phrase: "tombstone", common: 2 });
      expect(r.patterns.length).toBeGreaterThan(0); // a real search produces patterns
    } finally {
      if (prev === undefined) delete process.env.JM_JUDGE_URL; else process.env.JM_JUDGE_URL = prev;
      db.close(); sb.cleanup();
    }
  }, 30_000);
});
