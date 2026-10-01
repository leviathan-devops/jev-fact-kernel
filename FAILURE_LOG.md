# FAILURE_LOG — the fact kernel

Every derailment THIS BUILD committed or avoided, with its signature.

| # | the derailment | the signature | the kill |
|---|---|---|---|
| 1 | **editing without re-driving** (EN-119) | the probe crashed for a whole commit span; nobody ran it | every fix re-runs its subject |
| 2 | **a /tmp control** (x2 — the T0 control and the probe controls) | a control deleted between runs; its absence read as a pass | the controls live in `fixtures/` |
| 3 | **a code that means two things** (exit 1 = lies OR crash; exit 0 = clean OR unread) | a crash blocked an honest server | split the code; a verdict requires its evidence |
| 4 | **a mislabeled control** (EN-118) | the derivation printed a pass from an inverted gap | read the controls, not the gap |
| 5 | **a question that enumerates** (EN-116) | pass-1 routed real claims to NONE at 0.51 | state the class; the enumeration became the definition |
| 6 | **an unbounded read** (EN-117) | `timeout(1)` exit 124 on both servers | `select()` with a deadline |
| 7 | **the right check on the wrong carrier** (the spec gate's first version) | pre-commit cannot see the message; it refused its own seed commit | the `commit-msg` carrier |

**THE RECURRING CLASS:** an instrument whose flaw and whose finding point the same way. It has
appeared SEVEN times in this build. The only defence that held was DRIVING THE CONTROL.
