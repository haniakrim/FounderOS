#!/usr/bin/env node
// Live check of the Postiz public API. Read-only: lists channels, posts and
// analytics; never creates a post. Skips (exit 0) without POSTIZ_URL + POSTIZ_API_KEY.
//   POSTIZ_URL=https://postiz.example.com POSTIZ_API_KEY=... node scripts/verify-postiz.mjs
import fs from 'node:fs';

function envLocal() {
  try {
    return Object.fromEntries(
      fs.readFileSync('.env.local', 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#') && l.includes('='))
        .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).replace(/^["']|["']$/g, '')]),
    );
  } catch { return {}; }
}
const local = envLocal();
const url = (local.POSTIZ_URL || process.env.POSTIZ_URL || '').trim().replace(/\/+$/, '');
const key = (local.POSTIZ_API_KEY || process.env.POSTIZ_API_KEY || '').trim();
if (!url || !key) {
  console.log('SKIP verify-postiz: POSTIZ_URL / POSTIZ_API_KEY not set.');
  process.exit(0);
}
const base = /\/public\/v1$/.test(url) ? url : `${url}/api/public/v1`;
const get = async (path) => {
  const res = await fetch(`${base}${path}`, { headers: { Authorization: key }, signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
  return res.json();
};
try {
  const channels = await get('/integrations');
  if (!Array.isArray(channels)) throw new Error('/integrations did not return an array');
  console.log(`ok channels: ${channels.length}`);
  const now = new Date();
  const q = `startDate=${encodeURIComponent(new Date(now - 30 * 864e5).toISOString())}&endDate=${encodeURIComponent(new Date(+now + 30 * 864e5).toISOString())}`;
  const posts = await get(`/posts?${q}`);
  if (!Array.isArray(posts.posts)) throw new Error('/posts did not return { posts: [] }');
  console.log(`ok posts in +-30d: ${posts.posts.length}`);
  const first = channels.find((c) => !c.disabled);
  if (first) {
    try {
      const a = await get(`/analytics/${encodeURIComponent(first.id)}?date=30`);
      console.log(`ok analytics for ${first.name}: ${Array.isArray(a) ? a.length : 0} metrics`);
    } catch (e) { console.log(`note analytics unavailable for ${first.name}: ${e.message}`); }
  }
  console.log('PASS verify-postiz');
} catch (e) {
  console.error(`FAIL verify-postiz: ${e.message}`);
  process.exit(1);
}
