// src/serve.ts — the HTTP surface (S17): POST /decide · GET /health · GET /jobs · POST /find.
// Anything on the host can target the engine without the CLI.
import { openDb, indexPathFor } from "./store/db.ts";
import { jobsDir } from "./job/store.ts";
import { Judge } from "./judge/client.ts";
import { find } from "./verbs/find.ts";
import { readdirSync } from "node:fs";

export interface ServeOpts { port?: number; name?: string; }

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
      const db = openDb(indexPathFor(indexName));
      try {
        if (url.pathname === "/health") {
          const judge = new Judge(db, {});
          // key material metadata is NOT disclosed unless the caller is authenticated (JM_SERVE_TOKEN)
          const authed = !process.env.JM_SERVE_TOKEN || req.headers.get("authorization") === `Bearer ${process.env.JM_SERVE_TOKEN}`;
          return Response.json({ ok: true, index: indexName, key_present: judge.keySource !== "absent", model: judge.model(), ...(authed ? { key_source: judge.keySource, key_fingerprint: judge.keyFingerprint } : {}) });
        }
        if (url.pathname === "/jobs") {
          let jobs: string[] = [];
          try { jobs = readdirSync(jobsDir()); } catch { jobs = []; }
          return Response.json({ jobs });
        }
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
          const body = await req.json() as { phrase?: string; common?: number; structure?: "md" | "json" };
          if (!body.phrase) return Response.json({ error: "JM_ARGS: phrase required" }, { status: 400 });
          const res = await find(db, { phrase: body.phrase, common: body.common, structure: body.structure ?? "json" });
          return Response.json({ trend: res.trend, patterns: res.patterns, calls: res.calls, cost_usd: res.costUsd });
        }
        return Response.json({ error: "JM_ROUTE: unknown path" }, { status: 404 });
      } finally { db.close(); }
    },
  });
}
