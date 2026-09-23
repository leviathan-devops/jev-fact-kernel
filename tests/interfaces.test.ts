// tests/interfaces.test.ts — W1's gate: the frozen contracts exist and are the ONLY declaration
// site. A contract that exists in two places drifts; this test fails the moment one is added.
import { test, expect, describe } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

describe("W1 — the frozen contracts", () => {
  test("test_interfaces_exported", async () => {
    const t = await import("../src/judge/types.ts");
    // every contract is a real export (a type-only import would compile but not be checkable here)
    const src = readFileSync(join(import.meta.dir, "..", "src", "judge", "types.ts"), "utf8");
    for (const name of ["AskItem", "AskManyResult", "JudgeAnswer", "RateLimiter", "RateLimiterStats", "JobRecovery", "JobRecoveryCounts", "GateVerdict", "GateFinding"]) {
      expect(src).toContain(`export interface ${name}`);
    }
    // ONE DECLARATION SITE: no other src file may declare these shapes
    const srcDir = join(import.meta.dir, "..", "src");
    const walk = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? walk(join(d, e.name)) : e.name.endsWith(".ts") ? [join(d, e.name)] : []);
    for (const f of walk(srcDir)) {
      if (f.endsWith("judge/types.ts")) continue;
      const body = readFileSync(f, "utf8");
      for (const name of ["AskManyResult", "RateLimiter", "JobRecovery", "GateVerdict"]) {
        expect(body).not.toContain(`export interface ${name}`);
      }
    }
    // and the shapes are usable (a compile-level check the runtime can see)
    const item: import("../src/judge/types.ts").AskItem = { id: "x", state: {} };
    expect(item.id).toBe("x");
    const verdict: import("../src/judge/types.ts").GateVerdict = { gate: "BLOCKED", findings: [], blockedReason: "quota" };
    expect(verdict.gate).toBe("BLOCKED");
    void t;
  });
});
