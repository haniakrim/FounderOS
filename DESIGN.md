# FounderOS design spec

Derived from the GladOS kit tokens in `app/globals.css` (`:root[data-ui='glados']`, lines 8829-8927) and the Apple fluid-interface rules. Brand colours and Geist stay. Every colour is a token; no raw hex in components; no emojis. Audit that produced the deltas: `docs/design-audit.md`.

Values marked (new) do not exist yet and are defined by the audit fixes.

## 1. Type

Base: `font: 100%/1.5 var(--font-sans)` (Geist); `font-optical-sizing: auto` (new); `font-variant-numeric: tabular-nums` already on body. Sizes in rem so text scaling works. Weight 300 for display and titles, 400 body, 500 badges.

| Token            | rem / px       | Weight     | Tracking | Leading | Use                                 |
| ---------------- | -------------- | ---------- | -------- | ------- | ----------------------------------- |
| `--g-fs-display` | 2.75 / 44      | 300        | -0.02em  | 1.05    | `.g-display`                        |
| 30px title       | 1.875 / 30     | 300        | -0.02em  | 1.1     | sheet title, section `data-size=30` |
| `--g-fs-title`   | 1.75 / 28      | 300        | -0.02em  | 1.1     | tabs (anchor), page title           |
| `--g-fs-section` | 1.625 / 26     | 300        | -0.02em  | 1.1     | `.g-section-title`                  |
| 22px title       | 1.375 / 22     | 300        | -0.012em | 1.2     | drawer, dialog, dock empty          |
| `--g-fs-card`    | 0.9375 / 15    | 400        | 0        | 1.3     | card title, dock title              |
| `--g-fs-body`    | 0.84375 / 13.5 | 400        | 0        | 1.5     | body, rows, inputs                  |
| 12.5px control   | 0.78125 / 12.5 | 400        | 0        | 1.2     | `.g-btn`                            |
| `--g-fs-cap`     | 0.71875 / 11.5 | 400        | +0.01em  | 1.4     | captions, eyebrow, crumbs           |
| `--g-fs-faint`   | 0.6875 / 11    | 400 to 500 | +0.01em  | 1.3     | badges, tags, rail labels           |

Rules: tracking falls as size rises (negative at 26px and up, 0 at 13-17px, +0.01em at 12px and below). Leading falls as size rises. Emphasis by weight, not colour alone. Text over translucent surfaces: `--g-ink`, never `--g-muted`, and weight 400 minimum.

## 2. Spacing (rem)

Scale: `--g-space-1` 0.25, `-2` 0.5, `-3` 0.75, `-4` 1, `-5` 1.25, `-6` 1.5, `-7` 2.25, `-8` 3 rem. Extra stops allowed only when named: 4 rem and 6 rem for hero and page gutters. Radii (px, unchanged): card 28, nested 20, well 14, input 12, pill 999. Topbar height 3.25rem (52px). Touch rows min 2.75rem (44px), 3rem on `pointer: coarse`.

## 3. Materials

Content scrolls under chrome. Heavier material for bigger, structural surfaces. Never stack translucent on translucent.

| Token (new)          | Recipe                                                                                                                                           | Use                                             |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| `--g-mat-nav`        | `color-mix(in srgb, var(--g-bg) 60%, transparent)`, `backdrop-filter: blur(20px) saturate(180%)`, top highlight `inset 0 1px 0 var(--g-bg-lift)` | `.g-topbar`, `.g-side` when floating            |
| `--g-mat-sheet`      | `color-mix(in srgb, var(--g-card) 78%, transparent)`, `blur(28px) saturate(180%)`, `box-shadow: var(--g-shadow)`                                 | `.g-sheet`, `.g-drawer`, `.g-dialog`, `.g-dock` |
| `--g-mat-pop`        | `color-mix(in srgb, var(--g-card-2) 82%, transparent)`, `blur(16px) saturate(180%)`, `box-shadow: var(--g-shadow-sm)`                            | `.g-pop`, `.g-menu`, `.g-tip`                   |
| `--g-scrim` (exists) | `rgba(0,0,0,0.55)` dark, `rgba(29,29,31,0.22)` light, `blur(6px)`                                                                                | modal layers only                               |
| `--g-scrim-solid`    | `rgba(0,0,0,0.7)` dark, `rgba(29,29,31,0.4)` light                                                                                               | reduced transparency                            |

