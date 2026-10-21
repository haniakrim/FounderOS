#!/usr/bin/env node
// Read-only check of the worker pool and its model gateway. Makes no model call
// and costs nothing. Reads GET /api/pool on the running app.
//   node scripts/verify-workers.mjs                       (app at http://127.0.0.1:4100)
//   APP_URL=https://host APP_COOKIE='glados_session=...' node scripts/verify-workers.mjs
// Exit 0 with SKIP while AI_GATEWAY_API_KEY is not set (the pool is up, the gateway is not).
// Exit 1 when the app is unreachable or the pool payload is malformed.
const base = (process.env.APP_URL ?? 'http://127.0.0.1:4100').replace(/\/+$/, '');
const headers = process.env.APP_COOKIE ? { cookie: process.env.APP_COOKIE } : {};
try {
  const res = await fetch(`${base}/api/pool`, { headers, cache: 'no-store', signal: AbortSignal.timeout(10000), redirect: 'manual' });
  if (res.status !== 200) throw new Error(`/api/pool -> HTTP ${res.status} (password set? pass APP_COOKIE)`);
  const j = await res.json();
  const limits = j?.snapshot?.limits;
  if (!limits || !Number.isInteger(limits.worker) || !Number.isInteger(limits.conductor) || typeof j?.llm?.configured !== 'boolean') {
    throw new Error('/api/pool payload has no snapshot.limits or llm.configured');
  }
  console.log(`ok pool: ${limits.worker} worker seats, ${limits.conductor} conductor seats, ${j.snapshot.running} running, ${j.snapshot.queued} queued`);
  if (!j.llm.configured) {
    console.log(`SKIP gateway: ${j.llm.detail || 'AI_GATEWAY_API_KEY not set'} (set it at /integrations)`);
    process.exit(0);
  }
  console.log(`PASS gateway key resolves: ${j.llm.detail}`);
} catch (err) {
  console.log(`FAIL verify-workers: ${err?.message ?? err}`);
  process.exit(1);
}
