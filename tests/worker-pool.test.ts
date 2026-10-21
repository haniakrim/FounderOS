import { describe, expect, test, vi } from 'vitest';
import { openDb } from '@/lib/db';
import { LLM_DEFAULT_MODEL } from '@/lib/connectors/llm';
import {
  NotConfiguredError,
  computePoolMetrics,
  createWorkerPool,
  modelChain,
  type PoolTaskCtx,
} from '@/lib/worker-pool';

const instantSleep = async () => undefined;
const mk = (opts: Parameters<typeof createWorkerPool>[1] = {}) => {
  const db = openDb(':memory:');
  return { db, pool: createWorkerPool(db, { sleep: instantSleep, ...opts }) };
};
const tick = () => new Promise((r) => setTimeout(r, 0));

describe('modelChain: per-seat routing, ids come from the repo or env only', () => {
  test('worker seat: WORKER_POOL_MODEL then the gateway default', () => {
    expect(modelChain('worker', null, { WORKER_POOL_MODEL: 'vendor/cheap-1' })).toEqual(['vendor/cheap-1', LLM_DEFAULT_MODEL]);
  });
  test('conductor seat ignores the cheap model', () => {
    expect(modelChain('conductor', null, { WORKER_POOL_MODEL: 'vendor/cheap-1' })).toEqual([LLM_DEFAULT_MODEL]);
  });
  test('a stored (failover) model wins on both seats; builtin means default', () => {
    expect(modelChain('worker', 'anthropic/x', { WORKER_POOL_MODEL: 'vendor/cheap-1' })).toEqual(['anthropic/x', LLM_DEFAULT_MODEL]);
    expect(modelChain('conductor', 'builtin', {})).toEqual([LLM_DEFAULT_MODEL]);
  });
});

