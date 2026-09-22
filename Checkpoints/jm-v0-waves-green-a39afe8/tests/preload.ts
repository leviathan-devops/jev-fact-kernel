// tests/preload.ts — THE HERMETICITY PRELOAD.
//
// WHY THIS FILE EXISTS: six test files point the judge at a LOCAL endpoint (`JM_JUDGE_URL`) so the
// outage/usage/policy paths are reachable — but `requireKey()` gates the call BEFORE any network
// happens, so those tests need a key to be PRESENT even though no real API is ever contacted.
//
// On the author's machine that key came from an AMBIENT FILE (`~/.config/typesafe/key`), so the
// suite passed there and **failed in a fresh container with 9 errors** — `JEV_NO_KEY` — while
// reporting 217/0 on the host. MEASURED, both sides:
//
//   host        ~/.config/typesafe/key present  -> 217 pass / 0 fail
//   container   no key file, no env var         -> 208 pass / 9 fail
//
// **A SUITE THAT NEEDS AN AMBIENT CREDENTIAL IS NOT HERMETIC**, and a green battery that depends on
// the author's home directory is a claim about the author's machine, not about the code. This
// preload supplies a placeholder so the suite runs anywhere — including CI, a fresh clone, and a
// container — with no key on the box.
//
// It is deliberately `??=` (only when absent): a developer who exports a REAL key still exercises
// that path, and the tests that specifically prove the KEYLESS behaviour delete the variable
// themselves (`phantom-artifacts`, `retrieve`), which keeps those paths honest.
process.env.TYPESAFE_API_KEY ??= "hermetic-placeholder-not-a-real-key";
