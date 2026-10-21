# Design system

Started 2026-10-21. Two parts: bring FounderOS in line with the Apple
fluid-interface rules, and ship its themes and component kits as a portable kit
for new apps.

## Sources

- Rules: `app-design-defaults` skill (17 sections from the operator's Apple design guide PDF).
- Audit: `docs/design-audit.md` (17 pass/fail lines, 15 ranked findings with file:line).
- Spec: `DESIGN.md`.
- Portable kit: `~/Desktop/founderos-themes/` and the `founderos-themes` skill.

## Fluid pass (branch `design/fluid-pass`)

| Batch | Findings | State |
|---|---|---|
| 1 | 1 press feedback, 3 popover origin, 4 focus ring, 5 reduced-transparency, 6 prefers-contrast, topbar material | Done 2026-10-21 (bc1be59). Typecheck clean; vitest 4759 pass, 1 unrelated fail (untracked `.claude/skills` evidence files hold `/Users/` paths). Not yet browser-checked. |
| 2 | 2 overlay exit, 7 divider fade, 8 translucent sheets | Open |
| 3 | 9 rem scale, 10 tracking, 11 reduced-motion crossfade | Open |
| 4 | 12 `transition: all`, 13 raw hex, 14 dock timing, 15 width animation | Open |

## Portable kit (done 2026-10-21)

- `themes/`: GladOS, Classic and Legacy tokens copied verbatim, plus fluid-motion CSS.
- `kit/appearance.ts`, `kit/react`, `kit/next`, `kit/vanilla`: the same appearance model, cookie, storage keys, init script and Settings picker as FounderOS. 40 of 40 Playwright checks passed; `tsc --strict` clean.
- `kit/glados` (78 components), `kit/classic` (about 60), `kit/legacy` (47): shells, components and CSS, each with a specimen and screenshots. `tsc --strict` clean, zero console errors, no overflow at 1440 and 390.
- Not ported: page-specific screens (Creative Engine, Blueprint, AdPilot, Inbox, Wizard chat, Knowledge Graph).

## Open decisions

- Classic kit `SetupLink` default href: changed to `/setup` (FounderOS uses `/integrations`).
