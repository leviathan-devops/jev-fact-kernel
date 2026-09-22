// src/serve.ts — the HTTP surface (S17): POST /decide · GET /health · GET /jobs · POST /find.
// Anything on the host can target the engine without the CLI.
//
// THE READ/WRITE RULE AT THIS SURFACE (D-028/W5, from the round-2 second-operator drill):
//   /health is a REPORT   — it answers 200 whenever the process is up and CREATES NOTHING.
//   /find   is a READ     — a missing index is a 404 with the engine's own sentence.
//   /decide is a WRITE    — the judge's cache row lives in the store, so it may create it.
import { Database } from "bun:sqlite";
import { openDb, openIndexExisting, indexExists, indexPathFor } from "./store/db.ts";
import { jobsDir } from "./job/store.ts";
import { Judge } from "./judge/client.ts";
import { find } from "./verbs/find.ts";
import { readdirSync } from "node:fs";

export interface ServeOpts { port?: number; name?: string; maxBodyBytes?: number; }

/** The request-body cap (D-036). The surface had NO limit: a 2 MB `POST /decide` body was
 *  accepted, forwarded to the judge, and BLOCKED THE WHOLE SURFACE — `/health` and `/jobs` stopped
 *  answering while it was in flight, so a watchdog or load balancer would have judged the service
 *  dead. Measured: a small /decide leaves /health answering in 0.75 ms; a 2 MB body hangs
 *  everything. 1 MB is far above any legitimate payload here (a decision state, a question set, a
 *  find phrase) and far below what hurts. */
export const DEFAULT_MAX_BODY_BYTES = 1_048_576;

/** Read a request body with a hard byte cap, so a truncated/oversized/chunked body cannot be
 *  read into memory unbounded. Returns null when the cap is exceeded. */
async function readBodyCapped(req: Request, cap: number): Promise<string | null> {
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > cap) return null;
  const reader = req.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > cap) { try { await reader.cancel(); } catch { /* the stream is already gone */ } return null; }
    chunks.push(value);
  }
  const buf = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) { buf.set(c, at); at += c.byteLength; }
  return new TextDecoder().decode(buf);
}

/** The health path's judge needs A db to report the key's provenance, but the health path must not
 *  CREATE one. When the index is absent, a throwaway in-memory db is enough: the key facts do not
 *  depend on the store. */
function judgeDbFor(name: string): Database {
  return indexExists(name) ? openDb(indexPathFor(name)) : new Database(":memory:");
}

