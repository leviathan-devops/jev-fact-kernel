#!/usr/bin/env python3
# THE POSITIVE CONTROL for T0 — must produce 3 hits.
import subprocess, time
t0 = time.time()
p = subprocess.Popen(["node", "srv.js"], stdout=subprocess.PIPE)
buf = b""
while time.time() - t0 < 60:
    ch = p.stdout.read(1)
    buf += ch
    if b'"id":2' in buf:
        break
elapsed = time.time() - t0
print(f"the server took {elapsed:.2f}s to answer")
