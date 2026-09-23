# 01 — DISCOVERY

**Package:** `packages/jm/` · **Step:** 2 (discover before designing)
**Date:** 2026-09-21 · All numbers below were produced by commands run this
session; each row names its command.

---

## 1. The measured inventory

### 1.1 Runtime

| Item | Value | Command |
|------|-------|---------|
| bun | 1.4.2 | `bun --version` |
| node | v24.13.1 | `node --version` |
| system sqlite3 | **absent** | `which sqlite3` → not found |
| sqlite path | `bun:sqlite` | (decision, not measurement) |
| opengrok | **UP** on :18080 | `curl -s -m 3 http://127.0.0.1:18080/` |

### 1.2 The corpora

| Target | Measure | Command |
|--------|---------|---------|
| `~/.local/share/opencode` | **44G** | `du -sh` |
| `…/opencode/storage` | **9.8G** | `du -sh` |
| `…/opencode/storage/session_diff` | **11,831 files** | `ls \| wc -l` |
| `…/opencode/hive-mind` | **650M** | `du -sh` |
| `…/opencode/tool-output` | 40K | `du -sh` |
| opencode DBs | 4 files (`opencode.db`, `opencode-local.db`, `opencode-.db`, `opencode-archive-20260905.db`) | `ls *.db` |
| `OPENCODE_WORKSPACE` | **219G** | `du -sh` |
| `JARVIS_WORKSPACE` | **32G** | `du -sh` |
| `~/.omp/agent/sessions` | **133 dirs** | `ls \| wc -l` |
| Discord | 2 guilds · 52 channels | `CHANNELS.md` + live `listChannels` |

### 1.3 The existing tools (the composition targets)

| Tool | State | Role in JM |
|------|-------|------------|
| opengrok (:18080) | UP | code xref — JM delegates code-structure queries |
| ripwire (`~/.local/bin/ripwire`) | present | structural code graph — JM delegates |
| semantica MCP | mounted | decision persistence + NER/relations extractors |
| manager-machine boilerplate | present (`KNOWLEDGE_LIBRARY/agent_plugin_boilerplates/manager-machine`) | the daemon frame (W1/W6) |
| JARVIS discord client | present (`JARVIS/src/discord.ts`, 253L) | the `@dc` adapter |
| Abide | cloned earlier; `/tmp/abide` cleaned | the diff-check sibling (shares judge+cache) |
| claim firewall | DESIGN (`JARVIS/reports/JevClaimFirewall_Blueprint.md`) | the close-path sibling |

### 1.4 The docs migrated into this repo

| File | Bytes | Class |
|------|-------|-------|
| `docs/bibles/JEV_ENGINEERING_BIBLE.md` | 321,680 | bible (3,006L) |
| `docs/blueprints/JM_MASTER_BLUEPRINT_v1.md` | ~37,000 | master blueprint (691L) |
| `docs/blueprints/JM_V1_TARGETABLE_DECISION_ENGINE_BLUEPRINT.md` | 16,524 | engine design (279L) |
| `docs/blueprints/JM_JevManager_Blueprint_v0.1.md` | 24,948 | v0.1 (Wave 0 scope) |
| `docs/blueprints/JevClaimFirewall_Blueprint.md` | 36,239 | sibling design (801L) |
| `docs/blueprints/WarheadsAbide_Master_Blueprint_v1.md` | 20,333 | sibling design (438L) |
| `docs/blueprints/JevOmpCopilot_Master_Blueprint_v1.md` | 66,700 | sibling design (1,413L) |
| `docs/bibles/JevSWE_Bible_ShowMe_v{1,2}.md` | 13,434 / 10,167 | bibles |
| `docs/bibles/JevCopilot_ShowMe_v1.md` | 1,362 | thin show-me |
| `docs/packages/JevRuntimeIntelligence_meta_architecture_package/` | 7 files | extraction package |
| `docs/handovers/JEV_ABIDE_BEHAVIOR_POLICING_CONTEXT_HANDOVER.md` | 40,787 | handover (1,171L) |

Repo total: **1.1M** across 18 files (`du -sh`).

---

## 2. The variant table (lineage)

JM's design exists in three generations on disk. The winner is the strict
superset for the *engine*; the fire gate is a separate, later artifact.

