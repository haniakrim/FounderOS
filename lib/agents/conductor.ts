/**
 * Wizard routing. A message can name its target explicitly with a leading
 * `@<agentId|name>`; otherwise the model picks the best-fit agent from the
 * roster. Either way the Wizard delegates to that agent's chat (with its
 * tools) and returns `{ routedTo, ...chat }`. Routing never throws on a bad
 * `@name` — it falls back to model routing.
 */
import { chat as llmChat } from '@/lib/connectors/llm';
import { BRAND } from '@/lib/brand';
import { chatWithAgent, type ChatResult } from '@/lib/agents/chat';
import type { GladosDb } from '@/lib/db';
import type { RuntimeAgent } from '@/lib/agents/runtime';
import { isFilming } from '@/lib/demo-mode';
import { getWorkerPool, modelArg } from '@/lib/worker-pool';

export type ConductorResult = ChatResult & { routedTo: string };

const AT_PREFIX = /^@(\S+)\s*/;

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function matchAgent(agents: RuntimeAgent[], token: string): RuntimeAgent | undefined {
  const t = slug(token);
  return agents.find((a) => a.id === token || a.id === t || slug(a.name) === t);
}

/** Ask the model for the single best-fit agent id; fall back to the first agent. */
async function pickAgent(db: GladosDb, routable: RuntimeAgent[], message: string): Promise<string> {
  const roster = routable.map((a) => `- ${a.id}: ${a.name} — ${a.description}`).join('\n');
  const system = [
    `You are the Wizard, the router for ${BRAND.name} operator agents.`,
    'Pick the single best-fit agent for the user message.',
    'Reply with ONLY that agent id and nothing else. Options:',
    roster,
  ].join('\n');
  const pooled = await getWorkerPool(db).run({
    kind: 'chat',
    agentId: 'conductor',
    label: 'Conductor routing',
    seat: 'conductor',
    source: 'conductor-route',
    storedModel: db.agents.get('conductor')?.model,
    exec: async (ctx) => {
      const r = await llmChat({ system, messages: [{ role: 'user', content: message }], ...modelArg(ctx) });
      return { ok: true, summary: r.text.slice(0, 120), data: r };
    },
  });
  const res = pooled.data as Awaited<ReturnType<typeof llmChat>>;
  const picked = (res.text.trim().split(/\s+/)[0] ?? '').replace(/[^a-zA-Z0-9_-]/g, '');
  const found = routable.find((a) => a.id === picked);
  if (found) return found.id;
  // Filming mode: with no model key on a filming host the pick comes back empty and
  // everything would fall to routable[0]. Score the roster by keyword overlap so the
  // Wizard still routes sensibly on camera.
  if (isFilming()) {
    const words = message.toLowerCase().match(/[a-z]{4,}/g) ?? [];
    let best: { id: string; score: number } | null = null;
    for (const a of routable) {
      const hay = `${a.name} ${a.description}`.toLowerCase();
      const score = words.reduce((n, w) => n + (hay.includes(w) ? 1 : 0), 0);
      if (score > 0 && (!best || score > best.score)) best = { id: a.id, score };
    }
    if (best) return best.id;
  }
  return routable[0].id;
}

export async function routeConductorMessage(
  db: GladosDb,
  agents: RuntimeAgent[],
  message: string,
  opts: { screenContext?: string } = {},
): Promise<ConductorResult> {
  const routable = agents.filter((a) => a.id !== 'conductor');
  let targetId: string | undefined;
  let delivered = message;

  const at = message.match(AT_PREFIX);
  if (at) {
    const explicit = matchAgent(routable, at[1]);
    if (explicit) {
      targetId = explicit.id;
      delivered = message.replace(AT_PREFIX, '').trim() || message;
    }
    // unknown @name → fall through to model routing (never throw)
  }

  if (!targetId) targetId = await pickAgent(db, routable, message);

  const result = await chatWithAgent(db, agents, targetId, delivered, opts);
  return { routedTo: targetId, ...result };
}
