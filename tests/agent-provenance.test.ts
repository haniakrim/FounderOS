import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { openDb } from "@/lib/db";
import { createRuntime, STATUS_CHECK_WHY } from "@/lib/agents/runtime";
import { realAgents } from "@/lib/agents/real";
import {
  NO_SOURCES_LABEL,
  PROVENANCE_PROMPT,
  parseProvenance,
  provenanceLines,
} from "@/lib/agents/provenance";
import { systemPromptFor } from "@/lib/agents/chat";

describe("parseProvenance", () => {
  test("reads a well-formed block and strips it from the text", () => {
    const { text, provenance } = parseProvenance(
      'Revenue is up.\n```provenance\n{"why":"Two invoices cleared","sources":["invoice-12","https://x.test/a"]}\n```',
    );
    expect(text).toBe("Revenue is up.");
    expect(provenance).toEqual({
      why: "Two invoices cleared",
      sources: ["invoice-12", "https://x.test/a"],
    });
  });
  test("missing block yields nothing, never an invented source", () => {
    expect(parseProvenance("plain answer").provenance).toEqual({
      why: null,
      sources: [],
    });
  });
  test("malformed JSON and wrong types are ignored", () => {
    expect(parseProvenance("a\n```provenance\n{nope\n```").provenance).toEqual({
      why: null,
      sources: [],
    });
    expect(
      parseProvenance('a\n```provenance\n{"why":5,"sources":"x"}\n```')
        .provenance,
    ).toEqual({ why: null, sources: [] });
  });
  test("dedupes, drops non-strings, caps the list", () => {
    const many = Array.from({ length: 30 }, (_, i) => `s${i}`);
    const { provenance } = parseProvenance(
      "a\n```provenance\n" +
        JSON.stringify({ sources: ["a", "a", 3, "", ...many] }) +
        "\n```",
    );
    expect(provenance.sources[0]).toBe("a");
    expect(provenance.sources.length).toBe(12);
  });
  test("text lines state the gap honestly", () => {
    expect(provenanceLines({ why: null, sources: [] })).toContain(
      NO_SOURCES_LABEL,
    );
  });
  test("agent chat prompt carries the contract and the no-invention rule", () => {
    const p = systemPromptFor(realAgents[0]);
    expect(p).toContain(PROVENANCE_PROMPT);
    expect(p).toMatch(/Never invent action items/);
  });
});

describe("run storage", () => {
  const mk = (result: object) =>
    createRuntime(openDb(":memory:"), [
      {
        id: "a",
        name: "A",
        description: "",
        departmentId: "d",
        run: async () => ({ ok: true, summary: "s", ...result }),
      },
    ]);

  test("structured why + sources are stored with the run and read back", async () => {
    const db = openDb(":memory:");
    const rt = createRuntime(db, [
      {
        id: "a",
        name: "A",
        description: "",
        departmentId: "d",
        run: async () => ({
          ok: true,
          summary: "done",
          why: "because",
          sources: ["f.md"],
        }),
      },
    ]);
    const run = await rt.run("a");
    expect(run.why).toBe("because");
    const back = db.agentRuns.get(run.id)!;
    expect(back.sources).toEqual(["f.md"]);
  });
  test("a fenced block in the summary is parsed and stripped", async () => {
    const run = await mk({
      summary: 'ok\n```provenance\n{"why":"w","sources":["u"]}\n```',
    }).run("a");
    expect(run.summary).toBe("ok");
    expect(run.sources).toEqual(["u"]);
  });
  test("no provenance stores null/empty", async () => {
    const run = await mk({}).run("a");
    expect(run.why).toBeNull();
    expect(run.sources).toEqual([]);
  });
  test("migration is additive and idempotent on a pre-existing table", () => {
    const file = path.join(
      fs.mkdtempSync(path.join(process.env.TMPDIR ?? "/tmp", "prov-")),
      "x.db",
    );
    const first = openDb(file);
    first.agentRuns.insert({
      id: "r1",
      agentId: "a",
      startedAt: "t",
      finishedAt: "t",
      ok: true,
      summary: "s",
      why: null,
      sources: [],
    });
    const again = openDb(file);
    expect(again.agentRuns.get("r1")!.sources).toEqual([]);
  });
});

describe("calendar approval gate", () => {
  // No calendar write path exists: lib/connectors/gcal.ts is a read-only CalDAV REPORT reader.
  // If someone adds one, this fails until the write goes through a pending-action approval.
  const WRITE = /calendar|event|gcal|schedule|meeting|invite/i;
  test("no agent chat tool can create or change a calendar event", () => {
    for (const agent of realAgents) {
      for (const tool of agent.chatTools?.() ?? []) {
        const writes =
          /^(create|add|insert|update|delete|schedule|book|send|write|put|post)/i.test(
            tool.name,
          );
        expect(
          writes && WRITE.test(`${tool.name} ${tool.description}`),
          `${agent.id}.${tool.name}`,
        ).toBe(false);
      }
    }
  });
  test("the calendar connector issues no write requests", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "lib/connectors/gcal.ts"),
      "utf8",
    );
    expect(src).not.toMatch(/method:\s*['"](PUT|POST|PATCH|DELETE)['"]/i);
    expect(src).not.toMatch(
      /\.(createEvent|insertEvent|updateEvent|deleteEvent)\b/,
    );
  });
});

describe("status-check agents name what they read", () => {
  const agent = (ok: boolean) => ({
    id: "probe",
    name: "Probe",
    description: "",
    departmentId: "d",
    reads: ["IMAP inboxes"],
    run: async () => ({ ok, summary: "3 unread" }),
  });

  test("a successful run with no provenance uses the agent's reads", async () => {
    const run = await createRuntime(openDb(":memory:"), [agent(true)]).run("probe");
    expect(run.sources).toEqual(["IMAP inboxes"]);
    expect(run.why).toBe(STATUS_CHECK_WHY);
  });

  test("a failed run claims no sources", async () => {
    const run = await createRuntime(openDb(":memory:"), [agent(false)]).run("probe");
    expect(run.sources ?? []).toEqual([]);
    expect(run.why ?? null).toBeNull();
  });

  test("every configured built-in agent declares what it reads", () => {
    const missing = realAgents.filter((a) => a.configured?.() !== false && !a.reads?.length && !["deal-scanner", "deal-alerts", "team-briefing"].includes(a.id)).map((a) => a.id);
    expect(missing).toEqual([]);
  });
});
