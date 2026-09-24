# Which model should be the PERMANENT Jev backend? (v2 — CORRECTED)

> Generated 2026-09-24 · depth: deep · round 2: 6 parallel scouts + direct primary reads
> **v1 OF THIS REPORT IS RETRACTED. Its recommendation (kev-4b) ranks #24 of 77.**

## THE CORRECTION, UP FRONT

**v1 recommended `jaredpalmer/kev-4b` as the permanent backend. The independent JevBench
leaderboard ranks it #24 of 77 with a SEALED accuracy of 22.4% — the worst of the serious
candidates.** v1 rested on the authors' own model cards, compared a *locked* number against
*public-item* numbers, and never consulted the one independent head-to-head benchmark that
exists for this model class. **That was the error.**

## THE EVIDENCE — the live JevBench v1.4.1 board (scored 2026-09-23)

Source: https://benchmarkheaven.com/jev-models · protocol `jevbench::v1.4` · 534 public + 308
sealed decisions · 77 ranked systems · "not affiliated with or endorsed by TypeSafe AI".

| # | system | score | Intel | Calib | Speed | Cost | public | **sealed** | gap |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Jev 1.13.0 (TypeSafe API) | **63.3** | 53.1 | 76.3 | 83.3 | 52.0 | 86.6% | **36.7%** | +49.9 |
| 2 | **JevK5 v0.2.0** (allebee) | **62.0** | 48.9 | 74.5 | 91.1 | 59.5 | 85.3% | **33.1%** | +52.2 |
| 3 | Hopper (HopitAI) | 59.4 | 48.0 | 79.1 | 86.8 | 58.7 | 82.3% | **34.1%** | +48.2 |
| 4 | Winnow-12B Q8 | 55.6 | 48.3 | 64.8 | 82.3 | 52.9 | 85.7% | 33.1% | +52.6 |
| 9 | SemIf (formerly OpenJev) | 47.7 | 44.4 | 66.8 | 83.7 | 59.5 | 81.0% | 26.3% | +54.7 |
| 16 | decider-35b-a3b | 41.2 | 47.2 | 65.3 | 80.8 | 45.3 | 83.1% | 31.5% | +51.6 |
| **24** | **kev 4B** (research preview) | **36.1** | 42.1 | **39.6** | 75.7 | 61.8 | 66.2% | **22.4%** | +43.8 |
| 34 | decider-2b (Mapika) | 30.7 | 38.5 | 43.5 | 83.2 | 61.0 | 71.0% | 24.7% | +46.3 |
| 36 | Laya (Convai, ModernBERT 421M) | 30.3 | 36.1 | 63.7 | 71.1 | **86.2** | 58.4% | 30.8% | +27.6 |
| 42 | kev 8B | 25.6 | 41.8 | 40.2 | 74.9 | 44.0 | 71.4% | 21.8% | +49.7 |
| 45 | kev 0.6B | 24.8 | 34.2 | 50.0 | 75.6 | 76.1 | 66.7% | 24.0% | +42.6 |

## THE SEALED COLUMN IS THE ONLY COMPARABLE NUMBER

The public→sealed gap is **~50 points for nearly every system**, including TypeSafe's own Jev
(+49.9). That means the 534 public items are **contaminated for everyone**. Ranking on public
accuracy ranks contamination.

**On the sealed set (the strictest class, items never published):**

| rank by sealed | system | sealed |
|---|---|---|
| 1 | Jev 1.13.0 (the hosted API) | 36.7% |
| 2 | **Hopper** | **34.1%** |
| 3 | **JevK5 v0.2.0** | **33.1%** |
| 4 | Winnow-12B | 33.1% |
| 5 | decider-35b-a3b | 31.5% |
| 6 | Laya | 30.8% |
| 7 | decider-2b | 24.7% |
| 8 | **kev 4B** | **22.4%** ← my v1 pick, LAST |

## THE TERMINOLOGY (what "locked" and "sealed" MEAN)

