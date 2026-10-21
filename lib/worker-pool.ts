/**
 * Worker pool: the one place an agent run, an agent chat, a skill run and a
 * board heartbeat go through. Bounded concurrency per seat, per-seat model
 * routing, a timeout and retry-with-backoff per task, cancellation, and a
 * persisted ledger (pool_runs) the Agents board and the usage board read.
 *
 * Seats
 *   worker     cheap seats. Model: the agent's stored model (the F9 failover
 *              choice) > WORKER_POOL_MODEL > the gateway default.
 *   conductor  the Conductor / Wizard seat. Model: the stored model > the
 *              gateway default. Never the cheap seat model.
 * A retry after a failure moves one step down the chain, and the chain always
 * ends on the gateway default (LLM_DEFAULT_MODEL), which is the existing
 * gateway failover. Model ids are never invented here: they come from the
 * agent row, the env, or lib/connectors/llm.
 *
 * Honest states: a task that needs a model key and has none fails at once with
 * status `failed` and notConfigured, it is not retried and not faked.
 */
import { randomUUID } from 'node:crypto';
import type { GladosDb } from '@/lib/db';
import { LLM_DEFAULT_MODEL } from '@/lib/connectors/llm';
import { chatModelFor } from '@/lib/agent-review';
import { POOL_RESULT_CAP, POOL_KEEP_ROWS, POOL_TERMINAL, type PoolRunRow, type PoolSeat, type PoolStatus } from '@/lib/db-ext/pool-runs';

export type { PoolRunRow, PoolSeat, PoolStatus };

export class NotConfiguredError extends Error {
  readonly notConfigured = true;
  constructor(message: string) {
    super(message);
    this.name = 'NotConfiguredError';
  }
}
export class PoolTimeoutError extends Error {
  constructor(ms: number) {
    super(`timed out after ${Math.round(ms / 1000)}s`);
    this.name = 'PoolTimeoutError';
  }
}
export class PoolCancelledError extends Error {
  constructor() {
    super('cancelled');
    this.name = 'PoolCancelledError';
  }
}

export class PoolFullError extends Error {
  readonly poolFull = true;
  constructor(max: number) {
    super(`worker pool queue is full (${max} waiting); try again shortly`);
    this.name = 'PoolFullError';
  }
}

export type PoolKind = 'run' | 'chat' | 'skill' | 'heartbeat';
export type PoolTaskCtx = { runId: string; attempt: number; model: string; signal: AbortSignal };
export type PoolTaskResult = { ok: boolean; summary: string; data?: unknown };
export type PoolTaskSpec = {
  kind: PoolKind;
  agentId: string;
  label?: string;
  seat?: PoolSeat;
  /** Where the task came from (route name, cron id); shown in the ledger. */
  source?: string;
  /** The agent's stored model id (db.agents.model), if any. */
  storedModel?: string | null;
  timeoutMs?: number;
  retries?: number;
  exec(ctx: PoolTaskCtx): Promise<PoolTaskResult>;
};
export type PoolOutcome = {
  id: string;
  status: PoolStatus;
  ok: boolean;
  summary: string;
  attempts: number;
  model: string;
  durationMs: number;
  result?: PoolTaskResult;
  error?: Error;
};
export type PoolHandle = { id: string; done: Promise<PoolOutcome> };

export type PoolOptions = {
  concurrency?: Partial<Record<PoolSeat, number>>;
  backoffMs?: number;
  backoffCapMs?: number;
  defaultTimeoutMs?: number;
  defaultRetries?: Partial<Record<PoolKind, number>>;
  sleep?: (ms: number, signal: AbortSignal) => Promise<void>;
  now?: () => number;
  maxQueue?: number;
};

const DEFAULT_RETRIES: Record<PoolKind, number> = { chat: 2, skill: 2, run: 1, heartbeat: 0 };

