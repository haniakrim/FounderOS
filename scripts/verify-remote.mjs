#!/usr/bin/env node
// Read-only check of remote access. Reads GET /api/remote-access on the running app.
//   node scripts/verify-remote.mjs        (APP_URL, APP_COOKIE as in verify-workers.mjs)
// Exit 0 with SKIP until Tailscale is up and a password is set; exit 1 if unreachable.
const base = (process.env.APP_URL ?? 'http://127.0.0.1:4100').replace(/\/+$/, '');
const headers = process.env.APP_COOKIE ? { cookie: process.env.APP_COOKIE } : {};
try {
  const res = await fetch(`${base}/api/remote-access`, { headers, cache: 'no-store', signal: AbortSignal.timeout(10000), redirect: 'manual' });
  if (res.status !== 200) throw new Error(`/api/remote-access -> HTTP ${res.status}`);
  const j = await res.json();
  if (typeof j?.tailscale?.installed !== 'boolean' || typeof j?.passwordSet !== 'boolean') throw new Error('payload has no tailscale or passwordSet');
  console.log(`ok card: tailscale installed=${j.tailscale.installed} up=${j.tailscale.up} state=${j.tailscale.state}; password=${j.passwordSet}; status=${j.status}`);
  if (!j.tailscale.installed) { console.log('SKIP install Tailscale first'); process.exit(0); }
  if (!j.tailscale.up) { console.log('SKIP Tailscale is not running or not signed in'); process.exit(0); }
  if (!j.passwordSet) { console.log('SKIP set a password in Setup > Security before sharing'); process.exit(0); }
  if (!j.tailscaleUrl) throw new Error('Tailscale is up but the card has no tailnet URL');
  console.log(`PASS tailnet URL ${j.tailscaleUrl}; trustProxy=${j.trustProxy}`);
} catch (err) { console.log(`FAIL verify-remote: ${err?.message ?? err}`); process.exit(1); }
