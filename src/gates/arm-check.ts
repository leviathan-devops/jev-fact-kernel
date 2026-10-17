// src/gates/arm-check.ts — the arm check.
//
// `~/.jev-gates/mode` with a line whose trimmed text is ARMED turns the check on.
// A known-bad commit is one the judge scores below the existing flag threshold
// (DEFAULT_POLICY.flag, 0.5). The threshold is not tuned here.
//
// Tests point JEV_GATES_MODE_FILE at their own file and JM_JUDGE_URL at a mock
// bound with port 0. This module refuses 8090 and 18090 before fetch.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Database } from "bun:sqlite";
import { Judge } from "../judge/client.ts";
import { DEFAULT_POLICY, noulFrom } from "../judge/policy.ts";

export type ArmMode = "ARMED" | "DARK";

export interface CommitUnderCheck {
  message: string;
  diff: string;
}

export interface ArmCheckResult {
  mode: ArmMode;
  verdict: "BLOCK" | "ALLOW" | "DARK";
  reason: string;
  noul?: number;
  requests: number;
}

const LIVE_JUDGE_PORTS = new Set(["8090", "18090"]);

export function armModePath(): string {
  const override = process.env.JEV_GATES_MODE_FILE;
  if (override !== undefined && override.length > 0) return override;
  return join(process.env.HOME ?? "", ".jev-gates", "mode");
}

export function readArmMode(modeFile = armModePath()): ArmMode {
  if (!existsSync(modeFile)) return "DARK";
  const armed = readFileSync(modeFile, "utf8")
    .split(/\r?\n/)
    .some((line) => line.trim() === "ARMED");
  return armed ? "ARMED" : "DARK";
}

function liveJudgePort(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  return LIVE_JUDGE_PORTS.has(parsed.port) ? parsed.port : null;
}

/** When the mode file is ARMED, ask the judge and block a known-bad commit.
 *  When it is not, do not call the judge. */
export async function armCheckCommit(
  db: Database,
  commit: CommitUnderCheck,
  opts: { modeFile?: string; judge?: Judge } = {},
): Promise<ArmCheckResult> {
  const mode = readArmMode(opts.modeFile ?? armModePath());
  if (mode !== "ARMED") {
    return {
      mode,
      verdict: "DARK",
      reason: "mode file is not ARMED — the arm check does not call the judge",
      requests: 0,
    };
  }
  const url = process.env.JM_JUDGE_URL ?? "";
  if (url.length === 0) {
    return {
      mode,
      verdict: "BLOCK",
      reason: "ARMED and JM_JUDGE_URL is unset — refusing rather than dialing a default live judge",
      requests: 0,
    };
  }
  const port = liveJudgePort(url);
  if (port !== null) {
    return {
      mode,
      verdict: "BLOCK",
      reason: `JEV_LIVE_JUDGE_PORT: refusing to connect to port ${port}`,
      requests: 0,
    };
  }
  const judge = opts.judge ?? new Judge(db, {});
  const judged = await judge.askManyBatch(
    [{ id: "commit", state: { message: commit.message, diff: commit.diff } }],
    {
      acceptable: {
        type: "noul",
        instructions:
          "Is this commit acceptable to land? A known-bad commit claims a result without naming what ran and what passed. Answer 1.0 if it is acceptable, 0.0 if it must be blocked.",
      },
    },
    "arm-check@v1",
  );
  const noul = noulFrom(judged.answers, "commit__acceptable");
  if (noul >= DEFAULT_POLICY.flag) {
    return {
      mode,
      verdict: "ALLOW",
      reason: `noul=${noul.toFixed(3)} >= flag=${DEFAULT_POLICY.flag}`,
      noul,
      requests: judged.requests,
    };
  }
  return {
    mode,
    verdict: "BLOCK",
    reason: `known-bad commit blocked noul=${noul.toFixed(3)} < flag=${DEFAULT_POLICY.flag}`,
    noul,
    requests: judged.requests,
  };
}