describe('worker pool', () => {
  test('never runs more than the seat limit at once, and drains the queue in order', async () => {
    const { pool } = mk({ concurrency: { worker: 2 } });
    let live = 0;
    let peak = 0;
    const order: number[] = [];
    const gates: Array<() => void> = [];
    const handles = [0, 1, 2, 3, 4].map((i) =>
      pool.submit({
        kind: 'run', agentId: `a${i}`,
        exec: async () => {
          live++;
          peak = Math.max(peak, live);
          order.push(i);
          await new Promise<void>((r) => gates.push(r));
          live--;
          return { ok: true, summary: `done ${i}` };
        },
      }),
    );
    await tick();
    expect(pool.snapshot()).toMatchObject({ running: 2, queued: 3 });
    for (let round = 0; round < 8; round++) {
      gates.splice(0).forEach((g) => g());
      await tick();
    }
    const outcomes = await Promise.all(handles.map((h) => h.done));
    expect(peak).toBe(2);
    expect(order).toEqual([0, 1, 2, 3, 4]);
    expect(outcomes.every((o) => o.status === 'ok')).toBe(true);
    expect(pool.snapshot()).toMatchObject({ running: 0, queued: 0 });
  });

  test('the conductor seat is not starved by a full worker seat', async () => {
    const { pool } = mk({ concurrency: { worker: 1, conductor: 1 } });
    const hold = new Promise<void>(() => undefined);
    pool.submit({ kind: 'run', agentId: 'w', exec: () => hold.then(() => ({ ok: true, summary: '' })) });
    const c = pool.submit({ kind: 'chat', agentId: 'conductor', seat: 'conductor', exec: async () => ({ ok: true, summary: 'routed' }) });
    expect((await c.done).status).toBe('ok');
  });

  test('retries a thrown error, moving down the model chain to the gateway default', async () => {
    const { pool, db } = mk({ backoffMs: 10 });
    const sleeps: number[] = [];
    const p2 = createWorkerPool(db, { backoffMs: 10, sleep: async (ms) => void sleeps.push(ms) });
    const seen: string[] = [];
    const o = await p2.submit({
      kind: 'chat', agentId: 'a', storedModel: 'vendor/primary', retries: 2,
      exec: async (ctx: PoolTaskCtx) => {
        seen.push(ctx.model);
        if (ctx.attempt < 3) throw new Error('gateway 503');
        return { ok: true, summary: 'finally' };
      },
    }).done;
    expect(o.status).toBe('ok');
    expect(o.attempts).toBe(3);
    expect(seen).toEqual(['vendor/primary', LLM_DEFAULT_MODEL, LLM_DEFAULT_MODEL]);
    expect(sleeps).toEqual([10, 20]);
    expect(db.poolRuns.get(o.id)).toMatchObject({ status: 'ok', attempts: 3, model: LLM_DEFAULT_MODEL });
    void pool;
  });

  test('gives up after the retry budget and says how many attempts', async () => {
    const { pool } = mk();
    const exec = vi.fn(async () => {
      throw new Error('boom');
    });
    const o = await pool.submit({ kind: 'chat', agentId: 'a', retries: 1, exec }).done;
    expect(exec).toHaveBeenCalledTimes(2);
    expect(o).toMatchObject({ status: 'failed', ok: false, attempts: 2 });
    expect(o.summary).toContain('failed after 2 attempts: boom');
  });

  test('an ok:false result is an honest failure, not retried', async () => {
    const { pool } = mk();
    const exec = vi.fn(async () => ({ ok: false, summary: 'Slack is not configured on this host' }));
    const o = await pool.submit({ kind: 'run', agentId: 'a', retries: 3, exec }).done;
    expect(exec).toHaveBeenCalledTimes(1);
    expect(o).toMatchObject({ status: 'failed', summary: 'Slack is not configured on this host' });
  });

  test('a missing model key fails at once with the key message and no retry', async () => {
    const { pool, db } = mk();
    const exec = vi.fn(async () => {
      throw new Error('AI_GATEWAY_API_KEY is not set — add it to .env.local to enable agent chat.');
    });
    const o = await pool.submit({ kind: 'chat', agentId: 'a', retries: 5, exec }).done;
    expect(exec).toHaveBeenCalledTimes(1);
    expect(o.status).toBe('failed');
    expect(o.error).toBeInstanceOf(NotConfiguredError);
    expect(o.summary).toContain('AI_GATEWAY_API_KEY is not set');
    expect(computePoolMetrics(db.poolRuns.recent(10)).notConfigured).toBe(1);
  });

  test('times out a hung task, aborts its signal, and records timeout', async () => {
    const { pool } = mk();
    let aborted = false;
    const o = await pool.submit({
      kind: 'run', agentId: 'a', timeoutMs: 20, retries: 0,
      exec: (ctx) => new Promise(() => ctx.signal.addEventListener('abort', () => (aborted = true))),
    }).done;
    expect(o.status).toBe('timeout');
    expect(o.summary).toContain('timed out');
    expect(aborted).toBe(true);
  });

  test('a timed-out attempt is retried and can succeed', async () => {
    const { pool } = mk();
    const o = await pool.submit({
      kind: 'run', agentId: 'a', timeoutMs: 20, retries: 1,
      exec: (ctx) => (ctx.attempt === 1 ? new Promise(() => undefined) : Promise.resolve({ ok: true, summary: 'second try' })),
    }).done;
    expect(o).toMatchObject({ status: 'ok', attempts: 2 });
  });

  test('cancels a queued task before it starts', async () => {
    const { pool, db } = mk({ concurrency: { worker: 1 } });
    const hold = new Promise<void>((r) => setTimeout(r, 30));
    const first = pool.submit({ kind: 'run', agentId: 'a', exec: async () => (await hold, { ok: true, summary: 'first' }) });
    const exec = vi.fn(async () => ({ ok: true, summary: 'never' }));
    const second = pool.submit({ kind: 'run', agentId: 'b', exec });
    expect(pool.cancel(second.id)).toBe(true);
    const o = await second.done;
    expect(o.status).toBe('cancelled');
    expect(exec).not.toHaveBeenCalled();
    expect(db.poolRuns.get(second.id)?.status).toBe('cancelled');
    expect((await first.done).status).toBe('ok');
    expect(pool.cancel(second.id)).toBe(false);
  });

  test('cancels a running task: signal aborts, no retry, slot frees for the next task', async () => {
    const { pool } = mk({ concurrency: { worker: 1 } });
    let aborted = false;
    const exec = vi.fn((ctx: PoolTaskCtx) => new Promise<never>(() => ctx.signal.addEventListener('abort', () => (aborted = true))));
    const running = pool.submit({ kind: 'run', agentId: 'a', retries: 3, exec });
    const next = pool.submit({ kind: 'run', agentId: 'b', exec: async () => ({ ok: true, summary: 'next' }) });
    await tick();
    expect(pool.snapshot().active.find((r) => r.id === running.id)?.status).toBe('running');
    pool.cancel(running.id);
    const o = await running.done;
    expect(o.status).toBe('cancelled');
    expect(aborted).toBe(true);
    expect(exec).toHaveBeenCalledTimes(1);
    expect((await next.done).status).toBe('ok');
  });

  test('cancel during backoff stops the retry loop', async () => {
    const db = openDb(':memory:');
    const pool = createWorkerPool(db, { backoffMs: 5_000 });
    const exec = vi.fn(async () => {
      throw new Error('flaky');
    });
    const h = pool.submit({ kind: 'chat', agentId: 'a', retries: 3, exec });
    await tick();
    await tick();
    pool.cancel(h.id);
    expect((await h.done).status).toBe('cancelled');
    expect(exec).toHaveBeenCalledTimes(1);
  });

  test('persists the result, marks stale in-flight rows interrupted on start, and reports metrics', async () => {
    const db = openDb(':memory:');
    db.poolRuns.insert({
      id: 'dead', kind: 'run', agentId: 'x', label: 'x', seat: 'worker', model: 'm', status: 'running', attempts: 1,
      source: '', queuedAt: new Date().toISOString(), startedAt: new Date().toISOString(), finishedAt: null, summary: '', error: '', result: '',
    });
    const pool = createWorkerPool(db, { sleep: instantSleep });
    expect(db.poolRuns.get('dead')?.status).toBe('interrupted');
    const o = await pool.submit({ kind: 'skill', agentId: 'skill:x', exec: async () => ({ ok: true, summary: 'hi', data: { text: 'full output' } }) }).done;
    expect(JSON.parse(db.poolRuns.get(o.id)!.result)).toEqual({ text: 'full output' });
    await pool.submit({ kind: 'run', agentId: 'y', retries: 0, exec: async () => { throw new Error('x'); } }).done;
    const m = pool.metrics(24);
    expect(m).toMatchObject({ total: 3, ok: 1, failed: 1, interrupted: 1 });
    expect(m.byKind.map((k) => k.kind).sort()).toEqual(['run', 'skill']);
    expect(m.avgMs).not.toBeNull();
  });
});
