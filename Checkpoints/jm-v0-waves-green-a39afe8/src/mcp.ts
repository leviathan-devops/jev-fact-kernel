// src/mcp.ts — the MCP surface (S18): the engine as tools an agent can call.
// Protocol: JSON-RPC 2.0 over stdio — initialize · tools/list · tools/call. No framework.
// Every tool returns a content block with the SAME shapes the HTTP surface returns, so an
// agent's answer and a curl answer cannot drift apart.
import { openDb, openIndexExisting, indexPathFor } from "./store/db.ts";
import { queryIndex } from "./verbs/query.ts";
import { find } from "./verbs/find.ts";
import { Judge } from "./judge/client.ts";
import { targetsIn, ingestAll } from "./targets.ts";

export const SERVER_INFO = { name: "jm", version: "0.1.0" };

export interface McpTool {
  name: string;
  description: string;
  inputSchema: { type: "object"; properties: Record<string, unknown>; required?: string[] };
}

export const TOOLS: McpTool[] = [
  {
    name: "jm_query",
    description: "Search the JM index (literal FTS or a WHERE predicate). Returns matching rows with paths and sizes. Keyless.",
    inputSchema: {
      type: "object",
      properties: {
        fts: { type: "string", description: "FTS5 MATCH phrase (e.g. \"tombstone\" or '\"exact phrase\"')" },
        where: { type: "string", description: "SQL predicate on the files row (e.g. size>2000)" },
        tag: { type: "string", description: "k=v tag filter" },
        limit: { type: "number", description: "max rows (default 50, cap 10000)" },
        index: { type: "string", description: "index name (default 'all')" },
      },
    },
  },
  {
    name: "jm_find",
    description: "The 9-stage find chain: seeds -> candidates -> cluster -> patterns. Every pattern carries n + exemplar ids. Judged (needs a key) except the seed stages.",
    inputSchema: {
      type: "object",
      properties: {
        phrase: { type: "string", description: "the X to find" },
        common: { type: "number", description: "minimum support n for a pattern (default 2)" },
        structure: { type: "string", enum: ["md", "json"], description: "output structure (default json for an agent; the CLI defaults to md for a human)" },
        index: { type: "string", description: "index name (default 'all')" },
      },
      required: ["phrase"],
    },
  },
  {
    name: "jm_decide",
    description: "Ask the shared Jev judge: state + questions -> typed answers with probabilities. Cached by (provider, model, schema, state).",
    inputSchema: {
      type: "object",
      properties: {
        state: { description: "the state object the questions are asked about" },
        questions: { type: "object", description: "the question schema" },
        schema: { type: "string", description: "schema label for the cache fingerprint" },
        index: { type: "string", description: "index name (default 'decisions')" },
      },
      required: ["state", "questions"],
    },
  },
  {
    name: "jm_index",
    description: "Index targets through their adapters (`--in all` or a comma list). Keyless, incremental by content sha.",
    inputSchema: {
      type: "object",
      properties: {
        in: { type: "string", description: "'all' or a comma-separated target list" },
        index: { type: "string", description: "index name to write" },
      },
      required: ["in"],
    },
  },
];

export interface JsonRpcRequest { jsonrpc: "2.0"; id?: number | string | null; method: string; params?: Record<string, unknown>; }

/** One request -> one response. Pure enough to unit-test without a transport. */
export async function handle(req: JsonRpcRequest): Promise<Record<string, unknown> | null> {
  // A REQUEST WITHOUT AN `id` IS A NOTIFICATION, AND JSON-RPC 2.0 FORBIDS REPLYING TO ONE.
  // `req.id ?? null` made a notification indistinguishable from a request, so a `tools/call` sent
  // without an id came back as `{"id":null,"result":…}` — a frame the client is not reading, which
  // it can then mis-parse as the answer to a LATER request. Probed: M7.
  //
  // The method still RUNS: `callTool` is awaited BEFORE `ok`/`err` is built, so a fire-and-forget
  // `jm_index` still indexes. Only the reply is suppressed — which is what fire-and-forget means.
  // `id: null` (present but null) stays a REQUEST per the spec, and the parse-error path below
  // keeps its mandatory `id: null` frame.
  const notification = req.id === undefined;
  const id = req.id ?? null;
  const ok = (result: unknown) => (notification ? null : { jsonrpc: "2.0" as const, id, result });
  const err = (code: number, message: string) => (notification ? null : { jsonrpc: "2.0" as const, id, error: { code, message } });

  switch (req.method) {
    case "initialize":
      return ok({
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      });
    case "notifications/initialized":
      return null;                                   // a notification: no response at all
    case "tools/list":
      return ok({ tools: TOOLS });
    case "ping":
      return ok({});
    case "tools/call": {
      const p = (req.params ?? {}) as { name?: string; arguments?: Record<string, unknown> };
      const name = p.name;
      const args = (p.arguments ?? {}) as Record<string, unknown>;
      if (!name) return err(-32602, "JM_MCP_ARGS: name required");
      if (!TOOLS.some((t) => t.name === name)) return err(-32602, `JM_MCP_UNKNOWN_TOOL: ${name}`);
      try {
        const text = await callTool(name, args);
        return ok({ content: [{ type: "text", text }] });
      } catch (e) {
        // A tool failure is a RESULT with isError, not a transport error: the agent must see it.
        const msg = String(e);
        return ok({ content: [{ type: "text", text: `JM_ERROR: ${msg}` }], isError: true });
      }
    }
    default:
      return err(-32601, `JM_MCP_METHOD: unknown method ${req.method}`);
  }
}

