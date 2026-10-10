// src/judge/canon-gguf.ts — THE CANON ADAPTER: the systemone wire over a GGUF decider.
//
// THE SITUATION (measured this session): the system canon is
//   /home/leviathan/models/gguf/decider-0.8b.Q8_0.gguf  (811 MB, Mapika/decider-0.8b)
//   served by beellama's llama-server on 127.0.0.1:8008
// That server speaks llama.cpp's TEXT API (`/completion`), NOT TypeSafe's `/v1/systemone`.
//
// THE MODEL CARD says the 0.8b's wire format IS `POST /v1/systemone`. The model is trained
// for it; the SERVING BINARY here does not implement it. So this adapter TRANSLATES:
// it builds the canon prompt the model was trained on and reads the answer back.
//
// THE CANON PROMPT FORMAT (decider/prompt.py:99-135, the trained format — verbatim shape):
//
//     Context:
//     <state>
//
//     Question: <text>
//     Options:
//     (A) Yes
//     (B) No
//     Answer: (
//
// THE READOUT: the letter the model emits at the `(` slot is the answer. `noul` = P(yes) is
// derived from a MULTI-SAMPLE vote when the server exposes no logprobs (measured: beellama's
// `top_probs` is EMPTY even with n_probs set), and from the logit distribution when it does.
//
// THIS IS A DEGRADATION, NAMED HONESTLY: with the argmax alone, the output is 0/1, not a
// calibrated probability. The multi-sample mode (k draws at temperature 1) gives a frequency
// estimate; it is NOT the trained softmax readout. Both are exposed, and the caller chooses.

export const CANON_GGUF = "canon-gguf";

export interface CanonQuestion {
  type: "noul" | "choice" | "score";
  instructions: string;
  criteria?: Record<string, string> | string[];
}

export interface CanonBatch {
  state: unknown;
  questions: Record<string, CanonQuestion>;
  /** draws at temperature 1 for a frequency estimate when logprobs are unavailable (default 1) */
  samples?: number;
  timeoutMs?: number;
  base?: string;
}

export interface CanonAnswer {
  type: string;
  noul?: number;
  choice?: string;
  score?: number;
  probabilities?: Record<string, number>;
  /** HOW the number was produced — the honesty field. */
  readout: "logprob" | "frequency" | "argmax";
  samples: number;
}

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** Build the options list for a question, the canon way. */
function optionsFor(q: CanonQuestion): { labels: string[]; values: string[] } {
  if (q.type === "noul") return { labels: ["A", "B"], values: ["Yes", "No"] };
  if (q.type === "choice") {
    const keys = Array.isArray(q.criteria) ? q.criteria : Object.keys(q.criteria ?? {});
    const ks = keys.length > 0 ? keys : ["A", "B"];
    return { labels: ks.map((_, i) => LETTERS[i]), values: ks as string[] };
  }
  // score: the levels are the options
  const lv = Array.isArray(q.criteria) ? q.criteria : Object.values(q.criteria ?? {});
  const ls = lv.length > 0 ? lv : ["low", "mid", "high"];
  return { labels: ls.map((_, i) => LETTERS[i]), values: ls as string[] };
}

/** THE CANON PROMPT — the exact shape `decider/prompt.py` builds. */
export function buildCanonPrompt(state: unknown, q: CanonQuestion): string {
  const s = typeof state === "string" ? state : JSON.stringify(state);
  const { labels, values } = optionsFor(q);
  const opts = labels.map((l, i) => `(${l}) ${values[i]}`).join("\n");
  return `Context:\n${s}\n\nQuestion: ${q.instructions}\nOptions:\n${opts}\nAnswer: (`;
}

interface CompletionResp {
  content?: string;
  /** MEASURED: beellama emits `completion_probabilities`, NOT `probs`. Its entries carry
   *  `top_logprobs` (an array of {token, logprob}) — that is the distribution. */
  completion_probabilities?: { id?: number; token?: string; logprob?: number; top_logprobs?: { token: string; logprob: number }[] }[];
  error?: { message?: string; type?: string; code?: number };
}

/** THE READOUT: softmax over the OPTION LETTERS only, renormalized.
 *
 *  MEASURED (this session, decider-0.8b.Q8_0):
 *    "JM_INDEX_MISSING..." -> A p=0.4853, B p=0.0816   (P(yes) = 0.4853/0.5669 = 0.856)
 *    "all 233 tests passed" -> B p=0.6948, A p=0.0114  (P(yes) = 0.0114/0.7062 = 0.016)
 *  The letters are the options; the other top_logprobs are noise tokens (' A', 'C', ...) and are
 *  DROPPED, then the remaining option letters are renormalized to sum to 1. That is the trained
 *  readout's shape (a softmax over the option logits at the answer slot). */
