// tests/find-excerpt.test.ts — D-031: the excerpt a judge sees, and the quote a human reads,
// must BOTH contain the match. Found on the REAL corpus, where every phrase returned
// `209 -> 100 -> 0 -> 0`: the seeded documents held their phrase at char 1267, 1267 and 9224,
// all OUTSIDE the 1200-char head slice the judge was shown. The judge was asked "is this an
// instance of X?" while being shown text that did not contain X — so it answered no, correctly,
// and the chain silently dropped every true positive.
import { test, expect, describe } from "bun:test";
import { excerptAround, quoteAround, seedsOf } from "../src/verbs/excerpt.ts";
import { join } from "node:path";
import { makeSandbox, fill } from "./helpers.ts";
import { openDb, indexPathFor, saveTargets } from "../src/store/db.ts";
import { ingestAll } from "../src/targets.ts";
import { queryIndex } from "../src/verbs/query.ts";

/** A document that looks like the real corpus: JSON preamble, then the content far in. */
function structuredDoc(prefixLen: number, needle: string, tailLen = 400): string {
  return JSON.stringify({ file: "x", patch: "Index: x\n".repeat(Math.ceil(prefixLen / 10)) }) + `\n${needle} and then more text\n` + "z".repeat(tailLen);
}

describe("D-031 the find excerpt", () => {
  test("test_the_excerpt_contains_the_match_far_into_the_document", () => {
    const needle = "tombstone-record-marker";
    const text = structuredDoc(4000, needle);          // the match sits past char 4000
    expect(text.length).toBeGreaterThan(1200);
    const ex = excerptAround(text, ["tombstone"], 1200);
    expect(ex.length).toBeLessThanOrEqual(1200);
    expect(ex.toLowerCase()).toContain("tombstone");    // the whole point
  });

  test("test_the_quote_STARTS_at_the_match", () => {
    const needle = "tombstone-record-marker";
    const text = structuredDoc(4000, needle);
    const q = quoteAround(text, ["tombstone"], 160);
    expect(q.startsWith("tombstone")).toBe(true);       // a reader must see WHY the row matched
  });

  test("test_a_short_document_is_returned_whole_by_the_excerpt", () => {
    // Two different contracts: the EXCERPT returns a short document whole (nothing to window),
    // while the QUOTE always starts at the match — even in a short document, because the quote's
    // job is to show WHY the row matched, not to reproduce the text.
    const text = "short tombstone doc";
    expect(excerptAround(text, ["tombstone"], 1200)).toBe(text);
    expect(quoteAround(text, ["tombstone"], 160)).toBe("tombstone doc");
    // and a short document with no match at all: the quote is the head
    expect(quoteAround("nothing to see", ["absent"], 160)).toBe("nothing to see");
  });

  test("test_no_match_falls_back_to_the_head", () => {
    // a --where-only candidate has no seed in its text; the excerpt and quote are the head, and
    // neither throws nor returns an empty string
    const text = "x".repeat(3000);
    const ex = excerptAround(text, ["not-present"], 1200);
    expect(ex.length).toBe(1200);
    expect(ex).toBe(text.slice(0, 1200));
    const q = quoteAround(text, ["not-present"], 160);
    expect(q.length).toBe(160);
  });

  test("test_the_earliest_seed_wins", () => {
    const text = "alpha " + "b".repeat(2000) + " zulu";
    const ex = excerptAround(text, ["zulu", "alpha"], 1200);
    // "alpha" is earlier than "zulu", so the window is centred there — clamped to the start
    expect(ex.startsWith("alpha")).toBe(true);
  });

  test("test_D032_filter_judges_on_text_containing_the_match", async () => {
    // The SAME class as D-031, in the filter verb: its candidates come from an FTS match, and it
    // sent the judge a 1500-char HEAD slice. Measured on the real corpus: 4 of 6 candidates had
    // their hit OUTSIDE that slice, one of them at char 58,842.
    const sb = makeSandbox();
    try {
      // a document whose match sits far past any head slice, in the structured-corpus shape
      const body = JSON.stringify({ file: "x", patch: "Index: x\n".repeat(400) }) + "\ntombstone-record-marker and then more text\n" + "z".repeat(500);
      fill(sb.root, { "c/deep.json": body, "c/shallow.json": "tombstone up front" });
      process.env.JM_HOME = sb.home;
      saveTargets([{ name: "c", kind: "fs", root: join(sb.root, "c") }]);
      const db = openDb(indexPathFor("f"));
      await ingestAll(db, "all");
      const sc = queryIndex(db, { fts: "tombstone", limit: 10 });
      expect(sc.length).toBe(2);                       // both match by FTS
      // what filter would send the judge, for each candidate
      const seeds = seedsOf("tombstone");
      for (const r of sc) {
        const doc = db.query("SELECT text FROM docs WHERE path = ?").get(r.path) as { text: string } | null;
        const ex = excerptAround(doc?.text ?? "", seeds, 1500);
        expect({ path: r.path, hasMatch: ex.toLowerCase().includes("tombstone") }).toEqual({ path: r.path, hasMatch: true });
      }
      db.close();
    } finally { sb.cleanup(); }
  });
});
