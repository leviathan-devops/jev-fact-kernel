// src/verbs/route.ts — W5/S13: the catalogue Choice. Decide WHICH capability should act.
// Builds the menu from what is actually installed (skills · tools · models), asks the judge,
// and on `act` produces the INJECTION TEXT a caller prepends before the model sees the prompt.
import type { Database } from "bun:sqlite";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { Judge } from "../judge/client.ts";
import { routeOf, signalOf, DEFAULT_POLICY, type Policy, type ChoiceAnswer, type NoulAnswer } from "../judge/policy.ts";

export interface CatalogueEntry { id: string; kind: "skill" | "tool" | "model"; name: string; hint?: string; }
export interface Catalogue { entries: CatalogueEntry[]; sources: string[]; }

export interface RouteOpts {
  task: string;                 // the natural-language task the route must serve
  catalogue?: Catalogue;        // inject for tests; else built from disk
  policy?: Policy;
  context?: string;
}

export interface RouteResult {
  choice: string;               // the selected catalogue id ("" when the ladder escalates)
  route: "act" | "escalate" | "noop";   // "reject" is folded into "escalate" (same caller action)
  p: number;                    // the winner's probability
  runnerUp?: { id: string; p: number };   // logged, always (the near-miss is the useful part)
  injection?: string;           // present ONLY on act
  candidates: number;
  calls: number;
  cached: boolean;
  costUsd: number;
  reason: string;
}

/** The live catalogue: skills on disk, the tool names this engine exposes, and the judge's model. */
export function buildCatalogue(indexName?: string): Catalogue {
  const sources: string[] = [];
  const entries: CatalogueEntry[] = [];

  const skillDirs = [
    join(homedir(), ".omp", "agent", "skills"),
    join(homedir(), ".omp", "agent", "managed-skills"),
  ];
  for (const dir of skillDirs) {
    if (!existsSync(dir)) continue;
    sources.push(dir);
    for (const name of readdirSync(dir)) {
      if (name.startsWith(".")) continue;
      entries.push({ id: `skill:${name}`, kind: "skill", name });
    }
  }

  for (const t of ["jm_query", "jm_find", "jm_decide", "jm_index"]) {
    entries.push({ id: `tool:${t}`, kind: "tool", name: t, hint: "JM engine tool" });
  }
  void indexName;

  entries.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));   // deterministic menu order
  return { entries, sources };
}

/** Ask the judge which capability should act. Fail polarity: no key -> throw (caller exits 2). */
export async function route(db: Database, opts: RouteOpts): Promise<RouteResult> {
  const cat = opts.catalogue ?? buildCatalogue();
  if (cat.entries.length === 0) throw new Error("JM_ROUTE_CATALOGUE_EMPTY: no skills, tools or models found");
  const policy = opts.policy ?? DEFAULT_POLICY;

  const menu = cat.entries.map((e) => `${e.id}${e.hint ? ` (${e.hint})` : ""}`).join("\n");
  const questions = {
    choice: {
      type: "mcq" as const,
      instructions: `Which ONE capability should act on the task? Choose from this exact menu:\n${menu}\nIf none fits, choose "none".`,
      choices: [...cat.entries.map((e) => e.id), "none"],
    },
  };
  const state = { task: opts.task, ...(opts.context ? { context: opts.context } : {}) };

  const judge = new Judge(db, {});
  const res = await judge.ask(state, questions, "route@v1");
  const typed = (res.answers as { choice?: ChoiceAnswer | NoulAnswer }).choice;
  const probs = typed && typed.type === "choice" ? (typed.probabilities ?? {}) : {};
  const ranked = Object.entries(probs).sort((a, b) => (b[1] - a[1]) || (a[0] < b[0] ? -1 : 1));
  const top = ranked[0] ?? (typed && typed.type === "choice" ? [typed.choice, signalOf(typed)] as [string, number] : ["none", signalOf(typed)]);
  const winner = top;
  const runner = ranked[1];
  const decided = routeOf(typed, policy);        // the SAME ladder decision-tree uses
  // "reject" folds into "escalate": both hand the decision to a human, so the caller's action
  // set stays three-valued.
  // THE MENU IS THE CONTRACT: a judge answer naming an id the catalogue does NOT contain must
  // never become an act + injection (ADV-2 probe test_adv_route_choice_outside_the_menu: the
  // engine emitted "[JM ROUTE] Use skill:NOT-IN-MENU" for a capability that does not exist).
  const inMenu = winner[0] !== "none" && cat.entries.some((e) => e.id === winner[0]);
  const ladder: "act" | "escalate" | "noop" = decided.route === "act" ? "act" : decided.route === "noop" ? "noop" : "escalate";
  const folded: RouteResult["route"] = ladder === "act" && !inMenu ? "escalate" : ladder;

  return {
    choice: folded === "act" ? winner[0] : "",
    route: folded,
    p: winner[1],
    runnerUp: runner ? { id: runner[0], p: runner[1] } : undefined,
    injection: folded === "act"
      ? `[JM ROUTE] Use ${winner[0]} (p=${winner[1].toFixed(3)}). Runner-up: ${runner ? `${runner[0]} (p=${runner[1].toFixed(3)})` : "none"}.` // injected BEFORE the model sees the prompt
      : undefined,
    candidates: cat.entries.length,
    calls: res.costUsd === 0 ? 0 : 1,
    cached: res.cached,
    costUsd: res.costUsd,
    reason: folded === "act"
      ? `${winner[0]} at p=${winner[1].toFixed(3)} >= act ${policy.act}`
      : !inMenu && ladder === "act" ? `judge chose ${winner[0]} at p=${winner[1].toFixed(3)} but it is NOT in the catalogue -> escalate` : `${decided.reason} -> ${folded}`,
  };
}
