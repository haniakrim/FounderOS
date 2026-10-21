/**
 * SOPs as skills: run a skill (a SKILL.md procedure) as an agent task through
 * the worker pool. The skill text is the system prompt; the operator's input
 * is the user turn; an optional agent lends its read-only tools. The result is
 * recorded on the pool ledger (pool_runs.result = { text, toolCalls }).
 */
import { BRAND } from '@/lib/brand';
import { chat as llmChat, llmStatus } from '@/lib/connectors/llm';
import type { GladosDb } from '@/lib/db';
import { realAgents } from '@/lib/agents/real';
import { readSkillMarkdown } from '@/lib/skills-catalog';
import { systemPromptFor } from '@/lib/agents/chat';
import { getWorkerPool, modelArg, type PoolHandle } from '@/lib/worker-pool';

const SKILL_CAP = 24_000;
const SLUG_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

export class SkillNotFoundError extends Error {
  constructor(slug: string) {
    super(`skill not found: ${slug}`);
    this.name = 'SkillNotFoundError';
  }
}

/** The SOP text: the on-disk library first, the seeded catalog second. */
export function skillText(db: GladosDb, slug: string, dir?: string): string | null {
  if (!SLUG_RE.test(slug) || slug.includes('..')) return null;
  const disk = readSkillMarkdown(slug, dir);
  if (disk) return disk;
  const seeded = db.skills.all().find((s) => s.id === slug);
  return seeded?.markdown || null;
}

export function skillSystemPrompt(skillMd: string, agentPrompt?: string): string {
  return [
    agentPrompt ?? `You are an operator assistant inside ${BRAND.name}.`,
    'You are executing a standard operating procedure (a skill). Follow it step by step and report what you did and what you found.',
    'You are READ-ONLY: never claim to have sent, created, scheduled, or published anything. If a step needs an action you cannot take, say so and stop at that step.',
    '--- SKILL ---',
    skillMd.slice(0, SKILL_CAP),
  ].join('\n');
}

export async function llmReady(): Promise<{ configured: boolean; detail: string }> {
  const s = await llmStatus();
  return { configured: s.state === 'connected', detail: s.detail ?? '' };
}

export function startSkillRun(
  db: GladosDb,
  input: { slug: string; input?: string; agentId?: string },
  opts: { dir?: string; source?: string } = {},
): PoolHandle {
  const md = skillText(db, input.slug, opts.dir);
  if (!md) throw new SkillNotFoundError(input.slug);
  const agent = input.agentId ? realAgents.find((a) => a.id === input.agentId) : undefined;
  if (input.agentId && !agent) throw new Error(`unknown agent: ${input.agentId}`);
  const system = skillSystemPrompt(md, agent ? systemPromptFor(agent) : undefined);
  const tools = agent?.chatTools?.();
  const prompt = input.input?.trim() || 'Run this procedure now.';
  return getWorkerPool(db).submit({
    kind: 'skill',
    agentId: agent?.id ?? `skill:${input.slug}`,
    label: `skill: ${input.slug}`,
    seat: 'worker',
    source: opts.source ?? `skill:${input.slug}`,
    storedModel: agent ? db.agents.get(agent.id)?.model : null,
    exec: async (ctx) => {
      const r = await llmChat({ system, messages: [{ role: 'user', content: prompt }], tools, ...modelArg(ctx) });
      if (!r.text.trim()) return { ok: false, summary: 'the model returned no text', data: r };
      return { ok: true, summary: r.text.trim().slice(0, 300), data: { text: r.text, toolCalls: r.toolCalls } };
    },
  });
}