| Variant | Lines | Scope | Verdict |
|---------|-------|-------|---------|
| `JM_JevManager_Blueprint_v0.1.md` | 498 | the loop: index/query/find/decision-tree/route/cache/ledger + 12 recipes | **WAVE 0 SPEC** — still authoritative for the CLI's v0.1 surface |
| `JM_V1_TARGETABLE_DECISION_ENGINE_BLUEPRINT.md` | 279 | targets · operations · recipes · results; pools; job store; surfaces; 32 use cases | **ENGINE WINNER** — superset of v0.1's scope |
| `JM_MASTER_BLUEPRINT_v1.md` | 691 | the runtime fire gate (trigger→assemble→gate→route→ladder→oracle) | **RUNTIME LAYER WINNER** — a distinct surface, not a variant of the engine |

Divergence notes (what v1 added over v0.1): the target registry + adapters; the
job store + queue + resume; the pool scheduler with budgets; the serving
surfaces (`serve`/`mcp`/`watch`); the 32-case catalog. v0.1's recipe set, cache
law, ledger schema, and fail-polarity laws carry forward **unchanged** — v1 is
v0.1 plus a scheduler and doors.

Fork point to name: **v0.1 remains the Wave 0 acceptance contract**; v1's
additional surfaces land in W1–W6. Nothing in v0.1 is contradicted.

---

## 3. Constraints discovered (everything that exists constrains the design)

1. **No `sqlite3` binary** → the store layer must use `bun:sqlite` (which ships
   FTS5 in bun 1.4.x). Any shell-out design is dead on arrival.
2. **44G/219G scale** → indexing must be incremental (sha256 + mtime/size fast
   path + tombstones); a full rebuild must never be the default path.
3. **`session_diff` is 11,831 JSON files** → the first real corpus; JSON parse
   cost dominates the walk, so the indexer needs a streaming reader and a
   per-file skip on unchanged hash.
4. **opengrok is UP** → do not index code text into JM's store; delegate code
   structure to opengrok/ripwire and keep JM's store for non-code corpora
   (this is the no-dup law made concrete).
5. **manager-machine boilerplate exists** → the daemon (W1 queue, W6 watch) is a
   copy-and-wire job, not an authoring job. Its battery must be green on copy.
6. **The discord client is 253L and working** → the `@dc` adapter wraps it; no
   re-implementation of REST/auth/rate-limit handling.
7. **The doc-density gate is live on this host** (README ≥300L, generic ≥200L) →
   every doc in this package is written to floor or the write is refused. This
   is a real constraint discovered by being blocked twice during authoring.
8. **Jev pricing is documented** ($0.042/M input, no output charge) → cost lines
   are computable at write time; `cost_usd` is a ledger field, not a report.
9. **Semantica MCP is mounted** → the C1 extractor path exists as a tool call;
   the adapter is thin.
10. **The bible already defines the laws** (IL-01–24, T1–T10) → this package
    cites them rather than restating; drift between spec and bible is a defect.

---

## 4. What I did NOT read (honest disclosure)

- `@oh-my-pi/pi-coding-agent` source — the OMP wrap points for the fire gate
  (settled message, tool result, goal.complete) are still **unopened**. The fire
  gate's F1 fork depends on this; recorded as residual in the master blueprint.
- Semantica MCP tool schemas — assumed available; not read this turn.
- The six parked TTSR kernels' firing logs — the record's numbers (24 firings /
  18 unrecoverable) are quoted from the operator's context, not re-measured here.
- The oracle implementation — consumed by design, not read; its store schema is
  an interface assumption (firing_id keyed).
- `OPENCODE_WORKSPACE` beyond its size — 219G was measured, not walked.
- The 4 opencode DBs' schemas — the `@ocdb` adapter will read them in W2; the
  table list (`session,part,message`) is assumed from the handover, not verified.
- Abide's source (the clone was cleaned from `/tmp`) — cited from the earlier
  session's read; a re-clone precedes any adapter work.

---

## 5. The landing zone (what the new code must satisfy)

```
 Shared_Workspace/JevManager/          ← this repo (created 2026-09-21)
   src/          new code (bun, TS)
   reflexes/     reflex scripts (YAML)
   tests/        instrument battery
   ledger/       decision ledger (JSONL, gitignored)
   docs/         migrated designs (read-only)
   packages/jm/  this build package
```

