// src/judge/client.ts — the shared judge: cache-first, one seam, cost computed at write time.
import type { Database } from "bun:sqlite";
import { resolveKey } from "./key.ts";
import { callSystemOne, TYPESAFE_MODEL, type JudgeResponse } from "./transport.ts";
import { fingerprint, cacheGet, cachePut } from "./cache.ts";

export const JEV_NO_KEY = "JEV_NO_KEY";
export const USD_PER_INPUT_TOKEN = 0.042 / 1_000_000;   // published rate; no output charge

export class JevNoKeyError extends Error { constructor() { super(`${JEV_NO_KEY}: no TYPESAFE_API_KEY and no ~/.config/typesafe/key`); this.name = JEV_NO_KEY; } }

export interface AskResult { answers: JudgeResponse["answers"]; model: string; cached: boolean; inputTokens: number; costUsd: number; fingerprint: string; }

export class Judge {
  private key: string | null;
  readonly keySource: string;
  readonly keyFingerprint: string | null;
  constructor(private db: Database, private opts: { model?: string; mock?: boolean } = {}) {
    const k = resolveKey();
    this.key = k?.key ?? null;
    this.keySource = k?.source ?? "absent";
    this.keyFingerprint = k?.fingerprint ?? null;
  }

  model(): string { return this.opts.model ?? TYPESAFE_MODEL; }

  /** FAIL-CLOSED (L4): a decision verb without a key refuses; it never silently degrades. */
  private requireKey(): string {
    if (this.opts.mock || process.env.JM_MOCK_DIR) return this.key ?? "mock";
    if (!this.key) throw new JevNoKeyError();
    return this.key;
  }

  async ask(state: unknown, questions: Record<string, unknown>, schemaVersion = "v1"): Promise<AskResult> {
    const model = this.model();
    const fp = fingerprint(model, schemaVersion, state);
    const hit = cacheGet(this.db, fp);
    if (hit) return { answers: hit.answers as JudgeResponse["answers"], model: hit.model, cached: true, inputTokens: 0, costUsd: 0, fingerprint: fp };

    const key = this.requireKey();
    const resp = await callSystemOne(key, { state, model, questions });
    cachePut(this.db, fp, "typesafe", resp.model, schemaVersion, fp, resp.answers);
    const costUsd = (resp.usage?.input_tokens ?? 0) * USD_PER_INPUT_TOKEN;
    return { answers: resp.answers, model: resp.model, cached: false, inputTokens: resp.usage?.input_tokens ?? 0, costUsd, fingerprint: fp };
  }
}
