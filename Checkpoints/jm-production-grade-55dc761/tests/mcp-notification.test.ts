// tests/mcp-notification.test.ts — D-051: a notification must not be answered.
//
// JSON-RPC 2.0: "A Notification is a Request object without an `id` member… The Server MUST NOT
// reply to a Notification." `req.id ?? null` made the two indistinguishable, so a `tools/call`
// sent without an id came back as `{"id":null,"result":…}` — a frame the client is not reading,
// which it can then mis-parse as the answer to a LATER request. A wrong answer to the wrong
// question is the worst failure shape on a protocol surface: nothing errors, and the agent acts on
// another request's result.
//
// Both halves are pinned, because the obvious fix (drop anything without an id) would break
// fire-and-forget: a notification is PROCESSED, only its reply is suppressed.
import { describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { handle } from "../src/mcp";

const INIT = { jsonrpc: "2.0" as const, id: 1, method: "initialize", params: {} };

describe("D-051 — the JSON-RPC notification rule", () => {
  test("test_mcp_notification_gets_no_reply — the negative half", async () => {
    // A tools/call with NO id member: a notification. No frame may be produced.
    const out = await handle({ jsonrpc: "2.0", method: "tools/call", params: { name: "jev_query", arguments: {} } } as never);
    expect(out).toBeNull();
  });

  test("test_mcp_notification_unknown_method_also_silent — an error is still not a reply", async () => {
    // Per the spec the MUST NOT reply applies to notifications of every kind, including ones whose
    // method is unknown. Answering here would re-introduce the same mis-parse.
    const out = await handle({ jsonrpc: "2.0", method: "tools/nonexistent" } as never);
    expect(out).toBeNull();
  });

  test("test_mcp_request_with_id_still_replies — the positive half", async () => {
    const out = await handle(INIT as never);
    expect(out).not.toBeNull();
    expect((out as { id: number }).id).toBe(1);
    expect((out as { result: unknown }).result).toBeTruthy();
  });

  test("test_mcp_explicit_null_id_is_a_REQUEST — present-but-null is not absent", async () => {
    // The spec discourages `id: null`, but it IS an id member, so the caller is waiting for a reply.
    const out = await handle({ jsonrpc: "2.0", id: null, method: "ping" } as never);
    expect(out).not.toBeNull();
    expect((out as { id: null }).id).toBeNull();
  });

  test("test_mcp_notification_STILL_EXECUTES — fire-and-forget means processed, not ignored", async () => {
    // The half that a naive fix breaks: a notification's method must run. Probed live: a
    // notification-shaped jev_index created the index file while emitting no frame.
    // NOTE: the argument is `index`, which the tool's schema declares. This test first passed
    // `name` — an undeclared key, silently ignored, so the write landed in `all.sqlite` and the
    // assertion failed. Standard JSON-Schema semantics (unknown keys ignored), and a reminder that
    // a test's own argument names are part of what it is testing.
    const home = mkdtempSync(join(tmpdir(), "jm-notif-"));
    const corpus = join(home, "corpus");
    mkdirSync(corpus, { recursive: true });
    writeFileSync(join(corpus, "a.md"), "a body");
    const prev = process.env.JM_HOME;
    process.env.JM_HOME = home;
    try {
      const out = await handle({ jsonrpc: "2.0", method: "tools/call", params: { name: "jev_index", arguments: { in: corpus, index: "notif" } } } as never);
      expect(out).toBeNull();                                     // no reply…
      expect(existsSync(join(home, "index", "notif.sqlite"))).toBe(true);   // …but the work happened
    } finally {
      if (prev === undefined) delete process.env.JM_HOME; else process.env.JM_HOME = prev;
      rmSync(home, { recursive: true, force: true });
    }
  });
});