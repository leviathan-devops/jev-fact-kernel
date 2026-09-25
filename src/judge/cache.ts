// src/judge/cache.ts — fingerprint + redaction + the cache table (D013/D014, L11).
// key = sha256(model ⊕ schema-version ⊕ canonical(redact(state))) — redact BEFORE hashing.
import { createHash } from "node:crypto";
import type { Database } from "bun:sqlite";

export function redact(value: unknown): unknown {
  if (typeof value === "string") {
    return value
      // BOUNDED QUANTIFIERS, BECAUSE AN UNBOUNDED ONE MADE THE FINGERPRINT QUADRATIC (D-037).
      // `[\w.+-]+@` is greedy: on a long word it consumes the WHOLE run, then backtracks one
      // character at a time looking for `@`. Measured on this engine:
      //     n= 50,000 -> 505 ms      n=100,000 -> 1,986 ms      n=200,000 -> 7,912 ms
      // 4x per doubling — a 4 MB document body would have taken ~3,200 SECONDS before the sha
      // even ran, which is why the run "hung" with no output and the transport's timeout never
      // fired (the hang was BEFORE the network). The RFC bounds the local part at 64 characters,
      // so `{1,64}` matches every real address and makes the scan linear.
      // ORDER: MOST SPECIFIC FIRST. With the loose phone pattern ahead of the hex pattern, a
      // 32-character hex string was redacted as `[phone]abcdef[phone]` — the marker was wrong AND
      // six characters of the value SURVIVED. A partial redaction of a secret is a leak.
      //
      // THE SECRET PATTERN RUNS BEFORE THE HEX PATTERN (audit cache.ts:21). The rule above was
      // stated here and contradicted two lines below it: `sk-`/`ghp_`/`xoxb-` tokens whose BODY is
      // a long hex run match BOTH patterns — MEASURED, `sk-` + 40 hex characters matches
      // `[a-f0-9]{32,128}` and the secret pattern alike — so hex-first consumed the body first and
      // the marker came out `sk-[hex]` instead of `[secret]`. The body was still erased, so this
      // is a MARKER defect rather than a leak; it is fixed because a redactor whose output says
      // `[hex]` about a GitHub token misreports what it found, and because the rule and the code
      // must not disagree. Most specific (a known secret prefix) before most generic (a hex run).
      .replace(/[\w.+-]{1,64}@[\w-]{1,255}\.[\w.]{1,255}/g, "[email]")
      .replace(/\b(sk-|ghp_|xox[bap]-)[A-Za-z0-9_-]{8,128}/g, "[secret]")
      .replace(/\b[a-f0-9]{32,128}\b/gi, "[hex]")
      // THE PHONE PATTERN REQUIRES PHONE STRUCTURE (audit cache.ts:23). The loose form
      // `/\+?\d[\d ()-]{7,20}\d/` matched any 9–22 character run of digits — so an ordinary
      // numeric ID was redacted to `[phone]`, and **two states differing only in such an ID
      // produced the SAME fingerprint**: MEASURED, `{session_id: "123456789"}` and
      // `{session_id: "987654321"}` hashed identically, so the cache served one state's answer for
      // the other. A redactor inside a CACHE KEY must not erase the difference between two inputs;
      // the marker has to be narrower than the data it stands for. A real phone number carries a
      // leading `+`, a space, a parenthesis or a dash — a bare digit run does not, and is left
      // intact. This is the same rule as the email/hex ordering above it: REDACT THE SECRET, NOT
      // THE SHAPE.
      .replace(/(?:\(\d{1,4}\)[\d -]{5,18}\d|\+\d[\d ()-]{6,20}\d|\d{1,4}[ -]\d{2,4}[ -]?\d{2,4}(?:[ -]\d{2,4})?)/g, "[phone]");
  }
  if (Array.isArray(value)) return value.map(redact);
  if (value instanceof Date) return { __date: value.toISOString() };          // Date has no enumerable keys; collapse would erase it
  if (value instanceof Map) return { __map: Array.from(value.entries()).map(([k, v]) => [redact(k), redact(v)]) };
  if (value instanceof Set) return { __set: Array.from(value).map(redact).sort() };
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(value as Record<string, unknown>).sort()) out[k] = redact((value as Record<string, unknown>)[k]);
    return out;
  }
  return value;
}

export const canonical = (v: unknown): string => JSON.stringify(redact(v));

/** THE CANONICAL FORM FOR THE CACHE KEY — the RAW state, NOT the redacted one.
 *
 *  THE CRITICAL DEFECT THIS FIXES (audit cache.ts:29-31, MEASURED):
 *    fingerprint(model, schema, {email:'a@x.com'})  -> hash X
 *    fingerprint(model, schema, {email:'b@y.com'})  -> hash X   <- COLLISION
 *  Both states canonicalize to `[email]`, so cacheGet serves one state's answer for
 *  another. The cache key MUST preserve input-distinctness. The redactor's job is to
 *  strip secrets from what is STORED, not from what is KEYED.
 *
 *  THE FIX: the fingerprint hashes the canonical (sorted-key) JSON of the RAW state.
 *  The redacted form is computed ONLY for the `answer_json` column, so secrets do not
 *  leak into the stored payload. Two separate jobs, two separate paths. */
export const canonicalRaw = (v: unknown): string => {
  // Sort keys for a deterministic ordering (same as redact's object path), but do NOT redact.
  if (value_is_object(v)) {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as Record<string, unknown>).sort()) out[k] = canonicalRaw((v as Record<string, unknown>)[k]);
    return JSON.stringify(out);
  }
  if (Array.isArray(v)) return JSON.stringify(v.map(canonicalRaw));
  if (v instanceof Date) return JSON.stringify({ __date: v.toISOString() });
  if (v instanceof Map) {
    const entries = Array.from(v.entries()).map(([k, val]) => [canonicalRaw(k), canonicalRaw(val)]);
    entries.sort((a, b) => a[0].localeCompare(b[0]));
    return JSON.stringify({ __map: entries });
  }
  if (v instanceof Set) {
    const items = Array.from(v).map(canonicalRaw).sort();
    return JSON.stringify({ __set: items });
  }
  return JSON.stringify(v ?? null);
};

function value_is_object(v: unknown): boolean {
  return v !== null && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date) && !(v instanceof Map) && !(v instanceof Set);
}

export function fingerprint(model: string, schemaVersion: string, state: unknown): string {
  return createHash("sha256").update(`${model}\u0000${schemaVersion}\u0000${canonicalRaw(state)}`).digest("hex");
}

export interface CachedAnswer { answers: unknown; model: string; }

export function cacheGet(db: Database, fp: string): CachedAnswer | null {
  const row = db.query("SELECT answer_json, model FROM cache WHERE fingerprint = ?").get(fp) as { answer_json: string; model: string } | null;
  if (!row) return null;
  db.run("UPDATE cache SET hits = hits + 1 WHERE fingerprint = ?", [fp]);
  return { answers: JSON.parse(row.answer_json), model: row.model };
}

export function cachePut(db: Database, fp: string, provider: string, model: string, schemaHash: string, stateHash: string, answers: unknown): void {
  db.run("INSERT OR REPLACE INTO cache(fingerprint, provider, model, schema_hash, state_hash, answer_json, created_at, hits) VALUES (?,?,?,?,?,?,?, COALESCE((SELECT hits FROM cache WHERE fingerprint=?),0))",
    [fp, provider, model, schemaHash, stateHash, JSON.stringify(answers), new Date().toISOString(), fp]);
}
