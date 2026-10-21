import { NextResponse } from 'next/server';
import { getDb } from '@/lib/data';
import { getWorkerPool } from '@/lib/worker-pool';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Stop a queued or running pool task. A call already on the wire is abandoned, not recalled. */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const pool = getWorkerPool(getDb());
  if (!pool.get(params.id)) return NextResponse.json({ error: 'unknown run' }, { status: 404 });
  const cancelled = pool.cancel(params.id);
  return NextResponse.json({ ok: true, cancelled, run: pool.get(params.id) });
}
