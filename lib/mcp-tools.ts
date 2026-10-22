import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { GladosDb } from "@/lib/db";
import {
  AgentTaskHorizonSchema,
  AgentTaskPrioritySchema,
  AgentTaskStatusSchema,
  RoadmapStatusSchema,
  type AgentTask,
} from "@/lib/schemas";

/**
 * Tool definitions for the Match & CO. MCP server (scripts/mcp-server.ts).
 * Each tool is a zod input shape plus a handler over a GladosDb, so tests call
 * handlers directly. Outputs are plain business data: no credentials.
 */

export type ToolResult = {
  content: { type: "text"; text: string }[];
  isError?: boolean;
};

const ok = (data: unknown): ToolResult => ({
  content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
});
const fail = (message: string): ToolResult => ({
  content: [{ type: "text", text: message }],
  isError: true,
});

export interface McpTool<S extends z.ZodRawShape = z.ZodRawShape> {
  name: string;
  description: string;
  readOnly: boolean;
  shape: S;
  handler: (db: GladosDb, args: z.infer<z.ZodObject<S>>) => ToolResult;
}

function tool<S extends z.ZodRawShape>(t: McpTool<S>): McpTool<S> {
  return t;
}

const limit = z.number().int().min(1).max(200).default(50);

/** A task's department is its agent's department (operator tasks have none). */
function withDepartment(db: GladosDb, t: AgentTask) {
  const agent = t.agentId ? db.agents.get(t.agentId) : null;
  return { ...t, departmentId: agent?.departmentId ?? null };
}

export const tools = [
  tool({
    name: "list_departments",
    description: "List the departments of the business, in display order.",
    readOnly: true,
    shape: {},
    handler: (db) => ok(db.departments.all()),
  }),
  tool({
    name: "list_tasks",
    description:
      "List tasks, newest first. Optional filters: status (open, doing, blocked, done) and departmentId (the department of the agent that owns the task).",
    readOnly: true,
    shape: {
      status: AgentTaskStatusSchema.optional(),
      departmentId: z.string().min(1).optional(),
      limit,
    },
    handler: (db, a) =>
      ok(
        db.agentTasks
          .all()
          .map((t) => withDepartment(db, t))
          .filter(
            (t) =>
              (!a.status || t.status === a.status) &&
              (!a.departmentId || t.departmentId === a.departmentId),
          )
          .slice(0, a.limit),
      ),
  }),
  tool({
    name: "get_task",
    description: "Get one task by id, including its detail body.",
    readOnly: true,
    shape: { id: z.string().min(1) },
    handler: (db, a) => {
      const t = db.agentTasks.get(a.id);
      return t ? ok(withDepartment(db, t)) : fail(`No task with id ${a.id}`);
    },
  }),
  tool({
    name: "list_contacts",
    description:
      "List CRM contacts from the funnel (name, stage, venture, likelihood, contact channels), newest first.",
    readOnly: true,
    shape: { limit },
    handler: (db, a) =>
      ok(
        db.funnel
          .journeys()
          .slice(0, a.limit)
          .map(({ touches, ...c }) => ({ ...c, touchCount: touches.length })),
      ),
  }),
  tool({
    name: "search_contacts",
    description:
      "Search contacts by case-insensitive text across name, person, company, role, email, and product.",
    readOnly: true,
    shape: { query: z.string().min(1), limit },
    handler: (db, a) => {
      const q = a.query.toLowerCase();
      return ok(
        db.funnel
          .journeys()
          .filter((c) =>
            [c.name, c.person, c.company, c.role, c.email, c.product].some(
              (v) => v?.toLowerCase().includes(q),
            ),
          )
          .slice(0, a.limit)
          .map(({ touches, ...c }) => ({ ...c, touchCount: touches.length })),
      );
    },
  }),
  tool({
    name: "list_roadmap",
    description:
      "The roadmap board. Optional filters: status (done, now, next, later) and quarter like 2026-Q2.",
    readOnly: true,
    shape: {
      status: RoadmapStatusSchema.optional(),
      quarter: z
        .string()
        .regex(/^\d{4}-Q[1-4]$/)
        .optional(),
    },
    handler: (db, a) =>
      ok(
        db.roadmap
          .all()
          .filter(
            (r) =>
              (!a.status || r.status === a.status) &&
              (!a.quarter || r.quarter === a.quarter),
          ),
      ),
  }),
  tool({
    name: "create_task",
    description:
      'Create a task. Operator tasks use ownerKind "me" (default); agent tasks use ownerKind "agent" and must name agentId.',
    readOnly: false,
    shape: {
      title: z.string().trim().min(1).max(300),
      detail: z.string().max(5000).default(""),
      priority: AgentTaskPrioritySchema.default("normal"),
      dueAt: z.string().datetime().nullable().default(null),
      horizon: AgentTaskHorizonSchema.nullable().default(null),
      ownerKind: z.enum(["agent", "me"]).default("me"),
      agentId: z.string().min(1).nullable().default(null),
    },
    handler: (db, a) => {
      if (a.agentId && !db.agents.get(a.agentId))
        return fail(`No agent with id ${a.agentId}`);
      const now = new Date().toISOString();
      const id = `task-${randomUUID()}`;
      try {
        db.agentTasks.insert({
          id,
          agentId: a.agentId,
          title: a.title,
          status: "open",
          createdAt: now,
          updatedAt: now,
          detail: a.detail,
          dueAt: a.dueAt,
          priority: a.priority,
          ownerKind: a.ownerKind,
          horizon: a.horizon,
          runId: null,
        });
      } catch (e) {
        return fail(e instanceof Error ? e.message : String(e));
      }
      return ok(withDepartment(db, db.agentTasks.get(id)!));
    },
  }),
  tool({
    name: "update_task_status",
    description: "Set a task status to open, doing, blocked, or done.",
    readOnly: false,
    shape: { id: z.string().min(1), status: AgentTaskStatusSchema },
    handler: (db, a) => {
      if (!db.agentTasks.get(a.id)) return fail(`No task with id ${a.id}`);
      db.agentTasks.setStatus(a.id, a.status, new Date().toISOString());
      return ok(db.agentTasks.get(a.id));
    },
  }),
];
