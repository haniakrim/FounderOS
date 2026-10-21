# Project board

Live board of what is being built in FounderOS. Absolute dates only. The
`## Checklist` section is rendered under the terminal input by the status line;
`!` = waiting on the operator.

## Active

| Project | State | Last change | Waiting on | Folder |
|---|---|---|---|---|
| Design system: Apple fluid pass | All fix batches applied and browser-checked on branch `design/fluid-pass` (2026-10-22); leftovers: Knowledge Graph remap hex, bar height and sidebar width transitions | 2026-10-22 | operator OK to push the branch | `docs/projects/design-system/` |
| Portable theme and design kit | Built 2026-10-21 at `~/Desktop/founderos-themes/` (outside the repo) and installed as the `founderos-themes` skill | 2026-10-21 | Operator review; the `SetupLink` default href decision | `docs/projects/design-system/` |
| End-user manual | Manual, screenshots and PDF committed on `docs/user-manual` (0b8ea85, 8373fa9) | 2026-10-21 | Operator OK to push and merge | `docs/user-manual/` |

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
- [ ] ! Decide `SetupLink` default href in the Classic kit (`/setup` or `/integrations`)
- [ ] ! OK to push `design/fluid-pass` and `docs/user-manual`
- [ ] Fix Legacy `Strip` clipping long values in narrow cards (portable kit)
- [x] 2026-10-22: demo roadmap matched to the code: Statement ingestion done (`lib/statements.ts`, `/finances` upload), Auth + remote access now (login shipped, outside-network access open); unfinished Q3 items rolled into Q4
- [x] 2026-10-22: fluid pass closed (all 15 findings)
- [x] 2026-10-22: worker pool (`lib/worker-pool.ts`, `pool_runs` table) and agents board driving runs and skills
- [x] 2026-10-22: remote-access hardening and Setup → Security Remote access card
- [x] 2026-10-22: Postiz connector, Setup entry and Social panel
- [x] 2026-10-22: Railway deploy files (`Dockerfile`, `railway.json`, `/api/health`, `docs/deploy/railway.md`)
- [x] 2026-10-22: Q4 closeout checks added and run: `pnpm docker:smoke` (Railway image, login), `scripts/verify-workers.mjs`, `scripts/verify-remote.mjs`, roadmap synced
- [x] 2026-10-22: Postiz compose file added (`deploy/postiz`); config validated, stack not started
- [ ] ! Tailscale: `sudo brew services start tailscale`, `tailscale up`, then `node scripts/verify-remote.mjs` and the Remote access card commands
- [ ] ! Postiz: `sh deploy/postiz/up.sh up`, create your user at http://127.0.0.1:4007, set POSTIZ_URL and POSTIZ_API_KEY, then `node scripts/verify-postiz.mjs`
- [ ] ! Railway: install CLI, log in, OK to deploy (first public deploy), then `verify-railway.mjs` with RAILWAY_PASSWORD
- [ ] ! Gateway on the host for the worker pool: `/api/pool` reports AI_GATEWAY_API_KEY not set; set it at /integrations, then `node scripts/verify-workers.mjs`
