import { NextResponse } from 'next/server';
import { poolFullResponse } from '@/lib/pool-http';
import { z } from 'zod';
import { getDb } from '@/lib/data';
import { llmReady, SkillNotFoundError, startSkillRun } from '@/lib/skill-run';
import { setupHrefFor } from '@/lib/integrations-catalog';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const Body = z.object({
  input: z.string().max(8000).optional(),
  agentId: z.string().trim().min(1).max(120).optional(),
  wait: z.boolean().optional(),
});

/**
 * Run a skill (SOP) as a worker-pool task. 202 + runId by default (poll
 * GET /api/pool/runs/<id>); `wait: true` holds until it ends. Needs a model
 * key: without one it answers 503 notConfigured and runs nothing.
 */
export async function POST(req: Request, { params }: { params: { slug: string } }) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  const ready = await llmReady();
  if (!ready.configured) {
    return NextResponse.json({ error: ready.detail || 'No model key configured', notConfigured: true, setupHref: setupHrefFor('llm') }, { status: 503 });
  }
  try {
    const handle = startSkillRun(getDb(), { slug: params.slug, input: parsed.data.input, agentId: parsed.data.agentId });
    if (!parsed.data.wait) return NextResponse.json({ runId: handle.id, status: 'queued' }, { status: 202 });
    const o = await handle.done;
    const data = o.result?.data as { text?: string } | undefined;
    return NextResponse.json({ runId: o.id, status: o.status, ok: o.ok, summary: o.summary, text: data?.text ?? null, attempts: o.attempts, model: o.model });
  } catch (err) {
    const full = poolFullResponse(err);
    if (full) return full;
    if (err instanceof SkillNotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}
