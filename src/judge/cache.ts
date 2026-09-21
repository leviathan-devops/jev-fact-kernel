// src/judge/cache.ts — fingerprint + redaction + the cache table (D013/D014, L11).
// key = sha256(model ⊕ schema-version ⊕ canonical(redact(state))) — redact BEFORE hashing.
import { createHash } from "node:crypto";
import type { Database } from "bun:sqlite";

export function redact(value: unknown): unknown {
  if (typeof value === "string") {
    return value
      .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[email]")
      .replace(/\+?\d[\d ()-]{7,}\d/g, "[phone]")
      .replace(/\b[a-f0-9]{32,}\b/gi, "[hex]")
      .replace(/\b(sk-|ghp_|xox[bap]-)[A-Za-z0-9_-]{8,}/g, "[secret]");
  }
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(value as Record<string, unknown>).sort()) out[k] = redact((value as Record<string, unknown>)[k]);
    return out;
  }
  return value;
}

export const canonical = (v: unknown): string => JSON.stringify(redact(v));

export function fingerprint(model: string, schemaVersion: string, state: unknown): string {
  return createHash("sha256").update(`${model}\u0000${schemaVersion}\u0000${canonical(state)}`).digest("hex");
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
