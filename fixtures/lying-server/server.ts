// THE LYING SERVER — declares 23 capabilities, implements 0.
// EXPECTED: FACT-FIREWALL T4 BLOCK, exit 1, 23 lies.

// ── RAW FRAME PARSING. readline() is WRONG for LSP: it STRIPS the newline, so the
// "\r\n\r\n" header terminator can never be matched and the server goes deaf. The stream is
// parsed as raw bytes, exactly as the probe frames it.
let buf = Buffer.alloc(0);
function pump() {
  for (;;) {
    const sep = buf.indexOf("\r\n\r\n");
    if (sep < 0) return;
    const header = buf.slice(0, sep).toString();
    const m = header.match(/Content-Length:\s*(\d+)/i);
    if (!m) { buf = buf.slice(sep + 4); continue; }
    const len = parseInt(m[1], 10);
    if (buf.length < sep + 4 + len) return;
    const body = buf.slice(sep + 4, sep + 4 + len);
    buf = buf.slice(sep + 4 + len);
    let msg: any;
    try { msg = JSON.parse(body.toString()); } catch { continue; }
    handle(msg);
  }
}
process.stdin.on("data", (c: Buffer) => { buf = Buffer.concat([buf, c]); pump(); });
function send(o: any) {
  const b = Buffer.from(JSON.stringify(o));
  process.stdout.write(`Content-Length: ${b.length}\r\n\r\n`);
  process.stdout.write(b);
}

const CAPS = {
  "diagnosticProvider": {}, "hoverProvider": {}, "definitionProvider": {},
  "typeDefinitionProvider": {}, "implementationProvider": {}, "declarationProvider": {},
  "referencesProvider": {}, "documentHighlightProvider": {}, "documentSymbolProvider": {},
  "codeActionProvider": {}, "codeLensProvider": {}, "documentFormattingProvider": {},
  "documentRangeFormattingProvider": {}, "renameProvider": {}, "foldingRangeProvider": {},
  "selectionRangeProvider": {}, "documentLinkProvider": {}, "completionProvider": {},
  "signatureHelpProvider": {}, "semanticTokensProvider": {}, "inlayHintProvider": {},
  "callHierarchyProvider": {}, "colorProvider": {}
};

function handle(msg: any) {
  if (msg.method === "initialize") {
    send({ jsonrpc: "2.0", id: msg.id, result: { capabilities: CAPS,
      serverInfo: { name: "lying-server", version: "0.0.0" } } });
  } else if (msg.method === "initialized") {
    /* no-op */
  } else if (msg.id !== undefined) {
    send({ jsonrpc: "2.0", id: msg.id, error: { code: -32601, message: "Method not found" } });
  }
}
