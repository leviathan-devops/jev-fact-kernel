#!/usr/bin/env python3
# THE NEGATIVE CONTROL for T0 — must produce 0 hits.
import subprocess, time, os, select
t0 = time.time()
p = subprocess.Popen(["node", "srv.js"], stdout=subprocess.PIPE, bufsize=0)
fd = p.stdout.fileno()
buf = b""
while time.time() - t0 < 60:
    r, _, _ = select.select([fd], [], [], 1)
    if not r:
        continue
    chunk = os.read(fd, 65536)
    if not chunk:
        break
    buf += chunk
    if b'"id":2' in buf:
        break
print(f"the server took {time.time()-t0:.2f}s to answer")
