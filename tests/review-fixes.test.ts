import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, test } from 'vitest';
import {
  SESSION_ISSUED_KEY,
  SESSION_MAX_AGE_S,
  SHARED_MAX_LOCK_MS,
  clientKey,
  recordFailure,
  resetThrottle,
  retryAfterMs,
  sessionIsValid,
  setPassword,
  throttled,
} from '@/lib/auth';
import { upsertEnvLocal } from '@/lib/creds';
import { openDb } from '@/lib/db';
import { PoolFullError, createWorkerPool } from '@/lib/worker-pool';
import { readSkillMarkdown } from '@/lib/skills-catalog';
import { skillText } from '@/lib/skill-run';
import { PostizValidationError, validatePostizSchedule } from '@/lib/connectors/postiz';

const root = path.resolve(__dirname, '..');
let tmp: string;
beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'glados-rf-'));
  process.env.GLADOS_ENV_LOCAL = path.join(tmp, '.env.local');
  resetThrottle();
});

const req = (headers: Record<string, string>) => new Request('http://x/api/auth/login', { headers });

describe('1: login refreshes the issued clock', () => {
  test('expired state, then login, then the cookie validates', async () => {
    const secret = setPassword('correct horse battery');
    upsertEnvLocal({ [SESSION_ISSUED_KEY]: String(Date.now() - (SESSION_MAX_AGE_S + 5) * 1000) });
    expect(sessionIsValid(secret)).toBe(false); // expiry still works
    const { POST } = await import('@/app/api/auth/login/route');
    const res = await POST(
      new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password: 'correct horse battery' }),
      }),
    );
    expect(res.status).toBe(200);
    const cookie = /glados_session=([^;]*)/.exec(res.headers.get('set-cookie') ?? '')?.[1] ?? '';
    expect(cookie).toBe(secret); // secret kept: other devices stay signed in
    expect(sessionIsValid(cookie)).toBe(true);
  });
});

describe('2: client key, global counter, eviction', () => {
  test('trusted proxy: cf-connecting-ip wins, else rightmost x-forwarded-for', () => {
    expect(clientKey(req({ 'cf-connecting-ip': '9.9.9.9', 'x-forwarded-for': '1.1.1.1, 2.2.2.2' }), true)).toBe('9.9.9.9');
    expect(clientKey(req({ 'x-forwarded-for': '6.6.6.6, 1.1.1.1, 2.2.2.2' }), true)).toBe('2.2.2.2');
    expect(clientKey(req({ 'x-forwarded-for': '6.6.6.6' }), false)).toBe('direct');
  });
  test('100 failures across distinct keys lock everyone out', () => {
    const now = 1_000_000;
    for (let i = 0; i < 100; i++) recordFailure(`ip-${i}`, now + i);
    expect(throttled('brand-new-ip', now + 200)).toBe(true);
    expect(throttled('brand-new-ip', now + 15 * 60_000 + 1000)).toBe(false);
  });
  test('a full table evicts the oldest key instead of clearing everyone', () => {
    const t0 = 1_000_000;
    const at = (i: number) => t0 + i * 10_000; // 90 failures per 15 min: stays under the global limit
    for (let i = 0; i < 5000; i++) recordFailure(`k${i}`, at(i));
    recordFailure('extra', at(5000)); // table full: evicts k0 only (clear() would wipe k4999 too)
    for (let j = 1; j <= 7; j++) recordFailure('k4999', at(5000) + j);
    expect(throttled('k4999', at(5000) + 10)).toBe(true); // 1 + 7 = 8 failures kept
  });
});

describe('3: shared bucket and valid session', () => {
  test('the shared bucket lock is capped at 60s', () => {
    const now = 5_000_000;
    for (let round = 0; round < 4; round++) {
      const t = now + round * 10 * 60_000;
      for (let i = 0; i < 8; i++) recordFailure('direct', t);
    }
    expect(retryAfterMs('direct', now + 30 * 60_000 + 1)).toBeLessThanOrEqual(SHARED_MAX_LOCK_MS);
  });
  test('a request with a valid session is not throttled at login', async () => {
    const secret = setPassword('correct horse battery');
    for (let i = 0; i < 8; i++) recordFailure('direct');
    expect(throttled('direct')).toBe(true);
    const { POST } = await import('@/app/api/auth/login/route');
    const mk = (cookie?: string) =>
      new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(cookie ? { cookie: `glados_session=${secret}` } : {}) },
        body: JSON.stringify({ password: 'correct horse battery' }),
      });
    expect((await POST(mk())).status).toBe(429);
    expect((await POST(mk('s'))).status).toBe(200);
  });
});

describe('4: Dockerfile entrypoint', () => {
  test('seeds only absent keys and sets umask 077', () => {
    const d = fs.readFileSync(path.join(root, 'Dockerfile'), 'utf8');
    expect(d).toMatch(/set -e\numask 077/);
    expect(d).toContain('! grep -q "^$k=" "$f"');
    expect(d).not.toContain('grep -v "^$k="');
  });
});

