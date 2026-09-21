// test_budget_cap — a cap is a hard stop with the cap NAMED (never a warning, never silent).
import { test, expect } from "bun:test";
import { Budget, JM_BUDGET_EXCEEDED } from "../src/pools/budget.ts";

test_budget_cap();

function test_budget_cap() {
  test("test_budget_cap", () => {
    const b = new Budget({ calls: 5 });
    for (let i = 0; i < 5; i++) b.spend(0.0001);   // exactly the cap is allowed
    expect(b.used().calls).toBe(5);
    expect(() => b.spend(0.0001)).toThrow(new RegExp(JM_BUDGET_EXCEEDED));
    try { b.spend(0); } catch (e) {
      expect(String(e)).toContain("cap=5");       // the cap is NAMED in the refusal
    }
    const u = new Budget({ usd: 0.001 });
    u.spend(0.0005);
    expect(() => u.spend(0.0006)).toThrow(/JM_BUDGET_EXCEEDED.*cap=0\.001/);
  });

  test("test_budget_unbounded_passes", () => {
    const b = new Budget({});
    for (let i = 0; i < 1000; i++) b.spend(0);
    expect(b.used().calls).toBe(1000);
  });
}

// ── AUDIT REFUTATION PIN (A9-3): the two comparison operators are NOT the same job ──
// The audit claimed `roomLeft()`'s `>=` should be `>` "to match assert() logic". A boundary probe
// shows the opposite: with cap=3, roomLeft() is true before calls 1-3 and FALSE at calls=3 (which
// is correct — it PREDICTS the refusal that assert() then performs). With `>`, a caller that
// trusts roomLeft() would spend a 4th call and take JM_BUDGET_EXCEEDED. The pin holds BOTH halves.
test("test_budget_roomLeft_predicts_the_refusal", () => {
  const b = new Budget({ calls: 3 });
  for (let i = 1; i <= 3; i++) {
    expect(b.roomLeft()).toBe(true);            // room for exactly the calls that fit
    b.spend(0);
    expect(b.used().calls).toBe(i);   // `used()` is the public reader, not the private field
  }
  expect(b.roomLeft()).toBe(false);             // AT the cap: no more room (>= is correct here)
  expect(() => b.spend(0)).toThrow(/JM_BUDGET_EXCEEDED/);   // and assert() refuses the 4th
  const usd = new Budget({ usd: 0.5 });
  usd.spend(0.5);
  expect(usd.roomLeft()).toBe(false);           // the usd arm uses the same >= rule
  expect(() => usd.spend(0)).not.toThrow();     // spending 0 adds nothing, so it cannot exceed
  expect(() => usd.spend(0.01)).toThrow(/JM_BUDGET_EXCEEDED/);   // the first cent past the cap refuses
});

// ── AUDIT REFUTATION PIN (A10-2): the post-refusal state is the SAFETY PROPERTY ──
// The audit called the post-increment "inconsistent state (counters incremented before the
// check)". A probe shows the opposite: no caller catches JM_BUDGET_EXCEEDED (grep confirms), and
// after a refusal the budget stays CLOSED — roomLeft() is false, so nothing can spend again.
// Rolling the counters BACK would re-open the guard and permit unlimited retries.
test("test_budget_stays_closed_after_a_refusal", () => {
  const b = new Budget({ calls: 2 });
  b.spend(0); b.spend(0);
  expect(b.roomLeft()).toBe(false);
  expect(() => b.spend(0)).toThrow(/JM_BUDGET_EXCEEDED/);
  expect(b.roomLeft()).toBe(false);                 // STILL closed: the refusal is sticky
  expect(b.used().calls).toBe(3);                   // the over-cap spend is counted, not hidden
  expect(() => b.spend(0)).toThrow(/JM_BUDGET_EXCEEDED/);   // and a retry cannot slip through
});
