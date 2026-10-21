#!/usr/bin/env node
/**
 * Re-runnable post-deploy check. Skips (exit 0) without RAILWAY_URL.
 *   RAILWAY_URL=https://<service>.up.railway.app node scripts/verify-railway.mjs
 * Checks /api/health is 200 {ok:true}, and that / does not serve the app to an
 * anonymous visitor (redirect to /login or 401/503 means the password gate is on).
 * With RAILWAY_PASSWORD set it also proves the stored hash works: a wrong
 * password is refused (401) and the right one signs in (200 {ok:true}) and
 * unlocks `/`. One failed attempt is recorded by the login throttle.
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
  const password = process.env.RAILWAY_PASSWORD ?? '';
  if (password) {
    const login = (pw) => fetch(`${base}/api/auth/login`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: pw }), redirect: 'manual',
    });
    const bad = await login(`${password}-wrong`);
    check('wrong password refused', bad.status === 401, `status ${bad.status}`);
    const good = await login(password);
    const gb = await good.json().catch(() => null);
    check('right password signs in', good.status === 200 && gb?.ok === true, `status ${good.status}`);
    const cookie = (good.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');
    const home = await fetch(`${base}/`, { redirect: 'manual', headers: { cookie } });
    check('session unlocks /', home.status === 200, `status ${home.status}`);
  } else {
    console.log('SKIP login checks: RAILWAY_PASSWORD not set.');
  }
} catch (err) {
  check('reachable', false, String(err?.message ?? err));
}
process.exit(failed ? 1 : 0);