function readDistribution(tl: { token: string; logprob: number }[], labels: string[]): Record<string, number> {
  const raw: Record<string, number> = {};
  for (const t of tl) {
    const L = (t.token ?? "").trim().toUpperCase();
    if (L.length === 1 && labels.includes(L) && raw[L] === undefined) raw[L] = Math.exp(t.logprob);
  }
  const sum = Object.values(raw).reduce((a, b) => a + b, 0);
  const probs: Record<string, number> = {};
  if (sum > 0) for (const [k, v] of Object.entries(raw)) probs[k] = v / sum;
  return probs;
}

/** ONE forward pass through the GGUF server. */
async function completion(base: string, prompt: string, timeoutMs: number): Promise<CompletionResp> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}/completion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, n_predict: 1, n_probs: 20, temperature: 0, top_k: 0, top_p: 1, cache_prompt: true }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`CANON_GGUF_HTTP_${res.status}: ${(await res.text()).slice(0, 200)}`);
    return (await res.json()) as CompletionResp;
  } finally { clearTimeout(t); }
}

/** ONE SAMPLE at temperature 1 (for the frequency readout). */
async function sample(base: string, prompt: string, timeoutMs: number): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}/completion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, n_predict: 1, temperature: 1, top_k: 0, top_p: 1, cache_prompt: true }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`CANON_GGUF_HTTP_${res.status}`);
    const d = (await res.json()) as CompletionResp;
    return (d.content ?? "").trim();
  } finally { clearTimeout(t); }
}

/** ASK THE CANON GGUF — the systemone contract over llama.cpp's text API. */
export async function canonSystemOne(b: CanonBatch): Promise<Record<string, CanonAnswer>> {
  const base = (b.base ?? process.env.JM_JUDGE_URL ?? "http://127.0.0.1:8008").replace(/\/v1\/systemone$/, "").replace(/\/$/, "");
  const timeoutMs = b.timeoutMs ?? 30_000;
  const samples = Math.max(1, b.samples ?? 1);
  const out: Record<string, CanonAnswer> = {};

  for (const [name, q] of Object.entries(b.questions)) {
    const prompt = buildCanonPrompt(b.state, q);
    if (samples > 1) {
      // MULTI-SAMPLE — a frequency estimate when no logprobs are exposed.
      const votes: Record<string, number> = {};
      for (let i = 0; i < samples; i++) {
        const v = (await sample(base, prompt, timeoutMs)).replace(/[()]/g, "").trim().slice(0, 1).toUpperCase();
        votes[v] = (votes[v] ?? 0) + 1;
      }
      const { labels, values } = optionsFor(q);
      const probs: Record<string, number> = {};
      for (const [k, n] of Object.entries(votes)) probs[k] = n / samples;
      const top = Object.entries(votes).sort((x, y) => y[1] - x[1])[0]?.[0] ?? "";
      const idx = labels.indexOf(top);
      const a: CanonAnswer = { type: q.type, readout: "frequency", samples, probabilities: probs };
      if (q.type === "noul") a.noul = (probs["A"] ?? 0);
      else if (q.type === "choice") a.choice = idx >= 0 ? values[idx] : (top || "(none)");
      else a.score = idx >= 0 ? idx + 1 : -1;
      out[name] = a;
      continue;
    }
    // SINGLE PASS — the argmax letter (and the logprob distribution when the server emits it).
    const d = await completion(base, prompt, timeoutMs);
    const letter = (d.content ?? "").replace(/[()]/g, "").trim().slice(0, 1).toUpperCase();
    const { labels, values } = optionsFor(q);
    const idx = labels.indexOf(letter);
    const tl = d.completion_probabilities?.[0]?.top_logprobs ?? [];
    const probs = readDistribution(tl, labels);
    const hasDist = Object.keys(probs).length > 0;
    const a: CanonAnswer = { type: q.type, readout: hasDist ? "logprob" : "argmax", samples: 1 };
    if (hasDist) {
      a.probabilities = probs;
      const best = Object.entries(probs).sort((x, y) => y[1] - x[1])[0][0];
      if (q.type === "noul") a.noul = probs["A"] ?? 0;
      else if (q.type === "choice") a.choice = values[labels.indexOf(best)] ?? "(none)";
      else a.score = labels.indexOf(best) + 1;
    } else {
      // NO DISTRIBUTION AVAILABLE — the honest 0/1 from the argmax.
      if (q.type === "noul") a.noul = idx === 0 ? 1 : 0;
      else if (q.type === "choice") a.choice = idx >= 0 ? values[idx] : (letter || "(none)");
      else a.score = idx >= 0 ? idx + 1 : -1;
    }
    out[name] = a;
  }
  return out;
}
