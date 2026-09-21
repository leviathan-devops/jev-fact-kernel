# Jev-Enhanced SWE Bible v1

**Law (operator, 2026-09-19):** Keep the workflow in code. Insert Jev only
where `if` on strings would be a pile of regex.

**Authority:** TypeSafe how-to-build-with-system-one.md (AI-powered software,
not agents); primer RLCD; confidence.md; jev-1.13 jaggedness.md;
sdk/javascript.md. This file reprograms SWE 101. It is not a product spec.

**Series:** JevSWE_Bible (ShowMe v1). Parent: JevOmpCopilot_Master_Blueprint_v1.

---

## 0. THE ONE LAW

Software is still software. Loops, files, types, tests, transactions, retries
stay in YOUR language. Jev is not a second programmer. Jev is the instruction
you use when the next `if` would be matching *meaning* instead of *shape*.

```
┌────────────────────────────────────────────────────┐
│ Q: would this if become a pile of regex?           │
│   NO   → write the if / parser / SQL / count       │
│   YES  → enumerate answers, call Jev, if on floats │
└────────────────────────────────────────────────────┘
```
width=54 (content 52).

Regex-pile means: unbounded string forms, synonymy, intent, tone, "is this
the same bug", "is this still needed", "which bucket" when the buckets are
semantic not lexical.

---

## 1. THREE ERAS OF A DECISION

```
┌──────────────────┐
│ TRADITIONAL SWE  │
│ if / switch /    │
│ regex / parser   │
│ exact, brittle   │
└────────┬─────────┘
         ▼
┌──────────────────┐
│ LLM-AGENT ERA    │
│ prompt the model │
│ parse the prose  │
│ flexible, drunk  │
└────────┬─────────┘
         ▼
┌──────────────────┐
│ JEV ERA          │
│ code owns flow   │
│ Jev fills enums  │
│ typed, calibrated│
└──────────────────┘
```
width=20 inner boxes, stacked. shown=3 total=3 capped=0.

TypeSafe names the middle column **LLM agents** (model chooses next step;
goes off the rails unattended) vs **AI-powered software** (code owns control
flow; model only at the semantic hole). Cite:
https://docs.typesafe.ai/concepts/how-to-build-with-system-one.md

---

## 2. CODING 101 REWRITTEN (habit → replacement)

| Pre-Jev habit | What it was for | Jev-era replacement | NEVER Jev |
|---|---|---|---|
| `if s.includes("refund")` | intent | Noul "is this a refund request" | tokenizing |
| 40-line regex email/intent | classify free text | Choice over YOUR option set | inventing options |
| nested ifs for severity | grade meaning | Score 2-10 situation levels | interpolating a dollar amount |
| LLM "please JSON {action}" | unstructured → struct | systemOne questions map | generating the JSON schema |
| summarize old tool output | shrink context | Jev noul keep-call/keep-result (compaction plugins) | rewriting user text |
| `switch` on error strings | route failures | Choice of closed failure classes | HTTP status (already enum) |
| sentiment libraries | tone | Score levels you wrote | counting !!!! |
| embedding + cosine kNN | "similar" | Score/Noul on the pair if N is small; else retrieve in code then Jev | vector math |
| `parseInt` / date-fns | numbers, time | keep in code | Jev cannot count/compare dates (jaggedness) |
| codegen, plans, patches | System 2 | LLM | Jev (not trained to generate) |

The table is the bible. Everything below is how to *feel* it while typing.

---

## 3. THE REGEX-PILE TEST (mental compiler)

```
┌──────────────────────────────────────────┐
│ on(writing_an_if)                        │
│   if the predicate is shape              │
│     bytes, types, counts, hashes, dates  │
│     write code                           │
│   if the predicate is meaning            │
│     synonyms, intent, relevance, done-ness│
│     list the answers first               │
│     jev.systemOne                        │
│     if on noul/choice/confidence         │
│   if you cannot list the answers         │
│     you are not ready for Jev            │
│     retrieve / parse / LLM-generate opts │
│     THEN Jev picks                       │
└──────────────────────────────────────────┘
```
width=44. That last branch is jaggedness #9: extract candidates in code or
with a generative model; Jev only **picks**.

---

## 4. DATA FLOW OF ONE HOLE

```
┌──────────────┐
│  raw world   │  ticket, diff, log, email
└──────┬───────┘
       ▼
┌──────────────┐
│  CODE filter │  parse, count, slice, SQL
└──────┬───────┘
       ▼
┌──────────────┐
│  state JSON  │  only fields this question needs
└──────┬───────┘
       ▼
┌──────────────┐
│  Jev dispatch│  POST /v1/systemone  parallel questions
└──────┬───────┘
       ▼
┌──────────────┐
│  floats      │  noul / probabilities / confidence
└──────┬───────┘
       ▼
┌──────────────┐
│  CODE if     │  act / review / abstain  YOUR thresholds
└──────┬───────┘
       ▼
┌──────────────┐
│  side effect │  write, send, steer, drop  never Jev
└──────────────┘
```
width=16. Failure: missing key / 401 / malformed distro → no side effect.

---

## 5. FUNDAMENTALS THAT CHANGE

### 5.1 Types
Pre-Jev: `string` is where meaning hides. Post-Jev: meaning is an **enum you
declared**. The string never reaches the `if`. Only `choice` / `noul` / `score`
does.

### 5.2 Control flow
Pre-Jev: one giant decision tree of string tests. Post-Jev: shallow tree of
**numeric gates**. The bushy semantic part is one batched Jev call.

