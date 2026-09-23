// src/judge/client.ts — the shared judge: cache-first, one seam, cost computed at write time.
import type { Database } from "bun:sqlite";
import { resolveKey } from "./key.ts";
import { callSystemOne, judgeUrl, TYPESAFE_MODEL, type JudgeResponse } from "./transport.ts";
import { fingerprint, cacheGet, cachePut } from "./cache.ts";
import { createHash } from "node:crypto";
// THE FROZEN CONTRACTS LIVE IN types.ts (W1) — re-exported here so every existing import path
// keeps working while there is exactly ONE declaration site.
import type { AskItem, AskManyResult } from "./types.ts";
export type { AskItem, AskManyResult, JudgeAnswer, RateLimiter, RateLimiterStats, JobRecovery, JobRecoveryCounts, GateVerdict, GateFinding } from "./types.ts";

export const JEV_NO_KEY = "JEV_NO_KEY";
export const USD_PER_INPUT_TOKEN = 0.042 / 1_000_000;   // published rate; no output charge

export class JevNoKeyError extends Error { constructor() { super(`${JEV_NO_KEY}: no TYPESAFE_API_KEY and no ~/.config/typesafe/key`); this.name = JEV_NO_KEY; } }

export interface AskResult {
  answers: JudgeResponse["answers"]; model: string; cached: boolean; inputTokens: number; costUsd: number;
  /** TRUE when the response carried no `usage` block, so the cost above is a placeholder, not a
   *  measurement. Callers with a budget must treat this as a judge failure (D-046). */
  usageMissing?: boolean;
  fingerprint: string;
}

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

  /** THE BATCH ENTRY — `ask()` for ONE item, this for N. Keeps `requireKey`'s fail-closed contract
   *  (a missing key refuses, and the mock transport still short-circuits) and delegates the rest. */
  async askManyBatch(
    items: AskItem[],
    questions: Record<string, { type: string; instructions: unknown; criteria?: unknown }>,
    schemaVersion = "v1",
    batchSize = 200,
  ): Promise<AskManyResult> {
    const key = this.requireKey();
    return askMany(this.db, key, this.model(), items, questions, schemaVersion, batchSize);
  }

  /** A response with NO `usage` block cannot be costed (D-046). Measured: the client billed such a
   *  call at 0, and a $0.0001 usd cap never fired across 50 of them — an absent accounting field
   *  silently disabled a budget guard. The CALLER decides what that means (the verbs treat it like
   *  any other judge failure, under their own fail polarity); the client's job is to REPORT it
   *  rather than launder it into a number. */
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
    const tokens = resp.usage?.input_tokens;
    const usageMissing = typeof tokens !== "number" || !Number.isFinite(tokens);
    // DO NOT CACHE AN UNMEASURED RESPONSE (audit client.ts:61). `cachePut` ran BEFORE `usageMissing`
    // was computed, so a usage-less answer WAS cached — and on any later identical `ask()` the
    // cache-hit path above returns EARLY (`cached: true`) without the flag, so the fail-closed
    // `JM_JUDGE_USAGE_MISSING` refusal added by D-046 was **bypassed on every replay**. The guard
    // held on the first call and evaporated on the second, which is the worst shape a guard can
    // have: it works in the test that makes one call and fails in the run that makes two. A
    // response whose cost cannot be measured is not cacheable state; it is re-asked each time.
    if (!usageMissing) cachePut(this.db, fp, "typesafe", resp.model, schemaVersion, fp, resp.answers);
    const costUsd = usageMissing ? 0 : tokens * USD_PER_INPUT_TOKEN;
    return { answers: resp.answers, model: resp.model, cached: false, inputTokens: usageMissing ? 0 : tokens, costUsd, usageMissing, fingerprint: fp };
  }
}

/** ONE ITEM of a batch: an id (the caller's handle) and the payload to judge. */




