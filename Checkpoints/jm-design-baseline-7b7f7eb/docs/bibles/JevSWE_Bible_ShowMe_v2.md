# Jev-Enhanced SWE Bible v2

**Law:** Keep the workflow in code. Insert Jev only where `if` on strings
would be a pile of regex.

**This file** folds v1 (the law) into the **macro context of this workspace**:
JDM, OMP desks, attach, harvest of 30 GitHub repos, community session
plugins, TypeSafe docs. v1 is not overwritten (`JevSWE_Bible_ShowMe_v1.md`).

**Class:** BUILT / HARVESTED / PROPOSED / REJECTED as in
`JevOmpCopilot_Master_Blueprint_v1.md`.

---

## MACRO CONTEXT (this host, this session)

```
┌────────────────────────────────────────────────────┐
│ YOU  operator  keys  thresholds  next-pick         │
└──────────────────────┬─────────────────────────────┘
                       ▼
┌────────────────────────────────────────────────────┐
│ OMP session  Spark writes code  bash/edit/read     │
│ optional: omp-jev-compaction HOOK (community)      │
│ optional: jev-mcp TOOLS (agent calls Jev)          │
│ optional: typesafe-ai SKILL (agent writes Jev code)│
└──────────────────────┬─────────────────────────────┘
         ┌─────────────┼─────────────┐
         ▼             ▼             ▼
┌──────────────┐ ┌──────────┐ ┌──────────────┐
│ JDM 15 tools │ │ desks    │ │ YOUR product │
│ Discord REST │ │ attach   │ │ if + Jev     │
│ LIVE         │ │ hardSteer│ │ PROPOSED     │
└──────────────┘ └──────────┘ └──────────────┘
         Jev is NONE of those boxes until you
         put systemOne() in CODE or a hook.
```
width=54. JDM path:
`JARVIS/extension/jarvis-discord-manager.ts` +
`~/.omp/agent/extensions/jarvis-discord-manager.js`.
Attach: `JARVIS/src/attach.ts`. Discord != Jev.

What we already measured: 30 Discord GitHub URLs, 9 jev-core READMEs,
FIT map `JARVIS_DISCORD/reports/JEV_STACK_FIT.md`, community writeup
`JARVIS_DISCORD/reports/JEV_LIVE_SESSION_COMMUNITY.md`, no
`TYPESAFE_API_KEY` on this host.

---

## 0. THE ONE LAW (unchanged)

Software stays software. Jev is the opcode for **meaning**, not shape.

```
┌────────────────────────────────────────────────────┐
│ Q: would this if become a pile of regex?           │
│   NO  → parser / SQL / count / date / hash         │
│   YES → declare answers, systemOne, if on floats   │
└────────────────────────────────────────────────────┘
```

Regex-pile = synonyms, intent, relevance, done-ness, keep/drop of tool
JSON, "which bucket" when buckets are semantic.

---

## 1. WHAT JEV IS (converged metaphors, corrected)

| You said | Keep | Kill |
|---|---|---|
| structured in, decision out | YES | — |
| intuition, no thinking | YES (System One) | "thinking computer" |
| decision GPU | parallel question dispatch | rendering chains |
| shell compiler | closed ISA you defined | compiling programs |

TypeSafe: *AI-powered software, not agents. Code owns workflow.*
https://docs.typesafe.ai/concepts/how-to-build-with-system-one.md

RLCD trains decisions + calibrated probabilities, not chat (RLHF) and not
slow reasoners (RLVR).
https://docs.typesafe.ai/introduction/machine-learning-primer.md

---

## 2. THREE ERAS

```
┌──────────────────┐
│ TRADITIONAL      │  if / regex / parser   exact brittle
└────────┬─────────┘
         ▼
┌──────────────────┐
│ LLM-AGENT        │  prompt + parse JSON   flexible drunk
└────────┬─────────┘
         ▼
┌──────────────────┐
│ JEV-ERA SWE      │  code flow + enum fill typed calibrated
└──────────────────┘
```

X "Jev copilot in session" is still era 3: a **hook or MCP is the program**.
It is not era 2 (Jev chatting).

---

## 3. HABIT TABLE (Coding 101)

| Pre-Jev | Jev-era | NEVER Jev |
|---|---|---|
| `includes("refund")` | Noul | tokenization |
| 40 regexes | Choice over YOUR set | inventing options |
| nested severity ifs | Score levels | interpolating dollars |
| LLM please-JSON | systemOne map | generating the schema |
| summarize tool dumps | noul keep-call/result | rewriting user text |
| switch on error strings | Choice of classes | HTTP status (already enum) |
| parseInt / date-fns | keep in code | count/dates (jaggedness) |
| codegen / plans | LLM | Jev |

---

## 4. HOW IT DECIDES / HOW YOU KNOW / HOW YOU PROGRAM

**Decide:** one parallel pass over closed answers. Questions cannot see
each other. You declared the ISA.