async function callTool(name: string, args: Record<string, unknown>): Promise<string> {
  const indexName = typeof args.index === "string" ? args.index : (name === "jm_decide" ? "decisions" : "all");
  // ARGUMENTS BEFORE THE STORE (audit mcp:134). `openDb` CREATES, and it ran before each branch
  // validated its arguments — so a REFUSED call still left an index behind: `jm_index` with no `in`
  // created `all.sqlite` and then threw `JM_ARGS: in required`. MEASURED. The CLI's version of this
  // invariant was fixed (D-054/D-055/D-056: "a run that refuses its input must not have touched the
  // disk"); this surface kept the old order, which is exactly the failure the same-semantics claim
  // (§18.8) exists to prevent.
  if (name === "jm_index" && (typeof args.in !== "string" || args.in.length === 0)) throw new Error("JM_ARGS: in required");
  if (name === "jm_find" && (typeof args.phrase !== "string" || args.phrase.length === 0)) throw new Error("JM_ARGS: phrase required");
  // SAME SEMANTICS AS THE CLI (D-028): a READ tool refuses a missing index, a WRITE tool creates
  // one. This surface used openDb() for everything, so `jm_query` on a typo'd index returned
  // `{"rows": [], "n": 0}` at exit 0 AND materialised a phantom index file - the D-009 defect,
  // still live here after the CLI was fixed. (§18.8's "same semantics" claim was what exposed it.)
  const READ_TOOLS = new Set(["jm_query", "jm_find"]);
  const db = READ_TOOLS.has(name)
    ? openIndexExisting(indexName, indexPathFor(indexName))
    : openDb(indexPathFor(indexName));
  try {
    if (name === "jm_query") {
      const rows = queryIndex(db, {
        fts: args.fts as string | undefined,
        where: args.where as string | undefined,
        tag: args.tag as string | undefined,
        limit: typeof args.limit === "number" ? args.limit : 50,
      });
      return JSON.stringify({ rows, n: rows.length }, null, 2);
    }
    if (name === "jm_find") {
      const phrase = args.phrase;
      if (typeof phrase !== "string" || phrase.length === 0) throw new Error("JM_ARGS: phrase required");
      const res = await find(db, {
        phrase,
        common: typeof args.common === "number" ? args.common : undefined,
        structure: (args.structure as "md" | "json" | undefined) ?? "json",
      });
      return JSON.stringify({ trend: res.trend, patterns: res.patterns, calls: res.calls, cost_usd: res.costUsd }, null, 2);
    }
    if (name === "jm_decide") {
      if (!args.state || !args.questions) throw new Error("JM_ARGS: state + questions required");
      const judge = new Judge(db, {});
      const res = await judge.ask(args.state, args.questions as Record<string, unknown>, (args.schema as string) ?? "mcp@v1");
      return JSON.stringify({ answers: res.answers, cached: res.cached, model: res.model, cost_usd: res.costUsd }, null, 2);
    }
    if (name === "jm_index") {
      const spec = args.in;
      if (typeof spec !== "string" || spec.length === 0) throw new Error("JM_ARGS: in required");
      targetsIn(spec);                                  // resolve first: an unknown name fails BEFORE any write
      const stats = await ingestAll(db, spec);
      return JSON.stringify({ stats, rows: stats.reduce((n, s) => n + s.rows, 0) }, null, 2);
    }
    throw new Error(`JM_MCP_UNKNOWN_TOOL: ${name}`);
  } finally { db.close(); }
}

/** stdio transport: newline-delimited JSON-RPC. Never writes anything but protocol frames to stdout. */
export async function serveStdio(): Promise<void> {
  const decoder = new TextDecoder();
  let buf = "";
  const reader = Bun.stdin.stream().getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      let req: JsonRpcRequest;
      try { req = JSON.parse(line) as JsonRpcRequest; }
      catch { process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "JM_MCP_PARSE" } }) + "\n"); continue; }
      // A VALID JSON VALUE THAT IS NOT AN OBJECT IS STILL AN INVALID REQUEST (audit mcp:199).
      // `JSON.parse("null")` SUCCEEDS, so it sailed past the parse guard and `handle` dereferenced
      // `req.id` on `null` — killing the server with a raw JS error and NO JSON-RPC frame, so the
      // client saw a dead pipe rather than an error it could act on. JSON-RPC requires an object;
      // `-32600` (Invalid Request) is the frame for anything else. The parse guard covered
      // SYNTAX and this covers SHAPE.
      if (req === null || typeof req !== "object" || Array.isArray(req)) {
        process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "JM_MCP_INVALID_REQUEST: a JSON-RPC message must be an object" } }) + "\n");
        continue;
      }
      const res = await handle(req);
      if (res) process.stdout.write(JSON.stringify(res) + "\n");
    }
  }
}
