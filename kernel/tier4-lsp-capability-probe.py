#!/usr/bin/env python3
"""THE LSP CAPABILITY LIE PROBE — tier 4, the advertised-vs-implemented reconcile.

An LSP server declares its capabilities in the `initialize` reply. Each declared capability is a
PROMISE that a corresponding method is implemented. This probe:

  1. sends `initialize` and captures every declared capability
  2. maps each declared capability to its spec method
  3. calls each method with a minimal valid param
  4. reports -32601 MethodNotFound as A LIE — named, with the capability and the method

It is MECHANICAL: -32601 is a documented JSON-RPC error, not a judgement call.
Exit 0 = every advertised capability answered.  Exit 1 = at least one lie.
"""
import json, subprocess, sys, time, os
from pathlib import Path

# The LSP capability -> the method it PROMISES. (spec 3.17)
CAP2METHOD = {
    "diagnosticProvider":            ("textDocument/diagnostic", {"textDocument": None}),
    "hoverProvider":                 ("textDocument/hover", {"textDocument": None, "position": {"line":0,"character":0}}),
    "definitionProvider":            ("textDocument/definition", {"textDocument": None, "position": {"line":0,"character":0}}),
    "typeDefinitionProvider":        ("textDocument/typeDefinition", {"textDocument": None, "position": {"line":0,"character":0}}),
    "implementationProvider":        ("textDocument/implementation", {"textDocument": None, "position": {"line":0,"character":0}}),
    "declarationProvider":           ("textDocument/declaration", {"textDocument": None, "position": {"line":0,"character":0}}),
    "referencesProvider":            ("textDocument/references", {"textDocument": None, "position": {"line":0,"character":0},"context":{"includeDeclaration":True}}),
    "documentHighlightProvider":     ("textDocument/documentHighlight", {"textDocument": None, "position": {"line":0,"character":0}}),
    "documentSymbolProvider":        ("textDocument/documentSymbol", {"textDocument": None}),
    "codeActionProvider":            ("textDocument/codeAction", {"textDocument": None, "range": {"start":{"line":0,"character":0},"end":{"line":0,"character":1}}, "context": {"diagnostics":[]}}),
    "codeLensProvider":              ("textDocument/codeLens", {"textDocument": None}),
    "documentFormattingProvider":    ("textDocument/formatting", {"textDocument": None, "options":{"tabSize":2,"insertSpaces":True}}),
    "documentRangeFormattingProvider":("textDocument/rangeFormatting", {"textDocument": None, "range":{"start":{"line":0,"character":0},"end":{"line":0,"character":1}}, "options":{"tabSize":2,"insertSpaces":True}}),
    "renameProvider":                ("textDocument/rename", {"textDocument": None, "position": {"line":0,"character":0}, "newName": "x"}),
    "foldingRangeProvider":          ("textDocument/foldingRange", {"textDocument": None}),
    "selectionRangeProvider":        ("textDocument/selectionRange", {"textDocument": None, "positions":[{"line":0,"character":0}]}),
    "documentLinkProvider":          ("textDocument/documentLink", {"textDocument": None}),
    "completionProvider":            ("textDocument/completion", {"textDocument": None, "position": {"line":0,"character":0}}),
    "signatureHelpProvider":         ("textDocument/signatureHelp", {"textDocument": None, "position": {"line":0,"character":0}}),
    "semanticTokensProvider":        ("textDocument/semanticTokens/full", {"textDocument": None}),
    "inlayHintProvider":             ("textDocument/inlayHint", {"textDocument": None, "range":{"start":{"line":0,"character":0},"end":{"line":0,"character":1}}}),
    "callHierarchyProvider":         ("textDocument/prepareCallHierarchy", {"textDocument": None, "position": {"line":0,"character":0}}),
    "colorProvider":                 ("textDocument/documentColor", {"textDocument": None}),
}

def frame(obj):
    b = json.dumps(obj).encode()
    return b"Content-Length: %d\r\n\r\n" % len(b) + b

