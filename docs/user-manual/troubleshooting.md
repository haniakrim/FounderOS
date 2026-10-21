# Troubleshooting

Find your symptom below.

## I forgot my password

FounderOS stores only a hash of your password, so it cannot be looked up. To reset it you edit `.env.local` on the computer running FounderOS.

1. Stop FounderOS (press `Ctrl+C` in the terminal).
2. Open `.env.local` in the FounderOS folder.
3. Delete the line that starts with `GLADOS_PASSWORD_HASH=`.
4. Start FounderOS again with `pnpm dev` or `pnpm preview`.
5. Open <http://localhost:4100/setup> on that same computer.
6. Under **Security**, click **Set password** and choose a new one (at least 8 characters).

Until a new password exists, FounderOS answers only on this computer.

## A 503 page from another device

The page says "GladOS is not reachable from here yet" (or an API call returns 503 with a similar message).

Cause: no password is set, so FounderOS only answers on the computer it runs on. Any other address is refused on purpose.

1. On the computer running FounderOS, open <http://localhost:4100/setup>.
2. Under **Security**, set a password.
3. Set `GLADOS_HOST` in `.env.local` to the address to listen on (your Tailscale address, a LAN address, or `0.0.0.0`).
4. Restart FounderOS. A changed address needs a restart.
5. Open FounderOS from the other device and sign in.

Without `GLADOS_HOST`, FounderOS keeps listening on `127.0.0.1`, even with a password. If you set `GLADOS_HOST` before a password exists, it is refused.

If you reach it through a name that points at this computer in your hosts file, see `GLADOS_TRUSTED_HOSTS` in the [configuration reference](reference/configuration.md). That setting is ignored once a password is set.

## I am sent to the login page, or I see "unauthorized"

A password is set and your session is missing or expired (sessions last 30 days). Sign in at `/login`. An API call that returns 401 "unauthorized" means the same thing. If you see "cross-origin request refused" (403), the request came from a different site or address than the page it was sent from. Open FounderOS directly at the address you use to reach it.

If a lot of sign-in attempts fail, you get "too many attempts, wait a minute". Wait a minute and try again.

## Page switches are slow

In `pnpm dev`, each page compiles the first time you visit it, so the first visit to a page is slow. This is normal for dev mode.

To see real speed:

1. Stop the dev server.
2. Run `pnpm preview` and wait for the build.
3. Open <http://localhost:4100>.

Preview compiles every page ahead of time. After code changes, run `pnpm preview` again. More in [Installation](getting-started/installation.md#preview-mode).

## Optimal Engine (gbrain) errors or a stuck status

Optimal Engine runs the `gbrain` command-line tool. The engine accepts one writer at a time. If a second `gbrain` process is writing to the same store, writes can fail or time out.

1. Check for another running `gbrain` process, for example an import or embed started in a terminal or by another tool.
2. Wait for it to finish, or stop it.
3. Reload the page. The Optimal Engine status refreshes.

Long operations (capture, import, embed) are given more time than reads, but they can still time out if the machine is busy.

Also check:

- `gbrain` is on your PATH, or `GBRAIN_BIN` points to it.
- `GBRAIN_STORE` points to a folder that exists. The default is `knowledge/brain-store`.
- To turn the engine off on purpose, set `BRAIN_PROVIDER=stub`.

## A tool shows "Not configured"

This is not a fault. It means FounderOS has no key for that tool and will not pretend otherwise.

1. Click the **Set up** link on the badge, or open **Connections**.
2. Find the tool in [Integrations](system/integrations.md) and check which variables it needs. Some tools need two (Beehiiv needs a key and a publication ID; GoHighLevel needs a key and a location ID).
3. Save the key in the **API keys** panel, then reload the page.

If the badge changes to **Error**, a key exists but the check failed. The card shows the reason, such as a wrong or expired key.

Checks are cached for about a minute. A new key clears the cache, so it should show on the next load. If you edited `.env.local` by hand, restart FounderOS.

## I still see "Not configured" while the demo is on

In demo (Filming) mode the connector board shows scripted stand-ins, not real connections. Switch to real data in **Settings**, **Recording**, then add your keys. See the [Quick start](getting-started/quick-start.md#4-switch-from-the-demo-to-your-own-data).

## The Filming switch is greyed out ("Pinned by host")

`GLADOS_DATA_DIR` or `DEMO_MODE` is set in the environment, so the mode is fixed. Remove that variable and restart. See the [configuration reference](reference/configuration.md).

## Usage says it is not available

Usage is off in demo mode and reads nothing then. Switch to real data. If it shows **Not configured**, there is no Claude or Codex transcript folder on this computer and nothing has been pushed. See [Usage](system/usage-blueprint-roadmap.md#usage).

## Agent chat says it is not configured

Agent and Wizard chat need `AI_GATEWAY_API_KEY`. Add it in **Connections**, **API keys**, under the Vercel AI Gateway key.

## A page I expect is missing from the sidebar

You may have switched it off. Open **Settings**, **Modules**, and turn it back on.

## Port already in use

Another program is using port 4100. Stop it, or set `PORT` to a free port in `.env.local` and restart.
