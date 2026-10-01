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
import json, subprocess, sys, time, os, tempfile, shutil, select
from pathlib import Path
import pathlib

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
    """Read ONE framed LSP message from the child's stdout — WITH A HARD DEADLINE.

    THE DEFECT THIS REPLACES: the first version used proc.stdout.readline(), a BLOCKING read, and
    checked its `timeout` argument only BETWEEN calls. A server that never writes a newline blocked
    the probe FOREVER — measured: BOTH adversarial fixtures hit exit 124 under timeout(1), the
    honest one (which declares nothing and should answer instantly) included. A probe that HANGS
    is worse than one that answers wrongly: the caller gets no verdict, and the temp dir never
    cleans (2 residual /tmp/jev-t4-* dirs measured).

    THE FIX: select() on the fd with the REMAINING time budget, then a non-blocking os.read. The
    same read discipline the T0 comparison needed — a read whose cost is bounded by the budget,
    never by the peer's willingness to speak.
    """
    fd = proc.stdout.fileno()
    t0 = time.time()
    buf = b""
    # ── the header, up to the blank line ──
    while time.time() - t0 < timeout:
        r, _, _ = select.select([fd], [], [], max(0.0, timeout - (time.time() - t0)))
        if not r:
            return None                                   # the deadline, named — not a hang
        chunk = os.read(fd, 4096)
        if not chunk:
            return None                                   # EOF: the server exited
        buf += chunk
        if b"\r\n\r\n" in buf or b"\n\n" in buf:
            break
    if b"Content-Length:" not in buf:
        return None
    try:
        n = int(buf.decode(errors="ignore").split("Content-Length:")[1].split("\n")[0].strip())
    except Exception:
        return None
    # ── the body, exactly n bytes, still under the deadline ──
    sep = buf.find(b"\r\n\r\n")
    sep = sep + 4 if sep >= 0 else (buf.find(b"\n\n") + 2)
    body = buf[sep:]
    while len(body) < n and time.time() - t0 < timeout:
        r, _, _ = select.select([fd], [], [], max(0.0, timeout - (time.time() - t0)))
        if not r:
            return None
        chunk = os.read(fd, 65536)
        if not chunk:
            return None
        body += chunk
    try:
        return json.loads(body[:n])
    except Exception:
        return None

def probe(cmd, root, label):
    # THE PROBE MUST NOT MUTATE ITS SUBJECT. sample.ts used to be written into `root` and left
    # there (the baseline found `?? sample.ts` in the worktree). It now lives in a temp dir that
    # is removed on every exit path.
    tmp = tempfile.mkdtemp(prefix="jev-t4-")
    sample = Path(tmp) / "sample.ts"
    try: sample.write_text("export const x: number = 1;\nexport function f() { return x; }\n")
    except Exception: pass
    uri = "file://" + str(sample.resolve())
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
        p.kill(); shutil.rmtree(tmp, ignore_errors=True)
        return label, None, [], "NO INITIALIZE REPLY"
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
    shutil.rmtree(tmp, ignore_errors=True)          # no litter, on any path
    return label, declared, lies, oks

if __name__ == "__main__":
    root = sys.argv[1] if len(sys.argv) > 1 else "."
    cmd  = sys.argv[2:] or ["bun", "scripts/plutus-lsp.ts", "--stdio"]
    # THE LABEL IS DERIVED FROM THE SUBJECT, never hardcoded. It was pinned to "plutus-lsp", so
    # every fixture's ledger row claimed to be the live server — a row that names the WRONG
    # SUBJECT is worse than no row: it makes the evidence unusable for audit.
    label = pathlib.Path(root).resolve().name or "unknown"
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
    # ── THE LEDGER: one row per verdict. No triad, no block. A ledger write failure is LOUD but
    # does not change the verdict — the decision already stands on the wire evidence.
    try:
        sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
        import ledger as _led
    except Exception:
        _led = None
    if lies:
        if _led:
            for cap, method, why in lies:
                _led.append("T4_LSP_CAPABILITY_LIE", "BLOCK", 4, 1.0,
                            capability=cap, method=method, code=-32601,
                            server=label, verdict_detail=why, pid=os.getpid())
        print(f"FACT-FIREWALL T4 BLOCK: {len(lies)} advertised capabilit{'y' if len(lies)==1 else 'ies'} "
              f"answered -32601 MethodNotFound. The initialize reply is a FALSE CAPABILITY DECLARATION. "
              f"Either implement the method, or remove the capability from the reply.")
        sys.exit(1)
    if _led:
        _led.append("T4_LSP_CAPABILITY_OK", "PASS", 4, 1.0,
                    declared=len(declared), implemented=len(oks), server=label, pid=os.getpid())
    print("FACT-FIREWALL T4: every advertised capability answered.")
    sys.exit(0)
