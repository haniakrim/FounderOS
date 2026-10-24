import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAnthropicProvider, createHermesProvider, getLlmProvider, llmStatus } from '@/lib/connectors/llm';

const saved = { ...process.env };
afterEach(() => {
  process.env = { ...saved };
  vi.restoreAllMocks();
});

describe('LLM providers: Anthropic direct and Hermes', () => {
  it('LLM_PROVIDER picks the provider by name', () => {
    process.env.LLM_PROVIDER = 'anthropic';
    expect(getLlmProvider().name).toBe('anthropic');
    process.env.LLM_PROVIDER = 'hermes';
    expect(getLlmProvider().name).toBe('hermes');
    process.env.LLM_PROVIDER = 'gateway';
    expect(getLlmProvider().name).toBe('gateway');
  });

  it('anthropic without a key fails honestly, never silently', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    await expect(createAnthropicProvider().chat({ messages: [{ role: 'user', content: 'hi' }] })).rejects.toThrow(/ANTHROPIC_API_KEY is not set/);
  });

  it('a plain Hermes chat goes to the Hermes OpenAI-compatible API with its key', async () => {
    process.env.HERMES_API_URL = 'http://hermes.test:8642/';
    process.env.HERMES_API_KEY = 'k-test-123';
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: ' hello from hermes ' } }] }), { status: 200 }));
    const r = await createHermesProvider().chat({ system: 'be brief', messages: [{ role: 'user', content: 'hi' }] });
    expect(r.text).toBe('hello from hermes');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://hermes.test:8642/v1/chat/completions');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer k-test-123');
    expect(JSON.parse(String(init.body)).messages[0]).toEqual({ role: 'system', content: 'be brief' });
  });

  it('Hermes status: not configured without a Claude key, error when unreachable', async () => {
    process.env.LLM_PROVIDER = 'hermes';
    delete process.env.ANTHROPIC_API_KEY;
    expect((await llmStatus()).state).toBe('not_configured');
    process.env.ANTHROPIC_API_KEY = 'sk-test';
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('down'));
    expect((await llmStatus()).state).toBe('error');
  });
});
