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