function envInt(name: string, fallback: number): number {
  const n = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** The model chain for a seat. Index = attempt - 1; the last entry repeats. */
export function modelChain(seat: PoolSeat, storedModel?: string | null, env: Record<string, string | undefined> = process.env): string[] {
  const chain: string[] = [];
  const stored = chatModelFor(storedModel);
  if (stored) chain.push(stored);
  else if (seat === 'worker') {
    const cheap = chatModelFor(env.WORKER_POOL_MODEL);
    if (cheap) chain.push(cheap);
  }
  if (!chain.includes(LLM_DEFAULT_MODEL)) chain.push(LLM_DEFAULT_MODEL);
  return chain;
}

/** The model to hand llmChat: undefined when the chain is on the gateway default, so the provider's own default applies. */
export const modelArg = (ctx: { model: string }): { model?: string } => (ctx.model === LLM_DEFAULT_MODEL ? {} : { model: ctx.model });

const KEY_MISSING = /AI_GATEWAY_API_KEY is not set|creds missing|not configured/i;

function classify(err: unknown): Error {
  const e = err instanceof Error ? err : new Error(String(err));
  if ((e as { notConfigured?: boolean }).notConfigured) return e;
  if (KEY_MISSING.test(e.message)) return Object.assign(new NotConfiguredError(e.message), { cause: e });
  return e;
}

const realSleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    if (signal.aborted) return resolve();
    const t = setTimeout(done, ms);
    function done() {
      signal.removeEventListener('abort', done);
      clearTimeout(t);
      resolve();
    }
    signal.addEventListener('abort', done, { once: true });
  });

type Job = {
  id: string;
  spec: PoolTaskSpec;
  chain: string[];
  row: PoolRunRow;
  cancel: AbortController;
  startMs: number;
  resolve: (o: PoolOutcome) => void;
};

export type PoolSnapshot = {
  limits: Record<PoolSeat, number>;
  running: number;
  queued: number;
  active: Array<Pick<PoolRunRow, 'id' | 'kind' | 'agentId' | 'label' | 'seat' | 'model' | 'status' | 'attempts' | 'queuedAt' | 'startedAt'>>;
};

export type PoolMetrics = {
  windowHours: number;
  total: number;
  ok: number;
  failed: number;
  cancelled: number;
  timeout: number;
  interrupted: number;
  retried: number;
  notConfigured: number;
  avgMs: number | null;
  p95Ms: number | null;
  bySeat: Record<PoolSeat, number>;
  byModel: Array<{ model: string; runs: number; ok: number }>;
  byKind: Array<{ kind: string; runs: number }>;
};

