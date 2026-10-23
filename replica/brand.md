# Brand: Match & CO.

Set by the operator on 2026-10-22. Name chosen directly, so the candidate round was skipped.

## Name checks (screening only, not legal clearance)

| check | status |
| --- | --- |
| US trademark (USPTO, classes 9 and 42) | to run |
| EU trademark (EUIPO / TMview) | to run |
| Canada (CIPO) | to run |
| WIPO Global Brand Database | to run |
| domain (matchandco.com, matchco.com) | to run |
| App Store and Play | to run |
| handles (X, Instagram, TikTok, GitHub) | to run |
| web search "Match & CO. operating system" | to run |

"Match" is crowded (Match Group). Have a trademark lawyer run a full search before spending on the name.

## What changed

- `lib/brand.ts`: both builds (`glados`, `founderos`) show `Match & CO.`; ids, env vars, cookie keys and the `GladosDb` type are unchanged so installs keep working.
- Mark: `public/brand/matchco/matchco-symbol.svg`, also `app/icon.svg` (favicon).
- Page title, login, sidebar, topbar, agent prompts, setup copy: all read `BRAND.name`.
- HTTP user agents use `BRAND.slug` (`MatchCo`), since `&` and spaces are not valid in a UA token.
- Middleware fallback page reads `BRAND.name`.

## Palette

Unchanged: the app's themes and accents already sit in `app/globals.css` tokens. The mark uses ink `#14171c`, paper `#f4efe6`, amber dot `#e2a03f`.

## Logo brief

- Idea: a monogram "M&" with a full stop dot for the "CO.", calm serif, like a firm's seal.
- Type: monogram plus wordmark.
- Must read at 16px and as a 1024px app icon.
- Deliverables: SVG, 1024x1024 app icon without transparency, favicon set, 1200x630 social image.

## Voice

Calm, not cold. Direct, not blunt. Assured, not boastful.
