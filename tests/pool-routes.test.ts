import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const heartbeat = vi.fn(async (_id: string) => true);
vi.mock('@/founderos/lib/connectors/paperclip', async (orig) => ({
  ...(await orig<typeof import('@/founderos/lib/connectors/paperclip')>()),
  invokePaperclipHeartbeat: (id: string) => heartbeat(id),
}));

const skillsDir = mkdtempSync(path.join(tmpdir(), 'pool-skills-'));

beforeAll(() => {
  process.env.GLADOS_DB = path.join(mkdtempSync(path.join(tmpdir(), 'pool-routes-')), 'test.db');
  process.env.LLM_PROVIDER = 'stub';
  process.env.GLADOS_SKILLS_DIR = skillsDir;
  mkdirSync(path.join(skillsDir, 'weekly-review'), { recursive: true });
  writeFileSync(path.join(skillsDir, 'weekly-review', 'SKILL.md'), '---\nname: weekly-review\ndescription: Weekly review SOP\n---\nStep 1: summarise the week.\n');
});
afterEach(() => heartbeat.mockReset().mockResolvedValue(true));

const post = (url: string, body?: unknown) =>
  new Request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });

describe('board run route goes through the pool', () => {
  test('queues a heartbeat, answers 202 with a runId, and the ledger has it', async () => {
    const { POST } = await import('@/app/api/board/agents/[id]/run/route');
    const res = await POST(post('http://x/api/board/agents/seat-1/run', { name: 'Hermes Worker' }), { params: { id: 'seat-1' } });
    expect(res.status).toBe(202);
    const { runId } = await res.json();
    expect(heartbeat).toHaveBeenCalledWith('seat-1');
    const { GET } = await import('@/app/api/pool/runs/[id]/route');
    const run = (await (await GET(new Request('http://x'), { params: { id: runId } })).json()).run;
    expect(run).toMatchObject({ kind: 'heartbeat', agentId: 'seat-1', label: 'Hermes Worker', status: 'ok', seat: 'worker' });
  });

  test('board rejecting the heartbeat is a 502 and a failed ledger row', async () => {
    heartbeat.mockResolvedValue(false);
    const { POST } = await import('@/app/api/board/agents/[id]/run/route');
    const res = await POST(post('http://x/r', {}), { params: { id: 'seat-2' } });
    expect(res.status).toBe(502);
    expect((await res.json()).error).toContain('rejected');
  });

  test('no board creds is an honest 503 notConfigured, not a retry storm', async () => {
    heartbeat.mockRejectedValue(new Error('paperclip creds missing'));
    const { POST } = await import('@/app/api/board/agents/[id]/run/route');
    const res = await POST(post('http://x/r', {}), { params: { id: 'seat-3' } });
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ notConfigured: true });
    expect(heartbeat).toHaveBeenCalledTimes(1);
  });
});

