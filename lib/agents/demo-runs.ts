import { filmingMode } from '@/lib/paths';
import type { AgentRunResult, RuntimeAgent } from '@/lib/agents/runtime';

/**
 * What each status-check agent reports in the sample company (Filming mode). On a real host an agent reads
 * its connector, daemon or key and says so honestly when it is missing; the sample company is a fully wired
 * Saudi operation, so a run there reports the healthy state instead of a missing-key failure. Real installs
 * never see these.
 */
const DEMO_SUMMARY: Record<string, string> = {
  conductor: 'Instance hosts on this machine: 9/9 up · command-center, remotion, ollama, openclaw, tmux, whisper, ffmpeg, higgsfield, gh · all agents bound to the builtin runtime',
  'stack-monitor': '9/9 up · command-center, remotion, ollama, openclaw, tmux, whisper, ffmpeg, higgsfield, gh',
  'notion-sync': 'Notion connected · 42 pages mirrored from the Match & Co workspace, last sync 06:10 Riyadh time',
  'daily-briefing': 'Briefing sent 07:00 Riyadh time · 3 priorities, 4 drafts awaiting approval, SAR 12,240 available',
  'automation-jobs': '4 jobs scheduled (Sun-Thu): reconcile 06:00, heartbeat hourly, newsletter Thu 09:00, operator 07:30 · last run clean',
  'comms-agent': '3/3 channels live · Email OK · WhatsApp OK · Slack OK',
  'gmail-worker': '4 inboxes connected · 22 unread in the last 24h · 3 priority',
  'whatsapp-worker': 'WhatsApp Business connected · 14 chats synced, 2 awaiting a reply',
  'slack-worker': 'Slack connected · 9 channels joined, 31 messages in the last 24h',
  'brand-deal-drafter': 'Ready · playbook skill loaded, 4 drafts awaiting approval',
  'gsend-sender': 'Verified sender online · 5 sent this week, 0 bounces',
  'crm-pulse': 'CRM connected · 38 open deals, SAR 412K pipeline, 6 moved stage this week',
  'deal-scanner': 'Scanned 124 messages in 30 days · 14 deals classified, 3 need action',
  'deal-alerts': 'Alerts bot live · 2 deal-closed pings today, 1 action-needed',
  'team-briefing': 'Daily digest delivered to the ops lead at 17:30 Riyadh time',
  adscout: 'Ad library connected · 38 competitor ads tracked, 5 new this week',
};

/** Wrap an agent so that, in Filming mode, a run that would fail only for a missing key or host reports healthy. */
export function withDemoRuns(agent: RuntimeAgent): RuntimeAgent {
  const run = agent.run.bind(agent);
  const configured = agent.configured?.bind(agent);
  return {
    ...agent,
    configured: configured ? () => filmingMode() || configured() : undefined,
    async run(): Promise<AgentRunResult> {
      const result = await run();
      if (!filmingMode() || result.ok) return result;
      return { ...result, ok: true, summary: DEMO_SUMMARY[agent.id] ?? `${agent.name} is healthy · sample company` };
    },
  };
}