describe('5: pool queue cap', () => {
  test('submit throws PoolFullError at the cap; ledger is pruned and results capped', async () => {
    const db = openDb(':memory:');
    const pool = createWorkerPool(db, { concurrency: { worker: 1 }, maxQueue: 2 });
    const hold = new Promise<never>(() => undefined);
    pool.submit({ kind: 'run', agentId: 'a', exec: () => hold }); // running
    pool.submit({ kind: 'run', agentId: 'b', exec: () => hold }); // queued 1
    pool.submit({ kind: 'run', agentId: 'c', exec: () => hold }); // queued 2
    expect(() => pool.submit({ kind: 'run', agentId: 'd', exec: () => hold })).toThrow(PoolFullError);

    const db2 = openDb(':memory:');
    const base = { kind: 'run', agentId: 'x', label: '', seat: 'worker' as const, model: '', attempts: 1, source: '', startedAt: null, finishedAt: null, summary: '', error: '' };
    for (let i = 0; i < 1100; i++) {
      db2.poolRuns.insert({ ...base, id: `r${i}`, status: 'ok', queuedAt: new Date(1_700_000_000_000 + i).toISOString(), result: 'x'.repeat(i === 1099 ? 30_000 : 1) });
    }
    expect(db2.poolRuns.count()).toBeLessThanOrEqual(1000);
    expect(db2.poolRuns.get('r1099')!.result.length).toBe(20_000);
  });
  test('routes answer 429 when the pool is full', async () => {
    const prev = { ...process.env };
    process.env.GLADOS_DB = path.join(tmp, 'pool.db');
    process.env.LLM_PROVIDER = 'stub';
    process.env.WORKER_POOL_CONCURRENCY = '1';
    process.env.WORKER_POOL_MAX_QUEUE = '1';
    const skills = path.join(tmp, 'skills', 'demo');
    fs.mkdirSync(skills, { recursive: true });
    fs.writeFileSync(path.join(skills, 'SKILL.md'), '---\nname: demo\ndescription: d\n---\nstep\n');
    process.env.GLADOS_SKILLS_DIR = path.join(tmp, 'skills');
    try {
      const { getDb } = await import('@/lib/data');
      const { getWorkerPool } = await import('@/lib/worker-pool');
      const pool = getWorkerPool(getDb());
      const hold = new Promise<never>(() => undefined);
      pool.submit({ kind: 'run', agentId: 'a', exec: () => hold });
      pool.submit({ kind: 'run', agentId: 'b', exec: () => hold });
      const { POST } = await import('@/app/api/skills/[slug]/run/route');
      const res = await POST(new Request('http://x', { method: 'POST', body: '{}' }), { params: { slug: 'demo' } });
      expect(res.status).toBe(429);
      const { POST: runs } = await import('@/app/api/pool/runs/route');
      const r2 = await runs(new Request('http://x', { method: 'POST', body: JSON.stringify({ agentId: 'conductor' }) }));
      expect([429, 404]).toContain(r2.status);
    } finally {
      for (const k of ['GLADOS_DB', 'LLM_PROVIDER', 'WORKER_POOL_CONCURRENCY', 'WORKER_POOL_MAX_QUEUE', 'GLADOS_SKILLS_DIR']) {
        if (prev[k] === undefined) delete process.env[k];
        else process.env[k] = prev[k];
      }
    }
  });
});

describe('6: middleware cache TTL', () => {
  test('is 1500ms', () => {
    expect(fs.readFileSync(path.join(root, 'middleware.ts'), 'utf8')).toMatch(/const TTL_MS = 1_?500;/);
  });
});

describe('8: skill slugs', () => {
  test('dots-only and dotted-traversal slugs are rejected', () => {
    const dir = path.join(tmp, 'sk');
    fs.mkdirSync(path.join(dir, 'ok.v1'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'ok.v1', 'SKILL.md'), 'hi');
    fs.writeFileSync(path.join(tmp, 'SKILL.md'), 'secret');
    expect(readSkillMarkdown('ok.v1', dir)).toBe('hi');
    for (const bad of ['..', '.', '.hidden', 'a..b', '../x']) expect(readSkillMarkdown(bad, dir)).toBeNull();
    const db = openDb(':memory:');
    for (const bad of ['..', 'a..b', '.x']) expect(skillText(db, bad, dir)).toBeNull();
  });
});

describe('11: postiz schedule input', () => {
  const ok = { channelId: 'c1', platform: 'x', content: 'hi', date: '2099-01-01T00:00:00Z' };
  test('rejects oversize content, bad platform, non-strings', () => {
    expect(() => validatePostizSchedule({ ...ok, content: 'a'.repeat(5001) })).toThrow(PostizValidationError);
    expect(() => validatePostizSchedule({ ...ok, platform: 'X/../y' })).toThrow(PostizValidationError);
    expect(() => validatePostizSchedule({ ...ok, platform: 'a'.repeat(41) })).toThrow(PostizValidationError);
    expect(() => validatePostizSchedule({ ...ok, channelId: 5 as unknown as string })).toThrow(PostizValidationError);
    expect(validatePostizSchedule({ ...ok, content: 'a'.repeat(5000) }).content.length).toBe(5000);
  });
});

describe('9: postiz errors are generic to the client', () => {
  test('unreachable connector error carries no detail', async () => {
    process.env.POSTIZ_URL = 'http://postiz.invalid';
    process.env.POSTIZ_API_KEY = 'k';
    const { listPostizChannels, PostizError } = await import('@/lib/connectors/postiz');
    const boom = async () => {
      throw new Error('connect ECONNREFUSED 10.0.0.5:5000');
    };
    const err = await listPostizChannels(boom as unknown as typeof fetch).catch((e) => e);
    expect(err).toBeInstanceOf(PostizError);
    expect(err.message).toBe('Postiz unreachable');
    delete process.env.POSTIZ_URL;
    delete process.env.POSTIZ_API_KEY;
  });
});

describe('12: logout cookie options', () => {
  test('remove clears with the session cookie options', () => {
    const src = fs.readFileSync(path.join(root, 'app/api/auth/password/route.ts'), 'utf8');
    expect(src).toContain("{ ...sessionCookieOptions(req), maxAge: 0 }");
  });
});
