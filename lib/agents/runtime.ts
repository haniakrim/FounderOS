import { randomUUID } from 'node:crypto';
import type { GladosDb } from '@/lib/db';
import type { LlmToolSpec } from '@/lib/connectors/llm';
import type { AgentRun, Broadcast } from '@/lib/schemas';
import { getWorkerPool, type WorkerPool } from '@/lib/worker-pool';
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

export function createRuntime(db: GladosDb, agents: RuntimeAgent[], opts: { pool?: WorkerPool } = {}) {
  const registry = new Map(agents.map((a) => [a.id, a]));
  const pool = opts.pool ?? getWorkerPool(db);
  const seatOf = (id: string) => (id === 'conductor' ? ('conductor' as const) : ('worker' as const));
  const storedModel = (id: string) => {
    try {
      return db.agents.get(id)?.model ?? null;
    } catch {
      return null;
    }
  };

  return {
    list(): RuntimeAgent[] {
      return [...registry.values()];
    },

    /**
     * Queue a run on the worker pool and hand back its id at once. Every agent
     * run goes through the pool (queue, timeout, retry, cancel, ledger).
     */
    start(id: string, o: { source?: string } = {}): { runId: string; done: Promise<AgentRun> } {
      const agent = registry.get(id);
      if (!agent) throw new Error(`unknown agent: ${id}`);
      const startedAt = new Date().toISOString();
      let given: AgentRunResult | undefined;
      const handle = pool.submit({
        kind: 'run',
        agentId: id,
        label: agent.name,
        seat: seatOf(id),
        source: o.source ?? 'runtime',
        storedModel: storedModel(id),
        exec: async () => {
          given = await agent.run();
          return given;
        },
      });
      const done = handle.done.then((outcome) => {
        // Structured fields win; otherwise a fenced provenance block in the summary is
        // parsed (and stripped). Missing stays missing: the UI says "No sources given".
        const parsed = parseProvenance(outcome.summary);
        const structured = normalizeProvenance({ why: given?.why, sources: given?.sources });
        const run: AgentRun = {
          id: outcome.id,
          agentId: id,
          startedAt,
          finishedAt: new Date().toISOString(),
          ok: outcome.ok,
          summary: parsed.text,
          why: structured.why ?? parsed.provenance.why,
          sources: structured.sources.length ? structured.sources : parsed.provenance.sources,
        };
        db.agentRuns.insert(run);
        return run;
      });
      return { runId: handle.id, done };
    },

    async run(id: string, o: { source?: string } = {}): Promise<AgentRun> {
      return this.start(id, o).done;
    },

    /** Speak to every agent at once; each replies in parallel. */
    async broadcast(message: string): Promise<Broadcast> {
      const broadcastId = randomUUID();
      const createdAt = new Date().toISOString();
      db.broadcasts.insert({ id: broadcastId, message, createdAt });

      const replies = await Promise.all(
        [...registry.values()].map(async (agent) => {
          const outcome = await pool
            .submit({
              kind: 'run',
              agentId: agent.id,
              label: agent.name,
              seat: seatOf(agent.id),
              source: 'broadcast',
              storedModel: storedModel(agent.id),
              exec: () => (agent.respond ? agent.respond(message) : agent.run()),
            })
            .done;
          const result: AgentRunResult = { ok: outcome.ok, summary: outcome.summary };
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