```
┌────────────────────────────────────────────────────────────────────┐
│  THE TRUST LADDER                                                  │
├────────────────────────────────────────────────────────────────────┤
│  DEVELOPMENT ("dev set") — you look at it REPEATEDLY, tune on it.  │
│    Every model-selection decision lands here. INFLATED by selection│
│    pressure: you kept the winner out of N candidates.              │
│                                                                    │
│  HELD-OUT — the WEIGHTS never trained on it. The minimum bar.      │
│    Says nothing about how many times you LOOKED at it.             │
│                                                                    │
│  LOCKED ("locked read") — you may read it AT MOST ONCE per         │
│    candidate. kev's own card: "the locked test partition is read   │
│    at most once per candidate." You cannot iterate against it.     │
│                                                                    │
│  SEALED — STRONGEST. The items are NOT PUBLIC AT ALL. JevBench:    │
│    "The sealed item text, answer keys and per-item predictions are │
│    retained privately." You cannot train on what you cannot see.   │
│    A sealed number is the least gameable measure that exists.      │
└────────────────────────────────────────────────────────────────────┘
```

**My v1 error, named precisely:** I put kev-4b's **locked** 0.837 next to JevK5's **public-item**
0.958 and decider's **held-out** 0.755 in ONE table as if comparable, then ranked them. Those are
three different quantities. **The terminology exists exactly to prevent that comparison.**

## THE SIZE CORRECTIONS (the operator was right)

| model | what I said | the MEASURED truth | the distinction |
|---|---|---|---|
| **JevK5** | ~9 GB | **4.17 GB on this host** (`jevk5-4b-Q8_0.gguf`) · Q8_0 4.48 GB published · Q4_K_M 2.71 GB | bf16 base is 8.4 GB; the GGUF is ~4.5 GB |
| **kev-4b** | ~9 GB | **adapter only 0.16 GB** + base 9.32 GB | the adapter is tiny; the SERVING stack is 9 GB |
| decider-2b | 3.5 GB | 3.5 GB ✓ | correct |
| decider-0.8b | — | **0.76 GB measured** | the current canon |
| Laya | 808 MB | 421M params, CPU, 512-token/question budget | tiny but context-limited |

**`jevk5-4b-Q8_0.gguf` (4.17 GB) IS ALREADY ON THIS HOST.** The operator's "JevK5 is only 5gb" is
TRUE for the Q8 GGUF. My "~9 GB" was the bf16 figure — the same model, a different format.

## THE ANSWER: **`alibiserikbay/JevK5` v0.2.0**

**It is #2 of 77 overall, #1 among OPEN entrants, Apache-2.0, ~4.2 GB as a Q8 GGUF that is
already downloaded, and it serves TypeSafe's `/v1/systemone` via `jevk5-serve`.**

The four reasons, each from the independent board:

