// tests/redact-perf.test.ts — D-037: the fingerprint's redaction was QUADRATIC, and it ate hex
// strings with the wrong marker.
//
// Found by crossing the "large input" boundary: a 4 MB decision row made `decision-tree` hang with
// NO output at all (exit 124 at 90 s, empty stdout AND stderr, the transport's 30 s abort never
// firing). The hang was BEFORE the network — in `redact()`, which runs four regexes over every
// string as part of the cache fingerprint.
import { test, expect, describe } from "bun:test";
import { redact, canonical, fingerprint } from "../src/judge/cache.ts";

/** A run of word characters with no `@` — the shape that made the greedy `[\w.+-]+@` backtrack. */
const run = (n: number) => "y".repeat(n);

describe("D-037 redaction", () => {
  test("test_redaction_is_LINEAR_in_input_size", () => {
    // The old email pattern `/[\w.+-]+@[\w-]+\.[\w.]+/` consumed the whole run, then backtracked a
    // character at a time hunting for `@`. Measured on this engine: 50k -> 505 ms, 100k -> 1,986 ms,
    // 200k -> 7,912 ms (4x per doubling = quadratic). 4 MB extrapolates to ~3,200 SECONDS.
    // The bound `{1,64}` (the RFC's limit for an email local part) makes it linear; this pin holds
    // the SHAPE of the scaling rather than an absolute millisecond, so it does not flake on a
    // loaded host.
    const t = (n: number) => { const s = Date.now(); redact({ body: run(n) }); return Date.now() - s + 1; };
    const t1 = t(200_000);
    const t4 = t(800_000);            // 4x the input
    // linear => ~4x the time ; quadratic => ~16x. Allow a loose ceiling: it must be < 10x.
    expect(t4).toBeLessThan(t1 * 10);
    // and the absolute bound: 4 MB must finish in well under a second, not 3,000 of them
    const big = Date.now();
    redact({ body: run(4_000_000) });
    expect(Date.now() - big).toBeLessThan(3_000);
  });

  test("test_hex_is_redacted_as_hex_with_no_survivor", () => {
    // ORDER: with the loose phone pattern ahead of the hex pattern, a 32-char hash became
    // `[phone]abcdef[phone]` — wrong marker AND six characters of the value SURVIVED. A partial
    // redaction of a secret is a leak, so the specific patterns now run first.
    const h = "0123456789abcdef0123456789abcdef";
    const out = String(redact(`hash ${h} here`));
    expect(out).toBe("hash [hex] here");
    expect(out).not.toContain("abcdef");
  });

  test("test_redaction_still_catches_every_class", () => {
    expect(String(redact("mail me at alice@example.com"))).toContain("[email]");
    expect(String(redact("call +1 555 123 4567"))).toContain("[phone]");
    expect(String(redact("token sk-abcdefgh12345678"))).toContain("[secret]");
    expect(String(redact("nothing to redact here"))).toBe("nothing to redact here");
  });

  test("test_the_fingerprint_stays_deterministic_after_the_bound", () => {
    // the bound must not change WHICH state maps to WHICH fingerprint: same state -> same fp
    const state = { row: { title: "x", body: "y".repeat(200_000) }, criteria: null };
    const a = fingerprint("m", "s@v1", state);
    const b = fingerprint("m", "s@v1", state);
    expect(a).toBe(b);
    expect(canonical(state).length).toBeGreaterThan(200_000);
  });
});