Dividers under sticky bars are gradient fades, not 1px lines: 16px `linear-gradient(to bottom, color-mix(in srgb, var(--g-bg) 70%, transparent), transparent)`, opacity 0 to 1 on scroll over `--g-dur-colour`. Modal tasks use a scrim; non-blocking panels (`data-modal='false'`) do not. Stacked sheets: each parent dims by `filter: brightness(0.85)` and scales to 0.97.
Materialize on enter/exit: blur radius and scale animate together (blur 0 to full, scale 0.985 to 1) with opacity.

## 4. Motion

Easing: enter `--ease: cubic-bezier(0.32, 0.72, 0, 1)`; exit mirror `--ease-out-mirror: cubic-bezier(0.68, 0, 0.68, 0.28)` (new). Durations: `--g-dur-colour` 150ms (colour, border), `--g-dur-lift` 180ms (hover lift, toggles), `--g-dur-sheet` 240ms (sheets, drawers, dock), `--g-dur-arrive` 420ms (data viz only, never chrome). Menus and popovers: 150ms in, 120ms out.

Springs (Motion / Framer Motion) for anything gesture-driven or draggable:

- Default move / reposition: `{ type: 'spring', bounce: 0, duration: 0.4 }` (damping 1.0, response 0.4s).
- Rotation: `{ bounce: 0.2, duration: 0.4 }`.
- Sheet and drawer: `{ bounce: 0.2, duration: 0.3 }` (damping 0.8, response 0.3s).
- Bounce above 0 only after a flick or drag release, with the pointer's release velocity as initial velocity.
- Momentum projection at release: `end = pos + (v / 1000) * 0.998 / (1 - 0.998)`; commit/reverse by velocity sign.
- Rubber-band past edges: `d = (o * dim * 0.55) / (dim + 0.55 * |o|)`.

Interruptibility: never lock input during a transition; always animate from the live transform; use Pointer Events with `setPointerCapture`; keep the exiting element mounted until its exit finishes (`data-state='closing'`). Origin: popovers and menus `transform-origin` at the trigger edge (top left, top right when `data-align='end'`, bottom when `data-side='top'`, flipped in RTL), scale 0.94 to 1 with fade. Sheets and dialogs grow 0.985 to 1 with 8px rise; drawers slide 24px from their edge and exit the same way.

Performance: animate only `transform` and `opacity`; no `transition: all`; no width/height/margin transitions; `will-change` only while motion is imminent.

## 5. Press feedback

On pointer-down (`:active`), not on click: `transform: scale(0.97); transition: transform 100ms ease-out;`. Large clickable surfaces (`.g-card[data-action]`, `.g-hero`, `.g-stat`): `scale(0.985)`. Hover lift (`translateY(-1px)` plus `--g-shadow`) stays, press wins over hover. Disabled controls: `opacity: 0.45`, no transform. Applies to buttons, chips, segmented options, tabs, pills, sidebar items, menu items, swatches. Hit padding about 10px on small controls (pseudo-element, not layout). Feedback for success, error, commit and snap only; no decorative flourishes.

## 6. Focus

`:focus-visible` ring: `outline: 2px solid var(--g-focus)` (new: dark `rgba(236,242,250,0.85)`, light `rgba(29,29,31,0.8)`, at least 3:1 on every surface), offset 2px (inset -2px on cards, rows and segmented options). Never `outline: none` without an equivalent ring. `--g-ring` stays for hairlines.

## 7. Accessibility media rules

`prefers-reduced-motion: reduce`: slides, springs, parallax, hover lifts and press scale become a 120ms opacity crossfade (`animation: g-fade 120ms linear both`); no overshoot (bounce 0); keep colour and opacity state changes; spinners keep rotating but slow orbits and pulses stop; no loops under 5s per cycle; no full-viewport moving backgrounds.

`prefers-reduced-transparency: reduce`: `backdrop-filter: none`; `--g-mat-nav`, `--g-mat-sheet`, `--g-mat-pop` resolve to `var(--g-bg)` / `var(--g-card)` / `var(--g-card-2)` (opaque); scrim uses `--g-scrim-solid`; legacy blurred glass (`.glass-*`, `--glass-*`) also goes solid.

`prefers-contrast: more`: near-solid surfaces plus a 1px defined border (`inset 0 0 0 1px var(--g-ring)`); raise `--g-line` to 0.4 alpha, `--g-ring` to 0.7, `--g-muted` and `--g-dim` to at least 7:1 on `--g-bg`; drop shadows that carry the only separation.

Also: no abrupt brightness jumps; state is never conveyed by colour alone (dot plus word); coarse pointers get 40px icon buttons, 48px rows, 36px segmented options (already in `@media (pointer: coarse)`).