### 5.3 Errors
Pre-Jev: catch, log, hope. Post-Jev: low confidence **is** the error signal.
`confidence < 0.5` → do not guess (confidence.md). Noul ~0.5 → uncertain, not
"medium".

### 5.4 Tests
Pre-Jev: assert output == gold string. Post-Jev: assert (1) schema (2) on a
labeled set, binned p vs empirical rate (3) threshold policy. Calibration is
a **frequency** property, not a unit-test equality (primer).

### 5.5 Performance
Pre-Jev: optimize regex. Post-Jev: **one request, many questions** (cookbook:
13-in-1 is 12.2x cheaper / 10x faster vs 13 calls). Filter state first;
huge irrelevant state drops accuracy (jaggedness #5).

### 5.6 Security
State is data, not trusted. Injection can move the answer (jaggedness #6).
Never put the API key in tool args. Fail closed.

### 5.7 What you stop doing
Stop asking models to JSON-mode your control plane. Stop summarizing facts
you still need verbatim. Stop putting arithmetic in prompts. Stop "one
prompt to do the whole ticket."

---

## 6. DIFF-SHAPE: A TICKET ROUTER

Pre-Jev (regex pile):

```
┌──────────────────────────────────────────┐
│  function route(msg: string)             │
│ -  if /refund|chargeback|money back/i    │
│ -    return "billing"                    │
│ -  if /crash|500|stack trace/i           │
│ -    return "tech"                       │
│ -  return "other"                        │
└──────────────────────────────────────────┘
```

Post-Jev:

```
┌──────────────────────────────────────────┐
│  function route(msg: string)             │
│    r = client.systemOne({                │
│      state: { msg },                     │
│      questions: {                        │
│        cat: choice("ticket category", {  │
│          billing: "money, refunds",      │
│          tech: "breakage, errors",       │
│          other: "none of those"          │
│        }) } })                           │
│    if r.answers.cat.confidence < 0.5     │
│      return "human"                      │
│    return r.answers.cat.choice           │
└──────────────────────────────────────────┘
```
The `if` remaining is **risk**, not English.

---

## 7. SWE PATTERNS (where the hole usually is)

| Layer | Keep in code | Jev hole |
|---|---|---|
| Parse | JSON schema, AST, regex for emails | "which of these spans is the amount" (pre-parsed extraction cookbook) |
| Validate | types, ranges, checksums | "does this claim match the cited paragraph" |
| Route | URL, method, role | "what does this free-text want" |
| Gate | authn/z, quotas | "is this a jailbreak" (llm_guardrails cookbook) |
| Compact | token counts | "is this tool result still needed" (fast-jev / omp-jev-compaction) |
| Done-when | tests exit 0 | "is the ticket satisfied" (Foreman Nouls) |
| Rank | BM25, SQL ORDER | score each candidate (rerank cookbook) |

If the row is left column only, **do not call Jev**.

---

## 8. RUNTIME TRACE — "route this Discord message"

TIMELINE
════════════════════════════════════════════════════════
T-0: bot has channel text. Code already has channel_id (shape).
T-Jev: only category is meaning.

STEP 1 CODE
```
┌─────────────────────────────────────────────────────┐
│ fetchMessages(channelId)  discord.ts:99             │
│ → { content, author }  no Jev                       │
└─────────────────────────────────────────────────────┘
```
STEP 2 REGEX-PILE TEST
```
┌─────────────────────────────────────────────────────┐
│ Q: pile of regex on content? YES (intent)           │
│ Q: can code parse channel_id? YES → no Jev there    │
└─────────────────────────────────────────────────────┘
```
STEP 3 JEV
```
┌─────────────────────────────────────────────────────┐
│ TypeSafeClient.systemOne                            │
│ state: { content }                                  │
│ questions.cat: choice billing|tech|other            │
│ questions.urgent: noul "needs same-day reply?"      │
└─────────────────────────────────────────────────────┘
```
STEP 4 CODE
```
┌─────────────────────────────────────────────────────┐
│ if cat.confidence < 0.5 → human queue               │
│ else if urgent.noul > 0.8 → pager                   │
│ else → bucket[cat.choice]                           │
└─────────────────────────────────────────────────────┘
```
STEP 5 OBSERVER
Quiet if confidence high and no send to TypeSafe on parse path.
Escalation: no key → do not guess category; fail closed.

---

## 9. THE NEW INNER MONOLOGUE (while you type)

1. Is this **shape**? Parser.  
2. Is this **meaning**? Write the enum on paper. If you cannot, retrieve
   candidates first.  
3. One Jev call, all independent questions.  
4. `if` only on numbers + labels Jev returned.  
5. Side effects only in code.  
6. Log prediction vs outcome. Recalibrate thresholds. That is the test.

---

## 10. WHAT THIS DOES NOT CHANGE

Compilers, type systems, Git, transactions, idempotency, memory safety,
complexity, Big-O, distributed consensus. Jev does not replace CS 101. It
replaces the **ad-hoc NLP layer** you used to fake with regex, classifiers
you trained once and froze, and LLM-JSON you hoped would parse.

---

## 11. OPEN / REJECTED

REJECTED: Jev as the agent. REJECTED: Jev as compiler/GPU-renderer of
pipelines. REJECTED: asking Jev to count, add dates, generate code
(jaggedness). PROPOSED: your thresholds — measure on your labels.
BLOCKED until `TYPESAFE_API_KEY`: live calls.

Cite: how-to-build-with-system-one.md; primer; confidence.md; jev-1.13
jaggedness.md; sdk/javascript.md; omp-jev-compaction README (hook is still
code calling Jev).
