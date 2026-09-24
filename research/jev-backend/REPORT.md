# Which model should be the PERMANENT Jev backend for this workspace?

> Generated 2026-09-24 · depth: deep · 7 primary sources (the model cards) · workspace:
> research/jev-backend/

## Executive summary

- **RECOMMENDATION: `jaredpalmer/kev-4b`.** Apache-2.0, serves TypeSafe's `/v1/systemone`
  natively, **0.904 on real documents (locked test, read once)** and **0.837 out-of-domain
  (locked test)**, ECE 0.043, Brier 0.233. [1]
- **Two candidates are ELIMINATED ON LICENSE, not on quality.** `openjev/openjev` is
  **CC BY-NC 4.0** ("for commercial use, open a discussion") and `HopitAI/hopper` is
  **"research and demo use only"** (its training data included RACE). A permanent
  workspace-wide backend cannot carry a non-commercial core. [2][5]
- **`openjev` has the best raw accuracy (84.0% on 10,000 questions, 1.4 points behind the
  hosted Jev API) — and it is the one you cannot use.** Its smallest build (GGUF Q4_K_M) is
  **16.5 GB**, which does not fit this host's 12 GB card. [2]
- **`convaiinnovations/laya` is the wrong SHAPE** — a `pip install` SDK with its own request
  format, not a `/v1/systemone` server, and near-chance on typed decisions. [3]
- **`alibiserikbay/JevK5` is the strongest runner-up** (JevBench v1.4 **#2 of 76 systems, #1
  open entrant**), Apache-2.0, ~9 GB — but its own card admits *"accuracy drops sharply on
  JevBench's fresh sealed decisions"* (**33.1%** sealed vs 85.3% public). [4]
- **`Mapika/decider-2b` is the best CALIBRATION-per-byte** (ECE 0.037, 3.5 GB, 4 ms with CUDA
  graphs, schema cache up to 19x) and is already JM-integrated — but 0.755 held-out. [6]
- **`jaredpalmer/kev-0.8b` is the fallback, not the backend** — same wire, ~2 GB, but its own
  card says *"out of domain it is a sub-1B model"* (OOD 0.684). [7]
- **The decisive factor is EVALUATION RIGOR, not a headline number.** kev-4b is the only
  candidate whose numbers come from a **pre-registered protocol with locked tests read ONCE
  per candidate**, paired bootstraps, and hashes in `result.json`. Every other candidate's
  best number is a development-set number or a self-reported suite. [1]
- **The migration cost is real but small**: JM already speaks `/v1/systemone`; kev ships
  `kev.serve` on the same port. The adapter this session built for the GGUF stays for the
  fallback path.

## Background & scope

The question: which of seven candidate models should be the permanent backend for ALL Jev
architecture built in this workspace. Criteria: wire compatibility, calibration, accuracy
(held-out above in-task), operational fit on a 12 GB RTX 4080, license, and provenance.
Out of scope: general LLM serving, non-decision models.

## The comparison

| # | model | license | size | `/v1/systemone` | accuracy | ECE | fits 12 GB? |
|---|---|---|---|---|---|---|---|
| 1 | openjev/openjev | **CC BY-NC 4.0** | 54 GB bf16 / 16.5 GB Q4 | YES (native + shim) | **84.0%** (10k) | calibrated | **NO** (16.5 GB min) |
| 2 | alibiserikbay/JevK5 | **Apache-2.0** | ~9 GB bf16 / GGUF | YES (`jevk5-serve`) | JevBench #2/76 · hard 0.739 | hard 0.066 | tight |
| 3 | convaiinnovations/laya | unstated | 808 MB | **NO** (own SDK) | near-chance, typed | — | yes |
| 4 | Mapika/decider-2b | **Apache-2.0** | 3.5 GB bf16 | YES (native) | 0.805 / 0.755 | **0.037 / 0.084** | **yes** |
| 5 | HopitAI/hopper | **research-and-demo** | ~9 GB (4B LoRA) | YES | hard 0.685 | 0.102 | tight |
| 6 | **jaredpalmer/kev-4b** | **Apache-2.0** | ~9 GB bf16 | **YES** (`kev.serve`) | **0.904 / 0.837 locked** | **0.043 OOD** | tight |
| 7 | jaredpalmer/kev-0.8b | **Apache-2.0** | ~2 GB | YES (`kev.serve`) | 0.825 / 0.684 | 0.054 served | **yes** |

## Why kev-4b

**1 · THE LICENSE IS CLEAN.** Apache-2.0 for the adapter, the head, and the Qwen3.5-4B base. [1]
Two of the seven are non-commercial: openjev (CC BY-NC 4.0, "for commercial use, open a
discussion") [2] and hopper ("do not use this adapter commercially" — its training data
included RACE, whose terms extend to derived data) [5]. A permanent backend on either is a
licensing landmine buried under the whole workspace.

