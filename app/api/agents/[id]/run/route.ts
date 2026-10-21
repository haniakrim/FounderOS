import { NextResponse } from 'next/server';
import { poolFullResponse } from '@/lib/pool-http';
import { getDb } from '@/lib/data';
import { createRuntime } from '@/lib/agents/runtime';
import { realAgents } from '@/lib/agents/real';

export const dynamic = 'force-dynamic';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const runtime = createRuntime(getDb(), realAgents);
  try {
    const run = await runtime.run(params.id, { source: 'agents-api' });
    return NextResponse.json({ run });
  } catch (err) {
    const full = poolFullResponse(err);
    if (full) return full;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 404 },
    );
  }
}
