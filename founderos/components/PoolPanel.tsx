'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Square } from 'lucide-react';
import { Badge, Label } from '@/founderos/components/terminal';
import { SetupLink } from '@/components/SetupLink';
import type { PoolMetrics, PoolSnapshot, PoolRunRow } from '@/lib/worker-pool';

/**
 * The Pool tab: the OS drives the agents from here. Start an agent run or a
 * skill (SOP) on the worker pool, watch the queue, stop what is queued or
 * running, read what finished. Everything is the pool's own ledger (pool_runs),
 * polled from /api/pool; nothing here is sample data.
 */
type PoolView = {
  snapshot: PoolSnapshot;
  metrics: PoolMetrics;
  recent: Omit<PoolRunRow, 'result'>[];
  agents: { id: string; name: string; configured: boolean }[];
  skills: { slug: string; name: string }[];
  llm: { configured: boolean; detail: string; setupHref: string };
};

const TONE: Record<string, 'ok' | 'warn' | 'err' | 'default'> = {
  ok: 'ok', queued: 'warn', running: 'warn', failed: 'err', timeout: 'err', interrupted: 'err', cancelled: 'default',
};

const dur = (r: { startedAt: string | null; finishedAt: string | null }) => {
  if (!r.startedAt || !r.finishedAt) return '';
  const ms = Date.parse(r.finishedAt) - Date.parse(r.startedAt);
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
};
const ms = (n: number | null) => (n === null ? 'none' : n < 1000 ? `${n}ms` : `${(n / 1000).toFixed(1)}s`);

const field = 'rounded-ctl border border-os-border bg-os-bg px-2 py-1.5 font-mono text-[11px] text-os-text outline-none focus:border-os-accent';
const btn = 'pressable is-dark rounded-ctl border border-os-border px-3 py-1.5 font-mono text-[11px] text-os-text disabled:opacity-50';

