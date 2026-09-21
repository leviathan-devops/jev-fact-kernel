// src/pools/budget.ts — hard caps (bible L3 / T4). A cap is a stop, never a warning.
export const JM_BUDGET_EXCEEDED = "JM_BUDGET_EXCEEDED";

export class Budget {
  private calls = 0;
  private usd = 0;
  constructor(private caps: { calls?: number; usd?: number } = {}) {
    for (const [k, v] of Object.entries(caps)) {
      if (v === undefined) continue;
      if (!Number.isFinite(v) || v < 0) throw new Error(`JM_BUDGET_INVALID: ${k}=${v} (must be a finite number >= 0)`);
    }
  }

  spend(usd: number): void { this.calls += 1; this.usd += usd; this.assert(); }

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

  /** True while another call fits inside the caps (callers check this BEFORE spending). */
  roomLeft(): boolean {
    if (this.caps.calls !== undefined && this.calls >= this.caps.calls) return false;
    if (this.caps.usd !== undefined && this.usd >= this.caps.usd) return false;
    return true;
  }

  used(): { calls: number; usd: number; caps: { calls?: number; usd?: number } } {
    return { calls: this.calls, usd: this.usd, caps: this.caps };
  }
}
