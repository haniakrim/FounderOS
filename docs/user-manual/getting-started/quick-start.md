# Quick start

A first tour of FounderOS using the built-in demo company, then how to switch to your own data. It takes about ten minutes. You need FounderOS running first: see [Installation](installation.md).

## 1. Look around the demo company

When you open <http://localhost:4100> for the first time, FounderOS shows a fictional company. Nothing on screen is real, and none of it touches your own data folder.

1. Find the sidebar on the left. It groups pages by what you are doing: Command, Revenue, Growth, Workforce, Knowledge and System.
2. Click **Home** for the overview.
3. Click **Agents** to see the roster of named AI agents, their tasks and run history.
4. Click **Funnel** to see the client journey, and **Comms** for the unified inbox.
5. Click **Optimal Engine** under Knowledge to browse the searchable knowledge base.

Each area is explained in its own page: [Command](../features/command.md), [Revenue](../features/revenue.md), [Growth](../features/growth.md), [Workforce](../features/workforce.md), [Knowledge](../features/knowledge.md).

## 2. Jump anywhere with the command palette

The command palette is the fastest way to move around.

1. Press `Cmd+K` (Mac) or `Ctrl+K` (Windows and Linux). A search box opens.
2. Type a few letters, such as `funnel`, `org` or the name of an agent. Every word you type must match the item's name or its keywords.
3. Use the up and down arrow keys to pick a result, then press `Enter`. Click also works.
4. Press `Esc` to close the palette. Press `Cmd+K` again to toggle it.

The palette lists:

- every page in the sidebar, plus a few extra views such as **Org Chart**;
- every agent and tool in your database;
- external links such as Attio CRM and Fathom Calls, which open in a new tab;
- **Toggle sidebar** (also `Cmd+\`).

It shows up to nine results at a time. If nothing matches, it says "No matches".

### Number-key shortcuts

When you are not typing in a field, press `1` to `9` to jump to the first nine pages in the sidebar order. Pages you switch off in Settings are skipped.

## 3. Make it look the way you like

Open **Settings** from the System group. The **Appearance** section lets you pick a style, an accent colour and dark, light or system mode. Changes apply immediately. See [Settings](../system/settings.md#appearance).

## 4. Switch from the demo to your own data

The demo company is called **Filming mode** in the Settings page. When you are ready for your own business:

1. Open **Settings** (press `Cmd+K`, type `settings`, press `Enter`).
2. Find the **Filming mode** card (called **Recording** on the page).
3. Click **Switch to real data**.

FounderOS now reads your real data folder, `data/`. It starts blank apart from six departments: Sales, Marketing/Growth, TECH, Finances, Communications and Clients. You add everything else through the pages or by connecting tools.

Switching only changes which folder FounderOS reads. It never copies, seeds or deletes anything, so you can switch back and forth safely. The change takes effect without restarting.

If the switch is greyed out and says **Pinned by host**, your installation fixes the mode with an environment variable and the switch cannot change it. See [Troubleshooting](../troubleshooting.md).

To make every fresh install start on blank data instead of the demo, set `GLADOS_DEFAULT_MODE=real`. See the [configuration reference](../reference/configuration.md).

## 5. Connect your first tool

1. Open **Connections** from the System group.
2. Find a tool you use, for example Slack or Stripe.
3. Add its key. See [Integrations](../system/integrations.md) for what each tool needs.

Tools without a key show **Not configured**. That is honest by design: see [Concepts](../concepts.md#honest-not-configured-connectors).

## 6. Protect it with a password

If you only use FounderOS on this computer, you can skip this. To open it from a phone or another computer, set a password in **Settings**, then **Security**. See [Settings](../system/settings.md#security).