export function PoolPanel() {
  const [view, setView] = useState<PoolView | null>(null);
  const [agentId, setAgentId] = useState('');
  const [skill, setSkill] = useState('');
  const [input, setInput] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ text?: string; summary: string; error: string } | null>(null);
  const busy = useRef(false);

  const load = useCallback(async (force = false) => {
    if (!force && (busy.current || document.hidden)) return;
    busy.current = true;
    try {
      const res = await fetch('/api/pool', { cache: 'no-store' });
      if (res.ok) setView((await res.json()) as PoolView);
    } catch {
      /* keep the last snapshot */
    } finally {
      busy.current = false;
    }
  }, []);

  const activeCount = view ? view.snapshot.running + view.snapshot.queued : 0;
  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), activeCount > 0 ? 1500 : 4000);
    return () => clearInterval(id);
  }, [load, activeCount]);

  const post = async (url: string, body: unknown) => {
    setNote(null);
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) setNote(j.error ?? `request failed (${res.status})`);
    await load(true);
  };

  const stop = async (id: string) => {
    await fetch(`/api/pool/runs/${id}/cancel`, { method: 'POST' }).catch(() => undefined);
    await load(true);
  };

  const toggle = async (id: string) => {
    if (open === id) return setOpen(null);
    setOpen(id);
    setDetail(null);
    const res = await fetch(`/api/pool/runs/${id}`, { cache: 'no-store' }).catch(() => null);
    if (!res?.ok) return;
    const { run } = (await res.json()) as { run: { summary: string; error: string; result: { text?: string } | null } };
    setDetail({ text: run.result?.text, summary: run.summary, error: run.error });
  };

  if (!view) return <p className="font-mono text-[10.5px] text-os-dim">loading pool...</p>;
  const m = view.metrics;
  const modelsNote = view.llm.configured ? null : (
    <div className="flex flex-wrap items-center gap-2 rounded-ctl border border-os-border bg-os-bg px-3 py-2">
      <Badge tone="warn">Not configured</Badge>
      <span className="font-mono text-[10.5px] text-os-dim">No model key: skills and chats cannot run. Agent status runs still work.</span>
      <SetupLink href={view.llm.setupHref} hint={view.llm.detail} />
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain pr-1" data-testid="pool-panel">
      {modelsNote}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
        {(
          [
            ['Running', `${view.snapshot.running}/${view.snapshot.limits.worker + view.snapshot.limits.conductor}`],
            ['Queued', view.snapshot.queued],
            ['Runs 24h', m.total],
            ['OK', m.ok],
            ['Failed', m.failed + m.timeout],
            ['Retried', m.retried],
            ['Avg', ms(m.avgMs)],
            ['p95', ms(m.p95Ms)],
          ] as const
        ).map(([k, v]) => (
          <div key={k} className="flex flex-col gap-1 rounded-ctl border border-os-border bg-os-bg px-2.5 py-2">
            <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-os-dim">{k}</span>
            <span className="font-mono text-[18px] font-semibold leading-none">{v}</span>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label>Run an agent</Label>
          <div className="flex gap-2">
            <select className={`${field} min-w-0 flex-1`} value={agentId} onChange={(e) => setAgentId(e.target.value)} aria-label="Agent">
              <option value="">Pick an agent</option>
              {view.agents.map((a) => (
                <option key={a.id} value={a.id}>{a.name}{a.configured ? '' : ' (not configured)'}</option>
              ))}
            </select>
            <button type="button" className={btn} disabled={!agentId} onClick={() => post('/api/pool/runs', { agentId })}>
              Queue run
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label>Run a skill (SOP)</Label>
          <div className="flex gap-2">
            <select className={`${field} min-w-0 flex-1`} value={skill} onChange={(e) => setSkill(e.target.value)} aria-label="Skill">
              <option value="">{view.skills.length ? 'Pick a skill' : 'No skills on this machine'}</option>
              {view.skills.map((s) => (
                <option key={s.slug} value={s.slug}>{s.name}</option>
              ))}
            </select>
            <button
              type="button"
              className={btn}
              disabled={!skill || !view.llm.configured}
              title={view.llm.configured ? undefined : 'Needs a model key'}
              onClick={() => post(`/api/skills/${encodeURIComponent(skill)}/run`, { input })}
            >
              Run skill
            </button>
          </div>
          <input className={field} value={input} onChange={(e) => setInput(e.target.value)} placeholder="Input for the procedure (optional)" aria-label="Skill input" />
        </div>
      </div>
      {note && <p className="font-mono text-[10.5px] text-os-err" role="status">{note}</p>}

      <div className="flex min-h-0 flex-col gap-1.5">
        <Label>Queue and history</Label>
        {view.recent.length === 0 && <p className="font-mono text-[10.5px] text-os-dim">No pool runs yet. Queue one above.</p>}
        {view.recent.map((r) => {
          const live = r.status === 'queued' || r.status === 'running';
          return (
            <div key={r.id} className="rounded-ctl border border-os-border bg-os-bg">
              <div className="flex items-center gap-2 px-2.5 py-1.5 font-mono text-[10.5px]">
                <Badge tone={TONE[r.status] ?? 'default'}>{r.status}</Badge>
                <button type="button" className="min-w-0 flex-1 truncate text-left text-os-text" onClick={() => void toggle(r.id)} title={r.summary || r.label}>
                  {r.label}
                </button>
                <span className="text-os-dim">{r.kind}</span>
                <span className="hidden max-w-[10rem] truncate text-os-dim sm:inline" title={r.model}>{r.seat} · {r.model}</span>
                {r.attempts > 1 && <span className="text-os-warn">x{r.attempts}</span>}
                <span className="text-os-dim">{dur(r)}</span>
                {live && (
                  <button type="button" onClick={() => void stop(r.id)} aria-label={`Stop ${r.label}`} title="Stop" className="pressable is-dark flex h-5 w-5 items-center justify-center rounded-ctl text-os-warn hover:text-os-err">
                    <Square className="h-3 w-3" strokeWidth={1.8} />
                  </button>
                )}
              </div>
              {open === r.id && (
                <div className="border-t border-os-border px-2.5 py-2 font-mono text-[10.5px] leading-relaxed text-os-muted">
                  {detail ? (
                    <>
                      <p className="whitespace-pre-wrap">{detail.text ?? (detail.summary || 'no output yet')}</p>
                      {detail.error && <p className="mt-1 text-os-err">{detail.error}</p>}
                    </>
                  ) : (
                    'loading...'
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
