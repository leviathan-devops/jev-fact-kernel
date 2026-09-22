// src/store/db.ts — open/init the index store; resolve index paths + targets.
import { Database } from "bun:sqlite";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
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
  // WAL IS PERSISTENT, SO SETTING IT IS A ONE-TIME MIGRATION — and the migration needs an EXCLUSIVE
  // lock that `busy_timeout` does not reliably wait out. Setting it unconditionally made FOUR
  // simultaneous opens on a FRESH database race for that lock: measured under load, rounds 5 and 7
  // of 8 lost a run to `database is locked` even WITH the timeout in force. Reading the current
  // mode first means only the first process converts; the others see "wal" and do nothing. The
  // setter is wrapped because losing the race is not an error: the winner's conversion is
  // persistent, so the loser simply proceeds against a database that is already in WAL.
  const mode = (db.query("PRAGMA journal_mode").get() as { journal_mode?: string } | null)?.journal_mode;
  if (mode !== "wal") {
    try { db.run("PRAGMA journal_mode = WAL"); }
    catch { /* another process won the conversion; WAL persists, so this is not a failure */ }
  }
  db.run(SCHEMA_SQL);
  // ATOMIC, NOT CHECK-THEN-INSERT (D-038). Reading first and inserting only when absent is a
  // TOCTOU race: four concurrent CLI runs all read "no row", all four inserted, and three died on
  // `UNIQUE constraint failed: meta.key` at exit 1. Measured over six rounds of four simultaneous
  // indexers: rounds 1-5 clean, round 6 lost a run. `INSERT OR IGNORE` is idempotent and lets the
  // database arbitrate the race instead of the application.
  db.run("INSERT OR IGNORE INTO meta(key, value) VALUES ('schema_version', ?)", [String(SCHEMA_VERSION)]);
  return db;
}

/** Sanitise a caller-supplied index name: no path separators, no traversal, bounded length. */
export function safeName(name: string): string {
  const cleaned = name.replace(/[^A-Za-z0-9._-]/g, "_").replace(/\.\.+/g, "_").slice(0, 64);
  if (!cleaned || cleaned === "." || cleaned === "..") throw new Error(`JM_NAME_INVALID: "${name}"`);
  // COLLISION-PROOF, the same fix `safeTargetName` carries for D-027. `my index` and `my/index` both
  // sanitised to `my_index`, so two DIFFERENT index names resolved to ONE file — MEASURED: the second
  // `jm index --name "my/index"` reported `JM_INDEX_OK ... changed=0` while writing into the first
  // index's file, and `ls index/` showed a single `my_index.sqlite`. An operator naming two indexes
  // that differ only in punctuation silently got one. A name that was ALREADY safe is returned
  // UNCHANGED, so every existing index keeps its filename and `indexPathFor` stays deterministic.
  if (cleaned === name) return cleaned;
  return `${cleaned.slice(0, 48)}-${createHash("sha256").update(name).digest("hex").slice(0, 8)}`;
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
  let parsed: unknown;
  try { parsed = JSON.parse(readFileSync(p, "utf8")); }
  catch { throw new Error(`JM_TARGETS_CORRUPT: ${p} is not valid JSON`); }   // LOUD: never a silent empty registry
  // VALID JSON IS NOT A VALID REGISTRY (audit db.ts:79). The parse result was cast straight to
  // `Target[]`, so `{}`, `null` or `"x"` — all valid JSON — sailed through and the failure surfaced
  // far away as `undefined is not a function` on `.find()` or `.filter()`. A file whose SHAPE is
  // wrong is as corrupt as one whose syntax is, and it is named the same way.
  if (!Array.isArray(parsed)) {
    throw new Error(`JM_TARGETS_CORRUPT: ${p} must be a JSON ARRAY of targets (found ${parsed === null ? "null" : typeof parsed})`);
  }
  for (const [i, t] of parsed.entries()) {
    const ok = t !== null && typeof t === "object"
      && typeof (t as Target).name === "string" && (t as Target).name.length > 0
      && typeof (t as Target).kind === "string"
      && typeof (t as Target).root === "string";
    if (!ok) throw new Error(`JM_TARGETS_CORRUPT: ${p} entry ${i} is not {name,kind,root} strings`);
  }
  return parsed as Target[];
}

export function saveTargets(list: Target[]): void {
  const p = targetsPath();
  mkdirSync(dirname(p), { recursive: true });
  // WRITE-THEN-RENAME (audit db.ts:76/86). `writeFileSync(p, …)` truncates the live file and rewrites
  // it in place, so a crash, an ENOSPC, or a killed process mid-write leaves a TRUNCATED or EMPTY
  // registry — and every target the operator defined is gone. Callers do read-modify-write
  // (`loadTargets()` → mutate → `saveTargets()`), which widens the window. `rename(2)` is atomic on
  // the same filesystem, so a reader sees either the old file or the new one, never a half-written one.
  const tmp = `${p}.tmp-${process.pid}`;
  writeFileSync(tmp, JSON.stringify(list, null, 2) + "\n");   // sync: errors throw, never swallowed
  renameSync(tmp, p);
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
