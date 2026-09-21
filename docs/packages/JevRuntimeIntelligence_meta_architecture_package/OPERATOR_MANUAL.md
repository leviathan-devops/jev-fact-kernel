# OPERATOR MANUAL — Jev-in-loop runtime kernel

Companion: BLUEPRINT.md (why) · BIBLE.md (what) · this file (how you run it)

Your job: keep workflow in code; put Jev only on closed questions; never ship
without TYPESAFE_API_KEY if Jev is on the complete/ship path.

## Cold start (this host)

1. Confirm Paragon V2 boilerplate exists:
   `OPENCODE_WORKSPACE/.../Paragon_V2_Behavior_Algorithms/`
   Battery claim in IMPLEMENTED.md: 237 pass / 0 fail (2026-09-01). Re-run
   `bun test` in THAT directory before you trust the number today.
2. Confirm TypeSafe key in the process env (not in git, not in logs):
   `printenv TYPESAFE_API_KEY | wc -c`  — must be > 0. Do not print the value.
3. Confirm TTSR: `ttsr.enabled=true` in omp config. Behavioral rules are still
   ZERO on this host (skill note 2026-09-18). Jev does not replace that gap.
4. Do not start OpenFang for this kernel. Discord I/O is unrelated.

## Daily use — the four calls you actually make

| When | You do | Jev question | You do with the answer |
|------|--------|--------------|------------------------|
| After a tool batch | pass last tool names + one claim | theatrical? looping? | block /done or steer |
| Paragon dampen band | nothing extra if you wired jevGuard | intent ENFORCE? | machine already steps |
| Before you type done | run the evidence noul | command output exist? | only then /done |
| GI hunt list | noul each candidate snippet | real defect? | keep/drop the hit |

You never "ask Jev to review the repo".

## Symptom -> action

| You see | Do this | Do NOT |
|---------|---------|--------|
| Goal completed with no test command in the log | refuse /done; run evidence noul | argue with the model |
| Same 3 tools repeating | noul looping; if high, interrupt | keep waiting |
| JEV_NO_KEY / 401 | stop. set key. no skip | "continue without Jev" |
| JEV_TIMEOUT | continue this turn; log it | invent a noul of 0 |
| TTSR never fires | `omp ttsr test` the phrase; restart omp | add Jev to the rule file |
| Aether SHIP with prose "Jev said ok" | fail the GATE | accept the paragraph |
| JESL UNKNOWN-NODE on jev-noul | kind not in registry; do not ship the card | rename the node to oracle |
| Paragon OFF still idle on bait | working as designed (kill switch) | turn Jev up |
| Muse TE 4-6/turn, Jev STEER storm | recalibrate; do not lower Paragon thresholds | delete families |

## Recovery runbook

1. Key missing: export TYPESAFE_API_KEY from your secret store; restart the
   omp session so the ctor sees it. Sessions do not hot-load env.
2. Jev 401: key revoked. Rotate. Same fail-closed.
3. False STEER: dump last 50 log.jsonl rows (state, answers, later-truth).
   Raise the noul bar for THAT question. Do not touch machine.ts.
4. Paragon never lifts: check role-gate (user text dropped), level!=OFF,
   frames actually emitted by THIS model (D-matrix coverage boundary).
5. TTSR silent: thinking not in scope; rule loaded at session start only;
   invalid regex skipped. Fix the rule, restart omp, live-trap once.
6. JESL card red: run the card's vitest; check frozen token; do not invent
   a 9th bracketed string.

## What you never do

- Paste tool dumps into Jev
- Put Jev in TTSR `condition:`
- Replace CHECK lines with Jev prose
- Block tools because Jev is slow
- Close the escape hatch with a noul
- Commit the API key
- Claim the kernel is BUILT — jevGuard.ts is PROPOSED in this package
