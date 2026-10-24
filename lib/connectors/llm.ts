/**
 * LLM connector — backs agent & Wizard chat through the Vercel AI Gateway.
 *
 * Mirrors the brain.ts provider shape: a real `gateway` provider (default) that
 * calls the AI SDK with a `"provider/model"` string, plus a `stub` provider
 * (LLM_PROVIDER=stub) that is deterministic and makes NO network call — so the
 * whole agent-chat stack is testable offline. Status stays honest: no
 * AI_GATEWAY_API_KEY ⇒ not_configured, never a fake "connected".
 */
import { z } from 'zod';
import { CRED_FILES, resolveCred } from '@/lib/creds';
import type { ConnectorStatus } from '@/lib/connectors/types';

export type LlmRole = 'system' | 'user' | 'assistant' | 'tool';
export type LlmMessage = { role: LlmRole; content: string };

export type LlmToolSpec = {
  name: string;
  description: string;
  parameters: z.ZodTypeAny;
  execute: (args: Record<string, unknown>) => Promise<unknown>;
};

export type LlmToolCall = { name: string; args: unknown; result: unknown };

export type LlmChatRequest = {
  system?: string;
  messages: LlmMessage[];
  tools?: LlmToolSpec[];
  model?: string;
};

export type LlmChatResult = { text: string; toolCalls: LlmToolCall[] };

export interface LlmProvider {
  name: string;
  chat(req: LlmChatRequest): Promise<LlmChatResult>;
}

const GATEWAY_KEY = 'AI_GATEWAY_API_KEY';
const DEFAULT_MODEL = process.env.LLM_MODEL ?? 'anthropic/claude-sonnet-5';
/** The gateway model an agent with no stored model id runs on (the failover select's default, F9). */
export const LLM_DEFAULT_MODEL = DEFAULT_MODEL;

/** process.env first (Next auto-loads .env.local), then the operator's cred files. */
function resolveGatewayKey(): string | undefined {
  return resolveCred(GATEWAY_KEY, [CRED_FILES.agentsEnv, CRED_FILES.socialMedia]);
}

/** Stub trigger: a user message containing `use-tool:<name>` fires that tool. */
const STUB_TRIGGER = /use-tool:(\S+)/;

export const stubLlmProvider: LlmProvider = {
  name: 'stub',
  async chat(req) {
    const lastUser = [...req.messages].reverse().find((m) => m.role === 'user');
    const text = lastUser ? `stub-reply: ${lastUser.content}` : 'stub-reply';
    const toolCalls: LlmToolCall[] = [];
    const trigger = lastUser?.content.match(STUB_TRIGGER);
    if (trigger && req.tools) {
      const spec = req.tools.find((t) => t.name === trigger[1]);
      if (spec) {
        const args: Record<string, unknown> = {};
        const result = await spec.execute(args);
        toolCalls.push({ name: spec.name, args, result });
      }
    }
    return { text, toolCalls };
  },
};

type ModelFactory = (id: string) => Promise<unknown>;

/** One AI SDK generateText exchange (tools, multi-step) against whichever model factory a provider supplies. */
async function generate(req: LlmChatRequest, defaultModel: string, modelFor: ModelFactory): Promise<LlmChatResult> {
  const { generateText, tool, stepCountIs } = await import('ai');
  const tools = Object.fromEntries(
    (req.tools ?? []).map((t) => [
      t.name,
      tool({ description: t.description, inputSchema: t.parameters, execute: t.execute }),
    ]),
  );
  const messages = req.messages
    .filter((m) => m.role !== 'tool')
    .map((m) => ({ role: m.role as 'system' | 'user' | 'assistant', content: m.content }));

  const result = await generateText({
    model: (await modelFor(req.model ?? defaultModel)) as Parameters<typeof generateText>[0]['model'],
    system: req.system,
    messages,
    tools: req.tools?.length ? tools : undefined,
    stopWhen: stepCountIs(6),
  });

  const toolCalls: LlmToolCall[] = [];
  for (const step of result.steps ?? []) {
    const calls = step.toolCalls ?? [];
    const results = step.toolResults ?? [];
    for (const c of calls) {
      // Match the result to its call by id — a failed/missing tool result
      // can leave `toolResults` shorter than `toolCalls`, so positional
      // alignment would attach the wrong output to every later call.
      const hit = results.find((r) => r.toolCallId === c.toolCallId);
      toolCalls.push({ name: c.toolName, args: c.input, result: hit?.output });
    }
  }
  return { text: result.text, toolCalls };
}

export function createGatewayProvider(model: string = DEFAULT_MODEL): LlmProvider {
  return {
    name: 'gateway',
    async chat(req) {
      // Fail fast with an honest message instead of letting the SDK hang —
      // and hydrate process.env from the operator's cred files so a key that
      // exists outside .env.local still works.
      const key = resolveGatewayKey();
      if (!key) {
        throw new Error('AI_GATEWAY_API_KEY is not set — add it to .env.local to enable agent chat.');
      }
      if (!process.env.AI_GATEWAY_API_KEY) process.env.AI_GATEWAY_API_KEY = key;
      return generate(req, model, async (id) => (await import('ai')).gateway(id));
    },
  };
}

/* ── Direct Anthropic and Hermes (LLM_PROVIDER=anthropic | hermes) ─────────────────────────────────── */

