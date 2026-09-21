// tests/find.test.ts — C5 (the pin's proof contract): every pattern carries `n` + EXEMPLAR IDS.
// The pin names `test_find_patterns` as a selectable test; it did not exist until this file.
// Transport is canned (JM_MOCK_DIR) so the chain is exercised without cost; the cache, the
// budget, the narrowing and the pattern synthesis are REAL.
import { test, expect, describe } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { makeSandbox, fill } from "./helpers.ts";
import { openDb, indexPathFor, saveTargets } from "../src/store/db.ts";
import { ingestAll } from "../src/targets.ts";
import { find } from "../src/verbs/find.ts";

/** A canned judge that answers `noul = p` for every call (the find chain uses one question). */
function mockNoul(ps: number[]): string {
  // find asks ONE question: `is_instance` (a different key from decision-tree's `flag`). Answering
  // the wrong key leaves every p at 0 and the chain looks broken when it is the mock that is.
  const dir = mkdtempSync(join(tmpdir(), "jm-mockf-"));
  ps.forEach((noul, i) => writeFileSync(join(dir, `call-${i}.json`), JSON.stringify({
    model: "jev-1.13.0", answers: { is_instance: { type: "noul", noul } }, usage: { input_tokens: 100, output_tokens: 5 },
  })));
  return dir;
}

async function seeded(files: Record<string, string>) {
  const sb = makeSandbox();
  fill(sb.root, files);
  process.env.JM_HOME = sb.home;
  saveTargets([{ name: "c", kind: "fs", root: sb.root }]);
  const db = openDb(indexPathFor("all"));
  await ingestAll(db, "all");
  return { sb, db };
}

