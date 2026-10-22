# Match & CO. as an MCP server

`scripts/mcp-server.ts` exposes the business to Claude over stdio. It opens the
same database as the app: `GLADOS_DB` if set, otherwise demo or real mode
exactly as `lib/data.ts` decides. Set `GLADOS_DEFAULT_MODE=real` (or flip the
mode in Settings) to point it at real data.

Run it by hand: `pnpm mcp` (waits for an MCP client on stdin).

## Register with Claude Code

```sh
claude mcp add match-and-co -- pnpm --dir /ABSOLUTE/PATH/TO/FounderOS mcp
```

With real data and an explicit database:

```sh
claude mcp add match-and-co -e GLADOS_DB=/ABSOLUTE/PATH/TO/FounderOS/data/glados.db -- pnpm --dir /ABSOLUTE/PATH/TO/FounderOS mcp
```

## Register with Claude Desktop

Add to `claude_desktop_config.json`
(`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "match-and-co": {
      "command": "pnpm",
      "args": ["--dir", "/ABSOLUTE/PATH/TO/FounderOS", "mcp"],
      "env": { "GLADOS_DB": "/ABSOLUTE/PATH/TO/FounderOS/data/glados.db" }
    }
  }
}
```

Desktop needs `pnpm` and Node on its PATH; if not, use the absolute path to
`pnpm` as `command`. Omit `env` to follow the app's demo/real mode.

## Tools

Read: `list_departments`, `list_tasks` (status, departmentId, limit),
`get_task`, `list_contacts`, `search_contacts`, `list_roadmap` (status, quarter).

Write: `create_task`, `update_task_status`.

There is no `add_note_to_contact`: contacts have no notes field in the schema,
so the server does not pretend to. Inputs are validated with the zod schemas in
`lib/schemas.ts`. Tool definitions live in `lib/mcp-tools.ts`. Credentials are
never returned; contact email and phone are returned because the app stores
and shows them.
