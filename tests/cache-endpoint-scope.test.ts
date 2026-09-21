// tests/cache-endpoint-scope.test.ts — D-044: the cache is scoped to the ENDPOINT.
//
// The fingerprint held provider/model/schema/state, and `provider` is hard-coded "typesafe" — so
// once the endpoint became configurable (JM_JUDGE_URL), a MIRROR serving the same model NAME would
// receive the PRIMARY's cached answers. Measured before the fix: two local endpoints answering
// 0.90 and 0.10 for the same state — the second call returned 0.90 and reported `cached`.
//
// The invariant the cache must hold: same (endpoint, model, schema, state) -> same answer. Not
// "same model name".
import { test, expect, describe } from "bun:test";
import { makeSandbox } from "./helpers.ts";
import { openDb, indexPathFor } from "../src/store/db.ts";
import { Judge } from "../src/judge/client.ts";

describe("D-044 cache endpoint scoping", () => {
  test("test_two_endpoints_do_not_share_a_cache_entry", async () => {
    const a = Bun.serve({ port: 0, fetch() { return Response.json({ model: "m", answers: { flag: { type: "noul", noul: 0.9 } }, usage: { input_tokens: 5, output_tokens: 1 } }); } });
    const b = Bun.serve({ port: 0, fetch() { return Response.json({ model: "m", answers: { flag: { type: "noul", noul: 0.1 } }, usage: { input_tokens: 5, output_tokens: 1 } }); } });
    const sb = makeSandbox();
    const prev = process.env.JM_JUDGE_URL;
    try {
      const db = openDb(indexPathFor("scope"));
      const j = new Judge(db, {});
      const state = { q: "the same state for both endpoints" };
      const questions = { flag: { type: "noul", instructions: "?" } };

      process.env.JM_JUDGE_URL = `http://127.0.0.1:${a.port}/`;
      const r1 = await j.ask(state, questions, "scope@v1");
      expect((r1.answers as { flag: { noul: number } }).flag.noul).toBe(0.9);

      process.env.JM_JUDGE_URL = `http://127.0.0.1:${b.port}/`;
      const r2 = await j.ask(state, questions, "scope@v1");
      expect(r2.cached).toBe(false);                                            // NOT A's entry
      expect((r2.answers as { flag: { noul: number } }).flag.noul).toBe(0.1);   // B's OWN answer

      process.env.JM_JUDGE_URL = `http://127.0.0.1:${a.port}/`;
      const r3 = await j.ask(state, questions, "scope@v1");
      expect(r3.cached).toBe(true);                                             // A's entry survived
      expect((r3.answers as { flag: { noul: number } }).flag.noul).toBe(0.9);
      db.close();
    } finally {
      if (prev === undefined) delete process.env.JM_JUDGE_URL; else process.env.JM_JUDGE_URL = prev;
      a.stop(true); b.stop(true); sb.cleanup();
    }
  }, 30_000);
});
