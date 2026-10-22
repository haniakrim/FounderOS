import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getDb } from "../lib/data";
import { tools } from "../lib/mcp-tools";
import { BRAND } from "../lib/brand";

/**
 * Match & CO. as a stdio MCP server. Opens the same database as the app
 * (GLADOS_DB, demo vs real mode via lib/data.ts). Never write to stdout:
 * it carries the protocol.
 */
const server = new McpServer({ name: "match-and-co", version: "1.0.0" });

for (const t of tools) {
  server.registerTool(
    t.name,
    {
      description: t.description,
      inputSchema: t.shape,
      annotations: { readOnlyHint: t.readOnly },
    },
    // The SDK validates args against t.shape (zod) before calling this.
    ((args: unknown) =>
      (t.handler as (db: unknown, a: unknown) => unknown)(
        getDb(),
        args,
      )) as never,
  );
}

await server.connect(new StdioServerTransport());
console.error(`${BRAND.name} MCP server ready (${tools.length} tools)`);
