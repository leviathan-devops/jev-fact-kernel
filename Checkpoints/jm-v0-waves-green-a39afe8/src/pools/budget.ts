// src/pools/budget.ts — hard caps (bible L3 / T4). A cap is a stop, never a warning.
export const JM_BUDGET_EXCEEDED = "JM_BUDGET_EXCEEDED";

export class Budget {
  private calls = 0;
  private usd = 0;
  private pending = 0;   // in-flight claims: counted by roomLeft(), settled by settle()

  constructor(private caps: { calls?: number; usd?: number } = {}) {
    // THE KEYS ARE VALIDATED, NOT JUST THE VALUES (audit budget.ts:10). The loop below checked
    // `Number.isFinite(v)` and threw on a bad VALUE — while an unknown KEY was accepted in silence.
    // MEASURED: `new Budget({ call: 5 })` (the natural typo for `calls`) produced `roomLeft: true`
    // with `caps: {call: 5}` — **the cap did nothing, and nothing said so**. A budget is the guard
    // that stops a runaway loop from spending; a guard that a typo can switch off is not a guard.
    // Same class as H-5 (`policy.fail` typo -> fail-OPEN) and the body-cap override.
    const KNOWN = ["calls", "usd"];
    for (const [k, v] of Object.entries(caps)) {
      if (!KNOWN.includes(k)) {
        throw new Error(`JM_BUDGET_INVALID: unknown cap "${k}" (known: ${KNOWN.join(", ")}) — a misspelled cap would silently not apply`);
      }
      if (v === undefined) continue;
      if (!Number.isFinite(v) || v < 0) throw new Error(`JM_BUDGET_INVALID: ${k}=${v} (must be a finite number >= 0)`);
    }
  }

  spend(usd: number): void {
    if (!Number.isFinite(usd) || usd < 0) throw new Error(`JM_BUDGET_INVALID: spend(${usd}) (must be a finite number >= 0)`);
    this.calls += 1; this.usd += usd; this.assert();
  }

  /** A cap of N allows exactly N calls; the (N+1)th refuses and NAMES the cap.
   *  (Off-by-one fixed 2026-09-21: the check was >=, which refused the Nth call itself.) */
  assert(): void {
    if (this.caps.calls !== undefined && this.calls > this.caps.calls) {
      throw new Error(`${JM_BUDGET_EXCEEDED}: calls=${this.calls} cap=${this.caps.calls}`);
    }
    if (this.caps.usd !== undefined && this.usd > this.caps.usd) {
      throw new Error(`${JM_BUDGET_EXCEEDED}: usd=${this.usd.toFixed(6)} cap=${this.caps.usd}`);
    }
  }

  /** True while another call fits inside the caps (callers check this BEFORE spending). Counts
   *  in-flight claims, so a pool cannot all pass this check before any of them spends. */
  roomLeft(): boolean {
    if (this.caps.calls !== undefined && this.calls + this.pending >= this.caps.calls) return false;
    if (this.caps.usd !== undefined && this.usd >= this.caps.usd) return false;
    return true;
  }

  /** SYNCHRONOUS claim, taken BEFORE an awaited call. This is the fix for the pool overshoot
   *  (D-024): `roomLeft()` alone is check-then-await, so every concurrent lane could pass the
   *  check before any lane spent - a cap of 1 produced 3 calls. Claim first, settle after.
   *  Returns false when nothing can be claimed. */
  claim(): boolean {
    if (!this.roomLeft()) return false;
    this.pending += 1;
    return true;
  }

  /** Settle a claim after the call resolves: a CACHED call refunds the slot (it consumed no
   *  budget), a real call converts the claim into a spend. */
  settle(costUsd: number, cached: boolean): void {
    if (this.pending > 0) this.pending -= 1;
    if (!cached) this.spend(costUsd);
  }

  used(): { calls: number; usd: number; caps: { calls?: number; usd?: number } } {
    return { calls: this.calls, usd: this.usd, caps: { ...this.caps } };   // a copy: callers must not mutate the guard
  }
}