describe("W4 find", () => {
  test("test_find_patterns", async () => {
    // C5: patterns.md carries n + exemplar ids. Three files about a split-brain session bug and
    // one unrelated file: the chain must narrow, judge, and emit patterns with support counts.
    // The cluster signature is (kind + the first two path tokens), so the three related files must
    // SHARE a directory prefix to form one pattern with n>=2. Three files in three directories are
    // three singleton clusters, and with the (now applied) common=2 filter that is correctly ZERO
    // patterns — which is what the first version of this fixture measured.
    const { sb, db } = await seeded({
      "sess/split-a.md": "the session id collided after the worktree split, so the resume list showed two copies of the same chat log",
      "sess/split-b.md": "after a worktree split the session id is duplicated across two cwd buckets and the resume list is ambiguous",
      "sess/split-c.md": "worktree split leaves a duplicated session id; the chat log appears twice in the resume list",
      "other/unrelated.md": "the weather in Lisbon is nice in May and the coffee is excellent",
    });
    // one canned answer per judged candidate; all clearly above the act bar
    const mock = mockNoul(Array.from({ length: 40 }, () => 0.93));
    process.env.JM_MOCK_DIR = mock;
    try {
      const res = await find(db, { phrase: "split-brain session bug", common: 2 });
      // the chain ran and narrowed: seeds -> candidates -> judged -> patterns
      expect(res.trend).toMatch(/^\d+ → \d+ → \d+ → \d+$/);
      const [seeds, candidates, judged, patterns] = res.trend.split(" → ").map(Number);
      expect(seeds).toBeGreaterThan(0);
      expect(candidates).toBeGreaterThan(0);
      expect(judged).toBeGreaterThan(0);
      expect(judged).toBeLessThanOrEqual(candidates);
      expect(patterns).toBeGreaterThanOrEqual(1);
      expect(patterns).toBeLessThanOrEqual(judged);
      expect(res.belowCommon).toBeGreaterThanOrEqual(0);            // the drop count is observable

      // EVERY pattern carries n and exemplar IDS (the C5 contract, literally)
      for (const p of res.patterns) {
        expect(typeof p.n).toBe("number");
        expect(p.n).toBeGreaterThanOrEqual(1);
        expect(Array.isArray(p.exemplars)).toBe(true);
        expect(p.exemplars.length).toBeGreaterThanOrEqual(1);
        expect(p.exemplars.length).toBeLessThanOrEqual(p.n);        // exemplars are a sample OF the support
        for (const e of p.exemplars) {
          expect(typeof e.path).toBe("string");
          expect(e.path.length).toBeGreaterThan(0);                 // an ID, not an empty string
          expect(typeof e.p).toBe("number");
          expect(e.p).toBeGreaterThanOrEqual(0.8);                  // only kept candidates become exemplars
        }
        expect(typeof p.signature).toBe("string");
        expect(Array.isArray(p.tokens)).toBe(true);
      }
      db.close();
    } finally { delete process.env.JM_MOCK_DIR; rmSync(mock, { recursive: true, force: true }); sb.cleanup(); }
  });

  test("test_find_phrase_with_no_matches_still_reports", async () => {
    // The negative half: a phrase nothing matches must produce an EMPTY pattern set and a valid
    // trend, not a throw and not a fabricated pattern.
    const { sb, db } = await seeded({ "a/only.md": "a quiet file with nothing of interest" });
    const mock = mockNoul([0.99]);
    process.env.JM_MOCK_DIR = mock;
    try {
      const res = await find(db, { phrase: "zzyzx nothing at all matches this", common: 2 });
      expect(res.patterns.length).toBe(0);                          // a singleton cluster is below common=2
      expect(res.belowCommon).toBeGreaterThanOrEqual(0);
      db.close();
    } finally { delete process.env.JM_MOCK_DIR; rmSync(mock, { recursive: true, force: true }); sb.cleanup(); }
  });

  test("test_find_budget_caps_the_chain", async () => {
    // A capped chain stops claiming and SAYS so — it never reports a complete pass it did not do.
    const { sb, db } = await seeded({
      "a/x1.md": "session id duplicated after the split in the resume list",
      "b/x2.md": "session id duplicated after the split in the resume list again",
      "c/x3.md": "another session id duplicated after the split in the resume list",
    });
    const mock = mockNoul(Array.from({ length: 20 }, () => 0.95));
    process.env.JM_MOCK_DIR = mock;
    try {
      const res = await find(db, { phrase: "session id duplicated", common: 1, budgetCalls: 1 });
      expect(res.calls).toBeLessThanOrEqual(1);
      expect(res.budgetStopped).toBe(true);
      db.close();
    } finally { delete process.env.JM_MOCK_DIR; rmSync(mock, { recursive: true, force: true }); sb.cleanup(); }
  });

  test("test_D033_no_single_seed_monopolises_the_candidates", async () => {
    // The candidate set was built SEED BY SEED and then truncated, so a first seed with >= limit
    // hits starved every other seed. Measured on the real corpus: "theatrical enforcement claim"
    // (seeds theatrical=345, enforcement=361, claim=486 hits) produced 100 candidates, ALL from
    // `theatrical` — the chain judged one token's hits and reported patterns for the whole phrase.
    // The fix is a round-robin fetch; this pin asserts every seed is REPRESENTED.
    const sb = makeSandbox();
    try {
      // three seeds, each with many distinct hits, so a seed-by-seed slice would starve two
      const files: Record<string, string> = {};
      for (let i = 0; i < 40; i++) files[`c/alpha-${i}.md`] = `alpha marker ${i}`;
      for (let i = 0; i < 40; i++) files[`c/beta-${i}.md`] = `beta marker ${i}`;
      for (let i = 0; i < 40; i++) files[`c/gamma-${i}.md`] = `gamma marker ${i}`;
      fill(sb.root, files);
      process.env.JM_HOME = sb.home;
      saveTargets([{ name: "c", kind: "fs", root: join(sb.root, "c") }]);
      const db = openDb(indexPathFor("all"));
      await ingestAll(db, "all");

      const mock = mockNoul(Array.from({ length: 40 }, () => 0.95));
      process.env.JM_MOCK_DIR = mock;
      try {
        const res = await find(db, { phrase: "alpha beta gamma", common: 2, limit: 30 });
        const [reachable, candidates] = res.trend.split(" → ").map(Number);
        expect(candidates).toBe(30);                       // the limit is honored
        expect(reachable).toBe(90);                        // 3 seeds x the per-seed fetch cap (30)
        // THE PROOF OF BALANCE: the three seeds live in three path-token clusters, so a
        // round-robin across seeds yields ONE PATTERN PER SEED, each with n=10. A seed-by-seed
        // fetch would have produced ONE cluster of 30 (all from `alpha`) and starved the rest.
        expect(res.patterns.length).toBe(3);
        const ns = res.patterns.map((x) => x.n).sort((a, b) => a - b);
        expect(ns).toEqual([10, 10, 10]);
        // and each pattern's exemplars come from its OWN seed
        for (const pat of res.patterns) {
          const names = new Set(pat.exemplars.map((e) => e.path.match(/c\/([a-z]+)-/)?.[1]));
          expect(names.size).toBe(1);                      // one seed per cluster, never mixed
        }
      } finally { delete process.env.JM_MOCK_DIR; rmSync(mock, { recursive: true, force: true }); }
      db.close();
    } finally { sb.cleanup(); }
  });
});
