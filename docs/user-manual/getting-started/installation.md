# Installation

This page gets FounderOS running on your own computer. It takes about five minutes.

## Before you start

You need:

- A computer running macOS or Linux (the project is developed on macOS).
- **Node.js 22 or newer.** Check with `node --version`. The project pins Node 22 in a `.nvmrc` file.
- **pnpm**, the package manager FounderOS uses. Check with `pnpm --version`.
- The FounderOS folder (a clone of the repository) on your disk.

You do not need any API keys to start. FounderOS opens on a fictional demo company, so you can look around before connecting anything real.

## Install and start

1. Open a terminal and go to the FounderOS folder.
2. If you use nvm, run `nvm use` so you are on Node 22.
3. Install the dependencies:

   ```bash
   pnpm install
   ```

4. Start the app:

   ```bash
   pnpm dev
   ```

5. Open <http://localhost:4100> in your browser.

On the first start FounderOS builds its demo company into a folder called `demo-data/`. That takes a few seconds. After that you see a working business: agents, tasks, a funnel, brand deals, social accounts and a knowledge base. Nothing in it is real.

To use a different port, set `PORT` (see the [configuration reference](../reference/configuration.md)).

## No login on first run

With no password set, FounderOS listens on `127.0.0.1` only. That means only this computer can open it, so there is nothing to sign in to. When you want to reach it from another device, set a password first. See [Settings](../system/settings.md#security).

## Why page switches feel slow in dev mode

`pnpm dev` compiles each page the first time you visit it, so switching to a new page can take several seconds. This is expected and only affects the first visit to each page.

To see FounderOS at its real speed, use preview mode.

## Preview mode

Preview builds every page ahead of time, then serves the result. Page switches are fast, the way they are in normal use.

1. Stop `pnpm dev` if it is running (press `Ctrl+C`).
2. Run:

   ```bash
   pnpm preview
   ```

3. Wait for the build to finish, then open <http://localhost:4100>.

Preview builds into its own folder (`.next-preview`), so it does not disturb a dev server in the same checkout.

To restart the preview on the last build without rebuilding:

```bash
pnpm preview --no-build
```

If you change code, run `pnpm preview` again to rebuild. If the build fails, FounderOS does not start an old build.

## Other commands

| Command | What it does |
|---|---|
| `pnpm dev` | Start for everyday use and editing. Compiles pages on first visit. |
| `pnpm preview` | Build, then serve the built app. |
| `pnpm start` | Serve an existing build. |
| `pnpm test` | Run the automated tests. |

## Next step

Take the [quick start tour](quick-start.md).