const ANTHROPIC_KEY = 'ANTHROPIC_API_KEY';
const ANTHROPIC_DEFAULT = 'claude-sonnet-5-5';
const anthropicKey = (): string | undefined => resolveCred(ANTHROPIC_KEY, []);
/** The Gateway's "anthropic/claude-x" ids name the same model as the API's "claude-x". */
const anthropicId = (id: string): string => (id.startsWith('anthropic/') ? id.slice('anthropic/'.length) : id);

/** Claude through the Anthropic API directly: the same tools and multi-step loop as the Gateway, no Gateway key. */
export function createAnthropicProvider(): LlmProvider {
  return {
    name: 'anthropic',
    async chat(req) {
      const apiKey = anthropicKey();
      if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set — add it to .env.local to enable agent chat.');
      const model = anthropicId(req.model ?? process.env.ANTHROPIC_MODEL ?? ANTHROPIC_DEFAULT);
      return generate({ ...req, model }, model, async (id) => (await import('@ai-sdk/anthropic')).createAnthropic({ apiKey })(anthropicId(id)));
    },
  };
}

const hermesUrl = (): string => (process.env.HERMES_API_URL ?? 'http://hermes:8642').replace(/\/+$/, '');
const hermesHeaders = (): Record<string, string> => {
  const key = process.env.HERMES_API_KEY?.trim();
  return { 'content-type': 'application/json', ...(key ? { authorization: `Bearer ${key}` } : {}) };
};

/**
 * Hermes (LLM_PROVIDER=hermes): a plain conversation goes to the Hermes Agent's OpenAI-compatible API, so
 * Hermes answers with its own memory and skills. A request that carries this app's tools stays on Claude
 * directly, because Hermes cannot call a tool that lives inside this process.
 */
export function createHermesProvider(): LlmProvider {
  const claude = createAnthropicProvider();
  return {
    name: 'hermes',
    async chat(req) {
      if (req.tools?.length) return claude.chat(req);
      const messages = [
        ...(req.system ? [{ role: 'system', content: req.system }] : []),
        ...req.messages.filter((m) => m.role !== 'tool').map((m) => ({ role: m.role, content: m.content })),
      ];
      const res = await fetch(`${hermesUrl()}/v1/chat/completions`, {
        method: 'POST',
        headers: hermesHeaders(),
        body: JSON.stringify({ model: process.env.HERMES_MODEL ?? 'hermes-agent', messages }),
        signal: AbortSignal.timeout(120_000),
      });
      if (!res.ok) throw new Error(`Hermes answered ${res.status}: ${(await res.text()).slice(0, 160)}`);
      const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const text = body.choices?.[0]?.message?.content?.trim();
      if (!text) throw new Error('Hermes returned an empty reply');
      return { text, toolCalls: [] };
    },
  };
}

export function getLlmProvider(): LlmProvider {
  const name = process.env.LLM_PROVIDER ?? 'gateway';
  if (name === 'stub') return stubLlmProvider;
  if (name === 'anthropic') return createAnthropicProvider();
  if (name === 'hermes') return createHermesProvider();
  return createGatewayProvider();
}

export function chat(req: LlmChatRequest): Promise<LlmChatResult> {
  return getLlmProvider().chat(req);
}

export async function llmStatus(): Promise<ConnectorStatus> {
  const base = { id: 'llm', name: 'LLM (Gateway)', kind: 'orchestration' } as const;
  if (process.env.LLM_PROVIDER === 'stub') {
    return { ...base, state: 'connected', detail: 'stub provider active (tests)' };
  }
  if (process.env.LLM_PROVIDER === 'anthropic') {
    return anthropicKey()
      ? { ...base, name: 'LLM (Anthropic)', state: 'connected', detail: `Anthropic API · default model ${process.env.ANTHROPIC_MODEL ?? ANTHROPIC_DEFAULT}` }
      : { ...base, name: 'LLM (Anthropic)', state: 'not_configured', detail: 'Set ANTHROPIC_API_KEY in .env.local to enable agent chat.' };
  }
  if (process.env.LLM_PROVIDER === 'hermes') {
    const hb = { ...base, name: 'LLM (Hermes)' } as const;
    if (!anthropicKey()) return { ...hb, state: 'not_configured', detail: 'Set ANTHROPIC_API_KEY in .env.local: Hermes chats use it for tool calls.' };
    try {
      const res = await fetch(`${hermesUrl()}/health`, { headers: hermesHeaders(), signal: AbortSignal.timeout(4000) });
      return res.ok
        ? { ...hb, state: 'connected', detail: `Hermes Agent at ${hermesUrl()} · tool calls on Claude ${process.env.ANTHROPIC_MODEL ?? ANTHROPIC_DEFAULT}` }
        : { ...hb, state: 'error', detail: `Hermes answered ${res.status} at ${hermesUrl()}` };
    } catch {
      return { ...hb, state: 'error', detail: `Hermes is not reachable at ${hermesUrl()}` };
    }
  }
  const key = resolveGatewayKey();
  if (!key) {
    return {
      ...base,
      state: 'not_configured',
      detail: 'Set AI_GATEWAY_API_KEY in .env.local to enable agent chat via the Vercel AI Gateway.',
    };
  }
  return { ...base, state: 'connected', detail: `Vercel AI Gateway · default model ${DEFAULT_MODEL}` };
}
