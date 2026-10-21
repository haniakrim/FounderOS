#!/usr/bin/env node
// One-shot, idempotent roadmap sync for the four open 2026-Q4 items. Status is
// never changed. Writes company.json, seed-v1.ts and demo-data/glados.db with
// the same text; refuses to touch anything unless every file matches exactly.
//   node scripts/sync-roadmap-q4.mjs [repoRoot]      (default: cwd)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const root = path.resolve(process.argv[2] ?? '.');
const require = createRequire(path.join(root, 'package.json'));
const Database = require('better-sqlite3');
if (/(^|[\\/])data$/.test(root) || root.includes(`${path.sep}data${path.sep}`)) throw new Error('refusing to run inside data/');

const NEXT = {
  'rm-auth': 'Login lockout, secure cookies, session expiry and the Remote access card shipped, plus a read-only check (scripts/verify-remote.mjs). Left: sign in to Tailscale on the host, then share the app on the tailnet.',
  'rm-postiz': 'Postiz connector, Setup entry and Social panel shipped, plus a compose file for a local Postiz (deploy/postiz; config validated, not yet started). Left: start it, create your user, set POSTIZ_URL and POSTIZ_API_KEY.',
  'rm-railway': 'Dockerfile, railway.json and /api/health shipped; pnpm docker:smoke proves build, health, the password gate and login locally. Left: Railway login and your OK for the first public deploy.',
  'rm-workers': 'Pool shipped (lib/worker-pool.ts): bounded seats, retry, cancel, recovery, usage card, plus a read-only check (scripts/verify-workers.mjs). Left: gateway install on the host (/api/pool reports the gateway key AI_GATEWAY_API_KEY as not set).',
};
const OLD = {
  'rm-auth': 'Login lockout, secure cookies, session expiry and the Remote access card shipped; linking Tailscale is left.',
  'rm-postiz': 'Postiz connector, Setup entry and Social panel shipped; pointing it at the Postiz server is left.',
  'rm-railway': 'Dockerfile, railway.json and /api/health ready and built locally; first deploy waits on the account.',
  'rm-workers': 'Pool shipped: bounded seats, retry, cancel, recovery, usage card. Gateway install on the host left.',
};
const ids = Object.keys(NEXT);
const swap = (text, file) => {
  let out = text;
  for (const id of ids) {
    const n = out.split(JSON.stringify(OLD[id]).slice(1, -1)).length - 1;
    const already = out.includes(NEXT[id]);
    if (n === 0 && already) continue;
    if (n !== 1) throw new Error(`${file}: expected exactly 1 old text for ${id}, found ${n}`);
    out = out.replace(OLD[id], () => NEXT[id]);
  }
  return out;
};

// The new text names these files. Refuse to claim them if any is missing.
const needed = ['scripts/docker-smoke.sh', 'scripts/verify-workers.mjs', 'scripts/verify-remote.mjs', 'scripts/verify-railway.mjs', 'deploy/postiz/up.sh', 'deploy/postiz/override.yaml'];
const missing = needed.filter((f) => !fs.existsSync(path.join(root, f)));
if (missing.length) throw new Error(`create these first, the roadmap text refers to them: ${missing.join(', ')}`);
const files = ['lib/demo/company.json', 'lib/demo/seed-v1.ts'].map((f) => path.join(root, f));
const next = files.map((f) => swap(fs.readFileSync(f, 'utf8'), f));
JSON.parse(next[0]);                                   // still valid JSON
const dbPath = path.join(root, 'demo-data/glados.db');
const db = new Database(dbPath);
db.pragma('busy_timeout = 5000');                      // the dev server may hold the WAL briefly
const rows = db.prepare(`SELECT id, status FROM roadmap_items WHERE id IN (${ids.map(() => '?').join(',')})`).all(...ids);
if (rows.length !== 4 || rows.some((r) => r.status !== 'now')) throw new Error(`demo DB: expected 4 rows with status now, got ${JSON.stringify(rows)}`);
// Order: temp files and backups, then BEGIN IMMEDIATE, DB updates, renames, COMMIT.
// Any failure rolls the DB back and puts every renamed file back from its backup.
const tmps = files.map((f, i) => { const t = `${f}.tmp-${process.pid}`; fs.writeFileSync(t, next[i]); return t; });
const baks = files.map((f) => { const b = `${f}.bak-${process.pid}`; fs.copyFileSync(f, b); return b; });
const up = db.prepare('UPDATE roadmap_items SET description = ? WHERE id = ?');
const renamed = [];
let began = false;
try {
  db.exec('BEGIN IMMEDIATE'); began = true;
  ids.forEach((id) => up.run(NEXT[id], id));
  tmps.forEach((t, i) => { fs.renameSync(t, files[i]); renamed.push(i); });
  if (process.env.SYNC_TEST_FAIL === 'before-commit') throw new Error('test failure injected before commit');
  db.exec('COMMIT'); began = false;
} catch (err) {
  if (began) { try { db.exec('ROLLBACK'); } catch {} }
  renamed.forEach((i) => fs.renameSync(baks[i], files[i]));
  throw err;
} finally {
  [...tmps, ...baks].forEach((f) => fs.rmSync(f, { force: true }));
  db.close();
}
console.log('roadmap synced: 4 items, status unchanged (now)');
