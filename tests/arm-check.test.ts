// tests/arm-check.test.ts — the arm check blocks a known-bad commit.
//
// The mode file is `~/.jev-gates/mode`. A line whose trimmed text is ARMED turns the
// check on. The judge in this test is a mock bound with port 0. Nothing here dials
// 8090 or 18090.
import { expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { armCheckCommit } from "../src/gates/arm-check.ts";
import { openDb } from "../src/store/db.ts";

const KNOWN_BAD = {
  message: "KNOWN_BAD_COMMIT all tests pass",
  diff: "a claim with no named run and no named pass",
};

test("test_arm_check_blocks_known_bad_commit", async () => {
  const dir = mkdtempSync(join(tmpdir(), "jev-arm-"));
  const modeFile = join(dir, "mode");
  writeFileSync(modeFile, "ARMED\n");
  let calls = 0;
  let seenPort = 0;
  const server = Bun.serve({
    port: 0,
    async fetch(req) {
      const url = new URL(req.url);
      seenPort = Number(url.port);
      if (req.method === "GET") return new Response("no", { status: 404 });
      calls += 1;
      const body = (await req.json().catch(() => ({}))) as { questions?: Record<string, unknown> };
      const raw = JSON.stringify(body);
      const noul = raw.includes("KNOWN_BAD_COMMIT") ? 0.05 : 0.91;
      const answers: Record<string, unknown> = {};
      for (const key of Object.keys(body.questions ?? {})) answers[key] = { type: "noul", noul };
      return Response.json({ model: "mock-judge", answers, usage: { input_tokens: 5, output_tokens: 1 } });
    },
  });
  const prevUrl = process.env.JM_JUDGE_URL;
  const prevMode = process.env.JEV_GATES_MODE_FILE;
  const prevMock = process.env.JM_MOCK_DIR;
  process.env.JM_JUDGE_URL = `http://127.0.0.1:${server.port}/v1/systemone`;
  process.env.JEV_GATES_MODE_FILE = modeFile;
  delete process.env.JM_MOCK_DIR;
  const db = openDb(join(dir, "index.sqlite"));
  try {
    const port = server.port;
    if (port === undefined) throw new Error("mock judge did not bind a port");
    expect(port).toBeGreaterThan(0);
    expect(port).not.toBe(8090);
    expect(port).not.toBe(18090);

    const blocked = await armCheckCommit(db, KNOWN_BAD);
    expect(blocked.mode).toBe("ARMED");
    expect(blocked.verdict).toBe("BLOCK");
    expect(blocked.requests).toBeGreaterThan(0);
    expect(calls).toBeGreaterThan(0);
    expect(seenPort).toBe(port);

    writeFileSync(modeFile, "DARK\n");
    const callsAtDark = calls;
    const dark = await armCheckCommit(db, KNOWN_BAD);
    expect(dark.verdict).toBe("DARK");
    expect(dark.requests).toBe(0);
    expect(calls).toBe(callsAtDark);

    writeFileSync(modeFile, "ARMED\n");
    const allowed = await armCheckCommit(db, {
      message: "fix(tests): pin the named refusal",
      diff: "expect(code).toBe(2)",
    });
    expect(allowed.verdict).toBe("ALLOW");
    expect(allowed.requests).toBeGreaterThan(0);
  } finally {
    db.close();
    server.stop(true);
    if (prevUrl === undefined) delete process.env.JM_JUDGE_URL;
    else process.env.JM_JUDGE_URL = prevUrl;
    if (prevMode === undefined) delete process.env.JEV_GATES_MODE_FILE;
    else process.env.JEV_GATES_MODE_FILE = prevMode;
    if (prevMock === undefined) delete process.env.JM_MOCK_DIR;
    else process.env.JM_MOCK_DIR = prevMock;
    rmSync(dir, { recursive: true, force: true });
  }
});

test("test_arm_check_refuses_live_judge_ports_before_a_socket", async () => {
  const dir = mkdtempSync(join(tmpdir(), "jev-arm-live-"));
  const modeFile = join(dir, "mode");
  writeFileSync(modeFile, "ARMED\n");
  const prevUrl = process.env.JM_JUDGE_URL;
  const prevMode = process.env.JEV_GATES_MODE_FILE;
  process.env.JM_JUDGE_URL = "http://127.0.0.1:8090/v1/systemone";
  process.env.JEV_GATES_MODE_FILE = modeFile;
  const db = openDb(join(dir, "index.sqlite"));
  try {
    const blocked = await armCheckCommit(db, KNOWN_BAD);
    expect(blocked.verdict).toBe("BLOCK");
    expect(blocked.requests).toBe(0);
    expect(blocked.reason).toContain("8090");
  } finally {
    db.close();
    if (prevUrl === undefined) delete process.env.JM_JUDGE_URL;
    else process.env.JM_JUDGE_URL = prevUrl;
    if (prevMode === undefined) delete process.env.JEV_GATES_MODE_FILE;
    else process.env.JEV_GATES_MODE_FILE = prevMode;
    rmSync(dir, { recursive: true, force: true });
  }
});
