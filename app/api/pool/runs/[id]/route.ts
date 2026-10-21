import { NextResponse } from 'next/server';
import { getDb } from '@/lib/data';
import { getWorkerPool } from '@/lib/worker-pool';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** One pool run, with its recorded result (skill output, chat reply). */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const row = getWorkerPool(getDb()).get(params.id);
  if (!row) return NextResponse.json({ error: 'unknown run' }, { status: 404 });
  let result: unknown = null;
  try {
    result = row.result ? JSON.parse(row.result) : null;
  } catch {
    result = null;
  }
  return NextResponse.json({ run: { ...row, result } });
}
