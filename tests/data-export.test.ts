import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const tmp = mkdtempSync(path.join(tmpdir(), "glados-dataexp-"));
const dbFile = path.join(tmp, "test.db");
const brain = path.join(tmp, "brain");
const saved = { ...process.env };

beforeAll(() => {
  process.env.GLADOS_DB = dbFile;
  process.env.BRAIN_DIR = brain;
  mkdirSync(brain);
  writeFileSync(path.join(brain, "note.md"), "# hello");
});
afterAll(() => {
  process.env = saved;
});

const post = (body: unknown) =>
  new Request("http://localhost/api/data/delete", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

describe("data export and delete", () => {
  test("demo mode refuses both with an honest message", async () => {
    process.env.DEMO_MODE = "1";
    const { GET } = await import("@/app/api/data/export/route");
    const { POST } = await import("@/app/api/data/delete/route");
    const ex = await GET();
    expect(ex.status).toBe(409);
    expect(((await ex.json()) as { error: string }).error).toMatch(/demo/i);
    const del = await POST(post({ confirm: "DELETE" }));
    expect(del.status).toBe(409);
  });

  test("export streams a tar.gz holding a SQLite snapshot and the brain folder", async () => {
    process.env.DEMO_MODE = "0";
    const { GET } = await import("@/app/api/data/export/route");
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toMatch(
      /matchco-export-\d{4}-\d{2}-\d{2}\.tar\.gz/,
    );
    const out = path.join(tmp, "out.tar.gz");
    writeFileSync(out, Buffer.from(await res.arrayBuffer()));
    const list = execFileSync("tar", ["-tzf", out]).toString();
    expect(list).toMatch(/matchco-export-[\d-]+\/glados\.db/);
    expect(list).toMatch(/matchco-export-[\d-]+\/brain\/note\.md/);
  });

  test("delete needs confirm DELETE", async () => {
    process.env.DEMO_MODE = "0";
    const { POST } = await import("@/app/api/data/delete/route");
    expect((await POST(post({}))).status).toBe(400);
    expect((await POST(post({ confirm: "delete" }))).status).toBe(400);
    expect((await POST(post("not json"))).status).toBe(400);
  });

  test("delete wipes rows and reseeds only the structural rows", async () => {
    process.env.DEMO_MODE = "0";
    const { getDb } = await import("@/lib/data");
    const { POST } = await import("@/app/api/data/delete/route");
    expect(existsSync(dbFile)).toBe(true);
    const res = await POST(post({ confirm: "DELETE" }));
    expect(res.status).toBe(200);
    expect(((await res.json()) as { ok: boolean }).ok).toBe(true);
    expect(getDb().departments.all().length).toBeGreaterThan(0);
  });
});
