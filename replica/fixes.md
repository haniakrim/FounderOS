# Fixes and angle for Match & CO.

Collected 2026-10-22. There was no single "original" app on record, so the target is the category Match & CO. competes in: AI planners and operating systems for solo operators. **Motion**, **Sunsama**, **Akiflow** and **Reclaim** for reviews, plus Lindy in the Hacker News search.

## Sample

- **279 rows**: 166 Trustpilot reviews (Motion 100, Akiflow 40, Reclaim about 22, Sunsama 4) and 113 Hacker News comments. The comments come from the Algolia API and have no star rating.
- **2 platforms, not 3.** The ranker counts each Trustpilot domain as a separate source; the true count is two platforms.
  - The App Store reviews RSS returned no entries for any of the three apps (checked 2026-10-22).
  - Reddit's public JSON API refused unauthenticated requests.
  - Google Play, G2 and Capterra were not read.
- Trustpilot skews to billing anger: people go there to complain about charges. Weigh the billing themes with that in mind.
- One Motion-page review names "Motionly" and one names "Mootion AI". Trustpilot may be mixing up companies, so those two are weak evidence.
- Full ranked output: `feedback.md`. Themes file: `themes.json`.

## 1. What they hate

1. **Trial-to-annual billing traps, refusals to refund, cancel buttons that are hard to find.** 24 reviews (billing theme) plus 38 on price. 1.4 average stars, Trustpilot only.
   - "I did not realise I would be then charged a whole year in advance" (https://www.trustpilot.com/reviews/6a6329ec289a195e27d19130)
   - "Not able to cancel my subscription." (https://www.trustpilot.com/reviews/6ad72c3b9010720749f21448)
2. **Support is a bot or silent.** 27 reviews, 3 Trustpilot domains.
   - "I sent an email, but there are only AI assistants." (https://www.trustpilot.com/reviews/69b6a6b4e1275d15464a1aaf)
3. **Integrations that claim sync but are one-way or need workarounds.** About 61 matches, but many are generic HN mentions of "integration". The strong signal is about 6 Trustpilot reviews.
   - "Sync with ClickUp is not actually 2-way." (https://www.trustpilot.com/reviews/6ad63a3cc5c6b502d632d9a6)
   - "Two-way sync requires workarounds and third-party automation to function reliably." (https://www.trustpilot.com/reviews/69ac79587d01b477fb675059)
4. **AI agents that feel bolted on, or hallucinate.** 10 reviews, **thin: one platform**.
   - "The AI hallucinates a lot and give you too many action items, things that you never discussed in a meeting." (https://www.trustpilot.com/reviews/6a26910eff12b1eb1f523be5)
   - "the ai agents are useless. (who was asking for them)?" (https://www.trustpilot.com/reviews/69415bf7d1a47c2e0e0a2329)
5. **Overwhelming setup and too many features.** 9 reviews, 2 sources.
   - "it seems like it's a full-time job just adding data into the system." (https://www.trustpilot.com/reviews/69ef9198378ad51dce780029)
6. **Cannot export or delete their own data.** 5 reviews, **thin**.
   - "No possible to delete your data after subscription is over" (https://www.trustpilot.com/reviews/69b6a6b4e1275d15464a1aaf)
7. **Tools that write into your calendar without asking.** Reclaim only, **thin**.
   - "Added hundreds of focus time and lunches to my gcal (with no warning)" (https://www.trustpilot.com/reviews/6a91b9d0f830a480d32ef0f3)

## 2. What is missing

1. **A real mobile and iPad app.** 6 to 8 reviews, 2 to 3 sources.
   - "it's disappointing that there is not an ipad app or a more functional mobile app." (https://www.trustpilot.com/reviews/6951bff8f3902b104ca57734)
2. **A Claude / MCP connection.** 8 mentions, 2 sources, all from happy users asking for more.
   - "The one thing I'd love to have is a connection to Claude" (https://www.trustpilot.com/reviews/6a465fd8bb9041d51420d61a)
3. **The AI explaining why it scheduled something.** 1 review, **thin**.
   - "the scheduling AI could be more transparent about why it makes the decisions it does." (https://www.trustpilot.com/reviews/69ac79587d01b477fb675059)
4. **Subtasks and bulk task creation.** 2 reviews, **thin**.
   - "missing tons of features such as subtasks" (https://www.trustpilot.com/reviews/69b1c944b1709e7ecb9425bc)

## 3. What is unsolved

1. **Solo operators running a whole business.** Motion is pitched at teams and charges by seat. Solo users still adopt it but say it fits teams better. 8 reviews, 3 sources.
   - "I have been using it as a solopreneur but it think it works best for teams of 3 or more." (https://www.trustpilot.com/reviews/69778820eef67c231759f8e0)
   - "it actually seems more useful for project managers within companies." (https://www.trustpilot.com/reviews/69ef9198378ad51dce780029)
2. **Planning that reaches the rest of the business.** These tools plan the day; they do not run sales, content or money. Users stitch together ClickUp, Jira and Notion around them. Inferred from the integration and "single source of truth" reviews; no one names the whole job directly.

## Fix plan

| # | build or change | size | skill | evidence |
| --- | --- | --- | --- | --- |
| F1 | Honest billing: monthly by default, no trial that turns into an annual plan, an email before every renewal, cancel in one click from Settings | S | replica-launch | billing 24, price 38 |
| F2 | Export everything (SQLite plus brain folder as one zip) and "delete all my data" in Settings | S | replica-backend | data-own 5 (thin), plus the hate list |
| F3 | Sync-direction badge on every connector (read only, one-way, two-way), backed by what the connector really does (honest-or-absent) | S | replica-build | integrations about 6 strong |
| F4 | Agents show their work: every agent action and schedule change lists its sources and a one-line "why", and nothing is written to a calendar without approval | M | replica-build | ai-gimmick 10 (thin), Reclaim calendar writes |
| F5 | Match & CO. as an MCP server, so Claude can read and act on tasks, contacts and the board | M | replica-backend | claude-mcp 8 |
| F6 | Solo-first setup: one guided path, team features hidden until a second person is invited | S | replica-build | solo 8, overwhelm 9 |
| F7 | A human support path: a "write to the maker" link that reaches a real inbox, not a bot | S | replica-launch | support 27 |

## The angle

1. **Recommended.** For solo founders who are tired of team tools that bill by the seat and lock them into annual plans, Match & CO. is one operating system for the whole business: their data, their machine, billed monthly with no traps.
   - Evidence: billing plus price, 62 reviews; solo, 8 reviews across 3 sources.
2. For operators who stopped trusting AI that invents action items, Match & CO.'s agents show their sources and ask before they touch your calendar.
   - Evidence: ai-gimmick, 10 reviews. Thin: one platform.
3. For people who live in Claude, Match & CO. is the business that Claude can see: tasks, contacts and the board, over MCP.
   - Evidence: claude-mcp, 8 mentions across 2 sources, all positive users asking for it.

Do not use any competitor's name in ads, the app name or the store listing. A comparison page is a question for a lawyer.
