import { beforeAll, describe, expect, test } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { z } from "zod";

let db: import("@/lib/db").GladosDb;
let tools: typeof import("@/lib/mcp-tools").tools;

beforeAll(async () => {
  process.env.GLADOS_DB = path.join(
    mkdtempSync(path.join(tmpdir(), "glados-mcp-")),
    "test.db",
  );
  db = (await import("@/lib/data")).getDb();
  tools = (await import("@/lib/mcp-tools")).tools;
});

// Mirrors the SDK: parse args with the tool's zod shape, then call the handler.
const call = (name: string, args: Record<string, unknown> = {}): { parseError?: boolean; isError?: boolean; data: any } => {
  const t = tools.find((x) => x.name === name)!;
  const parsed = z.object(t.shape).safeParse(args);
  if (!parsed.success) return { parseError: true, data: null };
  const r = t.handler(db, parsed.data as never);
  return { ...r, data: r.isError ? null : JSON.parse(r.content[0].text) };
};

describe("MCP tools", () => {
  test("registers the documented tool set", () => {
    expect(tools.map((t) => t.name).sort()).toEqual(
      [
        "create_task",
        "get_task",
        "list_contacts",
        "list_departments",
        "list_roadmap",
        "list_tasks",
        "search_contacts",
        "update_task_status",
      ].sort(),
    );
  });

  test("list_departments returns the seeded departments", () => {
    const r = call("list_departments");
    expect(r.data.length).toBeGreaterThan(0);
  });

  test("create, get, filter and update a task", () => {
    const created = call("create_task", {
      title: "Call the bank",
      priority: "high",
    });
    expect(created.isError).toBeUndefined();
    const id = created.data.id as string;
    expect(created.data).toMatchObject({
      title: "Call the bank",
      status: "open",
      ownerKind: "me",
      priority: "high",
    });

    expect(call("get_task", { id }).data.title).toBe("Call the bank");
    expect(
      call("list_tasks", { status: "open" }).data.map(
        (t: { id: string }) => t.id,
      ),
    ).toContain(id);

    const updated = call("update_task_status", { id, status: "done" });
    expect(updated.data.status).toBe("done");
    expect(
      call("list_tasks", { status: "open" }).data.map(
        (t: { id: string }) => t.id,
      ),
    ).not.toContain(id);
  });

  test("filters tasks by department through the owning agent", () => {
    const agent = db.agents.all()[0];
    const t = call("create_task", {
      title: "Agent job",
      ownerKind: "agent",
      agentId: agent.id,
    });
    expect(t.data.departmentId).toBe(agent.departmentId);
    const ids = call("list_tasks", {
      departmentId: agent.departmentId,
    }).data.map((x: { id: string }) => x.id);
    expect(ids).toContain(t.data.id);
    expect(call("list_tasks", { departmentId: "no-such-dept" }).data).toEqual(
      [],
    );
  });

  test("rejects invalid input and unknown ids", () => {
    expect(call("create_task", { title: "" }).parseError).toBe(true);
    expect(
      call("update_task_status", { id: "x", status: "bogus" }).parseError,
    ).toBe(true);
    expect(call("get_task", { id: "nope" }).isError).toBe(true);
    expect(
      call("update_task_status", { id: "nope", status: "done" }).isError,
    ).toBe(true);
    expect(
      call("create_task", { title: "x", ownerKind: "agent" }).isError,
    ).toBe(true);
  });

  test("contacts list and search", () => {
    db.funnel.insertContact({
      id: "c-mcp-1",
      name: "Acme deal",
      venture: "default",
      status: "first_touch",
      product: null,
      amountUsd: null,
      relationship: "warm",
      likelihood: 40,
      url: null,
      email: "jo@acme.test",
      phone: null,
      person: "Jo Smith",
      company: "Acme",
      role: null,
      linkedin: null,
      createdAt: new Date().toISOString(),
    });
    expect(
      call("list_contacts").data.map((c: { id: string }) => c.id),
    ).toContain("c-mcp-1");
    expect(call("search_contacts", { query: "jo smith" }).data).toHaveLength(1);
    expect(call("search_contacts", { query: "zzz-none" }).data).toEqual([]);
  });

  test("list_roadmap filters by status", () => {
    db.roadmap.insert({
      id: "r-mcp-1",
      title: "Ship MCP",
      quarter: "2026-Q4",
      status: "now",
      departmentId: null,
      description: "",
    });
    expect(
      call("list_roadmap", { status: "now" }).data.map(
        (r: { id: string }) => r.id,
      ),
    ).toContain("r-mcp-1");
    expect(
      call("list_roadmap", { status: "done" }).data.map(
        (r: { id: string }) => r.id,
      ),
    ).not.toContain("r-mcp-1");
  });
});
