# CURRENT_STATE — the Jev fact kernel

**The mission:** a false claim is mechanically detectable and blockable at the moment it is made,
and a lying LSP server cannot register.

**The mechanism:** take the CLAIMED SUBJECT, ask the DISK, let the MISMATCH be the finding. The
kernel NEVER reads prose. A local Jev judge enters only where a machine cannot answer.

**The branch:** feat/jev-fact-kernel · **The spec:** specs/DPL1_JEV_FACT_KERNEL.md (sha16
1f0339511782204f).

**The state:** BATTERY GREEN (PASS=10 FAIL=0 UNMEASURED=0). Ten commits, all FR-cited, all through
the spec gate. The LSP-registration gate BLOCKS a server declaring 23 capabilities and implementing
0, and REGISTERS one that declares nothing.

**What is NOT built:** FR-8's tool_call half, T1 (grounding), T2's code path, the jarvis-upper
enrollment (needs a GitHub repo that does not yet exist), and the ship docs.