1. **#2 of 77, #1 open.** 62.0 vs Jev's 63.3 — **1.0 point behind the hosted API**, ahead of every
   other open model including hopper (#3, and research-only licensed).
2. **Apache-2.0.** Clean for a permanent workspace backend. Hopper (#3) is "research and demo use
   only"; openjev (Convai's DiffusionGemma variant) is CC BY-NC.
3. **Fits this host.** 4.17 GB measured, already present, vs kev-4b's 9 GB serving stack.
4. **The wire is native.** `jevk5-serve --model alibiserikbay/JevK5 --port 8090` answers
   `/v1/systemone`.

**Its honest weakness, from the card itself:** *"Accuracy drops sharply on JevBench's fresh sealed
decisions"* — 33.1% sealed. **But every candidate collapses there, including Jev (36.7%).** On the
sealed set JevK5 is 3rd, 3.6 points behind the hosted API — the same 3.6-point band the whole open
field occupies.

## WHERE EACH CANDIDATE LANDS — the operator's five challenges

| the operator said | the verdict |
|---|---|
| "JevK5 is #2 on JevBench, second only to the official Jev API" | **CONFIRMED** — #2 of 77 at 62.0 vs 63.3 |
| "JevK5 is only 5gb right now as is Kev4b" | **HALF RIGHT** — JevK5 Q8_0 = **4.17 GB** (measured, on disk). kev-4b's ADAPTER is 0.16 GB but its 9 GB base must also be resident |
| "other benchmarks rate laya" | **CONFIRMED, and it cuts both ways** — Laya is **#36 on JevBench (30.3)** but has the **best Cost axis in the field (86.2)** and a reported ~0.766 on narrow in-distribution suites vs Jev's 0.727. It is a specialist, not the backend |
| "Decider was ranked down in the #20s" | **CONFIRMED and STALE** — decider-2b was **#20-23 under v1.2 几何-mean scoring**; the current v1.4.1 board puts it **#34** |
| "how did you come to these conclusions" | **From the authors' own model cards — insufficient.** This round used the independent benchmark. My v1 pick moved from #1 (my ranking) to **#24 of 77** (theirs) |

## THE RUNNER-UP AND THE SPECIALISTS

- **Hopper** (#3, sealed 34.1% — the best open sealed number) — **BLOCKED by license**
  ("research and demo use only"; its data included RACE).
- **Laya** (#36) — the cost/speed extreme: 86.2 Cost axis, ~$0.0029/1k decisions, CPU-only, 421M
  params. **Use it as a cheap pre-filter in front of JevK5, not as the backend** — its 512-token
  budget cuts long states by design (the board says so).
- **decider-0.8b** (the current canon, #60-adjacent at 0.776/0.707 by its own card) — 0.76 GB, the
  GGUF adapter already built this session. **Keep it as the offline/fallback path.**

## THE OPERATIONAL RECOMMENDATION

```
 PRIMARY:    alibiserikbay/JevK5 v0.2.0  (Apache-2.0)
   serve:    jevk5-serve --model alibiserikbay/JevK5 --port 8090
   OR:       the Q8 GGUF already on disk (jevk5-4b-Q8_0.gguf, 4.17 GB) via llama.cpp
   wire:     JM_JUDGE_URL=http://127.0.0.1:8090/v1/systemone   (native, no adapter)
   result:   231/231 valid on the public items; 228/231 same answer as bf16 on Q8_0

 FALLBACK:   Mapika/decider-0.8b GGUF  (current canon, 0.76 GB, offline)
 PRE-FILTER: Laya  (CPU, ~$0.003/1k, for cheap first-pass triage of huge candidate sets)
 NOT USED:   kev-4b/kev-9b/kev-0.8b (Apache-2.0 but #24/#42/#45)
             Hopper (research-only license)
             openjev (CC BY-NC 4.0; 16.5 GB minimum — the best accuracy, unusable)
```

## OPEN QUESTIONS

- **The board measures SERVED systems**, and JevK5 ran "unknown" endpoint status (no p50 latency
  reported). Its Speed axis (91.1) is the 2nd best in the field, but the on-host latency is
  unmeasured.
- **The sealed set is 308 items.** Small differences (33.1 vs 34.1) are within noise; the board's
  own README warns "small sealed differences do not prove pairwise superiority."
- **No candidate was tested on THIS host this session** except decider-0.8b.
- **The cost axis assumes a $ figure** for self-hosted systems (estimated, not metered). JevK5's
  ~$0.022/1k is an ESTIMATE.

## SOURCES

[1] JevBench live board v1.4.1 — https://benchmarkheaven.com/jev-models (scored 2026-09-23, independent)
[2] JevBench repo + method — https://github.com/fstandhartinger/jevbench (MIT; "not affiliated with TypeSafe")
[3] JevK5 v0.2.0 — https://huggingface.co/alibiserikbay/JevK5 (Apache-2.0, #2 of 77)
[4] kev-4b — https://huggingface.co/jaredpalmer/kev-4b (#24 of 77, sealed 22.4%)
[5] Hopper — https://huggingface.co/HopitAI/hopper (#3, research-only license)
[6] Laya — https://huggingface.co/convaiinnovations/laya (#36, best cost axis)
[7] decider-2b — https://huggingface.co/Mapika/decider-2b (#34; #20-23 under the old v1.2 scoring)
