import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CONNECTOR_SYNC } from "@/lib/connectors/sync";
import { INTEGRATIONS, connectionCatalog } from "@/lib/integrations-catalog";

const DIR = path.join(process.cwd(), "lib/connectors");
const NOT_CONNECTORS = new Set(["types", "index", "sync"]);
const VALID = ["read", "write", "two-way", "webhook-in"];
const src = (f: string) => fs.readFileSync(path.join(DIR, `${f}.ts`), "utf8");

describe("connector sync direction", () => {
  it("every lib/connectors module belongs to a connector with a valid sync value", () => {
    const modules = fs
      .readdirSync(DIR)
      .filter((f) => f.endsWith(".ts"))
      .map((f) => f.slice(0, -3))
      .filter((f) => !NOT_CONNECTORS.has(f));
    const covered = new Set(
      Object.values(CONNECTOR_SYNC).flatMap((c) => c.files),
    );
    expect(modules.filter((m) => !covered.has(m))).toEqual([]);
    for (const [id, c] of Object.entries(CONNECTOR_SYNC)) {
      expect(VALID, id).toContain(c.sync);
      for (const f of c.files)
        expect(fs.existsSync(path.join(DIR, `${f}.ts`)), `${id}: ${f}.ts`).toBe(
          true,
        );
    }
  });

  it("every catalogue entry with a connector carries its sync value", () => {
    const catalog = connectionCatalog([]);
    for (const i of INTEGRATIONS.filter((e) => e.connectorId)) {
      expect(CONNECTOR_SYNC[i.connectorId!], i.slug).toBeDefined();
      expect(catalog.find((c) => c.slug === i.slug)?.sync, i.slug).toBe(
        CONNECTOR_SYNC[i.connectorId!].sync,
      );
    }
  });

  it("two-way and write connectors really export something that sends, creates or updates", () => {
    for (const [id, c] of Object.entries(CONNECTOR_SYNC)) {
      if (c.sync !== "two-way" && c.sync !== "write") continue;
      expect(
        c.writes?.length,
        `${id} lists its write functions`,
      ).toBeGreaterThan(0);
      const text = c.files.map(src).join("\n");
      for (const w of c.writes!) {
        const defined = new RegExp(
          `(export (async )?function ${w}\\b|\\b${w}\\s*\\()`,
        ).test(text);
        expect(defined, `${id}: ${w} defined`).toBe(true);
        expect(w, `${id}: ${w} reads as a write`).toMatch(
          /^(send|create|launch|capture|update|post|push|write|schedule)/i,
        );
      }
      // a real outbound call, not just a name
      expect(
        /method:\s*'(POST|PUT|PATCH|DELETE)'|sendMail|\.send\(|postMessage|execFile|spawn|capture\(|scope:\s*'[a-z]+:write'/.test(
          text,
        ),
        `${id}: outbound call`,
      ).toBe(true);
    }
  });

  it("read and webhook-in connectors do not claim a write path", () => {
    for (const [id, c] of Object.entries(CONNECTOR_SYNC)) {
      if (c.sync === "read" || c.sync === "webhook-in")
        expect(c.writes, id).toBeUndefined();
    }
  });
});