**2 · THE WIRE IS NATIVE.** `kev.serve` answers TypeSafe's `/v1/systemone`, and the card
states: *"Any TypeSafe-compatible client works: `TypeSafeClient(api_key="local",
base_url="http://127.0.0.1:8008", model="kev-latest")`"* [1]. No adapter needed. The same
port (8008), the same contract JM already speaks.

**3 · THE ACCURACY IS ON A LOCKED TEST.** 0.904 on real documents (`documents-v1`, 936
questions, **read once**), 0.891 on a private held-out set (`documents-v2`, 953), 0.837
out-of-domain on the **locked test**. Compare the field's best available numbers:

| the number | kev-4b | decider-2b | JevK5 | openjev |
|---|---|---|---|---|
| held-out / locked | **0.837 OOD locked** | 0.755 held-out | 0.331 sealed | 84.0% (dev-mixed) |
| in-distribution | 0.872 | 0.805 | 0.804 teacher | — |
| real long documents | **0.904 locked** | not reported | not reported | — |

**4 · CALIBRATION IS BUILT IN, NOT A LAYER.** The temperature lives in `head.pt` and every
loader gets calibrated probabilities by default — *"Every loader — `kev.serve`,
`kev.benchmark`, the Space, anyone's harness — gets the calibrated probabilities by
default. It never changes an answer."* [1] ECE 0.043 out of domain, Brier 0.233 on the locked
test. decider-2b is marginally better in-task (0.037) but worse OOD (0.084).

**5 · THE EVALUATION PROTOCOL IS THE DIFFERENTIATOR.** kev-4b's numbers come from a
pre-registered release rule: *"The release was decided by a rule registered before any read
(`PLAN.md` round 8)... then one read of the untouched documents test and one locked read."*
Every number carries suite hash, code hashes and git commit in `result.json`. [1] This is the
only candidate whose claims are produced by a protocol designed to prevent self-deception.
hopper, by contrast, publishes its OWN numbers and says plainly *"These are local numbers,
not official JevBench results"* — and discloses that on the reserved half it is *"level with
the frozen model on accuracy there, not ahead."* [5]

**6 · THE FAMILY IS A LADDER ON ONE WIRE.** kev-0.8b / kev-4b / kev-9b share the interface
and the serving code. The workspace can scale down (0.8b, ~2 GB) or up (9b, 0.852 OOD) by
changing ONE argument, never the client.

**7 · THE LIMITS ARE NAMED, NOT HIDDEN.** Date arithmetic fails (`deadline` 0.60) — and the
card ships the fix (`KEV_DATE_FACTS=1` → 0.85). Knowledge is base-limited (MMLU 0.70 vs Jev
0.90). Mac/MPS is slow (no DeltaNet kernels). Each limit is measured and stated. [1]

## The honest counter-arguments

- **decider-2b is already integrated and smaller.** 3.5 GB vs 9 GB, ECE 0.037 in-task, and
  the schema cache is up to 19x per batch. **The counter:** its held-out accuracy is 0.755
  against kev-4b's 0.837 locked OOD, and JM's questions are arbitrary operator text — a
  held-out distribution by definition. Accuracy on the distribution that matters favours
  kev-4b.
- **openjev is 1.4 points behind the HOSTED Jev API** — the best number in the field. **The
  counter:** CC BY-NC 4.0 and a 16.5 GB minimum. It cannot be the permanent backend.
- **JevK5 is ranked #2 of 76 by an INDEPENDENT benchmark.** **The counter:** the same
  benchmark's sealed set drops it to 33.1% — its own card flags this first under "Known weak
  spots."
- **~9 GB is tight on a 12 GB card** that also hosts embeddings (~1.1 GB). **The
  counter-measure:** the kev-0.8b fallback on the SAME wire for memory-constrained runs, and
  the 4B can be quantized.

## Recommendation

**Adopt `jaredpalmer/kev-4b` as the permanent backend.**

```
 serve:   uv run --extra serve python -m kev.serve --run jaredpalmer/kev-4b --port 8008
 client:  JM_JUDGE_URL=http://127.0.0.1:8008/v1/systemone   (already what JM speaks)
 fallback: jaredpalmer/kev-0.8b  — the same wire, ~2 GB, for memory-constrained runs
 scale-up: jaredpalmer/kev-9b    — 0.852 OOD, when accuracy outweighs memory
```

**The migration is one line of configuration**, because JM already targets
`/v1/systemone` — the adapter this session built for the GGUF server stays for the
GGUF/canon path and is not needed for kev.

## Open questions

- **kev-4b's fit on THIS host is unmeasured.** The card's numbers are H100/B300; the 4080's
  ~9 GB budget with embeddings resident is tight and must be measured before adoption.
- **The 4B's OOD advantage over decider-2b on OUR questions is inferred, not measured.** Both
  cards report on their own suites; a head-to-head on this workspace's real questions would
  settle it.
- **`KEV_DATE_FACTS=1` is preprocessing**, reported separately by the card and never folded
  into the model's numbers — its effect on JM's date-bearing questions is unmeasured.
- **No candidate was tested on this host this session** (except decider-0.8b, which is the
  current canon). The recommendation rests on the published protocols, which are unusually
  rigorous but are still the authors' own.

## Sources

[1] jaredpalmer/kev-4b — https://huggingface.co/jaredpalmer/kev-4b (accessed 2026-09-24, primary)
[2] openjev/openjev — https://huggingface.co/openjev/openjev (accessed 2026-09-24, primary)
[3] convaiinnovations/laya — https://huggingface.co/convaiinnovations/laya (accessed 2026-09-24, primary)
[4] alibiserikbay/JevK5 — https://huggingface.co/alibiserikbay/JevK5 (accessed 2026-09-24, primary)
[5] HopitAI/hopper — https://huggingface.co/HopitAI/hopper (accessed 2026-09-24, primary)
[6] Mapika/decider-2b — https://huggingface.co/Mapika/decider-2b (accessed 2026-09-24, primary)
[7] jaredpalmer/kev-0.8b — https://huggingface.co/jaredpalmer/kev-0.8b (accessed 2026-09-24, primary)
