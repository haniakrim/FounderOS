# Design audit: FounderOS vs Apple 17 rules

Scope: `app/globals.css` (17,667 lines), `components/g/*`, `founderos/`. Audited the GladOS kit (`:root[data-ui='glados']`, `.g-*`), the primary style. Classic/Console (`.os-*`, `.bh-*`, `.lab*`) sampled. Static read only. No browser run, so motion findings are from code, not frame-by-frame. No app code changed.

## Pass / fail per section

1. Response (kill latency): FAIL. `:active` press feedback missing on `.g-btn`, `.g-chip`, `.g-seg-opt`, `.g-tab`, `.g-pill`, `.g-side-item`, `.g-menu-item`; only legacy `.ae-o-*`, `.ib-*`, `.lab`, `.l-pressable` have it.
2. Direct manipulation: PASS (no custom drag found in sampled kit; dock resize handle is CSS-only, not audited further).
3. Interruptibility: FAIL. Sheet, drawer, dialog, popover, dock use CSS keyframes/transitions; closing unmounts instantly, nothing to grab.
4. Springs: FAIL. Everything is `cubic-bezier(0.32, 0.72, 0, 1)` plus fixed durations; no spring tokens. Dock uses 420ms where Apple sheet response is 0.3s.
5. Velocity handoff: FAIL (n/a, no gesture release code; dock handle has none).
6. Momentum projection: FAIL (n/a, same).
7. Spatial consistency: FAIL. `.g-pop` / menu has no `transform-origin`, no scale; no exit animation at all.
8. Hint in gesture direction: PASS (nothing contradicts it).
9. Rubber-banding: PASS (n/a).
10. Gesture checklist: PASS (n/a).
11. Frame-level smoothness: FAIL. 12 `transition: all`; layout properties animated (`width`, `margin-left`, `max-width`).
12. Materials and depth: FAIL. Topbar is 72% bg + 16px blur (no saturate, no top highlight) with a hard 1px divider; sheets, dialogs, popovers are opaque.
13. Multimodal feedback: PASS (restrained; no sound/haptic spam).
14. Reduced motion / accessibility: FAIL. Reduced-motion removes animation instead of crossfading; `prefers-reduced-transparency` only covers `.lab`; zero `prefers-contrast`; focus ring `--g-ring` is about 1.8:1.
15. Typography: FAIL. Px everywhere (313 px font-size, 0 rem), 26-30px headings at -0.015em, 11-11.5px labels at 0 tracking, no `font-optical-sizing`.
16. Design foundations: FAIL (partial). Raw hex in components (31 literals) violates house token rule. Rest passes.
17. Process: PASS (n/a for code).

## Top 15 findings, ranked by polish impact

### 1. No press feedback on the main controls (Rule 1)

`app/globals.css:9174` `.g-btn`, `:9201` `.g-chip`, `:9213` `.g-seg-opt`, `:9222` `.g-tab`, `:9239` `.g-pill`, `:9850` `.g-side-item`, `:9385` `.g-menu-item`, `:9116` `.g-card[data-action]`.
Add after line 9188 (before the reduced-motion block at 9429):

```css
.g-btn:active:not(:disabled),
.g-chip:active:not(:disabled),
.g-seg-opt:active,
.g-tab:active,
.g-pill:active,
.g-menu-item:active:not(:disabled),
.g-swatch-btn:active,
:root[data-ui="glados"] .os-sidebar.g-side a.g-side-item:active {
  transform: scale(0.97);
  transition-duration: 100ms;
  transition-timing-function: ease-out;
}
.g-card[data-action]:active,
.g-card-raised[data-action]:active,
.g-hero[data-action]:active,
.g-stat[data-action]:active {
  transform: scale(0.985);
  transition-duration: 100ms;
}
```

Also add `.g-chip:active, .g-seg-opt:active, .g-tab:active, .g-menu-item:active, .g-card[data-action]:active { transform: none; }` inside the reduced-motion block at 9429. Add `transform` to the `.g-chip`, `.g-seg-opt`, `.g-menu-item`, `.g-side-item` transition lists (they omit it; `.g-menu-item` has no transition at all).

### 2. Overlays unmount instantly, no exit (Rules 3, 7)

`components/g/Overlays.tsx:81` (`GSheet`: `if (!props.open) return null`), `:135` GDrawer, `:218` GDialog, `:330-345` GPopover (`{open && ...}`), CSS `app/globals.css:9364`, `:9370`, `:9375`, `:9380`.
Replace the early return with a `useExitPresence(open, 150)` hook returning `{mounted, state}`; render while `mounted`, set `data-state={open ? 'open' : 'closing'}` on `.g-sheet/.g-drawer/.g-dialog/.g-pop/.g-scrim`, unmount on `animationend` or after 150ms (skip delay under reduced motion). Never set `pointer-events` or focus lock during `closing`. CSS:

