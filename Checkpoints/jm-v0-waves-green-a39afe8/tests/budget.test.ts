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