**Know:** calibration is **group frequency** (p=0.8 happens ~80% of the
time), not one call. `confidence` = peakedness, not P(correct). Noul 0.5
= yes≈no. Measure on YOUR labels. Jaggedness: no math, dates, double
negatives, huge noisy state, generation.
https://docs.typesafe.ai/confidence.md
https://docs.typesafe.ai/model-jaggedness/jev-1.13.md

**Program:**

```
npm install @typesafe-ai/sdk
export TYPESAFE_API_KEY=...   # console.typesafe.ai/keys
```

```ts
import { choice, noul, TypeSafeClient } from "@typesafe-ai/sdk";
const client = new TypeSafeClient();
const r = await client.systemOne({
  state: { msg },
  questions: {
    cat: choice("ticket category", {
      billing: "money", tech: "breakage", other: "none",
    }),
  },
});
if (r.answers.cat.confidence < 0.5) return "human";
return r.answers.cat.choice;
```

https://docs.typesafe.ai/sdk/javascript.md

**Config you own:** state, instructions, criteria, thresholds, model id,
timeout/retries. **Not:** weights, CoT, per-tenant fine-tune.

Batch questions (cookbook: 13-in-1 = 12.2x cheaper / 10x faster).

---

## 5. COMMUNITY IN-SESSION = STILL THE LAW

| Pattern | Install | Jev insertion point |
|---|---|---|
| OMP compaction | `omp plugin install jerryfane/omp-jev-compaction` | hook on `context` / compact — **regex-pile of "is this tool JSON still needed"** |
| Claude compaction | tamaratran/fast-jev-compaction | same, Claude hook |
| MCP | rashedInt32/jev-mcp | agent calls jev_check/classify when **it** hits a regex-pile |
| Official skill | `npx skills add typesafe-ai/skills --skill typesafe-ai` | agent **writes** the systemOne() you should have written |
| Foreman | thruwire/foreman | sidecar: "is the worker done/stuck" — regex-pile of git+logs |

All five obey: workflow in code (hook/policy/MCP server). Jev only on
meaning. Discord JDM is I/O, not Jev.

---

## 6. THIS STACK — WHERE THE PILE IS

| Surface | Shape (code) | Meaning (Jev hole) | Status |
|---|---|---|---|
| JDM | REST, channel ids | route a Discord msg, keep attachment? | I/O live; Jev PROPOSED |
| OMP context | token counts | drop stale tool results | community plugin; install |
| desks | tests exit 0 | "ticket satisfied / stuck" | attach BUILT; Jev PROPOSED |
| JESL | card fired? | "did this violate the law" (Abide-like) | PROPOSED |
| Aether | CHECK syntax | CHECK meaning | PROPOSED |
| angels | .bin policy | do not merge with Jev | REJECTED merge |
| trading | book math | buy/sell Choice | BLOCKED infra |

FIT file: `JARVIS_DISCORD/reports/JEV_STACK_FIT.md`.

---

## 7. DIFF: TICKET ROUTER (the law in one function)

```
┌──────────────────────────────────────────┐
│ - if /refund|chargeback/i return billing │
│ - if /crash|500/i return tech            │
│ + r = systemOne({ state:{msg},           │
│ +     questions:{ cat: choice(...) }})   │
│ + if cat.confidence < 0.5 return human   │
│ + return cat.choice                      │
└──────────────────────────────────────────┘
```

---

## 8. TRACE — Discord message (JDM + optional Jev)

TIMELINE: JDM live. Key maybe missing.

STEP 1 `jarvis_dc_fetch` `{channel_id, limit:50}` → messages (shape).
STEP 2 regex-pile test on `content` → YES.
STEP 3 if no TYPESAFE_API_KEY → fail closed, do not guess.
       else `systemOne` choice+noul on `{content}`.
STEP 4 code: confidence gate then bucket / pager.
STEP 5 observer: no Jev on channel_id parse. Quiet = high confidence.

Escalation: compaction path is omp plugin, not this fetch.

---

## 9. MENTAL OS (reprogrammed)

1. Shape → code. Meaning → enum then Jev.  
2. Cannot list answers → retrieve/LLM candidates, then Jev picks.  
3. One call, many questions. Compose in `if`.  
4. Side effects only in code.  
5. Log prediction vs outcome. Recalibrate.  
6. Session plugins are still programs.  
7. Do not Jev-ize JDM, Git, or compilers.

---

## 10. DO THIS WEEK (use, not theory)

1. Key: `console.typesafe.ai/keys` → `~/.config/typesafe/key` mode 600.  
2. **In-session (X-posts):** `omp plugin install jerryfane/omp-jev-compaction`  
3. **In your product:** one `systemOne` at the first regex-pile you find.  
4. **Skill for the agent writing that code:** typesafe-ai skill (already on OMP).  
5. Leave attach/Foreman until a desk actually needs a done/stuck Noul.

---

## 11. REJECTED / OPEN

REJECTED: Jev as agent, compiler, chain-renderer, angel merge, OpenFang,
JevSeek-as-OMP-worker v1. OPEN: your thresholds. BLOCKED live Jev without
key. Cite primer, confidence, jaggedness, sdk/javascript, agent-skill.md,
omp-jev-compaction README, JDM paths above.
