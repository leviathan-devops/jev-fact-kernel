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

/** The endpoint, overridable so the boundary can be TESTED and a mirror can be used. The timeout
 *  and error paths were unreachable with a hard-coded URL: the only way to make the judge fail was
 *  to make the whole request oversized, which is what produced the D-037 false lead (the hang was
 *  in the fingerprint, and the abort never fired on the oversized request). `JM_JUDGE_URL` lets a
 *  controlled endpoint be put in front of the transport. */
export const judgeUrl = (): string => process.env.JM_JUDGE_URL ?? TYPESAFE_URL;
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
    // A FAITHFUL MOCK: ONE CANNED ANSWER PER QUESTION, RE-KEYED TO THE REQUEST, IN ORDER.
    //
    // It used to return one canned file per CALL, as-is — which modelled the pre-batch engine where
    // one request carried one question. The REAL API returns an answer for EVERY question in ONE
    // request (docs.typesafe.ai/api: "you choose each key; answers come back under the same keys"),
    // so a request of N questions must consume N canned answers and merge them into one response with
    // ONE `usage` block — exactly as the wire does. For a single-question `ask()` this is
    // byte-identical to the old behaviour (one file consumed, its value re-keyed to the request's own
    // key, which for every fixture is the same key).
    //
    // FOUND BY BATCHING `filter` AND RUNNING THE SUITE: with the old mock a 3-candidate batch got ONE
    // answer and two rows silently vanished. The tests caught it immediately, which is exactly why
    // the boundary fake must be faithful rather than convenient.
    const qs = (body as { questions?: Record<string, unknown> })?.questions ?? {};
    const keys = Object.keys(qs);
    const nQ = Math.max(1, keys.length);
    const ctrPath = join(mockDir, ".counter");
    const start = existsSync(ctrPath) ? Number(readFileSync(ctrPath, "utf8")) : 0;
    Bun.write(ctrPath, String(start + nQ));
    const answers: Record<string, unknown> = {};
    let model = "mock", inTok = 0, outTok = 0;
    for (let i = 0; i < nQ; i++) {
      const p = join(mockDir, `call-${start + i}.json`);
      if (!existsSync(p)) throw new Error(`JM_MOCK_MISSING: ${p}`);
      const r = JSON.parse(readFileSync(p, "utf8")) as JudgeResponse;
      const vals = Object.values(r.answers ?? {});
      answers[keys[i] ?? Object.keys(r.answers ?? {})[0] ?? "answer"] = vals[0];
      model = r.model ?? model;
      inTok += r.usage?.input_tokens ?? 0;
      outTok += r.usage?.output_tokens ?? 0;
    }
    return { model, answers, usage: { input_tokens: inTok, output_tokens: outTok } } as unknown as JudgeResponse;
  }
  // REFUSE AN OVERSIZED PAYLOAD HERE, not at the far side: measured, a 4 MB body neither returned
  // nor errored (the abort below did not fire), so the caller saw nothing at all.
  //
  // THE OVERRIDE IS VALIDATED (audit transport:49). `Number(env ?? default)` yields **NaN** for any
  // non-numeric value — `JM_JUDGE_MAX_BODY=1mb` is the natural typo — and `bytes > NaN` is ALWAYS
  // FALSE, so the cap was silently DISABLED and the oversized-payload hang this guard exists to
  // prevent came straight back. A guard whose override can switch it off with a typo is not a guard.
  const rawCap = process.env.JM_JUDGE_MAX_BODY;
  const cap = rawCap === undefined ? MAX_OUTBOUND_BYTES : Number(rawCap);
  if (!Number.isFinite(cap) || cap <= 0) {
    throw new Error(`JM_JUDGE_MAX_BODY_INVALID: "${rawCap}" is not a positive number (bytes) — refusing to run with the oversized-payload cap disabled`);
  }
  const bytes = judgeBodyBytes(body);
  if (bytes > cap) {
    throw new JudgePayloadTooLarge(`JM_JUDGE_PAYLOAD_TOO_LARGE: ${bytes} bytes exceeds the ${cap}-byte cap (JM_JUDGE_MAX_BODY overrides) — the state is too large to judge; trim the row or the excerpt`);
  }
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(judgeUrl(), {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`JM_JUDGE_HTTP_${res.status}: ${(await res.text()).slice(0, 200)}`);
    return (await res.json()) as JudgeResponse;
  } finally { clearTimeout(t); }
}