export function startServer(opts: ServeOpts = {}) {
  const port = opts.port ?? 7777;
  const maxBody = opts.maxBodyBytes ?? Number(process.env.JM_SERVE_MAX_BODY ?? DEFAULT_MAX_BODY_BYTES);
  const indexName = opts.name ?? "decisions";

  const token = process.env.JM_SERVE_TOKEN;   // optional bearer; loopback-only by default
  return Bun.serve({
    port,
    hostname: process.env.JM_SERVE_HOST ?? "127.0.0.1",
    async fetch(req) {
      const url = new URL(req.url);
      if (token && req.headers.get("authorization") !== `Bearer ${token}`) return Response.json({ error: "JM_UNAUTHORIZED" }, { status: 401 });

      // ── /health: a report, never a read of the corpus and never a write ──────────────────────
      if (url.pathname === "/health") {
        const db = judgeDbFor(indexName);
        try {
          const judge = new Judge(db, {});
          // key material metadata is NOT disclosed unless the caller is authenticated (JM_SERVE_TOKEN)
          const authed = !token || req.headers.get("authorization") === `Bearer ${token}`;
          return Response.json({
            ok: true,
            index: indexName,
            index_exists: indexExists(indexName),      // stated, not implied
            key_present: judge.keySource !== "absent",
            model: judge.model(),
            ...(authed ? { key_source: judge.keySource, key_fingerprint: judge.keyFingerprint } : {}),
          });
        } finally { db.close(); }
      }

      // ── /jobs needs no store at all ─────────────────────────────────────────────────────────
      if (url.pathname === "/jobs") {
        let jobs: string[] = [];
        try { jobs = readdirSync(jobsDir()); } catch { jobs = []; }
        return Response.json({ jobs });
      }

      // ── the store-backed paths ──────────────────────────────────────────────────────────────
      // ROUTE BEFORE STORE (audit serve:94). `openDb` CREATES, and it ran BEFORE the route was
      // validated — so `GET /nonexistent` returned 404 AND left `decisions.sqlite` behind. MEASURED.
      // /health and /jobs are answered above this block, so anything reaching here must be /decide or
      // /find with POST; anything else is refused by name without touching the disk. The same
      // invariant the CLI now enforces: a request that is REFUSED must not have created anything.
      if (!(url.pathname === "/decide" || url.pathname === "/find") || req.method !== "POST") {
        return Response.json({ error: "JM_ROUTE: unknown path" }, { status: 404 });
      }
      const isRead = url.pathname === "/find" && req.method === "POST";
      let db: Database;
      try {
        db = isRead ? openIndexExisting(indexName, indexPathFor(indexName)) : openDb(indexPathFor(indexName));
      } catch (err) {
        // A missing index on a READ path is a 404 carrying the ENGINE'S OWN sentence, not a 500
        // with a stack: the caller needs the same text the CLI prints.
        const m = String(err);
        return Response.json({ error: m }, { status: m.includes("JM_INDEX_MISSING") ? 404 : 500 });
      }
      try {
        if (url.pathname === "/decide" && req.method === "POST") {
          const raw = await readBodyCapped(req, maxBody);
          if (raw === null) return Response.json({ error: `JM_BODY_TOO_LARGE: the body cap is ${maxBody} bytes (JM_SERVE_MAX_BODY overrides)` }, { status: 413 });
          let body: { schema?: string; state?: unknown; questions?: Record<string, unknown> };
          try { body = JSON.parse(raw) as typeof body; }
          catch { return Response.json({ error: "JM_JSON_INVALID" }, { status: 400 }); }   // malformed body is a client error, never a crash
          if (!body.state || !body.questions) return Response.json({ error: "JM_ARGS: state + questions required" }, { status: 400 });
          const judge = new Judge(db, {});
          try {
            const res = await judge.ask(body.state, body.questions, body.schema ?? "http@v1");
            return Response.json({ answers: res.answers, cached: res.cached, model: res.model, cost_usd: res.costUsd });
          } catch (err) {
            const msg = String(err);
            if (msg.includes("JEV_NO_KEY")) return Response.json({ error: msg }, { status: 503 });   // fail-closed
            return Response.json({ error: msg }, { status: 500 });
          }
        }
        if (url.pathname === "/find" && req.method === "POST") {
          const raw = await readBodyCapped(req, maxBody);
          if (raw === null) return Response.json({ error: `JM_BODY_TOO_LARGE: the body cap is ${maxBody} bytes (JM_SERVE_MAX_BODY overrides)` }, { status: 413 });
          let body: { phrase?: string; common?: number; structure?: "md" | "json" };
          try { body = JSON.parse(raw) as typeof body; }
          catch { return Response.json({ error: "JM_JSON_INVALID" }, { status: 400 }); }
          if (!body.phrase) return Response.json({ error: "JM_ARGS: phrase required" }, { status: 400 });
          // THE SAME ERROR MAPPING AS `/decide` (audit serve:137). This branch had NO catch — the
          // enclosing block has only `try { … } finally { db.close(); }` — so a real engine failure
          // (`JM_JUDGE_USAGE_MISSING`, a fatal store or judge error) escaped to Bun's default
          // handler: a 500 with an internal body, bypassing the named-refusal contract every other
          // path honours, and giving the caller a stack-shaped answer instead of the engine's own
          // sentence. A keyless call is `503` (fail-closed), anything else is `500` with the
          // engine's message.
          try {
            const res = await find(db, { phrase: body.phrase, common: body.common, structure: body.structure ?? "json" });
            return Response.json({ trend: res.trend, patterns: res.patterns, calls: res.calls, cost_usd: res.costUsd, below_common: res.belowCommon });
          } catch (err) {
            const msg = String(err);
            if (msg.includes("JEV_NO_KEY")) return Response.json({ error: msg }, { status: 503 });
            return Response.json({ error: msg }, { status: 500 });
          }
        }
        return Response.json({ error: "JM_ROUTE: unknown path" }, { status: 404 });
      } finally { db.close(); }
    },
  });
}
