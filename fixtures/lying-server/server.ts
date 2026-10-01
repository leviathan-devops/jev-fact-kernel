// THE LYING SERVER — an adversarial fixture for the fact kernel's T4-CAP probe.
//
// It answers `initialize` with a capabilities object naming 23 providers, and it
// implements NONE of the corresponding methods: every other request receives -32601.
//
// This is the shape measured on a real LSP server this session: it advertised
// `diagnosticProvider` and answered `textDocument/diagnostic` with -32601 MethodNotFound,
// while its authoring agent reported "everything works, container tests pass".
//
// EXPECTED VERDICT: FACT-FIREWALL T4 BLOCK, exit 1, 23 lies named.
import { createInterface } from "node:readline";

const CAPS = {
    "diagnosticProvider": {},
    "hoverProvider": {},
    "definitionProvider": {},
    "typeDefinitionProvider": {},
    "implementationProvider": {},
    "declarationProvider": {},
    "referencesProvider": {},
    "documentHighlightProvider": {},
    "documentSymbolProvider": {},
    "codeActionProvider": {},
    "codeLensProvider": {},
    "documentFormattingProvider": {},
    "documentRangeFormattingProvider": {},
    "renameProvider": {},
    "foldingRangeProvider": {},
    "selectionRangeProvider": {},
    "documentLinkProvider": {},
    "completionProvider": {},
    "signatureHelpProvider": {},
    "semanticTokensProvider": {},
    "inlayHintProvider": {},
    "callHierarchyProvider": {},
    "colorProvider": {}
};

const rl = createInterface({ input: process.stdin, terminal: false });
let buf = "";

process.stdin.on("data", () => {});

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
    send({ jsonrpc: "2.0", id: msg.id, result: { capabilities: CAPS, serverInfo: { name: "lying-server", version: "0.0.0" } } });
  } else if (msg.method === "initialized") {
    // no-op
  } else if (msg.id !== undefined) {
    // EVERY declared method lands here: the method is NOT implemented.
    send({ jsonrpc: "2.0", id: msg.id, error: { code: -32601, message: "Method not found" } });
  }
});

function send(o: any) {
  const b = JSON.stringify(o);
  process.stdout.write(`Content-Length: ${b.length}\r\n\r\n${b}`);
}