Interfaces the new code must honor:

- **The bible's judge contract** — `state` + typed `questions` → typed answers
  with probabilities; `POST https://api.typesafe.ai/v1/systemone`.
- **The bible's cache key** — `sha256(model ⊕ schema ⊕ canonical(redact(state)))`.
- **The bible's ledger row** — §7.9's field set, including `policy` (thresholds
  in force) and `later_truth`.
- **The fire gate's script schema** — five author-owned sections (trigger,
  facts, assemble, gate, policy) + three machine-owned (ladder, ledger, cache).
- **manager-machine's frame** — SQLite-WAL store, crash-first rows, reconcile
  tick, resume plan, deny-by-default gate.
- **The discord client's exports** — `fetchMessages`, `sendMessage`, and the
  typed error sentinels (auth/forbidden/rate-limit).

---

## 6. The command log (verbatim runs)

```
$ bun --version
1.4.2
$ node --version
v24.13.1
$ which sqlite3
(error: command not found: sqlite3)
$ curl -s -m 3 http://127.0.0.1:18080/ >/dev/null && echo OPENGROK_UP
OPENGROK_UP
$ du -sh ~/.local/share/opencode
44G     /home/leviathan/.local/share/opencode
$ ls ~/.local/share/opencode/storage/session_diff | wc -l
11831
$ ls ~/.local/share/opencode/*.db
…/opencode-.db  …/opencode-archive-20260905.db  …/opencode-local.db  …/opencode.db
$ du -sh /home/leviathan/OPENCODE_WORKSPACE
219G    /home/leviathan/OPENCODE_WORKSPACE
$ du -sh /home/leviathan/JARVIS_WORKSPACE
32G     /home/leviathan/JARVIS_WORKSPACE
$ ls ~/.omp/agent/sessions | wc -l
133
$ ls /home/leviathan/JARVIS_WORKSPACE/tools
foreman
```

---

## 7. Interface sketches discovered

**The judge call (bible §6.19.1), the shape every verb routes through:**

```ts
const resp = await transport.systemOne({
  state,                       // bounded evidence, redacted
  model: "jev-latest",
  questions: {                 // typed, versioned in the recipe
    relation: { type: "choice",
      instructions: "How does the evidence relate to the claim?",
      criteria: { supports: "…", contradicts: "…", says_nothing: "…" } },
    theatrical: { type: "noul",
      instructions: "Is this a completion claim asserted without evidence?" },
  },
});
// resp.answers.relation { choice, probabilities, confidence }
// resp.usage { input_tokens, output_tokens }  -> cost_usd = in × 0.042/1e6
```

**The index row (W0/W2), the store's spine:**

```
 files(id, source_id, path, size, mtime, sha256, kind, state)   state: new|changed|gone
 docs(id, file_id, path, kind, text)      + docs_fts(text)      -- FTS5 virtual
 runs(id, verb, args_json, started, ended, status, stats_json, cost_usd)
 decisions(id, scenario_ref, question, answer_json, conf, policy, context_ref, at)
 cache(fingerprint PK, provider, model, schema_hash, state_hash, answer_json, hits)
```

**The job store (W1), per job:**

```
 ~/.jm/jobs/<job-id>/
   index.sqlite     the FTS5 store for this job's targets
   queue.sqlite     crash-first rows, ack-on-complete, resume plan
   ledger.jsonl     append-only decision rows
   results/         declared-structure outputs (md|json|csv)
```

**The reflex script (W8), the five author sections:**

```
 trigger · facts · assemble · gate · policy        (author-owned)
 ladder · ledger · cache                           (machine-owned)
```

---

## 8. Discovery conclusions

1. The design set is complete enough to build from; the gap is **zero
   implementation**.
2. The first real corpus (`@shadow`, 11,831 files) is small enough to prove the
   engine in one sitting and large enough to expose the incremental-index design.
3. The composition targets (opengrok, ripwire, manager-machine, the discord
   client, semantica) all exist, so JM's job is genuinely the *decision layer*,
   not a re-implementation of five other tools.
4. The two blocking unknowns (F1/F6, and the pi wrap points) affect only the
   runtime layer (W8), so W0–W7 can proceed without them.
5. The doc-density gate changes authoring practice: dense or split, never thin.
