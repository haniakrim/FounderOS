import type { PoolMetrics } from '@/lib/worker-pool';

/**
 * Worker pool runs on this host over the last 24 h, from the pool's own ledger
 * (pool_runs). Renders nothing when the pool has run nothing: no empty card
 * dressed as data. Shared by the Classic, GladOS and Legacy usage trees.
 */
const t = (n: number | null) => (n === null ? 'none' : n < 1000 ? `${n}ms` : `${(n / 1000).toFixed(1)}s`);

export function PoolBurn({ pool }: { pool: PoolMetrics | null | undefined }) {
  if (!pool) return null;
  const stats: [string, string | number][] = [
    ['Runs', pool.total],
    ['OK', pool.ok],
    ['Failed', pool.failed + pool.timeout + pool.interrupted],
    ['Cancelled', pool.cancelled],
    ['Retried', pool.retried],
    ['Avg', t(pool.avgMs)],
    ['p95', t(pool.p95Ms)],
  ];
  return (
    <section aria-label="Worker pool" data-testid="usage-pool" className="rounded-panel border border-os-border bg-os-surface p-4">
      <h3 className="mb-2 text-[13px] font-semibold text-os-text">Worker pool, last 24 h</h3>
      <dl className="flex flex-wrap gap-x-6 gap-y-2">
        {stats.map(([k, v]) => (
          <div key={k}>
            <dt className="text-[11px] text-os-muted">{k}</dt>
            <dd className="font-mono text-[15px] tabular-nums text-os-text">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-[12px] text-os-muted">
        {pool.byModel.map((m) => `${m.model} ${m.runs}`).join(' · ')}
        {pool.byModel.length ? ' · ' : ''}
        worker seats {pool.bySeat.worker}, conductor seat {pool.bySeat.conductor}
      </p>
    </section>
  );
}
