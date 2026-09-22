// tests/audit-judge.test.ts — the src/judge subsystem's findings (the group a previous gate line
// mis-claimed as "unreviewed"; it WAS reviewed, and these are its confirmed defects).
//
// Both are guards that hold in the obvious case and fail in the less obvious one — the shape this
// build keeps meeting.
import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { callSystemOne } from "../src/judge/transport";
import { Judge } from "../src/judge/client";
import { openDb, indexPathFor } from "../src/store/db";

describe("transport:49 — the oversized-payload cap must not be disableable by a typo", () => {
  test("test_body_cap_override_is_validated", async () => {
    // `Number(process.env.JM_JUDGE_MAX_BODY ?? MAX_OUTBOUND_BYTES)` yields **NaN** for any
    // non-numeric override — `JM_JUDGE_MAX_BODY=1mb` is the natural typo — and `bytes > NaN` is
    // ALWAYS FALSE. So the cap was silently DISABLED and the oversized-payload hang this guard was
    // written for came straight back. A guard whose override can switch it off with a typo is not a
    // guard. Same class as H-5 (`policy.fail` typo -> fail-OPEN).
    const prev = process.env.JM_JUDGE_MAX_BODY;
    try {
      process.env.JM_JUDGE_MAX_BODY = "1mb";
      await expect(callSystemOne("k", { state: { x: 1 }, model: "m", questions: {} })).rejects.toThrow(/JM_JUDGE_MAX_BODY_INVALID/);

      // and a VALID cap still enforces its limit
      process.env.JM_JUDGE_MAX_BODY = "50";
      await expect(callSystemOne("k", { state: { big: "x".repeat(500) }, model: "m", questions: {} })).rejects.toThrow(/JM_JUDGE_PAYLOAD_TOO_LARGE/);
    } finally {
      if (prev === undefined) delete process.env.JM_JUDGE_MAX_BODY; else process.env.JM_JUDGE_MAX_BODY = prev;
    }
  });
});

describe("client.ts:61 — an UNMEASURED response must not be cached", () => {
  test("test_usage_less_response_is_not_cached", async () => {
    // `cachePut` ran BEFORE `usageMissing` was computed, so a usage-less answer WAS cached — and on
    // any later identical `ask()` the cache-hit path returns EARLY (`cached: true`) WITHOUT the flag,
    // so the fail-closed `JM_JUDGE_USAGE_MISSING` refusal added by D-046 was bypassed on every
    // replay. The guard held on the FIRST call and evaporated on the second: the worst shape a guard
    // can have, because a test making one call passes and a run making two does not. `ask` has seven
    // live callers (every judged verb, plus the MCP and HTTP surfaces), so the blast radius was the
    // whole judged path.
    const home = mkdtempSync(join(tmpdir(), "jm-jb-"));
    // HOME IS SAVED AND RESTORED TOO. The first version of this test set `process.env.HOME` and
    // restored only JM_HOME/JM_LEDGER/KEY/URL — so the sandbox home (a DELETED temp dir by cleanup
    // time) leaked into every later test. The launcher tests read `$HOME/.bun/bin/bun`, so they
    // began failing with **exit 127 = no bun found**, in a run where they pass alone. That is
    // EXACTLY the D-059 class (tests/helpers.ts leaking a deleted path), reproduced by a test
    // written after the fix — the reason the rule is 'restore EVERY variable you set'.
    const prev = { home: process.env.JM_HOME, homeDir: process.env.HOME, ledger: process.env.JM_LEDGER, key: process.env.TYPESAFE_API_KEY, url: process.env.JM_JUDGE_URL };
    process.env.JM_HOME = home; process.env.HOME = home; process.env.TYPESAFE_API_KEY = "sandbox";
    delete process.env.JM_LEDGER;
    let calls = 0;
    const server = Bun.serve({ port: 0, fetch() { calls++; return Response.json({ model: "m", answers: { flag: { type: "noul", noul: 0.9 } } }); } });
    process.env.JM_JUDGE_URL = `http://127.0.0.1:${server.port}/`;
    try {
      const db = openDb(indexPathFor("cb"));
      const j = new Judge(db, { model: "m" });
      const q = { flag: { type: "noul", instructions: "?" } };
      const a = await j.ask({ x: 1 }, q, "v1");
      const b = await j.ask({ x: 1 }, q, "v1");
      db.close();
      expect(a.usageMissing).toBe(true);           // the first call reports the gap
      expect(b.usageMissing).toBe(true);           // AND SO DOES THE SECOND — never `undefined`
      expect(calls).toBe(2);                       // because the unmeasured response was NOT cached
    } finally {
      server.stop(true);
      if (prev.home === undefined) delete process.env.JM_HOME; else process.env.JM_HOME = prev.home;
      if (prev.homeDir === undefined) delete process.env.HOME; else process.env.HOME = prev.homeDir;
      if (prev.ledger === undefined) delete process.env.JM_LEDGER; else process.env.JM_LEDGER = prev.ledger;
      if (prev.key === undefined) delete process.env.TYPESAFE_API_KEY; else process.env.TYPESAFE_API_KEY = prev.key;
      if (prev.url === undefined) delete process.env.JM_JUDGE_URL; else process.env.JM_JUDGE_URL = prev.url;
      rmSync(home, { recursive: true, force: true });
    }
  });
});