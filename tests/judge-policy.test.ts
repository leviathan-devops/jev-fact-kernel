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
import { decisionTree as decisionTreeExport, validateRecipe as validateRecipeExport } from "../src/verbs/decision-tree.ts";

// A FIXED PORT IN A TEST IS A FLAKE: it fails whenever anything (a stray probe, another suite)
// holds it. `port: 0` lets the OS assign one and `server.port` reports it.
let server: ReturnType<typeof Bun.serve>;

beforeAll(() => {
  server = Bun.serve({
    port: 0,
    async fetch(req) {
      const u = new URL(req.url);
      if (u.pathname === "/err500") return new Response('{"detail":"boom"}', { status: 500 });
        // ECHO THE REQUESTED KEYS. The API returns one answer per question "under the same keys"
        // (docs.typesafe.ai/api). This stub returned a FIXED key set — fine while the engine asked one
        // question per request, but once `filter` BATCHES its keys are `"<path>__match"`, and a
        // fixed-key response answers none of them. The stub now mirrors the real contract, so a
        // batched request gets N answers and the suite still exercises the POLICY it is about.
        const body = await req.json().catch(() => ({})) as { questions?: Record<string, unknown> };
        const keys = Object.keys(body.questions ?? {});
        const answers: Record<string, unknown> = {};
        for (const k of keys) answers[k] = { type: "noul", noul: 0.9 };
        if (keys.length === 0) {
          answers.match = { type: "noul", noul: 0.9 };
          answers.is_instance = { type: "noul", noul: 0.9 };
          answers.flag = { type: "noul", noul: 0.9 };
        }
        return Response.json({ model: "flaky", answers, usage: { input_tokens: 10, output_tokens: 2 } });
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
    process.env.JM_JUDGE_URL = `http://127.0.0.1:${server.port}/err500`;
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
    process.env.JM_JUDGE_URL = `http://127.0.0.1:${server.port}/err500`;
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
    process.env.JM_JUDGE_URL = `http://127.0.0.1:${server.port}/ok`;
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

  test("test_D043_a_degraded_row_stores_an_UNKNOWN_confidence_not_zero", async () => {
    // The stored `conf` was recovered by regex-parsing the row's OWN reason string
    // (`d.reason.match(/agg=([0-9.]+)/)`), so every row whose reason carried no `agg=` — the
    // degraded and errored rows — silently stored 0. A 0 there reads as "the judge said no" when
    // the truth is "the judge never answered". The signal now rides on the row.
    const { sb, db } = await seeded();
    const sqlite = db;
    const prev = process.env.JM_JUDGE_URL;
    process.env.JM_JUDGE_URL = `http://127.0.0.1:${server.port}/err500`;
    const rows = join(sb.root, "d43.jsonl");
    await Bun.write(rows, JSON.stringify({ i: 1, title: "x", body: `d43-${Date.now()}` }) + "\n");
    try {
      const open = validateRecipeExport({ recipe: "d43", version: 1, questions: { flag: { type: "noul", instructions: "?" } }, policy: { act: 0.8, flag: 0.5, fail: "open" } });
      await decisionTreeExport({ db, rowsPath: rows, recipe: open, concurrency: 1 });
      const r = sqlite.query("SELECT conf FROM decisions").all() as { conf: number | null }[];
      expect(r.length).toBe(1);
      expect(r[0].conf).toBeNull();                  // UNKNOWN, never a fabricated 0
    } finally {
      if (prev === undefined) delete process.env.JM_JUDGE_URL; else process.env.JM_JUDGE_URL = prev;
      db.close(); sb.cleanup();
    }
  }, 30_000);
});