/** ASK MANY — THE BATCH PATH, and why it exists (MEASURED, not assumed).
 *
 *  THE API'S CONTRACT: `questions` is a `map<string, Question>` and **you choose every key**
 *  (docs.typesafe.ai/api — "You choose each key; answers come back under the same keys"). ONE
 *  `state` per request, but an UNBOUNDED NUMBER OF QUESTIONS. `usage` is ONE block for the request.
 *
 *  MEASURED against api.typesafe.ai this session, one request each:
 *      n= 50   0.92s    2143 in /  894 out        n=200   1.16s   7793 in / 3694 out
 *      n=100   2.13s    4028 in / 1794 out        n=400   2.39s  15328 in / 7494 out
 *  Time is FLAT in n; tokens are LINEAR (~38 input per question). And a wrapped batch AGREES with
 *  the serial answers on 8/8 cases at 9x the speed.
 *
 *  SO `ask()` PER CANDIDATE IS THE DEFECT. `find` made 98 requests for 98 candidates; at n=400 that
 *  is ONE request. The per-item question carries the item in structured `instructions` and the
 *  caller's question TEXT references that field by backticked name — the documented shape
 *  (docs.typesafe.ai/api: "Put the question in one field and the data in the others, and refer to
 *  the data fields by name in backticks").
 *
 *  THE CACHE STAYS PER-ITEM. Each (item, question) pair keeps the identity it would have had if
 *  asked alone, so a re-run is served from cache regardless of how the pairs were batched. Only the
 *  MISSES go on the wire. That is what keeps batching correct for incremental work. */