describe('agent run, skill run, cancel and the pool feed', () => {
  test('POST /api/agents/[id]/run records a pool row with the same id as the agent run', async () => {
    const { POST } = await import('@/app/api/agents/[id]/run/route');
    const res = await POST(post('http://x/run'), { params: { id: 'data-agent' } });
    const { run } = await res.json();
    const { GET } = await import('@/app/api/pool/runs/[id]/route');
    const pooled = (await (await GET(new Request('http://x'), { params: { id: run.id } })).json()).run;
    expect(pooled).toMatchObject({ kind: 'run', agentId: 'data-agent', source: 'agents-api' });
    expect(['ok', 'failed']).toContain(pooled.status);
  });

  test('POST /api/pool/runs queues an agent run (202) and 404s an unknown agent', async () => {
    const { POST } = await import('@/app/api/pool/runs/route');
    const ok = await POST(post('http://x/api/pool/runs', { agentId: 'data-agent' }));
    expect(ok.status).toBe(202);
    expect(typeof (await ok.json()).runId).toBe('string');
    const bad = await POST(post('http://x/api/pool/runs', { agentId: 'nope' }));
    expect(bad.status).toBe(404);
    expect((await POST(post('http://x/api/pool/runs', {}))).status).toBe(400);
  });

  test('POST /api/skills/[slug]/run runs the SOP through the pool and records the result', async () => {
    const { POST } = await import('@/app/api/skills/[slug]/run/route');
    const res = await POST(post('http://x/run', { input: 'week 42', wait: true }), { params: { slug: 'weekly-review' } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ status: 'ok', ok: true });
    expect(body.text).toContain('stub-reply: week 42');
    const { GET } = await import('@/app/api/pool/runs/[id]/route');
    const run = (await (await GET(new Request('http://x'), { params: { id: body.runId } })).json()).run;
    expect(run).toMatchObject({ kind: 'skill', label: 'skill: weekly-review', status: 'ok' });
    expect(run.result.text).toContain('week 42');
  });

  test('skill run: unknown skill 404, async default 202, bad body 400', async () => {
    const { POST } = await import('@/app/api/skills/[slug]/run/route');
    expect((await POST(post('http://x', {}), { params: { slug: 'no-such-skill' } })).status).toBe(404);
    expect((await POST(post('http://x', {}), { params: { slug: 'weekly-review' } })).status).toBe(202);
    expect((await POST(post('http://x', { input: 5 }), { params: { slug: 'weekly-review' } })).status).toBe(400);
  });

  test('skill run without a model key answers 503 notConfigured and runs nothing', async () => {
    process.env.LLM_PROVIDER = 'gateway';
    const prevKey = process.env.AI_GATEWAY_API_KEY;
    delete process.env.AI_GATEWAY_API_KEY;
    try {
      const { POST } = await import('@/app/api/skills/[slug]/run/route');
      const { getDb } = await import('@/lib/data');
      const before = getDb().poolRuns.count();
      const res = await POST(post('http://x', {}), { params: { slug: 'weekly-review' } });
      expect(res.status).toBe(503);
      expect(await res.json()).toMatchObject({ notConfigured: true, setupHref: expect.stringContaining('/integrations') });
      expect(getDb().poolRuns.count()).toBe(before);
    } finally {
      process.env.LLM_PROVIDER = 'stub';
      if (prevKey !== undefined) process.env.AI_GATEWAY_API_KEY = prevKey;
    }
  });

  test('cancel route stops a queued pool task; unknown run is 404', async () => {
    const { getDb } = await import('@/lib/data');
    const { getWorkerPool } = await import('@/lib/worker-pool');
    const pool = getWorkerPool(getDb());
    const h = pool.submit({ kind: 'run', agentId: 'slow', timeoutMs: 5000, retries: 0, exec: (ctx) => new Promise((_, rej) => ctx.signal.addEventListener('abort', () => rej(new Error('stop')))) });
    const { POST } = await import('@/app/api/pool/runs/[id]/cancel/route');
    const res = await POST(post('http://x'), { params: { id: h.id } });
    expect((await res.json()).cancelled).toBe(true);
    expect((await h.done).status).toBe('cancelled');
    expect((await POST(post('http://x'), { params: { id: 'nope' } })).status).toBe(404);
  });

  test('GET /api/pool and /api/board/live carry pool state; /api/pool reports llm readiness', async () => {
    const { GET } = await import('@/app/api/pool/route');
    const body = await (await GET()).json();
    expect(body.metrics.total).toBeGreaterThan(0);
    expect(body.llm.configured).toBe(true);
    expect(body.agents.length).toBeGreaterThan(0);
    expect(body.skills.map((s: { slug: string }) => s.slug)).toContain('weekly-review');
    expect(body.recent.every((r: Record<string, unknown>) => !('result' in r))).toBe(true);
    const live = await import('@/app/api/board/live/route');
    const payload = await (await live.GET()).json();
    expect(payload.pool).toMatchObject({ running: expect.any(Number), queued: expect.any(Number) });
  });
});
