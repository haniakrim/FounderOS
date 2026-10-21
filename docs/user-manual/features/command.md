# Command

The Command area is where you start your day and where your messages arrive. It has three pages.

| Page | Address | Use it to |
|---|---|---|
| [Home](#home) | `/` | See the state of the whole business and jot down a task or note |
| [Wizard](#wizard) | `/wizard` | Talk to the system in plain language, and have it create tasks or run agents |
| [Comms (Inbox)](#comms-inbox) | `/inbox` | Read and answer email, Slack and WhatsApp in one list, plus the morning digest, recordings, client lanes and the week |

Three things apply to every page below:

- **Demo mode.** A fresh install opens on a fictional company. Everything you see is sample data and nothing real runs. Turn it off in Settings (the switch is called Filming mode). See [Settings](../system/settings.md).
- **Not configured.** When a page needs a connector you have not set up, it says so with a *Not configured* badge or a *Set up* link instead of showing made-up numbers. Connector keys are covered in [Integrations](../system/integrations.md).
- **Appearance.** Settings offers more than one look. The pages keep the same content and controls in each look; only the layout and styling change. This manual describes the content.

---

## Home

**What it is for.** Home is the operator console. It answers one question: is the business running, and does anything need me? Everything on it is read from your own data, and every tile is a link to the page behind it.

### What you see

**Header.** A greeting with your name. The name comes from the `GLADOS_OPERATOR_NAME` setting and falls back to "Operator". Next to it is a status pill and up to three short status phrases, for example how many agents are active and how many connectors are connected. The pill is worked out from failed agent runs and connector health. It is never a fixed "Live" label. If something is degraded, a *Set up* link appears and takes you to the guided setup.

**Five counters** (each opens the page behind it):

| Counter | What it counts | Opens |
|---|---|---|
| Systems | Connectors that are connected, out of all connectors | Integrations |
| Agents | Active agents, out of all agents | Agents |
| Inbound | Messages that arrived in the last 24 hours | Inbox |
| Runs 7d | Agent runs in the last 7 days (and how many failed) | Agents |
| Pages | Pages in your knowledge store | Brain |

**Interject bar.** A single text field under the counters. See [Use the Interject bar](#use-the-interject-bar).

**Activity chart.** By default it shows your posting activity over 90 days, stacked by platform (Instagram, TikTok, X, YouTube, LinkedIn). When there is no posting history, it falls back to inbound messages over 30 days, stacked by source (email, WhatsApp, Slack). If neither exists it says "No posting or comms history yet" with a *Set up* link to Zernio. The "View all" link opens Social or Inbox, matching the chart.

**Income strip.** Appears only when there is income data. It splits your income by processor. Live data is month to date. In demo mode it shows the demo books, year to date. Details are on [Finances](revenue.md#finances).

**Left column:**

- **Agent activity.** Runs in the last 7 days, a seven-day dot strip, an "all ok" or "N failed" tag, and when the newest run finished. If no run was ever recorded, it says so.
- **Brain freshness.** A gauge of how current your knowledge pages are: Fresh (changed in the last 30 days), Aging (31 to 89 days) and Stale (90 days or more). If the knowledge store is not found it says "Brain store not mounted" with a *Set up* link.
- **Audience.** Up to four tiles with the latest follower or subscriber count and the change since the previous reading. The email tile opens the newsletter page; the others open that platform's page. With no history it says "No audience history yet".
- **Recent runs.** The last five agent runs, with an ok or failed dot, the agent, a one-line summary and the age.

**Right column:**

- **Details.** Where your knowledge store lives (with a copy button), the number of pages, the database mode, and the port FounderOS is running on.
- **Needs you.** Tasks that are blocked until you act. It lists up to five, high priority first, then the longest waiting. Each row opens that task. A count shows how many more there are, and "See all" opens Tasks.
- **Done today.** What finished since midnight: tasks marked done and agent runs, with failed runs shown as failed. It lists up to three.
- **Agents live.** Up to four active agents, with "+N more". Each opens that agent. If none are active it says "No agents live".
- **Now.** The first items of the current roadmap quarter. Each opens the Roadmap. Hidden if the roadmap is empty.

### What you can do

- Click any counter, tile, run or agent to jump to its page.
- Type into the Interject bar to create a task, hand work to an agent, or save a note.
- Click a task under *Needs you* to open and unblock it.

Home is mostly a reading page. It does not change anything except through the Interject bar.

### Use the Interject bar

The bar understands three kinds of sentence. It uses fixed rules, not an AI model, so the result is predictable.

| You type | What happens |
|---|---|
| `tell <agent> …`, `ask <agent> …` or `@<agent> …` | A task is created and assigned to that agent. The agent is matched by name or id. |
| `note …` or `remember …` | The text is saved as a note in your knowledge store inbox, tagged `interject`. |
| Anything else (a leading `todo` or `task` is optional) | A task is created for you. |

If you name an agent that does not exist, the line becomes a plain task for you rather than a guess.

1. Click the bar. The placeholder reads "Tell an agent, add a task or note…".
2. Type at least two characters. For example: `tell Daily Briefing to summarise Friday's replies`.
3. Press Enter, or click the send arrow.
4. A confirmation appears with an **Open** link. For tasks it also offers **Undo** for about ten seconds. Click it if you sent the wrong thing.

Notes cannot be undone from the toast. Delete them from the knowledge store instead.

### Demo mode

In demo mode Home shows the fictional company: invented agents, runs, inbound messages and income. The activity chart uses the comms mix. Nothing real is read. The income strip shows the demo books.

---

## Wizard

**What it is for.** The Wizard is a chat with the system itself. Each conversation is a *project*. You say what you need in plain words. The Wizard answers, and when it plans or delegates work it can create tasks, tick tasks off, and run one of your agents. You see exactly what it did as small receipts under its reply.

### What you need

The Wizard runs on the Claude command-line tool installed on the same computer as FounderOS. It does not use a cloud key from Settings. Each message is one exchange with that tool, and the same session is resumed for the rest of the project so it remembers the conversation.

If the tool is not installed or does not answer, the Wizard says "Wizard engine unavailable on this host" instead of inventing a reply. The **Sessions** tab shows whether the tool was found.

### What you see

At the top: the title, a **Create an agent** button, the number of projects, and two tabs, **Workspace** and **Sessions**.

**Workspace tab** has three columns:

1. **Projects (left).** Your projects, split into active and done. A filter lets you show only projects that have tasks owned by one agent ("All owners" by default). A **New project** button starts a blank one.
2. **Conversation (centre).** The chat. Above the messages is a strip of the project's tasks. Each task shows its title and owner, and a circle that becomes a tick when it is done. The text box says "Ask the Wizard".
3. **Crew (right).** "Agent performance": for each agent, a row of dots for its last runs in the recent window and the percentage that succeeded. Hover a row to see the latest run. Agents you have designed but not wired up appear faded.

**Sessions tab.** The engine card (is the Claude tool present, its version, the host name), totals (sessions, projects, spend in dollars, turns) and a list of sessions, one per project that has started a conversation.

### What you can do

- Start, rename, finish and delete projects.
- Send messages. The first line you send names an untitled project (the first 60 characters).
- Click a task chip to mark it done or reopen it.
- Let the Wizard create tasks and run agents. It can only run agents that have a runtime on this machine. If one does not, the receipt says "<agent> has no runtime here". It runs at most four agents per message.
- Create an agent design with **Create an agent**.

### How to

**Ask the Wizard for something**

1. Open `/wizard`. If there are no projects, click **New project**.
2. Click the text box ("Ask the Wizard") and type what you need. Press Enter to send.
3. Wait for the reply. The page shows "Wizard is working" with the elapsed time.
4. Read the receipts under the reply. They look like "2 tasks created", "1 marked done" or "Ran <agent>".
5. Check the task strip above the chat. Click a task to tick it off when the work is done.

**Rename, finish or delete a project**

1. Open the project from the left column.
2. In the conversation header, click the project name to rename it (Enter saves, Escape cancels).
3. Click **Mark done** to finish it. A finished project shows **Reopen** instead.
4. Use the delete control next to it to remove the project. It asks you to confirm first, and it is disabled while the Wizard is working.

**Create an agent design**

1. Click **Create an agent** at the top.
2. Fill in **Name**, **Department**, **Purpose** and, optionally, **Tools** (comma separated, for example `gmail, attio`).
3. Click **File as designed**.

This files a *spec* only. The new agent appears faded in the Crew panel and on the Blueprint until someone wires it up. It does not start running, and nothing claims it does.

### Plain truth about the Wizard

- It answers in plain text. It will say so when you ask for something it cannot do from this session.
- A reply counts spend. The Sessions tab shows the running total.
- It does not send email or messages for you. Use [Comms](#comms-inbox) for that.

### Demo mode

The Wizard works the same way in demo mode, but its projects, tasks and crew history are stored with the demo data. Your real projects are untouched. The Claude tool is still required for new replies.

---

## Comms (Inbox)

**What it is for.** One place for everything people send you: email, Slack, WhatsApp and calendar meetings, in a single list with a clear "who owes whom a reply" state. Beyond threads, the same page holds a morning digest, call recordings, one lane per client Slack channel, and a week calendar. Instagram DMs have their own inbox on [Social](growth.md#instagram-dm-inbox).

### What you need

| Channel | What it needs | Without it |
|---|---|---|
| Email | An IMAP login for up to four inboxes (`INBOX_1_HOST`, `INBOX_1_USER`, `INBOX_1_PASS`, and so on up to 4) | Email shows as not connected with a *Set up* link |
| Slack | A bot token (`SLACK_BOT_TOKEN`) with read scopes | Same |
| WhatsApp (reading) | Nothing to enter. It reads the WhatsApp desktop app on this computer | Same |
| WhatsApp (replying) | A WhatsApp Business number from Meta (`WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`) | The reply bar is replaced by "Sending is not set up yet" and a *Set up WhatsApp* link |
| Meetings | A connected Google Calendar | Meetings shows as not connected |
| Recordings | `FATHOM_API_KEY` for Fathom, and `PLAUD_INGEST_TOKEN` for Plaud pushes | "No recording source is connected" |

Add the keys in [Settings](../system/settings.md) or follow the steps in [Integrations](../system/integrations.md).

### What you see

**Top bar.** A breadcrumb, a source switcher (**All**, **Email**, **Slack**, **WhatsApp**, **Meetings**, each with a count), a search box (press `/` to focus it) that searches people, subjects and channels, and a "N/4 connected" indicator.

**Report row.** A strip of small charts and counts summarising the week of comms, with a count of threads that need a reply. Click it to jump straight to the *Needs reply* queue sorted by urgency. When nothing is waiting it says "Nothing waiting on you".

**View tabs** (shown under the report row): **Threads**, **Digest**, **Recordings**, **Clients** and **Week**. The tab you choose is kept in the address (`?tab=`) so you can bookmark it. A small dot on **Digest** means there is an unread digest.

#### Threads view

Three columns:

1. **Triage (left).**
   - **Channels:** a checklist of the four sources, each with a green dot if connected and a count. A source that is not connected has a *Set up* link. Click a source to filter; click **Reset** to clear.
   - **Range:** Today, Yesterday, Last 7 days, All.
   - The queue filter: **Needs reply** (they asked something, or a priority contact is waiting on you), **Waiting on them**, **FYI** (read it, nothing to send back) and **Done** (older than three days with nothing unread).
2. **List (middle).** The threads that match your filters. Choose the order: Newest first, Oldest first or Most urgent. Most urgent weighs priority contacts first, then the queue, then unread count. An active filter shows as a chip you can click to clear. If nothing matches it says "Nothing matches these filters."
3. **Reader (right).** The whole exchange for the chosen thread, with the sender, the channel and times. WhatsApp threads load their real history, including images, voice notes (with a play button), video and documents. A calendar meeting shows When, Calendar, Where and Link instead of messages, plus a **Join** button when there is a meeting link.

At the bottom of the reader is the reply bar (when the channel can send): four quick-start chips (`/draft reply`, `/confirm time`, `/ask for details`, `/next steps`) that drop a stub sentence into the box, then the text box and a send arrow. Press Command or Control plus Enter to send.

Above the reply bar are two buttons: **Snooze** (hide the thread for 24 hours) and **Mark done** (press `e`).

#### Digest view

The morning digest is written once a day at 07:00 by the scheduled runner. It is built from your comms feed. Nothing is sent. It has lanes grouped by source and a calendar lane for today. Each entry shows time, sender and a tier badge; entries that carry over from earlier show *Held over*. A **Clear** button on an entry marks it as dealt with. Opening the tab marks the digest read.

If the runner is off on this computer, it says "Morning digest is off on this instance" and explains that it only runs where `GLADOS_CRON=1` is set on the always-on host. Before the first run it says "Today's digest arrives at 7:00."

#### Recordings view

Call recordings from Plaud and Fathom in one list, newest first. Each card shows the title, source, date, length and participants. Click a card to open its summary and an **Open transcript** link (or "No transcript link for this recording"). Fathom is pulled when you open the tab, at most once every ten minutes. If Fathom does not answer, an error line appears with a **Retry** button. Plaud does not poll. A small relay on your side pushes finished recordings in (see [Integrations](../system/integrations.md)). An empty list says "No recordings yet."

#### Clients view

One lane per confirmed client that has a Slack channel, showing the latest messages with user and age. Each lane has a **Slack** button that opens the channel. If a lane is empty it reminds you to invite the Slack bot to the channel. Without Slack it shows a *Not configured* badge. With Slack but no channels it tells you to confirm a client on [Clients](revenue.md#clients) and give it a channel.

#### Week view

A seven-day calendar grid of the next seven days from your connected calendar. Without a calendar it shows *Not configured* and "Connect a calendar and the week fills in." With an empty week it says "Nothing on the calendar in the next seven days."

### What you can do

- Filter by channel, range and queue, search, and sort.
- Read a whole thread, including media.
- Reply on Slack, WhatsApp and email (see the rules below).
- Snooze a thread for 24 hours, or mark it done. Both are saved in this browser only, so another computer or browser will not see them.
- Open the Digest, Recordings, Clients and Week views.

**How replies work, per channel**

- **Slack:** sent for real through the bot, to the thread's channel.
- **WhatsApp:** sent for real, but only if the Business number is set up. It can only answer people on the business number; free-form replies are limited by Meta to 24 hours after their last message.
- **Email:** never sent straight away. The reply becomes a draft that has to be approved before anything leaves. If the draft cannot be created, FounderOS opens a draft in your computer's mail app instead and tells you it did.

A failed send shows an honest message next to the box (for example "failed" or the error), and the text stays in the box.

### How to

**Clear your reply queue**

1. Open `/inbox`.
2. In the report row, click the *Needs reply* count. The list switches to that queue, most urgent first.
3. Click the first thread. Read it in the reader.
4. Type a reply, or click a quick chip to start one, and press Command or Control plus Enter.
5. If the reply is done and nothing else is needed, click **Mark done** (or press `e`).
6. If you cannot answer yet, click **Snooze** to hide it for 24 hours.

**Find an old conversation**

1. Press `/` to focus the search box.
2. Type a name, a subject word or a channel name.
3. Set **Range** to *All* if the thread is older than a week.

**Read the morning digest**

1. Click the **Digest** tab. The dot goes away once it is opened.
2. Read each lane. Click **Clear** on entries you have handled.

**See a call recording**

1. Click **Recordings**.
2. Click a card to open the summary, then **Open transcript** if there is one.

### Demo mode

In demo mode Comms shows a scripted week of invented messages, meetings, a digest, recordings, client lanes and a week calendar. Replies are not delivered anywhere. The channel dots show the demo connectors, which are not real.

### Sample preview on a blank install

On a real (non-demo) install that has no digest, no recordings and no client lanes yet, adding `?sample=1` to the address (`/inbox?sample=1`) previews those views with a clearly badged sample set. As soon as real data exists the sample is ignored.
