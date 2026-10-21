import { NextResponse } from 'next/server';
import { getDb } from '@/lib/data';
import { realAgents } from '@/lib/agents/real';
import { getWorkerPool } from '@/lib/worker-pool';
import { llmReady } from '@/lib/skill-run';
import { readUserSkills } from '@/lib/skills-catalog';
import { setupHrefFor } from '@/lib/integrations-catalog';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Live pool state for the Agents board: queue, recent runs, metrics, what can be run. */
export async function GET() {
  const db = getDb();
  const pool = getWorkerPool(db);
  const llm = await llmReady();
  return NextResponse.json({
    snapshot: pool.snapshot(),
    metrics: pool.metrics(24),
    recent: pool.recent(40).map(({ result: _r, ...row }) => row),
    agents: realAgents.map((a) => ({ id: a.id, name: a.name, configured: a.configured ? a.configured() : true })),
    skills: readUserSkills().map((s) => ({ slug: s.slug, name: s.name })).slice(0, 500),
    llm: { configured: llm.configured, detail: llm.detail, setupHref: setupHrefFor('llm') },
    checkedAt: new Date().toISOString(),
  });
}
