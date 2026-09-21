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

export interface ServeOpts { port?: number; name?: string; }

/** The health path's judge needs A db to report the key's provenance, but the health path must not
 *  CREATE one. When the index is absent, a throwaway in-memory db is enough: the key facts do not
 *  depend on the store. */
function judgeDbFor(name: string): Database {
  return indexExists(name) ? openDb(indexPathFor(name)) : new Database(":memory:");
}

export function startServer(opts: ServeOpts = {}) {
  const port = opts.port ?? 7777;
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
          let body: { schema?: string; state?: unknown; questions?: Record<string, unknown> };
          try { body = await req.json() as typeof body; }
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
          let body: { phrase?: string; common?: number; structure?: "md" | "json" };
          try { body = await req.json() as typeof body; }
          catch { return Response.json({ error: "JM_JSON_INVALID" }, { status: 400 }); }
          if (!body.phrase) return Response.json({ error: "JM_ARGS: phrase required" }, { status: 400 });
          const res = await find(db, { phrase: body.phrase, common: body.common, structure: body.structure ?? "json" });
          return Response.json({ trend: res.trend, patterns: res.patterns, calls: res.calls, cost_usd: res.costUsd, below_common: res.belowCommon });
        }
        return Response.json({ error: "JM_ROUTE: unknown path" }, { status: 404 });
      } finally { db.close(); }
    },
  });
}
