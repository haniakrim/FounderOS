# Project board

Live board of what is being built in FounderOS. Absolute dates only. The
`## Checklist` section is rendered under the terminal input by the status line;
`!` = waiting on the operator.

## Active

| Project | State | Last change | Waiting on | Folder |
|---|---|---|---|---|
| Design system: Apple fluid pass | All fix batches applied and browser-checked on branch `design/fluid-pass` (2026-10-22); leftovers: Knowledge Graph remap hex, bar height and sidebar width transitions | 2026-10-22 | nothing: pushed to the operator's fork and merged to `main` there (2026-10-22) | `docs/projects/design-system/` |
| Portable theme and design kit | Built 2026-10-21 at `~/Desktop/founderos-themes/` (outside the repo) and installed as the `founderos-themes` skill | 2026-10-21 | Operator review; the `SetupLink` default href decision | `docs/projects/design-system/` |
| End-user manual | Manual, screenshots and PDF committed on `docs/user-manual` (0b8ea85, 8373fa9) | 2026-10-21 | Merged to `main` (already contained) 2026-10-22 | `docs/user-manual/` |

| Match & CO. rebrand and replica fixes | Rebrand (`lib/brand.ts`, mark, favicon), category review research (309 rows, `replica/`) and fixes F1-F7 shipped to `main` on the fork 2026-10-22 | 2026-10-22 | Operator: trademark/domain checks, palette decision, `MATCHCO_SUPPORT_EMAIL` | `replica/` |

## Shipped

| Project | Shipped | Where |
|---|---|---|
| pnpm and Node 22 pin | before 2026-10-21 (bb7ab60) | `main` history |

## Checklist

- [x] Design audit against the 17 Apple rules (`docs/design-audit.md`)
- [x] `DESIGN.md` spec
- [x] Fix batch 1: press feedback, popover origin, focus ring, topbar material, reduced-transparency and contrast fallbacks
- [x] Fix batch 2: overlay exit animations (finding 2), translucent sheets and dialogs (8), topbar divider fade (7)
- [x] Fix batch 3: rem type and spacing scale (9), per-size tracking (10), reduced-motion crossfades (11)
- [x] Fix batch 4: replace `transition: all` (12), raw hex in components (13), dock timing (14), sidebar width animation (15)
- [x] Browser check of the fluid pass at 1440 and 390, both modes
- [x] Portable kit: tokens, fonts, appearance system and picker (Next.js, React, plain HTML)
- [x] Portable kit: full GladOS, Classic and Legacy component kits with shells and specimens
- [x] 2026-10-22: Classic kit `SetupLink` default href kept at `/setup` (generic apps; it is a prop, FounderOS passes `/integrations`)
- [x] 2026-10-22: remotes switched: `origin` = haniakrim/FounderOS (fork), `upstream` = Bennettxai; all branches pushed, `design/fluid-pass` merged to fork `main`
- [ ] Fix Legacy `Strip` clipping long values in narrow cards (portable kit)
- [x] 2026-10-22: demo roadmap matched to the code: Statement ingestion done (`lib/statements.ts`, `/finances` upload), Auth + remote access now (login shipped, outside-network access open); unfinished Q3 items rolled into Q4
- [x] 2026-10-22: fluid pass closed (all 15 findings)
- [x] 2026-10-22: worker pool (`lib/worker-pool.ts`, `pool_runs` table) and agents board driving runs and skills
- [x] 2026-10-22: remote-access hardening and Setup → Security Remote access card
- [x] 2026-10-22: Postiz connector, Setup entry and Social panel
- [x] 2026-10-22: Railway deploy files (`Dockerfile`, `railway.json`, `/api/health`, `docs/deploy/railway.md`)
- [x] 2026-10-22: Q4 closeout checks added and run: `pnpm docker:smoke` (Railway image, login), `scripts/verify-workers.mjs`, `scripts/verify-remote.mjs`, roadmap synced
- [x] 2026-10-22: Postiz compose file added (`deploy/postiz`); config validated, stack not started
- [x] 2026-10-22: Q4 code scope shipped; rm-auth, rm-postiz, rm-railway and rm-workers marked done, their operator steps split into four 2027-Q1 items (Q4 now 8/8)
- [x] 2026-10-22: 2027-Q1 `rm-auth-live` done: Tailscale signed in (userspace daemon, state in ~/.local/state/tailscale), `tailscale serve` shares port 4100 on the tailnet, gate checked over HTTPS (307 / 200 / 200)
- [x] 2026-10-22: 2027-Q1 `rm-postiz-live` done: local Postiz up on 127.0.0.1:4007, owner user created (credentials in gitignored `deploy/postiz/.owner`), keys in `.env.local`, `verify-postiz.mjs` PASS
- [ ] 2027-Q1 `rm-railway-live`: CLI installed and logged in, deploy OK given 2026-10-22; blocked: Railway answered "Deploys have been paused due to an upstream issue" on `railway init`. Retry, then `verify-railway.mjs`
- [ ] ! 2027-Q1 `rm-workers-live`: Gateway on the host for the worker pool: `/api/pool` reports AI_GATEWAY_API_KEY not set; set it at /integrations, then `node scripts/verify-workers.mjs`
- [x] 2026-10-22: rebrand to Match & CO. (name, mark, favicon; internal ids kept)
- [x] 2026-10-22: replica research: 309 rows across Trustpilot, G2, Hacker News; fix plan and angle in `replica/fixes.md`
- [x] 2026-10-22: F1-F7 shipped: billing policy doc, data export/delete, connector sync badges, agent why + sources, MCP server, solo setup path, support link
- [ ] ! Run the Match & CO. trademark, domain and handle checks (`replica/brand.md`), ideally with a lawyer
- [ ] ! Set `MATCHCO_SUPPORT_EMAIL` in `.env.local`
- [x] 2026-10-24: Match & CO. brand package v1 applied: Soft White theme and GladOS light/dark tokens in `app/matchco.css` (accent slots = Lavender, Coral, Apricot, Gradient), Poppins + Inter, package logo/icons in `public/brand/matchco/`, animated login wallpaper, name "Founder OS By Match & CO."
- [ ] ! Classic and Bennett Legacy styles are not re-skinned to the brand; trademark check for the new name still open