export async function askMany(
  db: Database,
  key: string | null,
  model: string,
  items: AskItem[],
  questions: Record<string, { type: string; instructions: unknown; criteria?: unknown }>,
  schemaVersion: string,
  batchSize = 200,
): Promise<AskManyResult> {
  // 1 · EVERY (item, question) PAIR, WITH ITS OWN CACHE IDENTITY.
  const pairs: { key: string; fp: string; item: AskItem; qname: string }[] = [];
  const answers: AskManyResult["answers"] = {};
  const cachedKeys: string[] = [];
  let cachedModel: string | null = null;
  let cached = 0;
  for (const it of items) {
    for (const [qname, q] of Object.entries(questions)) {
      const qHash = createHash("sha256").update(JSON.stringify({ qname, q })).digest("hex").slice(0, 16);
      const fp = fingerprint(model, `${schemaVersion}#${qHash}#${judgeUrl()}`, it.state);
      const hit = cacheGet(db, fp);
      const key2 = `${it.id}__${qname}`;
      // THE CACHE STORES ONE ANSWER UNDER THE QUESTION'S OWN NAME — not the caller's flattened
      // `id__name` key. `ask()` caches `resp.answers`, a map keyed by the question name, so a hit
      // for one pair is `hit.answers[qname]`. Reading the WHOLE map into one key nested it
      // (`{c1__match: {c1__match: {...}}}`) and `noulFrom` reported
      // `JM_JUDGE_ANSWER_INVALID: expected "match", received [match]` — found by the replay test.
      const stored = hit ? (hit.answers as Record<string, unknown>)[qname] : undefined;
      if (stored !== undefined) {
        answers[key2] = stored as JudgeResponse["answers"][string];
        cached++; cachedKeys.push(key2);
        // THE MODEL IS THE ONE THAT PRODUCED THE CACHE, not the requested constant. A cold run
        // reported the RESPONSE model (`jev-1.13.0`) while an all-cached run reported the REQUEST
        // constant (`jev-latest`) — so the same work produced two different artifacts, and the
        // determinism contract ("a replay is byte-identical", decision.test.ts:51) broke on the model
        // field alone. `ask()` already reads `hit.model` for exactly this reason.
        if (hit!.model) cachedModel = hit!.model;
      }
      // a cached map WITHOUT this question is a miss: it must still be asked.
      else pairs.push({ key: key2, fp, item: it, qname });
    }
  }
  if (pairs.length === 0) return { answers, model: cachedModel ?? model, requests: 0, cached, cachedKeys, asked: 0, inputTokens: 0, costUsd: 0, usageMissing: 0 };

  // 2 · THE MISSES, IN CHUNKS. 200 keeps the payload well under the 256 KB outbound cap while
  //     staying inside the measured 400-question ceiling.
  let inputTokens = 0, costUsd = 0, usageMissing = 0, requests = 0, asked = 0;
  let lastModel = model;
  for (let i = 0; i < pairs.length; i += batchSize) {
    const chunk = pairs.slice(i, i + batchSize);
    const qs: Record<string, unknown> = {};
    for (const p2 of chunk) {
      const q = questions[p2.qname];
      // THE WRAPPER: the item's payload in a named field, and the caller's text told to judge it.
      // `instructions` may be a string, object, or array (api docs), so a string is wrapped into the
      // structured form rather than concatenated into the text.
      qs[p2.key] = {
        type: q.type,
        instructions: { item: p2.item.state, question: `${String(q.instructions)} Judge the value of \`item\`.` },
        ...(q.criteria !== undefined ? { criteria: q.criteria } : {}),
      };
    }
    // the mock transport needs no real key (same contract as requireKey)
    const resp = await callSystemOne(key ?? "mock", { state: "batch", model, questions: qs });
    requests++; lastModel = resp.model;
    const tok = resp.usage?.input_tokens;
    const chunkUsageMissing = typeof tok !== "number" || !Number.isFinite(tok);
    // THE USAGE CHECK COMES FIRST, AND IT IS FATAL HERE (D-046). "An unmeasured cost is fatal
    // REGARDLESS of fail polarity" — so a response with no `usage` block ends the run before any
    // answer is read. Checking keys first was WRONG ORDERING: a usage-less response that also did not
    // echo the keys reported `JM_JUDGE_ANSWER_COUNT`, masking the accounting failure the caller's
    // policy must act on. `fatalJudgeError` recognises this token and rethrows under BOTH polarities,
    // which is exactly how the suite asserts it (audit-judge.test.ts:102).
    if (chunkUsageMissing) {
      throw new Error(`JM_JUDGE_USAGE_MISSING: the response carried no usage block, so this call cannot be costed — a budget cannot be enforced against an unmeasured cost (D-046)`);
    }
      // (usage is present and finite past this point, so the tokens are credited here)
      inputTokens += tok; costUsd += tok * USD_PER_INPUT_TOKEN;
    // A MISSING ANSWER IS NOT A MISSING USAGE (found by the D-041 suite). This counted an absent
    // answer as `usageMissing`, so a response that simply did not echo a key was reported as an
    // uncostable one — the wrong token for the wrong failure. They are different events: an absent
    // `usage` block is an ACCOUNTING failure (D-046); an absent ANSWER means the question was not
    // judged. The API promises one answer per question ("answers come back under the same keys"), so
    // a short response is a LOUD, NAMED failure — never a silent skip that reads as a considered no.
    let missing = 0;
    for (const p2 of chunk) {
      const a = resp.answers[p2.key];
      if (a === undefined) { missing++; continue; }
      answers[p2.key] = a;
      asked++;
      if (!chunkUsageMissing) {
        // stored under the QUESTION's name, matching `ask()` — so a later batch (or a single `ask`)
        // hits the same row regardless of how the pairs were grouped.
        cachePut(db, p2.fp, "typesafe", resp.model, schemaVersion, p2.fp, { [p2.qname]: a } as JudgeResponse["answers"]);
      }
    }
    if (missing > 0) {
      throw new Error(
        `JM_JUDGE_ANSWER_COUNT: asked ${chunk.length}, received ${chunk.length - missing} — the response did ` +
        `not answer every question (returned keys: ${Object.keys(resp.answers).slice(0, 5).join(", ") || "none"})`,
      );
    }
  }
  return { answers, model: cachedModel ?? lastModel, requests, cached, cachedKeys, asked, inputTokens, costUsd, usageMissing };
}
