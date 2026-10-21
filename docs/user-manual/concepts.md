# Concepts

This page explains how FounderOS thinks. Read it once and the rest of the manual makes more sense.

## What FounderOS is

FounderOS is a personal operating system for a one-person company. You set the direction. AI agents cover the departments. Everything is stored in one local database on your machine, and every page reads from it.

## Demo data and real data

FounderOS keeps two separate datasets:

- **Demo data** lives in `demo-data/`. It is a fictional company with agents, tasks, a funnel, brand deals, social accounts and a knowledge base. FounderOS builds it on first start and refreshes it when it is about a week old.
- **Real data** lives in `data/`. It starts blank and holds your actual business.

A fresh install opens on the demo company so you see a working business instead of an empty screen. In the Settings page the demo mode is called **Filming mode**, because the demo is also used to record product videos.

Key facts:

- Switching between them only changes which folder is read. Nothing is copied, seeded or deleted.
- Demo rows never go into `data/`.
- While the demo is on, pages that read live services show scripted stand-ins, so connector badges there are not real.
- Some pages are off in the demo. For example, [Usage](system/usage-blueprint-roadmap.md#usage) reads nothing from your computer in demo mode.

Switching steps are in the [Quick start](getting-started/quick-start.md#4-switch-from-the-demo-to-your-own-data).

## Departments

Real data starts with six departments: Sales, Marketing/Growth, TECH, Finances, Communications and Clients. Agents, tasks and roadmap items belong to a department. The [org chart](features/workforce.md) shows how they fit together.

## Honest "Not configured" connectors

A connector is a link to an outside tool, such as email, Slack or Stripe. FounderOS never pretends a connection is live.

- A tool with no key shows a **Not configured** badge and a **Set up** link that takes you to the right place.
- A tool with a key that fails its check shows an error with the reason.
- Only a tool that really answers shows as live.

If a card or number is missing, the cause is usually an unconfigured connector, not a bug. See [Integrations](system/integrations.md).

## Agents

An agent is a named AI worker with a role, a department, tasks and a run history. The Agents board lists them. To chat with agents, FounderOS needs an AI key (`AI_GATEWAY_API_KEY`). Without one, agent chat says it is not configured. Details are in [Workforce](features/workforce.md).

The **Wizard** is the chat you use to run the system. A project there is a conversation.

## Optimal Engine

Optimal Engine is your knowledge base: markdown pages that FounderOS can search and connect. It appears as **Optimal Engine** under Knowledge. It uses the `gbrain` command-line tool and a store folder (by default `knowledge/brain-store`). Set `BRAIN_PROVIDER=stub` to turn it off. See [Knowledge](features/knowledge.md).

## Modules

You can switch pages off in Settings, under **Modules**. A module that is off leaves the sidebar, search and number keys. Its data is kept.

## Where your data and keys live

- Data: `data/` (real) or `demo-data/` (demo).
- Keys and password hash: `.env.local` in the project folder. This file is never committed to git.
- Keys you save in the app are shown masked, with only the last four characters, and are never shown back in full.
