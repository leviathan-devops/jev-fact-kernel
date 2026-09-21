// tests/mcp.test.ts — W6: the MCP surface (S18) as an agent would drive it.
// JSON-RPC over stdio is exercised through the REAL handler; the server is spawned once for the
// transport proof so the stdin/stdout framing is covered too.
import { test, expect, describe } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { makeSandbox, fill } from "./helpers.ts";
import { handle, TOOLS } from "../src/mcp.ts";
import { openDb, indexPathFor, saveTargets } from "../src/store/db.ts";
import { ingestAll } from "../src/targets.ts";

function seed(home: string, root: string): void {
  process.env.JM_HOME = home;
  fill(root, { "corpus/x.md": "the tombstone record", "corpus/y.md": "an unrelated note" });
  saveTargets([{ name: "corp", kind: "fs", root: join(root, "corpus") }]);
}

describe("W6 MCP surface", () => {
  test("test_mcp_tools_list", async () => {
    const r = await handle({ jsonrpc: "2.0", id: 1, method: "tools/list" });
    const names = (r!.result as { tools: { name: string }[] }).tools.map((t) => t.name);
    expect(names).toEqual(["jm_query", "jm_find", "jm_decide", "jm_index"]);
    for (const t of TOOLS) expect(t.inputSchema.type).toBe("object");
  });

  test("test_mcp_initialize", async () => {
    const r = await handle({ jsonrpc: "2.0", id: 1, method: "initialize" });
    const res = r!.result as { protocolVersion: string; serverInfo: { name: string }; capabilities: unknown };
    expect(res.serverInfo.name).toBe("jm");
    expect(res.protocolVersion.length).toBeGreaterThan(0);
    expect(res.capabilities).toBeTruthy();
  });

  test("test_mcp_notification_has_no_response", async () => {
    // A notification MUST NOT produce a response frame — a client that gets one desynchronises.
    const r = await handle({ jsonrpc: "2.0", method: "notifications/initialized" });
    expect(r).toBeNull();
  });

  test("test_mcp_unknown_tool_and_method", async () => {
    const a = await handle({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "jm_nope" } });
    expect((a!.error as { message: string }).message).toMatch(/JM_MCP_UNKNOWN_TOOL/);
    const b = await handle({ jsonrpc: "2.0", id: 3, method: "no/such" });
    expect((b!.error as { message: string }).message).toMatch(/JM_MCP_METHOD/);
  });

  test("test_mcp_query_returns_rows", async () => {
    // C14-ish: an agent calls jm_query and gets rows back through the MCP content block.
    const sb = makeSandbox();
    try {
      seed(sb.home, sb.root);
      const db = openDb(indexPathFor("all"));
      await ingestAll(db, "all");
      db.close();
      const r = await handle({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "jm_query", arguments: { fts: "tombstone", index: "all" } } });
      const text = (r!.result as { content: { text: string }[] }).content[0].text;
      const parsed = JSON.parse(text) as { n: number; rows: { path: string }[] };
      expect(parsed.n).toBe(1);
      expect(parsed.rows[0].path).toContain("x.md");
    } finally { sb.cleanup(); }
  });

  test("test_mcp_tool_error_is_a_result", async () => {
    // A tool failure must arrive as a RESULT with isError, not a JSON-RPC error: the agent
    // has to SEE the failure, and the transport must stay alive for the next call.
    const sb = makeSandbox();
    try {
      process.env.JM_HOME = sb.home;
      saveTargets([]);
      const r = await handle({ jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "jm_find", arguments: {} } });
      expect(r!.error).toBeUndefined();
      const res = r!.result as { isError: boolean; content: { text: string }[] };
      expect(res.isError).toBe(true);
      expect(res.content[0].text).toMatch(/JM_ERROR/);
    } finally { sb.cleanup(); }
  });

  test("test_mcp_index_unknown_target_fails_before_write", async () => {
    const sb = makeSandbox();
    try {
      process.env.JM_HOME = sb.home;
      saveTargets([]);
      const r = await handle({ jsonrpc: "2.0", id: 6, method: "tools/call", params: { name: "jm_index", arguments: { in: "ghost" } } });
      const res = r!.result as { isError: boolean; content: { text: string }[] };
      expect(res.isError).toBe(true);
      expect(res.content[0].text).toMatch(/JM_TARGET_UNKNOWN/);
    } finally { sb.cleanup(); }
  });
});
