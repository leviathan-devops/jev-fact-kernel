// src/judge/transport.ts — the ONE network seam. Tests may point JM_MOCK_DIR at canned
// responses (a transport-boundary fake, never a mock of the unit under test).
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface JudgeResponse {
  model: string;
  answers: Record<string, { type: string; noul?: number; choice?: string; probabilities?: Record<string, number>; confidence?: number; score?: number; legend?: Record<string, string> }>;
  usage: { input_tokens: number; output_tokens: number };
}

export const TYPESAFE_URL = "https://api.typesafe.ai/v1/systemone";
export const TYPESAFE_MODEL = "jev-latest";

/** The OUTBOUND cap (D-037). A 4 MB decision row made the whole run HANG — exit 124 at a 90-second
 *  timeout, no stdout, no stderr, no error — and the transport's own 30-second abort never fired on
 *  the oversized request. The same lesson as the HTTP surface's missing body cap (D-036), in the
 *  other direction: an unbounded payload is an availability problem, not a performance one. The
 *  cap refuses BEFORE the network, so the caller gets a named error instead of silence.
 *  `JM_JUDGE_MAX_BODY` overrides. */
export const MAX_OUTBOUND_BYTES = 262_144;

export class JudgePayloadTooLarge extends Error {}

export function judgeBodyBytes(body: unknown): number {
  return Buffer.byteLength(JSON.stringify(body), "utf8");
}

export async function callSystemOne(key: string, body: unknown, timeoutMs = 30_000): Promise<JudgeResponse> {
  const mockDir = process.env.JM_MOCK_DIR;
  if (mockDir) {
    // deterministic test transport: the Nth call reads call-<n>.json (counter in a sidecar file)
    const ctrPath = join(mockDir, ".counter");
    const n = existsSync(ctrPath) ? Number(readFileSync(ctrPath, "utf8")) : 0;
    Bun.write(ctrPath, String(n + 1));
    const p = join(mockDir, `call-${n}.json`);
    if (!existsSync(p)) throw new Error(`JM_MOCK_MISSING: ${p}`);
    return JSON.parse(readFileSync(p, "utf8")) as JudgeResponse;
  }
  // REFUSE AN OVERSIZED PAYLOAD HERE, not at the far side: measured, a 4 MB body neither returned
  // nor errored (the abort below did not fire), so the caller saw nothing at all.
  const cap = Number(process.env.JM_JUDGE_MAX_BODY ?? MAX_OUTBOUND_BYTES);
  const bytes = judgeBodyBytes(body);
  if (bytes > cap) {
    throw new JudgePayloadTooLarge(`JM_JUDGE_PAYLOAD_TOO_LARGE: ${bytes} bytes exceeds the ${cap}-byte cap (JM_JUDGE_MAX_BODY overrides) — the state is too large to judge; trim the row or the excerpt`);
  }
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(TYPESAFE_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`JM_JUDGE_HTTP_${res.status}: ${(await res.text()).slice(0, 200)}`);
    return (await res.json()) as JudgeResponse;
  } finally { clearTimeout(t); }
}