export function createWorkerPool(db: GladosDb, opts: PoolOptions = {}) {
  const limits: Record<PoolSeat, number> = {
    worker: opts.concurrency?.worker ?? envInt('WORKER_POOL_CONCURRENCY', 4),
    conductor: opts.concurrency?.conductor ?? envInt('WORKER_POOL_CONDUCTOR_CONCURRENCY', 2),
  };
  const maxQueue = () => opts.maxQueue ?? envInt('WORKER_POOL_MAX_QUEUE', 50);
  const backoffMs = opts.backoffMs ?? 800;
  const backoffCap = opts.backoffCapMs ?? 15_000;
  const defaultTimeout = opts.defaultTimeoutMs ?? envInt('WORKER_POOL_TIMEOUT_MS', 120_000);
  const sleep = opts.sleep ?? realSleep;
  const clock = opts.now ?? Date.now;
  const retriesFor = (k: PoolKind) => opts.defaultRetries?.[k] ?? DEFAULT_RETRIES[k];

  const queues: Record<PoolSeat, Job[]> = { worker: [], conductor: [] };
  const running: Record<PoolSeat, Set<Job>> = { worker: new Set(), conductor: new Set() };
  const jobs = new Map<string, Job>();

  const safe = (fn: () => void) => {
    try {
      fn();
    } catch {
      /* the in-memory state stays authoritative while the process lives */
    }
  };
  const save = (job: Job, patch: Parameters<GladosDb['poolRuns']['update']>[1]) => {
    Object.assign(job.row, patch);
    safe(() => db.poolRuns.update(job.id, patch));
  };

  // A row a dead process left running is not running: say so.
  safe(() => db.poolRuns.recover(new Date().toISOString()));
  safe(() => db.poolRuns.prune(POOL_KEEP_ROWS));

  function finish(job: Job, status: PoolStatus, summary: string, extra: { result?: PoolTaskResult; error?: Error } = {}) {
    const finishedAt = new Date().toISOString();
    save(job, {
      status,
      summary: summary.slice(0, 2000),
      error: extra.error ? extra.error.message.slice(0, 1000) : '',
      finishedAt,
      result: extra.result?.data !== undefined ? safeJson(extra.result.data) : '',
    });
    running[job.row.seat].delete(job);
    jobs.delete(job.id);
    job.resolve({
      id: job.id,
      status,
      ok: status === 'ok',
      summary,
      attempts: job.row.attempts,
      model: job.row.model,
      durationMs: Math.max(0, clock() - job.startMs),
      ...(extra.result ? { result: extra.result } : {}),
      ...(extra.error ? { error: extra.error } : {}),
    });
    pump();
  }

  async function attempt(job: Job, n: number): Promise<{ result: PoolTaskResult } | { error: Error; timedOut: boolean }> {
    const ac = new AbortController();
    const onCancel = () => ac.abort(new PoolCancelledError());
    if (job.cancel.signal.aborted) onCancel();
    else job.cancel.signal.addEventListener('abort', onCancel, { once: true });
    const timeoutMs = job.spec.timeoutMs ?? defaultTimeout;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let timedOut = false;
    const limit = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        timedOut = true;
        const err = new PoolTimeoutError(timeoutMs);
        ac.abort(err);
        reject(err);
      }, timeoutMs);
      const rej = () => reject(ac.signal.reason instanceof Error ? ac.signal.reason : new PoolCancelledError());
      if (ac.signal.aborted) rej();
      else ac.signal.addEventListener('abort', rej, { once: true });
    });
    limit.catch(() => undefined);
    const model = job.chain[Math.min(n - 1, job.chain.length - 1)];
    save(job, { attempts: n, model });
    try {
      const work = Promise.resolve().then(() => job.spec.exec({ runId: job.id, attempt: n, model, signal: ac.signal }));
      work.catch(() => undefined);
      const result = await Promise.race([work, limit]);
      return { result };
    } catch (err) {
      return { error: classify(err), timedOut };
    } finally {
      if (timer) clearTimeout(timer);
      job.cancel.signal.removeEventListener('abort', onCancel);
    }
  }

  async function execute(job: Job) {
    save(job, { status: 'running', startedAt: new Date().toISOString() });
    const maxAttempts = 1 + (job.spec.retries ?? retriesFor(job.spec.kind));
    let last: { error: Error; timedOut: boolean } | null = null;
    for (let n = 1; n <= maxAttempts; n++) {
      if (job.cancel.signal.aborted) return finish(job, 'cancelled', 'cancelled', { error: new PoolCancelledError() });
      const r = await attempt(job, n);
      if ('result' in r) {
        return finish(job, r.result.ok ? 'ok' : 'failed', r.result.summary, { result: r.result });
      }
      if (job.cancel.signal.aborted || r.error instanceof PoolCancelledError) {
        return finish(job, 'cancelled', 'cancelled', { error: new PoolCancelledError() });
      }
      last = r;
      const fatal = (r.error as { notConfigured?: boolean }).notConfigured === true;
      if (fatal || n === maxAttempts) break;
      await sleep(Math.min(backoffCap, backoffMs * 2 ** (n - 1)), job.cancel.signal);
    }
    const err = last?.error ?? new Error('failed');
    const notConfigured = (err as { notConfigured?: boolean }).notConfigured === true;
    const summary = notConfigured ? err.message : `${last?.timedOut ? 'timed out' : 'failed'} after ${job.row.attempts} attempt${job.row.attempts === 1 ? '' : 's'}: ${err.message}`;
    return finish(job, last?.timedOut ? 'timeout' : 'failed', summary, { error: err });
  }

  function pump() {
    for (const seat of ['conductor', 'worker'] as const) {
      while (running[seat].size < limits[seat] && queues[seat].length > 0) {
        const job = queues[seat].shift()!;
        running[seat].add(job);
        void execute(job);
      }
    }
  }

  function submit(spec: PoolTaskSpec): PoolHandle {
    if (queues.worker.length + queues.conductor.length >= maxQueue()) throw new PoolFullError(maxQueue());
    const id = randomUUID();
    const seat: PoolSeat = spec.seat ?? 'worker';
    const chain = modelChain(seat, spec.storedModel);
    const row: PoolRunRow = {
      id, kind: spec.kind, agentId: spec.agentId, label: spec.label ?? spec.agentId, seat, model: chain[0],
      status: 'queued', attempts: 0, source: spec.source ?? '', queuedAt: new Date().toISOString(),
      startedAt: null, finishedAt: null, summary: '', error: '', result: '',
    };
    safe(() => db.poolRuns.insert(row));
    const done = new Promise<PoolOutcome>((resolve) => {
      const job: Job = { id, spec, chain, row, cancel: new AbortController(), startMs: clock(), resolve };
      jobs.set(id, job);
      queues[seat].push(job);
    });
    pump();
    return { id, done };
  }

  /** Submit and wait. Resolves with the task's result; throws if it never produced one. */
  async function run(spec: PoolTaskSpec): Promise<PoolTaskResult & { runId: string }> {
    const h = submit(spec);
    const o = await h.done;
    if (o.result) return { ...o.result, runId: o.id };
    throw o.error ?? new Error(o.summary);
  }

  function cancel(id: string): boolean {
    const job = jobs.get(id);
    if (!job) return false;
    const q = queues[job.row.seat];
    const at = q.indexOf(job);
    if (at >= 0) {
      q.splice(at, 1);
      running[job.row.seat].add(job); // finish() removes it
      finish(job, 'cancelled', 'cancelled before it started', { error: new PoolCancelledError() });
      return true;
    }
    job.cancel.abort();
    return true;
  }

  function snapshot(): PoolSnapshot {
    const live = [...running.worker, ...running.conductor, ...queues.worker, ...queues.conductor];
    return {
      limits: { ...limits },
      running: running.worker.size + running.conductor.size,
      queued: queues.worker.length + queues.conductor.length,
      active: live.map(({ row: r }) => ({
        id: r.id, kind: r.kind, agentId: r.agentId, label: r.label, seat: r.seat, model: r.model,
        status: r.status, attempts: r.attempts, queuedAt: r.queuedAt, startedAt: r.startedAt,
      })),
    };
  }

  function metrics(windowHours = 24): PoolMetrics {
    const since = new Date(Date.now() - windowHours * 3_600_000).toISOString();
    return computePoolMetrics(db.poolRuns.since(since), windowHours);
  }

  return { submit, run, cancel, snapshot, metrics, get: (id: string) => db.poolRuns.get(id), recent: (n = 50) => db.poolRuns.recent(n), limits };
}

