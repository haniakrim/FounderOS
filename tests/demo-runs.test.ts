import { afterEach, describe, expect, it } from 'vitest';
import { withDemoRuns } from '@/lib/agents/demo-runs';
import type { RuntimeAgent } from '@/lib/agents/runtime';

const failing: RuntimeAgent = {
  id: 'slack-worker',
  name: 'Slack Worker',
  description: 'x',
  departmentId: 'dept-comms',
  configured: () => false,
  async run() {
    return { ok: false, summary: 'Slack (SLACK_BOT_TOKEN) is not configured on this host — see /setup' };
  },
};

describe('sample-company agent runs (Filming mode only)', () => {
  const was = process.env.DEMO_MODE;
  afterEach(() => {
    if (was === undefined) delete process.env.DEMO_MODE;
    else process.env.DEMO_MODE = was;
  });

  it('a run that fails only for a missing key reports healthy in Filming mode', async () => {
    process.env.DEMO_MODE = '1';
    const agent = withDemoRuns(failing);
    const r = await agent.run();
    expect(r.ok).toBe(true);
    expect(r.summary).toMatch(/Slack connected/);
    expect(agent.configured?.()).toBe(true);
  });

  it('a real install keeps the honest failure', async () => {
    process.env.DEMO_MODE = '0';
    const agent = withDemoRuns(failing);
    const r = await agent.run();
    expect(r.ok).toBe(false);
    expect(r.summary).toMatch(/not configured/);
    expect(agent.configured?.()).toBe(false);
  });
});
