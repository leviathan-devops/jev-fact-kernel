// src/store/db.ts — open/init the index store; resolve index paths + targets.
import { Database } from "bun:sqlite";
import { mkdirSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { dirname, join, basename, resolve } from "node:path";
import { createHash } from "node:crypto";
import { SCHEMA_SQL, SCHEMA_VERSION } from "./schema.ts";

export const jmHome = (): string => process.env.JM_HOME ?? join(process.env.HOME ?? ".", ".jm");
export const indexDir = (): string => join(jmHome(), "index");
export const targetsPath = (): string => join(jmHome(), "targets.json");

export type TargetKind = "fs" | "sqlite" | "jsonl";
export interface Target { name: string; kind: TargetKind; root: string; opts?: Record<string, unknown>; }

export function openDb(path: string): Database {
  mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path, { create: true });
  // ORDER MATTERS: the timeout must be in force BEFORE the pragma that needs a lock. Setting
  // `journal_mode = WAL` first meant the one statement most likely to contend ran unprotected —
  // measured: with the timeout set after it, ONE of four simultaneous indexers still died with
  // `database is locked`. (D-035; both other openers in this codebase have the timeout too, and
  // the STORE — the most contended file of the three — was the one missing it.)
  db.run("PRAGMA busy_timeout = 5000");
  db.run("PRAGMA journal_mode = WAL");
  db.run(SCHEMA_SQL);
  const row = db.query("SELECT value FROM meta WHERE key = 'schema_version'").get() as { value?: string } | null;
  if (!row) db.run("INSERT INTO meta(key, value) VALUES ('schema_version', ?)", [String(SCHEMA_VERSION)]);
  return db;
}

/** Sanitise a caller-supplied index name: no path separators, no traversal, bounded length. */
export function safeName(name: string): string {
  const cleaned = name.replace(/[^A-Za-z0-9._-]/g, "_").replace(/\.\.+/g, "_").slice(0, 64);
  if (!cleaned || cleaned === "." || cleaned === "..") throw new Error(`JM_NAME_INVALID: "${name}"`);
  return cleaned;
}
export const indexPathFor = (name: string): string => join(indexDir(), `${safeName(name)}.sqlite`);

/** A READ-ONLY open: the index must already exist. Creating a phantom index on a typo turned
 *  "no such index" into "no matches" with exit 0 — a silent wrong answer (second-operator drill,
 *  G1). Writers use openDb(); readers use this. */
export function openIndexExisting(name: string, dbPath: string): Database {
  if (!existsSync(dbPath)) {
    throw new Error(`JM_INDEX_MISSING: no index "${name}" at ${dbPath} — build it first (jm index --in all --name ${name})`);
  }
  return openDb(dbPath);
}

/** True when the index file exists (for a caller that wants to report rather than throw). */
export function indexExists(name: string): boolean {
  return existsSync(indexPathFor(name));
}

export function loadTargets(): Target[] {
  const p = targetsPath();
  if (!existsSync(p)) return [];
  try { return JSON.parse(readFileSync(p, "utf8")) as Target[]; }
  catch { throw new Error(`JM_TARGETS_CORRUPT: ${p} is not valid JSON`); }   // LOUD: never a silent empty registry
}

export function saveTargets(list: Target[]): void {
  const p = targetsPath();
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(list, null, 2) + "\n");   // sync write: errors throw to the caller, never swallowed
}

/** Resolve an argument to {name, root}: `@name` via the registry, else a path. */
export function resolveTarget(arg: string): { name: string; root: string } {
  if (arg.startsWith("@")) {
    const t = loadTargets().find((x) => x.name === arg.slice(1));
    if (!t) throw new Error(`JM_TARGET_UNKNOWN: ${arg} is not in ${targetsPath()}`);
    if (!existsSync(t.root)) throw new Error(`JM_TARGET_MISSING: ${t.name} -> ${t.root} does not exist`);
    return { name: t.name, root: t.root };
  }
  const root = resolve(arg);
  if (!existsSync(root)) throw new Error(`JM_TARGET_MISSING: ${root} does not exist`);
  const stem = (basename(root) || "root").replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 40);
  const tag = createHash("sha256").update(root).digest("hex").slice(0, 6);   // /a/proj and /b/proj must not collide
  return { name: `${stem}-${tag}`, root };
}
