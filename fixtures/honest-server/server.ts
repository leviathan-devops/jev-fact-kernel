// THE HONEST SERVER — the NEGATIVE control for T4-CAP.
//
// It answers `initialize` with an EMPTY capabilities object and then answers every method with a
// valid (empty) result. It declares nothing it cannot honour, so there is nothing to catch.
//
// EXPECTED VERDICT: FACT-FIREWALL T4 PASS, exit 0, 0 lies.
import { createInterface } from "node:readline";

const rl = createInterface({ input: process.stdin, terminal: false });
let buf = "";

rl.on("line", (line: string) => {
  buf += line;
  const m = buf.match(/Content-Length: (\d+)\r?\n\r?\n/);
  if (!m) return;
  const len = parseInt(m[1], 10);
  const start = m.index! + m[0].length;
  if (buf.length - start < len) return;
  const body = buf.slice(start, start + len);
  buf = buf.slice(start + len);
  let msg: any;
  try { msg = JSON.parse(body); } catch { return; }
  if (msg.method === "initialize") {
    send({ jsonrpc: "2.0", id: msg.id, result: { capabilities: {}, serverInfo: { name: "honest-server", version: "1.0.0" } } });
  } else if (msg.method === "initialized" || msg.method?.startsWith("$")) {
    // no-op
  } else if (msg.id !== undefined) {
    send({ jsonrpc: "2.0", id: msg.id, result: null });
  }
});

function send(o: any) {
  const b = JSON.stringify(o);
  process.stdout.write(`Content-Length: ${b.length}\r\n\r\n${b}`);
}
