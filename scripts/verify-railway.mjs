#!/usr/bin/env node
/**
 * Re-runnable post-deploy check. Skips (exit 0) without RAILWAY_URL.
 *   RAILWAY_URL=https://<service>.up.railway.app node scripts/verify-railway.mjs
 * Checks /api/health is 200 {ok:true}, and that / does not serve the app to an
 * anonymous visitor (redirect to /login or 401/503 means the password gate is on).
 */
const base = (process.env.RAILWAY_URL ?? '').replace(/\/$/, '');
if (!base) {
  console.log('verify-railway: RAILWAY_URL not set, skipping.');
  process.exit(0);
}
let failed = false;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` (${detail})` : ''}`);
  if (!ok) failed = true;
};
try {
  const h = await fetch(`${base}/api/health`, { cache: 'no-store' });
  const body = await h.json().catch(() => null);
  check('health 200 {ok:true}', h.status === 200 && body?.ok === true, `status ${h.status}`);
  const root = await fetch(`${base}/`, { redirect: 'manual' });
  const loc = root.headers.get('location') ?? '';
  check('anonymous / is gated', [307, 308, 401, 503].includes(root.status) && (root.status !== 307 && root.status !== 308 || loc.includes('/login')), `status ${root.status} ${loc}`);
} catch (err) {
  check('reachable', false, String(err?.message ?? err));
}
process.exit(failed ? 1 : 0);