export type WorkerPool = ReturnType<typeof createWorkerPool>;

function safeJson(v: unknown): string {
  try {
    return JSON.stringify(v).slice(0, POOL_RESULT_CAP);
  } catch {
    return '';
  }
}

/** Pure: ledger rows to the numbers the usage board shows. */
export function computePoolMetrics(rows: PoolRunRow[], windowHours = 24): PoolMetrics {
  const count = (s: PoolStatus) => rows.filter((r) => r.status === s).length;
  const durations = rows
    .filter((r) => r.startedAt && r.finishedAt && POOL_TERMINAL.has(r.status))
    .map((r) => Date.parse(r.finishedAt!) - Date.parse(r.startedAt!))
    .filter((n) => Number.isFinite(n) && n >= 0)
    .sort((a, b) => a - b);
  const byModel = new Map<string, { runs: number; ok: number }>();
  const byKind = new Map<string, number>();
  for (const r of rows) {
    const m = byModel.get(r.model) ?? { runs: 0, ok: 0 };
    m.runs++;
    if (r.status === 'ok') m.ok++;
    byModel.set(r.model, m);
    byKind.set(r.kind, (byKind.get(r.kind) ?? 0) + 1);
  }
  return {
    windowHours,
    total: rows.length,
    ok: count('ok'),
    failed: count('failed'),
    cancelled: count('cancelled'),
    timeout: count('timeout'),
    interrupted: count('interrupted'),
    retried: rows.filter((r) => r.attempts > 1).length,
    notConfigured: rows.filter((r) => r.status === 'failed' && KEY_MISSING.test(r.error || r.summary)).length,
    avgMs: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null,
    p95Ms: durations.length ? durations[Math.min(durations.length - 1, Math.ceil(durations.length * 0.95) - 1)] : null,
    bySeat: {
      worker: rows.filter((r) => r.seat === 'worker').length,
      conductor: rows.filter((r) => r.seat === 'conductor').length,
    },
    byModel: [...byModel.entries()].map(([model, v]) => ({ model, ...v })).sort((a, b) => b.runs - a.runs),
    byKind: [...byKind.entries()].map(([kind, runs]) => ({ kind, runs })).sort((a, b) => b.runs - a.runs),
  };
}

/** One pool per database handle, shared by every route in the process (survives HMR). */
const G = globalThis as unknown as { __workerPools?: WeakMap<object, WorkerPool> };
export function getWorkerPool(db: GladosDb): WorkerPool {
  const pools = (G.__workerPools ??= new WeakMap());
  let p = pools.get(db);
  if (!p) {
    p = createWorkerPool(db);
    pools.set(db, p);
  }
  return p;
}
