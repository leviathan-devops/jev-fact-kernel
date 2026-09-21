// src/judge/key.ts — key resolution (IL-24): env → ~/.config/typesafe/key. NEVER logged.
// Only a fingerprint (sha256 prefix) is ever surfaced.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

export interface ResolvedKey { key: string; source: "env" | "file"; fingerprint: string; }

export function resolveKey(): ResolvedKey | null {
  const env = process.env.TYPESAFE_API_KEY;
  if (env && env.trim().length > 0) {
    return { key: env.trim(), source: "env", fingerprint: fingerprintOf(env.trim()) };
  }
  const p = join(process.env.HOME ?? ".", ".config", "typesafe", "key");
  if (existsSync(p)) {
    try {
      const k = readFileSync(p, "utf8").trim();
      if (k.length > 0) return { key: k, source: "file", fingerprint: fingerprintOf(k) };
    } catch { /* fall through */ }
  }
  return null;
}

export function fingerprintOf(key: string): string {
  return createHash("sha256").update(key).digest("hex").slice(0, 12);
}
