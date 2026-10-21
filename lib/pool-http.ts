import { NextResponse } from 'next/server';
import { PoolFullError } from '@/lib/worker-pool';

/** 429 when the worker pool queue is full, otherwise null. */
export function poolFullResponse(err: unknown): NextResponse | null {
  if (!(err instanceof PoolFullError)) return null;
  return NextResponse.json({ error: err.message, poolFull: true }, { status: 429, headers: { 'retry-after': '10' } });
}
