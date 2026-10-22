import { randomUUID } from 'node:crypto';
import type { GladosDb } from '@/lib/db';
import type { LlmToolSpec } from '@/lib/connectors/llm';
import type { AgentRun, Broadcast } from '@/lib/schemas';
import { normalizeProvenance, parseProvenance } from '@/lib/agents/provenance';

export type AgentRunResult = {
  ok: boolean;
  summary: string;
  data?: unknown;
  /** Optional provenance: why this result, and what was read to get it. */
  why?: string;
  sources?: string[];
};

export type RuntimeAgent = {
  id: string;
  name: string;
  description: string;
  departmentId: string;
  run(): Promise<AgentRunResult>;
  /**
   * Cheap, synchronous: can this agent actually do its job on this host right
   * now (key present, binary on disk, daemon installed)? Absent means "yes".
   * The Blueprint uses it so 'live' is never claimed for a stub.
   */
  configured?(): boolean;
  /**
   * Optional conversational entry point used by broadcasts. Agents that can
   * actually act on a message (e.g. the data agent querying Optimal Engine)
   * implement this; everyone else falls back to run() and replies with live
   * status. A future OpenClaw/Claude Code binding plugs in here.
   */
  respond?(message: string): Promise<AgentRunResult>;
  /**
   * Read-only tools this agent can call during a chat. Each wraps an existing
   * connector so the model can actually read live data mid-conversation.
   */
  chatTools?(): LlmToolSpec[];
};

export function createRuntime(db: GladosDb, agents: RuntimeAgent[]) {
  const registry = new Map(agents.map((a) => [a.id, a]));

  return {
    list(): RuntimeAgent[] {
      return [...registry.values()];
    },

    async run(id: string): Promise<AgentRun> {
      const agent = registry.get(id);
      if (!agent) throw new Error(`unknown agent: ${id}`);
      const startedAt = new Date().toISOString();
      let result: AgentRunResult;
      try {
        result = await agent.run();
      } catch (err) {
        result = { ok: false, summary: err instanceof Error ? err.message : String(err) };
      }
      // Structured fields win; otherwise a fenced provenance block in the summary is
      // parsed (and stripped). Missing stays missing: the UI says "No sources given".
      const parsed = parseProvenance(result.summary);
      const given = normalizeProvenance({ why: result.why, sources: result.sources });
      const run: AgentRun = {
        id: randomUUID(),
        agentId: id,
        startedAt,
        finishedAt: new Date().toISOString(),
        ok: result.ok,
        summary: parsed.text,
        why: given.why ?? parsed.provenance.why,
        sources: given.sources.length ? given.sources : parsed.provenance.sources,
      };
      db.agentRuns.insert(run);
      return run;
    },

    /** Speak to every agent at once; each replies in parallel. */
    async broadcast(message: string): Promise<Broadcast> {
      const broadcastId = randomUUID();
      const createdAt = new Date().toISOString();
      db.broadcasts.insert({ id: broadcastId, message, createdAt });

      const replies = await Promise.all(
        [...registry.values()].map(async (agent) => {
          let result: AgentRunResult;
          try {
            result = await (agent.respond ? agent.respond(message) : agent.run());
          } catch (err) {
            result = { ok: false, summary: err instanceof Error ? err.message : String(err) };
          }
          const reply = {
            id: randomUUID(),
            broadcastId,
            agentId: agent.id,
            ok: result.ok,
            reply: result.summary,
            finishedAt: new Date().toISOString(),
          };
          db.broadcasts.insertReply(reply);
          return reply;
        }),
      );

      return { id: broadcastId, message, createdAt, replies };
    },
  };
}

export type AgentRuntime = ReturnType<typeof createRuntime>;
