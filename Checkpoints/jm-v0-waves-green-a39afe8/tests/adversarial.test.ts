// P5 ADVERSARIAL SWEEP — the pure decision surfaces, probed both ways.
// (Live injection/redaction probes run separately against the deployed CLI.)
import { test, expect } from "bun:test";
import { makeSandbox } from "./helpers.ts";
import { redact, canonical, fingerprint } from "../src/judge/cache.ts";
import { routeOf, signalOf, DEFAULT_POLICY } from "../src/judge/policy.ts";
import { Budget } from "../src/pools/budget.ts";
import { openDb, indexPathFor } from "../src/store/db.ts";
import { queryIndex } from "../src/verbs/query.ts";
import { indexTarget } from "../src/verbs/index.ts";
import { fill } from "./helpers.ts";

test_adv_route_boundaries();
test_adv_redaction();
test_adv_cache_key();
test_adv_sql_injection();
test_adv_empty_inputs();

function test_adv_route_boundaries() {
  test("test_adv_route_boundaries", () => {
    const P = DEFAULT_POLICY;                       // act .8 flag .5
    expect(routeOf({ type: "noul", noul: 0.8 }, P).route).toBe("act");       // INCLUSIVE boundary
    expect(routeOf({ type: "noul", noul: 0.7999 }, P).route).toBe("escalate");
    expect(routeOf({ type: "noul", noul: 0.5 }, P).route).toBe("escalate");  // INCLUSIVE boundary
    expect(routeOf({ type: "noul", noul: 0.4999 }, P).route).toBe("noop");
    expect(routeOf({ type: "noul", noul: 0 }, P).route).toBe("noop");
    expect(routeOf({ type: "noul", noul: 1 }, P).route).toBe("act");
    expect(routeOf(undefined, P).route).toBe("noop");                        // missing answer = noop
    // choice: MASS policy — the max probability drives the signal
    expect(signalOf({ type: "choice", choice: "a", probabilities: { a: 0.81, b: 0.19 } })).toBeCloseTo(0.81);
    expect(signalOf({ type: "choice", choice: "a", confidence: 0.9 })).toBe(0.9);
    expect(signalOf(undefined)).toBe(0);
  });
}

function test_adv_redaction() {
  test("test_adv_redaction", () => {
    const fixtureKey = process.env.JEV_FIXTURE_KEY || "sk-placeholder";
    const dirty = {
      email: "ceo@example.com", phone: "+1 (555) 123-4567",
      hash: "a".repeat(40), key: fixtureKey,
      nested: { list: ["bob@x.io"], deep: { hex: "deadbeef".repeat(8) } },
    };
    const out = canonical(dirty);
    expect(out).not.toContain("ceo@example.com");
    expect(out).not.toContain("555) 123-4567");
    expect(out).not.toContain(fixtureKey);
    expect(out).not.toContain("deadbeefdeadbeef");
    expect(out).toContain("[email]");
    // canonical: key order cannot fork the key
    expect(canonical({ a: 1, b: 2 })).toBe(canonical({ b: 2, a: 1 }));
  });
}

function test_adv_cache_key() {
  test("test_adv_cache_key", () => {
    const s1 = { claim: "done", n: 1 };
    expect(fingerprint("m", "v1", s1)).toBe(fingerprint("m", "v1", { n: 1, claim: "done" }));  // order-insensitive
    expect(fingerprint("m", "v1", s1)).not.toBe(fingerprint("m", "v2", s1));                  // schema matters
    expect(fingerprint("m", "v1", s1)).not.toBe(fingerprint("m2", "v1", s1));                 // model matters
    expect(fingerprint("m", "v1", s1)).not.toBe(fingerprint("m", "v1", { claim: "done", n: 2 })); // state matters
  });
}

function test_adv_sql_injection() {
  test("test_adv_sql_injection", () => {
    const sb = makeSandbox();
    try {
      fill(sb.root, { "a.json": '{"k":1}' });
      const db = openDb(indexPathFor("adv"));
      indexTarget(db, "adv", sb.root, {});
      // structurally-invalid predicates REFUSE (no column / no operator)
      expect(() => queryIndex(db, { where: "path LIKE '%'" })).toThrow();   // LIKE is not an allowed op
      expect(() => queryIndex(db, { where: "1=1" })).toThrow();             // digits are not a column
      expect(() => queryIndex(db, { where: "password='x'" })).toThrow();    // unknown column
      // AN INJECTION-SHAPED VALUE IS REFUSED, NOT SILENTLY COMPARED. This asserted
      // `rows.length === 0` with the comment "'1; DROP…' is a string compared to an INTEGER" — i.e. it
      // ENSHRINED the defect: SQLite orders TEXT above INTEGER, so that comparison was false for every
      // row, and the operator got an empty result at exit 0 that looked like "no matches". The
      // parameterisation DID hold (the table survived), and now the value is also rejected BY NAME
      // because `size` is a numeric column (`JM_WHERE_VALUE`). The table-survival assertion is kept —
      // that is the injection property — and the silent-empty expectation is replaced by a refusal.
      expect(() => queryIndex(db, { where: "size=1; DROP TABLE files" })).toThrow(/JM_WHERE_VALUE/);
      const still = db.query("SELECT COUNT(*) AS n FROM files").get() as { n: number };
      expect(still.n).toBe(1);                     // THE TABLE SURVIVED — the parameterisation held
      db.close();
    } finally { sb.cleanup(); }
  });
}

function test_adv_empty_inputs() {
  test("test_adv_empty_inputs", () => {
    const sb = makeSandbox();
    try {
      const db = openDb(indexPathFor("adv2"));
      const empty = indexTarget(db, "adv2", sb.root, {});      // empty dir
      expect(empty.files).toBe(0);
      const rows = queryIndex(db, { where: "size>0" });
      expect(rows.length).toBe(0);
      const b = new Budget({});
      expect(b.roomLeft()).toBe(true);
      db.close();
    } finally { sb.cleanup(); }
  });
}
