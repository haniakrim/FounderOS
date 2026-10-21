import { NextResponse } from 'next/server';
import { poolFullResponse } from '@/lib/pool-http';
import { invokePaperclipHeartbeat } from '@/founderos/lib/connectors/paperclip';
import { getDb } from '@/lib/data';
import { NotConfiguredError, getWorkerPool } from '@/lib/worker-pool';
import { setupHrefFor } from '@/lib/integrations-catalog';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * The OS Run button, for real: queue a board heartbeat for this agent on the
 * worker pool (bounded, timed out, cancellable, on the ledger). 202 + runId
 * when the board accepted it; 503 notConfigured when the board has no creds.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = (await req.json().catch(() => null)) as { name?: unknown } | null;
  const name = typeof body?.name === 'string' && body.name.trim() ? body.name.trim().slice(0, 80) : params.id;
  const pool = getWorkerPool(getDb());
  let handle;
  try {
    handle = pool.submit({
      kind: 'heartbeat',
      agentId: params.id,
      label: name,
      seat: name === 'Conductor' ? 'conductor' : 'worker',
      source: 'board-run',
      timeoutMs: 15_000,
      exec: async () => {
        let ok: boolean;
        try {
          ok = await invokePaperclipHeartbeat(params.id);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (/creds missing/i.test(msg)) throw new NotConfiguredError('The board is not configured (Paperclip URL and key missing)');
          throw err;
        }
        return ok ? { ok: true, summary: `heartbeat accepted for ${name}` } : { ok: false, summary: 'board rejected the heartbeat' };
      },
    });
  } catch (err) {
    const full = poolFullResponse(err);
    if (full) return full;
    throw err;
  }
  const outcome = await handle.done;
  if (outcome.ok) return NextResponse.json({ ok: true, runId: outcome.id }, { status: 202 });
  if (outcome.error instanceof NotConfiguredError) {
    return NextResponse.json({ error: outcome.summary, runId: outcome.id, notConfigured: true, setupHref: setupHrefFor('paperclip') }, { status: 503 });
  }
  if (outcome.status === 'cancelled') return NextResponse.json({ error: 'cancelled', runId: outcome.id }, { status: 409 });
  return NextResponse.json({ error: outcome.summary, runId: outcome.id }, { status: 502 });
}