def read_msg(proc, timeout=8.0):
    """Read ONE framed LSP message from the child's stdout."""
    t0 = time.time()
    buf = b""
    while time.time() - t0 < timeout:
        line = proc.stdout.readline()
        if not line: return None
        buf += line
        if line in (b"\r\n", b"\n"):
            break
    if b"Content-Length:" not in buf: return None
    try: n = int(buf.decode().split("Content-Length:")[1].split("\r\n")[0].strip())
    except Exception: return None
    body = proc.stdout.read(n)
    try: return json.loads(body)
    except Exception: return None

def probe(cmd, root, label):
    uri = "file://" + str(Path(root, "sample.ts").resolve())
    try: Path(root, "sample.ts").write_text("export const x: number = 1;\nexport function f() { return x; }\n")
    except Exception: pass
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                         stderr=subprocess.DEVNULL, cwd=root)
    # 1 · initialize
    p.stdin.write(frame({"jsonrpc":"2.0","id":1,"method":"initialize","params":{
        "processId": os.getpid(), "rootUri": "file://"+str(Path(root).resolve()),
        "capabilities": {}, "workspaceFolders":[{"uri":"file://"+str(Path(root).resolve()),"name":"w"}]}}))
    p.stdin.flush()
    cap = None
    for _ in range(6):
        m = read_msg(p)
        if m and m.get("id") == 1:
            cap = (m.get("result") or {}).get("capabilities") or {}
            break
    if cap is None:
        p.kill(); return label, None, [], "NO INITIALIZE REPLY"
    p.stdin.write(frame({"jsonrpc":"2.0","method":"initialized","params":{}})); p.stdin.flush()

    declared = [k for k, v in cap.items() if v not in (None, False)]
    lies, oks, gaps = [], [], []
    for c in declared:
        if c not in CAP2METHOD:
            gaps.append(c); continue
        method, tmpl = CAP2METHOD[c]
        params = json.loads(json.dumps(tmpl))
        if params.get("textDocument") is None: params["textDocument"] = {"uri": uri}
        mid = 100 + len(lies) + len(oks)
        p.stdin.write(frame({"jsonrpc":"2.0","id":mid,"method":method,"params":params}))
        p.stdin.flush()
        got = None
        for _ in range(4):
            m = read_msg(p, timeout=6.0)
            if m is None: break
            if m.get("id") == mid: got = m; break
        if got is None:
            lies.append((c, method, "NO REPLY (timeout)"))
        elif "error" in got:
            code = got["error"].get("code")
            if code == -32601:
                lies.append((c, method, f"-32601 MethodNotFound"))
            else:
                oks.append((c, method, f"error {code} (implemented)"))
        else:
            oks.append((c, method, "answered"))
    try: p.stdin.write(frame({"jsonrpc":"2.0","id":999,"method":"shutdown","params":{}})); p.stdin.flush()
    except Exception: pass
    p.kill()
    return label, declared, lies, oks

if __name__ == "__main__":
    root = sys.argv[1] if len(sys.argv) > 1 else "."
    cmd  = sys.argv[2:] or ["bun", "scripts/plutus-lsp.ts", "--stdio"]
    label, declared, lies, oks = probe(cmd, root, "plutus-lsp")
    if declared is None:
        print(f"FACT-FIREWALL T4: {lies}"); sys.exit(2)
    print(f"  ADVERTISED CAPABILITIES: {len(declared)}")
    for c in declared: print(f"    · {c}")
    print()
    print(f"  IMPLEMENTED ({len(oks)}):")
    for c, m, why in oks: print(f"    OK   {c:<34} {m:<40} {why}")
    print()
    print(f"  ★ LIES ({len(lies)}) — DECLARED BUT NOT IMPLEMENTED:")
    for c, m, why in lies: print(f"    LIE  {c:<34} {m:<40} {why}")
    print()
    if lies:
        print(f"FACT-FIREWALL T4 BLOCK: {len(lies)} advertised capabilit{'y' if len(lies)==1 else 'ies'} "
              f"answered -32601 MethodNotFound. The initialize reply is a FALSE CAPABILITY DECLARATION. "
              f"Either implement the method, or remove the capability from the reply.")
        sys.exit(1)
    print("FACT-FIREWALL T4: every advertised capability answered.")
    sys.exit(0)