```css
.g-sheet[data-state="closing"],
.g-dialog[data-state="closing"] {
  animation: g-sheet-out 150ms var(--ease-out-mirror) both;
}
.g-drawer[data-state="closing"] {
  animation: g-drawer-out 200ms var(--ease-out-mirror) both;
}
.g-pop[data-state="closing"] {
  animation: g-pop-out 120ms var(--ease-out-mirror) both;
}
.g-scrim[data-state="closing"] {
  animation: g-fade-out 150ms linear both;
}
@keyframes g-sheet-out {
  to {
    opacity: 0;
    transform: translateY(8px) scale(0.985);
  }
}
@keyframes g-drawer-out {
  to {
    opacity: 0;
    transform: translateX(24px);
  }
}
@keyframes g-pop-out {
  to {
    opacity: 0;
    transform: scale(0.94);
  }
}
@keyframes g-fade-out {
  to {
    opacity: 0;
  }
}
```

Define `--ease-out-mirror: cubic-bezier(0.68, 0, 0.68, 0.28)` next to `--ease` at line 20 (inverse of enter curve).

### 3. Popovers and menus grow from nowhere (Rule 7)

`app/globals.css:9380` `.g-pop`, `:9424` `@keyframes g-pop-in`.
Replace `@keyframes g-pop-in` with `@keyframes g-pop-in { from { opacity: 0; transform: scale(0.94); } to { opacity: 1; transform: none; } }` and set duration to 150ms (`:9380` `160ms` becomes `150ms`). Add:

```css
.g-pop {
  transform-origin: top left;
}
.g-pop[data-align="end"] {
  transform-origin: top right;
}
.g-pop[data-side="top"] {
  transform-origin: bottom left;
}
.g-pop[data-side="top"][data-align="end"] {
  transform-origin: bottom right;
}
[dir="rtl"] .g-pop {
  transform-origin: top right;
}
[dir="rtl"] .g-pop[data-align="end"] {
  transform-origin: top left;
}
```

Dialog/sheet (`:9422`) is centered, so center origin is correct there; keep.

### 4. Focus ring fails 3:1 contrast (Rule 14)

`app/globals.css:8841` (dark `--g-ring: rgba(205, 215, 232, 0.24)` over `--g-card-2 #2a2d33` is about 1.8:1), `:8940` (light `rgba(29, 29, 31, 0.18)`). Used by every focus rule at `:9332`, `:9404`, `:9407-9411`, `:9452`, `:9565`, `:9575`, `:9625`, `:9255`.
Add tokens: dark `--g-focus: rgba(236, 242, 250, 0.85);` at 8841, light `--g-focus: rgba(29, 29, 31, 0.8);` at 8940. Then in each of those `:focus-visible` / `.g-input:focus` rules change `var(--g-ring)` to `var(--g-focus)`. Keep `--g-ring` for hairline borders.

### 5. No `prefers-reduced-transparency` for the GladOS kit (Rule 14)

Only `app/globals.css:12801` and `:12896` (`.lab`). Blurring surfaces unprotected: `:9874` `.g-topbar`, `:9363` `.g-scrim`, `:9286` `.g-ask-glass`, `:9883` `.g-palette-layer`, `:3558`, `:3633`, `:3873`, `:3952`, `:4587`, `:4616`, `:4657`, `:4724`, `:5019`, `:8706`.
Add after line 9437:

```css
@media (prefers-reduced-transparency: reduce) {
  :root[data-ui="glados"] .g-topbar {
    background: var(--g-bg);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
  .g-scrim,
  .g-palette-layer {
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
    background: var(--g-scrim-solid);
  }
  .g-ask-glass {
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
    background: var(--g-card-2);
  }
  .g-sheet,
  .g-drawer,
  .g-dialog,
  .g-pop,
  .g-palette {
    background: var(--g-card);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
}
```

Add `--g-scrim-solid: rgba(0, 0, 0, 0.7)` (dark) / `rgba(29, 29, 31, 0.4)` (light). For the legacy blur lines, one rule: `@media (prefers-reduced-transparency: reduce) { * { -webkit-backdrop-filter: none !important; backdrop-filter: none !important; } }`.

### 6. No `prefers-contrast` anywhere (Rule 14)

