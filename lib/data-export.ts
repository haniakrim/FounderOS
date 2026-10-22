import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { Readable } from "node:stream";
import { getDb, resetDb, resolveDbPath } from "@/lib/data";
import { brainRoot } from "@/lib/database/scan";

export const DEMO_REFUSAL =
  "You are looking at the demo company, and demo data is not yours. Switch to real data in Setup, then export or delete.";

export const EXPORT_TMP_PREFIX = "matchco-export-";

export function exportName(d = new Date()): string {
  return `matchco-export-${d.toISOString().slice(0, 10)}`;
}

/**
 * Build the export: a consistent SQLite snapshot (online backup, never a copy
 * of the live file) plus the brain folder when one is configured, streamed as
 * a tar.gz by the system `tar` (no archive library is added). The brain is
 * linked into the staging folder and followed with `-h`, which both bsdtar and
 * GNU tar support.
 */
export async function buildExport(): Promise<{
  stream: ReadableStream<Uint8Array>;
  filename: string;
  hasBrain: boolean;
}> {
  const name = exportName();
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), EXPORT_TMP_PREFIX));
  const cleanup = () => fs.rmSync(stage, { recursive: true, force: true });
  try {
    const root = path.join(stage, name);
    fs.mkdirSync(root);
    await getDb().backup(path.join(root, "glados.db"));
    const brain = brainRoot();
    if (brain) fs.symlinkSync(brain, path.join(root, "brain"), "dir");
    const child = spawn("tar", ["-czhf", "-", "-C", stage, name], {
      stdio: ["ignore", "pipe", "ignore"],
    });
    child.on("close", cleanup);
    child.on("error", cleanup);
    return {
      stream: Readable.toWeb(child.stdout) as ReadableStream<Uint8Array>,
      filename: `${name}.tar.gz`,
      hasBrain: Boolean(brain),
    };
  } catch (e) {
    cleanup();
    throw e;
  }
}

/** Remove leftover export staging folders from the OS temp dir. */
export function clearExportTemp(): number {
  let n = 0;
  for (const d of fs.readdirSync(os.tmpdir())) {
    if (!d.startsWith(EXPORT_TMP_PREFIX)) continue;
    fs.rmSync(path.join(os.tmpdir(), d), { recursive: true, force: true });
    n += 1;
  }
  return n;
}

/**
 * Wipe the database: close it, delete the file and its WAL/SHM, reopen a fresh
 * one (getDb re-seeds only the structural departments/agents).
 */
export function wipeDatabase(): { removed: string[] } {
  const dbPath = resolveDbPath();
  resetDb();
  const removed: string[] = [];
  if (dbPath !== ":memory:") {
    for (const f of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
      if (fs.existsSync(f)) {
        fs.rmSync(f, { force: true });
        removed.push(f);
      }
    }
  }
  getDb();
  return { removed };
}
