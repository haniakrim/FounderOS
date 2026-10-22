/**
 * Per-agent chat orchestration. Loads the agent's rolling conversation, calls
 * the LLM connector with the agent's system prompt + its read-only tools, and
 * persists the user turn, any tool calls, and the assistant turn. Returns the
 * reply plus the full conversation. The LLM_PROVIDER=stub path keeps this
 * deterministic and offline for tests.
 */
import { randomUUID } from 'node:crypto';
import { BRAND } from '@/lib/brand';
import { chat as llmChat, type LlmMessage } from '@/lib/connectors/llm';
import type { GladosDb } from '@/lib/db';
import type { RuntimeAgent } from '@/lib/agents/runtime';
import type { AgentMessage } from '@/lib/schemas';
import { getWorkerPool, modelArg } from '@/lib/worker-pool';
import { PROVENANCE_PROMPT, parseProvenance, provenanceLines } from '@/lib/agents/provenance';

export type ChatResult = { reply: string; messages: AgentMessage[] };

const SCREEN_CONTEXT_CAP = 4000;

export function systemPromptFor(agent: RuntimeAgent, screenContext?: string): string {
  const lines = [
    `You are ${agent.name}, an operator agent inside ${BRAND.name}.`,
    agent.description,
    'Answer concisely and use your tools to read live data when it helps.',
    'You are READ-ONLY: never claim to have sent, created, scheduled, or published anything — you can only look things up and report.',
    'Never invent action items or calendar events. Anything that would change a calendar needs the operator to approve it first.',
    PROVENANCE_PROMPT,
  ];
  if (screenContext) {
    lines.push(
      `The operator is currently looking at this screen — use it as grounding when they say "this", "here", or ask about what they see:\n${screenContext.slice(0, SCREEN_CONTEXT_CAP)}`,
    );
  }
  return lines.join('\n');
}

export async function chatWithAgent(
  db: GladosDb,
  agents: RuntimeAgent[],
  agentId: string,
  message: string,
  opts: { screenContext?: string; source?: string } = {},
): Promise<ChatResult> {
  const agent = agents.find((a) => a.id === agentId);
  if (!agent) throw new Error(`unknown agent: ${agentId}`);

  const now = () => new Date().toISOString();

  db.agentMessages.insert({ id: randomUUID(), agentId, role: 'user', content: message, toolCalls: [], createdAt: now() });

  // Full rolling history. Prior `tool` turns are kept in the record for the
  // activity feed, but the gateway provider drops them before calling the model
  // (a bare {role:'tool'} string isn't a valid v6 tool-result part) — so on
  // follow-up turns the model sees the assistant's prose, not raw tool output.
  // Fine for v1 read-only chat; revisit if multi-turn tool reasoning is needed.
  const history = db.agentMessages.byAgent(agentId);
  const llmMessages: LlmMessage[] = history.map((m) => ({ role: m.role, content: m.content }));
  const tools = agent.chatTools?.();

  // Every chat goes through the worker pool. Model routing: the stored model
  // (the F9 failover choice) wins, a worker seat otherwise uses WORKER_POOL_MODEL,
  // and a retry falls back to the gateway default (see lib/worker-pool.ts).
  const system = systemPromptFor(agent, opts.screenContext);
  const pooled = await getWorkerPool(db).run({
    kind: 'chat',
    agentId,
    label: agent.name,
    seat: agentId === 'conductor' ? 'conductor' : 'worker',
    source: opts.source ?? 'chat',
    storedModel: db.agents.get(agentId)?.model,
    exec: async (ctx) => {
      const r = await llmChat({ system, messages: llmMessages, tools, ...modelArg(ctx) });
      return { ok: true, summary: r.text.slice(0, 300), data: r };
    },
  });
  const result = pooled.data as Awaited<ReturnType<typeof llmChat>>;

  if (result.toolCalls.length) {
    db.agentMessages.insert({
      id: randomUUID(),
      agentId,
      role: 'tool',
      content: result.toolCalls.map((c) => `${c.name} → ${JSON.stringify(c.result)}`).join('\n'),
      toolCalls: result.toolCalls,
      createdAt: now(),
    });
  }

  // Show the work: strip the fenced block and state the why + sources under the answer.
  const parsed = parseProvenance(result.text);
  const reply = parsed.text ? `${parsed.text}\n\n${provenanceLines(parsed.provenance)}` : result.text;
  db.agentMessages.insert({ id: randomUUID(), agentId, role: 'assistant', content: reply, toolCalls: [], createdAt: now() });

  return { reply, messages: db.agentMessages.byAgent(agentId) };
}
