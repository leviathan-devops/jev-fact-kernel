// src/judge/client.ts — the shared judge: cache-first, one seam, cost computed at write time.
import type { Database } from "bun:sqlite";
import { resolveKey } from "./key.ts";
import { callSystemOne, judgeUrl, TYPESAFE_MODEL, type JudgeResponse } from "./transport.ts";
import { fingerprint, cacheGet, cachePut } from "./cache.ts";
import { createHash } from "node:crypto";

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
    if (process.env.JM_MOCK_DIR) return this.key ?? "mock";   // the transport short-circuits to canned responses
    if (this.opts.mock) throw new Error("JM_MOCK_INVALID: opts.mock requires JM_MOCK_DIR (a key alone never fakes the transport)");
    if (!this.key) throw new JevNoKeyError();
    return this.key;
  }

  async ask(state: unknown, questions: Record<string, unknown>, schemaVersion = "v1"): Promise<AskResult> {
    const model = this.model();
    const qHash = createHash("sha256").update(JSON.stringify(questions)).digest("hex").slice(0, 16);
    // THE ENDPOINT IS PART OF THE DECISION'S IDENTITY (D-044). It was not: the fingerprint held
    // provider/model/schema/state, and `provider` is hard-coded "typesafe" — so now that the
    // endpoint is configurable (JM_JUDGE_URL, D-040), a MIRROR serving the same model NAME would
    // receive the PRIMARY's cached answers. Measured: two local endpoints answering 0.90 and 0.10
    // for the same state — the second call returned 0.90 and reported `cached`.
    const fp = fingerprint(model, `${schemaVersion}#${qHash}#${judgeUrl()}`, state);   // questions AND the endpoint are part of the identity
    const hit = cacheGet(this.db, fp);
    if (hit) return { answers: hit.answers as JudgeResponse["answers"], model: hit.model, cached: true, inputTokens: 0, costUsd: 0, fingerprint: fp };

    const key = this.requireKey();
    const resp = await callSystemOne(key, { state, model, questions });
    cachePut(this.db, fp, "typesafe", resp.model, schemaVersion, fp, resp.answers);
    const costUsd = (resp.usage?.input_tokens ?? 0) * USD_PER_INPUT_TOKEN;
    return { answers: resp.answers, model: resp.model, cached: false, inputTokens: resp.usage?.input_tokens ?? 0, costUsd, fingerprint: fp };
  }
}
