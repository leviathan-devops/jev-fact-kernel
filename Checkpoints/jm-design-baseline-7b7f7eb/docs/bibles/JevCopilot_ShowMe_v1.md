# Jev in-session OMP copilot — ShowMe v1

EXPLAIN + PLAN (2026-09-19). Research is README-level; copilot is not built.
TYPESAFE_API_KEY absent this host. Best v1 = Foreman-on-attachDesk, not JevSeek.

## Research depth

- Discord REST: 30 unique github URLs (cutoff 2026-09-17).
- Harvest: 30 READMEs + git ls-remote HEAD SHA.
- Digests: 9 jev-core + 21 adjacent.
- Local: typesafe-ai/SKILL.md, jev-deep-research.md (31008 B),
  jev-engineering-journal-researcher-boot.md, research_qwen_rlcd_vs_jev_analysis.md.
- Live POST /v1/systemone: zero. Env TYPESAFE count=0.
- Artifact: JARVIS_DISCORD/reports/JEV_STACK_FIT.md (118 lines).

## Verdict

Jev judges. The OMP agent writes. attachDesk.steer / interrupt is the actuator
(JARVIS/src/attach.ts:92-100). Foreman (209182dac7a3) is the template:
nine Noul questions, Python/TS policy, concurrent watch loop.
JevSeek (030d59114a03) selects tools — wrong first copilot for an existing agent.

## Plan v1

1. Seal TYPESAFE_API_KEY like Discord token.
2. Tick: screen() + semantic() bounded → system_one noul x9.
3. Policy CONTINUE / STEER / INTERRUPT / ESCALATE (Foreman thresholds).
4. Act only via attachDesk. Never register Jev as a worker tool.
5. Debounce 5s. Fail closed on missing key / 401.

P0 operator: mint key, then order build.
DPL1 handoff: trident-deep-planning (script-test + container suite).