`grep prefers-contrast app/globals.css` returns nothing. Add after the finding-5 block:

```css
@media (prefers-contrast: more) {
  :root[data-ui="glados"] {
    --g-line: rgba(205, 215, 232, 0.4);
    --g-ring: rgba(205, 215, 232, 0.7);
    --g-muted: #cdd5e1;
    --g-dim: #a8b2c1;
  }
  :root[data-ui="glados"][data-mode="light"] {
    --g-line: rgba(29, 29, 31, 0.45);
    --g-ring: rgba(29, 29, 31, 0.75);
    --g-muted: #3a3a3f;
    --g-dim: #55555b;
  }
  .g-card,
  .g-card-raised,
  .g-sheet,
  .g-drawer,
  .g-dialog,
  .g-pop,
  .g-btn,
  .g-input {
    box-shadow: inset 0 0 0 1px var(--g-ring);
  }
}
```

### 7. Topbar: hard divider and weak material (Rule 12)

`app/globals.css:9874-9876`, `:9369` `.g-sheet-foot` (inset 1px line).
Replace `:9874` `background` with `color-mix(in srgb, var(--g-bg) 60%, transparent)`, and `backdrop-filter`/`-webkit-backdrop-filter` with `blur(20px) saturate(180%)`; replace `border-bottom: 1px solid transparent` with `border-bottom: 0; box-shadow: inset 0 1px 0 var(--g-bg-lift)`; delete `:9876`. Add:

```css
.g-topbar::after {
  content: "";
  position: absolute;
  inset: 100% 0 auto;
  height: 16px;
  pointer-events: none;
  opacity: 0;
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, var(--g-bg) 70%, transparent),
    transparent
  );
  transition: opacity var(--g-dur-colour) var(--ease);
}
:root[data-ui="glados"] .g-topbar[data-scrolled]::after {
  opacity: 1;
}
```

Same swap at `:9369`: replace `box-shadow: inset 0 1px 0 var(--g-line)` with a `::before` 12px gradient (`to top`) above the footer.

### 8. Sheets, dialogs, popovers are opaque (Rule 12)

`app/globals.css:9364` `.g-sheet` (`--g-card`), `:9375` `.g-dialog` (`--g-card-2`), `:9380` `.g-pop`, `:9370` `.g-drawer`, `:9363` scrim blur only 2px.
Add tokens `--g-mat-sheet: color-mix(in srgb, var(--g-card) 78%, transparent); --g-mat-pop: color-mix(in srgb, var(--g-card-2) 82%, transparent);`. Then `.g-sheet, .g-drawer, .g-dialog { background: var(--g-mat-sheet); -webkit-backdrop-filter: blur(28px) saturate(180%); backdrop-filter: blur(28px) saturate(180%); }`, `.g-pop { background: var(--g-mat-pop); -webkit-backdrop-filter: blur(16px) saturate(180%); backdrop-filter: blur(16px) saturate(180%); }`. Scrim: `blur(2px)` to `blur(6px)`. Never nest `.g-pop` glass on `.g-sheet` glass: `.g-sheet .g-pop, .g-drawer .g-pop { background: var(--g-card-2); backdrop-filter: none; }`. Reduced-transparency fallback is in finding 5.

### 9. Type and spacing tokens in px (Rule 15)

`app/globals.css:8899-8909` (`--g-fs-*`), `:8911-8918` (`--g-space-*`); 313 raw px `font-size` declarations elsewhere.
Replace values mechanically (16px root): `--g-fs-display: 2.75rem; --g-fs-section: 1.625rem; --g-fs-title: 1.75rem; --g-fs-card: 0.9375rem; --g-fs-body: 0.84375rem; --g-fs-cap: 0.71875rem; --g-fs-faint: 0.6875rem;` and `--g-space-1: 0.25rem; --g-space-2: 0.5rem; --g-space-3: 0.75rem; --g-space-4: 1rem; --g-space-5: 1.25rem; --g-space-6: 1.5rem; --g-space-7: 2.25rem; --g-space-8: 3rem;`. Then sed `font-size: (\d+(\.\d+)?)px` to `font-size: ${n/16}rem` in the `.g-*` rules (9090-10100). Radii may stay px.

### 10. One tracking value for all heading sizes; none on small text (Rule 15)

