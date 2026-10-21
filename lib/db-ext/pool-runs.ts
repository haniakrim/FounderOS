/**
 * Worker pool run ledger (lib/worker-pool.ts). One row per task the pool
 * accepted: queued, running, and the terminal state it ended in. Nothing is
 * seeded; a fresh install has no row. A row left `queued` or `running` by a
 * process that died is marked `interrupted` on the next start (recover()).
 */
import type Database from 'better-sqlite3';

export const POOL_DDL = `
CREATE TABLE IF NOT EXISTS pool_runs (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  seat TEXT NOT NULL DEFAULT 'worker',
  model TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT '',
  queued_at TEXT NOT NULL,
  started_at TEXT,
  finished_at TEXT,
  summary TEXT NOT NULL DEFAULT '',
  error TEXT NOT NULL DEFAULT '',
  result TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS pool_runs_by_queued ON pool_runs (queued_at);
CREATE INDEX IF NOT EXISTS pool_runs_by_status ON pool_runs (status);
`;

export const POOL_STATUSES = ['queued', 'running', 'ok', 'failed', 'cancelled', 'timeout', 'interrupted'] as const;
export type PoolStatus = (typeof POOL_STATUSES)[number];
export const POOL_TERMINAL: ReadonlySet<PoolStatus> = new Set(['ok', 'failed', 'cancelled', 'timeout', 'interrupted']);
export const POOL_KEEP_ROWS = 1000;
export const POOL_RESULT_CAP = 20_000;
export type PoolSeat = 'worker' | 'conductor';

export type PoolRunRow = {
  id: string;
  kind: string;
  agentId: string;
  label: string;
  seat: PoolSeat;
  model: string;
  status: PoolStatus;
  attempts: number;
  source: string;
  queuedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  summary: string;
  error: string;
  result: string;
};

type Raw = {
  id: string; kind: string; agent_id: string; label: string; seat: string; model: string; status: string;
  attempts: number; source: string; queued_at: string; started_at: string | null; finished_at: string | null;
  summary: string; error: string; result: string;
};

const toRow = (r: Raw): PoolRunRow => ({
  id: r.id, kind: r.kind, agentId: r.agent_id, label: r.label, seat: r.seat === 'conductor' ? 'conductor' : 'worker',
  model: r.model, status: r.status as PoolStatus, attempts: r.attempts, source: r.source, queuedAt: r.queued_at,
  startedAt: r.started_at, finishedAt: r.finished_at, summary: r.summary, error: r.error, result: r.result,
});

export type PoolRunPatch = Partial<Pick<PoolRunRow, 'status' | 'attempts' | 'model' | 'startedAt' | 'finishedAt' | 'summary' | 'error' | 'result'>>;

const COLS: Record<keyof PoolRunPatch, string> = {
  status: 'status', attempts: 'attempts', model: 'model', startedAt: 'started_at',
  finishedAt: 'finished_at', summary: 'summary', error: 'error', result: 'result',
};

export function poolRunsRepo(db: InstanceType<typeof Database>) {
  return {
    insert(r: PoolRunRow): void {
      db.prepare(
        `INSERT OR REPLACE INTO pool_runs (id, kind, agent_id, label, seat, model, status, attempts, source, queued_at, started_at, finished_at, summary, error, result)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(r.id, r.kind, r.agentId, r.label, r.seat, r.model, r.status, r.attempts, r.source, r.queuedAt, r.startedAt, r.finishedAt, r.summary, r.error, r.result.slice(0, POOL_RESULT_CAP));
      this.prune(POOL_KEEP_ROWS);
    },
    /** Keep only the newest `keep` finished rows; live rows are never dropped. */
    prune(keep: number): number {
      return db
        .prepare(
          `DELETE FROM pool_runs WHERE status NOT IN ('queued','running') AND id NOT IN (
             SELECT id FROM pool_runs ORDER BY queued_at DESC, rowid DESC LIMIT ?)`,
        )
        .run(keep).changes;
    },
    update(id: string, patch: PoolRunPatch): void {
      const keys = (Object.keys(patch) as (keyof PoolRunPatch)[]).filter((k) => k in COLS);
      if (keys.length === 0) return;
      db.prepare(`UPDATE pool_runs SET ${keys.map((k) => `${COLS[k]} = ?`).join(', ')} WHERE id = ?`).run(...keys.map((k) => (k === 'result' && typeof patch[k] === 'string' ? (patch[k] as string).slice(0, POOL_RESULT_CAP) : patch[k] ?? null)), id);
    },
    get(id: string): PoolRunRow | null {
      const r = db.prepare('SELECT * FROM pool_runs WHERE id = ?').get(id) as Raw | undefined;
      return r ? toRow(r) : null;
    },
    recent(limit = 50): PoolRunRow[] {
      return (db.prepare('SELECT * FROM pool_runs ORDER BY queued_at DESC, rowid DESC LIMIT ?').all(limit) as Raw[]).map(toRow);
    },
    since(iso: string): PoolRunRow[] {
      return (db.prepare('SELECT * FROM pool_runs WHERE queued_at >= ? ORDER BY queued_at DESC, rowid DESC').all(iso) as Raw[]).map(toRow);
    },
    /** Rows a dead process left mid-flight. Returns how many were marked. */
    recover(now: string, keepIds: string[] = []): number {
      const rows = db.prepare("SELECT id FROM pool_runs WHERE status IN ('queued','running')").all() as { id: string }[];
      const stale = rows.filter((r) => !keepIds.includes(r.id));
      const st = db.prepare("UPDATE pool_runs SET status = 'interrupted', finished_at = ?, error = 'interrupted: the process that held this run stopped' WHERE id = ?");
      for (const r of stale) st.run(now, r.id);
      return stale.length;
    },
    count(): number {
      return (db.prepare('SELECT COUNT(*) AS n FROM pool_runs').get() as { n: number }).n;
    },
  };
}
