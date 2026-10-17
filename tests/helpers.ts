// tests/helpers.ts - the sandbox: every test gets its own JM_HOME + fixture tree.
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

export function makeSandbox(): { home: string; root: string; cleanup: () => void } {
  const home = mkdtempSync(join(tmpdir(), "jm-home-"));
  const root = mkdtempSync(join(tmpdir(), "jm-corpus-"));
  // REMEMBER WHAT WE OVERWROTE. These are process-global, and a sandbox that sets them without
  // restoring them leaks a DELETED path into every test that runs afterwards: the next test spawns a
  // child, the child inherits `JM_LEDGER=/tmp/jm-home-XXXX/ledger.jsonl`, and the ledger lands in a
  // directory that no longer exists instead of the one that test just made. MEASURED: a job reported
  // `JM_QUEUED done=1 files=1` while its own sandbox held no `ledger.jsonl` at all — the write went
  // to a previous sandbox's path. The same class as the container rig's H-6/H-7 (an env var set and
  // not restored), in the test layer, where it silently corrupts OTHER tests' fixtures.
  const prevHome = process.env.JM_HOME;
  const prevLedger = process.env.JM_LEDGER;
  process.env.JM_HOME = home;
  process.env.JM_LEDGER = join(home, "ledger.jsonl");
  return {
    home, root,
    // CLEANUP IS BEST-EFFORT BY CONTRACT: the temp dirs may already be gone (a test that
    // removed them itself, or a raced OS sweep), and a cleanup failure must NEVER turn a
    // green test red. The errors are intentionally ignored here and nowhere else.
    cleanup: () => {
      // RESTORE THE ENVIRONMENT AS WELL AS THE DISK — `undefined` restores by DELETE, because
      // assigning it stores the literal string "undefined" and `??` would then treat it as set.
      if (prevHome === undefined) delete process.env.JM_HOME; else process.env.JM_HOME = prevHome;
      if (prevLedger === undefined) delete process.env.JM_LEDGER; else process.env.JM_LEDGER = prevLedger;
      try { rmSync(home, { recursive: true, force: true }); } catch { /* best-effort: see above */ }
      try { rmSync(root, { recursive: true, force: true }); } catch { /* best-effort: see above */ }
    },
  };
}

/** A judge endpoint bound with `port: 0` that accepts the TCP handshake and then closes.
 *  Outage tests need every call to fail. A fixed port is not a mock — it can be taken, and
 *  it is not the process-local server the suite is allowed to call. The OS assigns the port;
 *  `socket.end()` drops the request before any HTTP response, so the transport sees a network
 *  failure and the retry path runs exactly as it did against a dead port. */
export function closedJudge(): { url: string; stop: () => void } {
  const server = Bun.listen({
    hostname: "127.0.0.1",
    port: 0,
    socket: {
      open(socket) { socket.end(); },
      data() { /* the peer is closed in open; nothing to read */ },
      error() { /* a reset during close is the outage this mock exists to produce */ },
      close() { /* the handshake is over */ },
    },
  });
  return {
    url: `http://127.0.0.1:${server.port}/`,
    stop: () => { server.stop(true); },
  };
}

/** Write a fixture tree: keys are paths RELATIVE to `root`. */
export function fill(root: string, files: Record<string, string>): void {
  for (const [relativePath, body] of Object.entries(files)) {
    const full = join(root, relativePath);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, body);
  }
}

/** A judge endpoint that ECHOES the requested question keys — the documented wire contract
 *  ("answers come back under the same keys", docs.typesafe.ai/api).
 *
 *  WHY THIS EXISTS: the engine BATCHES. A batched request carries one question per item, keyed
 *  `<itemId>__<questionName>`, so a stub that returns a FIXED key (`flag`, `is_instance`, …) answers
 *  nothing and the engine — correctly — raises `JM_JUDGE_ANSWER_COUNT`. Every server stub that
 *  predated batching had that shape; this helper is the faithful replacement. `answer(i, key, q)`
 *  builds the answer for the i-th requested question.
 *
 *  `usage: null` omits the usage block on purpose (the D-046 "unmeasured cost" fixtures). */
export function echoJudge(
  answer: (i: number, key: string, q: Record<string, unknown>) => unknown,
  opts: { model?: string; usage?: { input_tokens: number; output_tokens?: number } | null; onCall?: () => void } = {},
) {
  return async (req: Request): Promise<Response> => {
    opts.onCall?.();
    const body = (await req.json().catch(() => ({}))) as { questions?: Record<string, Record<string, unknown>> };
    const qs = body.questions ?? {};
    const answers: Record<string, unknown> = {};
    const entries = Object.entries(qs);
    if (entries.length === 0) answers.flag = answer(0, "flag", {});
    else entries.forEach(([k, q], i) => { answers[k] = answer(i, k, q); });
    const resp: Record<string, unknown> = { model: opts.model ?? "m", answers };
    if (opts.usage !== null) resp.usage = opts.usage ?? { input_tokens: 5, output_tokens: 1 };
    return Response.json(resp);
  };
}