`app/globals.css:9100` `.g-section-title` 26px, `:9222` `.g-tab` 28px, `:9366` `.g-sheet-title` 30px, `:9372` `.g-drawer-title` 22px, `:9376` `.g-dialog-title` 22px: all `-0.015em`. `.g-display` (`:9095`) 44px `-0.02em` fine. Small text has no tracking: `.g-eyebrow` `:9106`, `.g-badge` `:9189`, `.g-tag` `:9190`, `.g-seg-opt` `:9213`, `.g-launch-dot`.
Change 26/28/30px titles to `letter-spacing: -0.02em; line-height: 1.1`; 22px titles to `-0.012em` with `line-height: 1.2` (dialog already 1.2; sheet/drawer add it). Add `letter-spacing: 0.01em` to `.g-eyebrow, .g-badge, .g-tag, .g-seg-opt, .g-section-cap, .g-menu-item, .g-crumb, .g-dock-cap`. Add `font-optical-sizing: auto;` to `body` at `:225`. Body font stays Geist (brand).

### 11. Reduced motion deletes motion instead of crossfading (Rule 14)

`app/globals.css:9433-9436` (`animation: none` for scrim, sheet, drawer, dialog, pop); `:9938` dock `transition: none`.
Replace `animation: none` on `.g-sheet, .g-drawer, .g-dialog, .g-pop, .g-palette` with `animation: g-fade 120ms linear both;` (`@keyframes g-fade` exists at `:9421`) and keep `animation: none` for spinners/orbits. For `.g-dock` at `:9938`, replace `transition: none` with `transition: opacity 120ms linear, visibility 120ms; transform: none;` and add `.g-dock:not([data-open]) { opacity: 0; }`.

### 12. `transition: all` on legacy chrome (Rule 11)

`app/globals.css:3479`, `:3521`, `:3560` (also no easing), `:3607`, `:4726` (12 total via `grep -c "transition: all"`).
Replace each with `transition: color 0.18s var(--ease), background-color 0.18s var(--ease), border-color 0.18s var(--ease), box-shadow 0.18s var(--ease), transform 0.18s var(--ease), opacity 0.18s var(--ease);` (use the listed duration per line).

### 13. Raw hex in components (house rule, Rule 16 craft)

`components/SkillHierarchy.tsx:28` (`PEARLS_CONSOLE` ten literals), `:417` and `:429` (`'#f2f6f4'`), `:525` (`'#7e8c88'`), `:315-325` (`#fff`); `components/PipelineChart.tsx:241-242` (`#fff`); `components/KnowledgeGraph.tsx:42-55` (`#3b82f6`, `#14b8a6`, `#22c55e` and mapped values), `:1730-1732`, `:2052`, `:2080-2081`, `:2094` (`#ffffff`).
Replace `'#f2f6f4'` with `'var(--text)'`, `'#7e8c88'` with `'var(--text-3)'`, `#fff` / `#ffffff` with `var(--g-on-hero)` (exists, `:8856`; for Console add `--on-ink: #ffffff` to `:root`). Move palette arrays to `--pearl-1..10` tokens in the Console block (values unchanged) and read them with `getComputedStyle`. Keep brand values; only relocate.

### 14. Dock motion is slow and not interruptible (Rules 3, 4)

`app/globals.css:9910` `.g-dock` `transition: transform var(--g-dur-arrive) var(--ease)`, 420ms; `:8924` `--g-dur-arrive: 420ms`; `:9370` `.g-drawer` 24px slide, `:9423` `g-drawer-in`.
Immediate fix: `:9910` change both `var(--g-dur-arrive)` to `var(--g-dur-sheet)` (240ms, matches Apple drawer response 0.3s). Proper fix: drive dock and drawer with Motion `animate(x, 0, { type: 'spring', bounce: 0, duration: 0.3 })` from the live `translateX`, and `{ bounce: 0.2, duration: 0.3 }` after a handle drag release with `velocity` from pointer history; set `setPointerCapture` on `.g-dock-handle` (`:9916`).

### 15. Layout properties animated (Rule 11)

`app/globals.css:2545-2552` `.os-sidebar { transition: width 220ms }`, `.os-shell { transition: margin-left 220ms, margin-right 420ms }`; `:9895` `.g-launch-label { transition: max-width 300ms, margin 300ms }`; `:9589` `height` transition on bars.
For `.g-launch-label`: keep label always laid out and animate `opacity` + `transform: translateX(-4px)` to `none` over `var(--g-dur-lift)`; toggle width with `display: none` when idle, or use `grid-template-columns: 0fr` to `1fr` transition. For sidebar/shell: set `will-change: width` only during `html.sidebar-dragging`, and change `margin-right 420ms` to `220ms` so shell edges move in step. Replace bar `height` with `transform: scaleY()` plus `transform-origin: bottom` (already set at `:9588`).
