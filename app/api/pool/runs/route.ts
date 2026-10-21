import { NextResponse } from 'next/server';
import { poolFullResponse } from '@/lib/pool-http';
import { z } from 'zod';
import { getDb } from '@/lib/data';
import { createRuntime } from '@/lib/agents/runtime';
import { realAgents } from '@/lib/agents/real';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const Body = z.object({ agentId: z.string().trim().min(1).max(120), wait: z.boolean().optional() });

/** Queue an OS agent run on the worker pool. 202 + runId; `wait: true` holds for the result. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'agentId is required' }, { status: 400 });
  const rt = createRuntime(getDb(), realAgents);
  try {
    const { runId, done } = rt.start(parsed.data.agentId, { source: 'agents-board' });
    if (!parsed.data.wait) {
      void done.catch(() => undefined);
      return NextResponse.json({ runId, status: 'queued' }, { status: 202 });
    }
    return NextResponse.json({ runId, run: await done });
  } catch (err) {
    const full = poolFullResponse(err);
    if (full) return full;
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 404 });
  }
}
