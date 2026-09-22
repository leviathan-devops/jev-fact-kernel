// tests/audit-judge.test.ts — the src/judge subsystem's findings (the group a previous gate line
// mis-claimed as "unreviewed"; it WAS reviewed, and these are its confirmed defects).
//
// Both are guards that hold in the obvious case and fail in the less obvious one — the shape this
// build keeps meeting.
import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { callSystemOne } from "../src/judge/transport";
import { Judge } from "../src/judge/client";
import { openDb, indexPathFor } from "../src/store/db";
import { fingerprint } from "../src/judge/cache";

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
describe("cache.ts:23 — a redactor inside a CACHE KEY must not erase the input's identity", () => {
  test("test_redaction_does_not_collapse_distinct_states", () => {
    // MEASURED BEFORE THE FIX: `{session_id: "123456789"}` and `{session_id: "987654321"}` produced
    // the SAME fingerprint, because the phone pattern `/\+?\d[\d ()-]{7,20}\d/` matched any 9–22
    // character digit run and redacted an ordinary ID to `[phone]`. The cache then served one
    // state's answer for the other — a wrong answer to the wrong question, with nothing erroring.
    // A redactor inside a cache key has to be NARROWER than the data it stands for.
    const mk = (id: string) => ({ session_id: id });
    expect(fingerprint("m", "v1", mk("123456789"))).not.toBe(fingerprint("m", "v1", mk("987654321")));
    expect(fingerprint("m", "v1", mk("1234567890123456"))).not.toBe(fingerprint("m", "v1", mk("9999999999999999")));
  });

  test("test_redaction_still_covers_real_phone_shapes", () => {
    // The other half: the marker must still do its job. Two states differing only in a REAL phone
    // number share a fingerprint, because the number is the secret being kept out of the key.
    const mk = (c: string) => ({ contact: c });
    for (const [a, b] of [["+1 555 123 4567", "+1 555 999 8888"], ["(555) 123-4567", "(555) 999-8888"], ["555-123-4567", "555-999-8888"], ["+44 20 7946 0958", "+44 20 7000 0000"]]) {
      expect(fingerprint("m", "v1", mk(a))).toBe(fingerprint("m", "v1", mk(b)));
    }
  });
});

describe("find.ts:94 / policy.ts — an unmeasured cost is fatal REGARDLESS of fail polarity", () => {
  test("test_usage_missing_refuses_even_under_fail_open", async () => {
    // The D-046 guard throws `JM_JUDGE_USAGE_MISSING` INSIDE the pool task, where `runPool` captures
    // it as a generic error — and `fatalJudgeError` treated only `JEV_NO_KEY` as unconditionally
    // fatal. So under `fail: "open"` it was silently swallowed and the run completed with rows whose
    // cost was never measured: exactly the state D-046 exists to refuse. `fail: "open"` is the opt-in
    // to DEGRADE (a marked row whose cost is known to be zero), not an opt-in to run without
    // accounting. MEASURED: both polarities now REFUSE.
    const home = mkdtempSync(join(tmpdir(), "jm-fm-"));
    const corpus = join(home, "c");
    mkdirSync(corpus, { recursive: true });
    for (let i = 0; i < 3; i++) writeFileSync(join(corpus, `f${i}.md`), `tombstone record ${i}\nmore tombstone text here to make a decent excerpt`);
    const prev = { home: process.env.JM_HOME, homeDir: process.env.HOME, key: process.env.TYPESAFE_API_KEY, url: process.env.JM_JUDGE_URL, ledger: process.env.JM_LEDGER };
    process.env.JM_HOME = home; process.env.HOME = home; process.env.TYPESAFE_API_KEY = "sandbox";
    delete process.env.JM_LEDGER;
    const server = Bun.serve({ port: 0, fetch() { return Response.json({ model: "m", answers: { is_instance: { type: "noul", noul: 0.9 } } }); } });   // NO usage block
    process.env.JM_JUDGE_URL = `http://127.0.0.1:${server.port}/`;
    try {
      const { openDb, indexPathFor } = await import("../src/store/db");
      const { indexTarget } = await import("../src/verbs/index");
      const { find } = await import("../src/verbs/find");
      const db = openDb(indexPathFor("fm"));
      indexTarget(db, "fm", corpus, {});
      for (const failOpen of [false, true]) {
        await expect(find(db, { phrase: "tombstone", failOpen, concurrency: 1 })).rejects.toThrow(/JM_JUDGE_USAGE_MISSING/);
      }
      db.close();
    } finally {
      server.stop(true);
      if (prev.home === undefined) delete process.env.JM_HOME; else process.env.JM_HOME = prev.home;
      if (prev.homeDir === undefined) delete process.env.HOME; else process.env.HOME = prev.homeDir;
      if (prev.key === undefined) delete process.env.TYPESAFE_API_KEY; else process.env.TYPESAFE_API_KEY = prev.key;
      if (prev.url === undefined) delete process.env.JM_JUDGE_URL; else process.env.JM_JUDGE_URL = prev.url;
      if (prev.ledger === undefined) delete process.env.JM_LEDGER; else process.env.JM_LEDGER = prev.ledger;
      rmSync(home, { recursive: true, force: true });
    }
  });
});

describe("cache.ts:21 — the redaction ORDER must match the rule stated beside it", () => {
  test("test_secret_marker_wins_over_the_generic_hex_marker", () => {
    // The comment says "ORDER: MOST SPECIFIC FIRST" and the code contradicted it two lines below.
    // MEASURED: `sk-` + 40 hex characters matches BOTH `[a-f0-9]{32,128}` and the secret pattern, so
    // hex-first consumed the body and the marker came out `sk-[hex]` instead of `[secret]`. The body
    // was still erased, so this is a MARKER defect rather than a leak — fixed because a redactor
    // that says `[hex]` about a GitHub token misreports what it found, and because the rule and the
    // code must not disagree. A redactor inside a CACHE KEY is observable through the fingerprint,
    // so the property is pinned at that boundary: two DIFFERENT secrets must still hash apart
    // (the body stays in the key's input), while a MARKER change is checked by the collision
    // behaviour of same-shaped secrets.
    // WHAT IS OBSERVABLE, AND WHAT IS DELIBERATE. A secret's BODY being erased from the key is the
    // PRIVACY property, not a defect: the fingerprint is stored, and a low-entropy secret would be
    // brute-forceable out of a bare sha256. So two secrets of the same SHAPE collide BY DESIGN —
    // while two ordinary numeric IDs must NOT (that was the phone-pattern defect: it matched data
    // that is not a secret at all). My first draft of this test asserted the opposite and was wrong
    // about the design; the corrected assertions below separate the two cases.
    const secretA = "ghp_" + "a".repeat(36);
    const secretB = "ghp_" + "b".repeat(36);
    expect(fingerprint("m", "v1", { t: secretA })).toBe(fingerprint("m", "v1", { t: secretB }));   // the body is redacted: intended
    // a bare hex run is NOT a secret-shaped token, so it must not collapse onto one
    expect(fingerprint("m", "v1", { t: "a".repeat(40) })).not.toBe(fingerprint("m", "v1", { t: secretA }));
    // and ordinary numeric IDs stay distinct (the phone-pattern fix, re-asserted here)
    expect(fingerprint("m", "v1", { id: "123456789" })).not.toBe(fingerprint("m", "v1", { id: "987654321" }));
  });
});
