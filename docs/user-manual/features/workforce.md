# Workforce

The Workforce area is where you see and direct your agents: who they are, what they are doing, what they are waiting on you for, and what work is on the board.

| Page | Address | Use it to |
|---|---|---|
| [Agents](#agents) | `/agents` | Watch the live board, message the Conductor, approve agent work |
| [Agent setup](#agent-setup) | `/agents/setup/<agent id>` | Enter the keys an agent needs |
| [Org chart](#org-chart) | `/org` | See the hierarchy, filter by venture, broadcast to every agent |
| [Chats](#chats) | `/chats` | Read and continue conversations with any agent |
| [Tasks](#tasks) | `/tasks` | Track agent work and keep your own to-do list |
| [Workflows](#workflows) | `/workflows` | Map a process as a canvas of steps and test it |
| [Skills](#skills) | `/skills` | Browse the capability library and draft a new skill |
| [Compute](#compute) | `/compute` | See the cloud computers your agents work on |

Two things apply to every page below:

- **Demo mode.** A fresh install opens on a fictional company. Everything you see is sample data and nothing real runs. Turn it off in Settings (the switch is called Filming mode). See [Settings](../system/settings.md).
- **Not configured.** When a page needs a connector you have not set up, it says so with a *Not configured* badge and a *Set up* link instead of showing made-up numbers. Connector keys are covered in [Integrations](../system/integrations.md).

---

## Agents

**What it is for.** `/agents` is the board: the live view of your agent seats, their runs, and the work moving between stages. You also talk to the Conductor here. The Conductor is the lead agent (the CEO seat) that routes work to the others.

The page title is "Real Agents". It reads a Paperclip board, which is the harness that actually runs your agents. In demo mode it reads the demo company's board instead.

### What you see

Top of the page:

- **Run Activity**, **Agent Volume**, **Runs by Seat** and **Task Lanes** cards. These summarise the last days of runs and the open stages. They use the same data the board strip below polls.
- Two buttons at top right: **Open board** (only shown when a board address is configured; opens the Paperclip board in a new tab) and **Workflows**.

Below that is one large panel with four tabs:

1. **Roster**: the live board, with the Conductor chat on the right.
2. **Needs You**: the queue of agent work waiting for your decision.
3. **Deliverables**: files the agents have produced.
4. **Hermes**: the Hermes worker-pool dashboard, embedded. It loads only the first time you open the tab.

#### Roster tab: Board live

The strip refreshes by itself every 4 seconds while the browser tab is visible.

- A header showing how many seats there are and how many are running, plus the models currently holding seats. If the board does not answer, it says "board unreachable" and shows no data. Nothing is invented.
- Five counters: **Seats**, **Running now**, **Open tasks**, **Runs - 24h**, **Heartbeats - 24h**.
- **Seat chips**, one per agent. Each shows the name, the model and adapter, and either a small spinner with elapsed time (the agent is running now) or a play button.
- **Run feed**: the most recent runs, newest first, with a status mark, the agent name, the duration and how long ago. Runs that did not finish cleanly also show their status in words.
- **Task lanes**: tasks grouped by stage (for example todo, in progress, done). An empty stage shows "nothing here". A task whose agent is running right now is marked as live.

#### Conductor chat

On the right is the Conductor panel. Type in the box ("Message the CEO...") and send. The box also lets you:

- Attach a text file (its contents are sent with your message).
- Dictate with your voice, and have the last reply read aloud.
- See which model currently holds the Conductor seat.

Your message goes into a thread on the board and wakes the Conductor. The reply appears in the same panel when it lands. The panel checks every few seconds while it waits. If the run takes long, it tells you the reply will still arrive in the thread.

#### Needs You tab

This is the queue of agent files that are asking something of you. The agents' own file names decide the kind of ask, and the queue is ordered with people waiting on you first, then deadlines. Each row shows what it is, where it came from, why it is in front of you, and a due time if the agent gave one.

Each row has these buttons:

| Kind of item | Main button | What it means |
|---|---|---|
| Staged reply | send it | The agent wrote it and is waiting for you to send it |
| Decision | go ahead | Only you can make this call |
| Gate | unblock | Work is paused until you answer |
| Request | approve | Someone asked you for something |
| Draft | publish | A draft waits for your sign-off |
| Done / output | ok | Informational; nothing is asked |

- **dismiss** drops the item.
- **snooze** hides it from your queue for two hours. Nothing is sent and no agent is told.
- **clear all** (then **dismiss all N** to confirm) dismisses everything shown. There is deliberately no bulk approve.
- **refresh** reloads the list.

Clicking a row opens a review panel on the right that renders the file (text, images and PDFs show inline; other formats offer a download). The panel has **approve**, **dismiss**, and **download** (or **open page** for a live proposal link). Press Esc to close it.

Your decision is recorded in FounderOS and clears the item from the queue. If the agent rewrites the file, it comes back for a fresh decision. After you decide, an **undo** button lets you take it back.

#### Deliverables tab

A list of the files agents produced, grouped, with markers for items that are new since you last looked or were rewritten after you read them. Use the refresh button to reload, and open any item in the same review panel. Tab badges show how many items are new or changed, and how many are waiting on you.

#### Hermes tab

Shows the Hermes dashboard in a frame, with an **Open full dashboard** link. If the frame is blank or shows an error, the dashboard process on its host may be down. The address comes from `HERMES_DASH_URL`.

### What it needs

The live board needs three settings in `.env.local`: `PAPERCLIP_API_URL`, `PAPERCLIP_BOARD_KEY` and `PAPERCLIP_COMPANY_ID`. See [Integrations](../system/integrations.md). Without them, or if the board is down, the strip reads "board unreachable", the counters are empty, and Conductor messages fail with "Message did not reach the board".

### Demo mode

The board shows the demo company's seats, runs and tasks. The Conductor chat cannot reach a real board, so a message you send will report that it did not reach the board. Approvals you make in Needs You are recorded locally in the demo data only.

### How to: message the Conductor

1. Open **Agents**.
2. On the Roster tab, click the box in the Conductor panel on the right.
3. Type what you want, or click the microphone to dictate. Attach a text file if it helps.
4. Press send. Your message appears at once and a "thinking" state shows.
5. Wait for the reply to appear in the panel. You can leave the page; the reply stays in the thread.

### How to: clear your approval queue

1. Open **Agents** and click **Needs You**.
2. Click a row to read the full file in the review panel.
3. Click **approve** (or the row's main button) to say yes, or **dismiss** to say no.
4. If you are not ready to decide, click **snooze** to hide the item for two hours.
5. Click **undo** if you decided by mistake.

### How to: run an agent now

1. On the Roster tab, find the agent's seat chip.
2. Click the play button on the chip. It asks the board to run that agent's heartbeat.
3. The chip shows a spinner and elapsed time while it runs. The result appears in the Run feed. If the board rejects the request, the chip shows "run failed".

---

## Agent setup

**What it is for.** A step-by-step page that lists what a not-yet-active agent needs before it can work. The address is `/agents/setup/<agent id>`, for example `/agents/setup/gmail-worker`. The Workflows page links to one of these (the brand deal drafter) when its rules file is missing.

### What you see

- The agent's name, status, tier, role and model, and a one-line description.
- A numbered list of steps, each of one of three kinds:
  - **Key**: a field named after an environment variable (for example `ATTIO_API_KEY`), with a hint on where to find the value and a **Save** button.
  - **Yours to do**: something only you can do outside FounderOS, sometimes with an "open" link.
  - **Build owed**: wiring that is not built yet.
- If no guide exists for the agent, the page says so.

### What you can do

Paste a key into a Key step and click **Save** (or press Enter). The key is written to `.env.local` on the machine running FounderOS and takes effect right away. The field shows whether a key is already present, in masked form. The agent only becomes active once its wiring is proven, not when the steps are filled in.

### How to: set up an agent

1. Open `/agents/setup/<agent id>` (use the agent's id; the Workflows page also links to the brand deal drafter's guide).
2. Work through the steps in order.
3. For each Key step, paste the value and click **Save**. The field then shows the key as present.
4. Do any "Yours to do" steps in the outside service they point to.
5. Return to [Agents](#agents) and check the agent's seat.

Keys are never shown in full and are never committed to git. See [Settings](../system/settings.md) for the full list of places keys can be entered.

---

## Org chart

**What it is for.** A picture of who reports to whom: you at the top, the Wizard (the super agent) below you, then each department's crew.

### What you see

- A row of **venture** buttons: **All ventures** plus one per venture you have. Choosing one lights up only the agents that serve it and dims the rest. A panel then shows that venture's executive focus and its Optimal Engine tag.
- A **Life areas** legend. Each department crew is tinted by the part of life it serves.
- The top of the tree: your name as Operator, the Wizard card, with the **Optimal Engine** card on one side and the **Comms Feed** card on the other. Both cards link to their pages.
- One column per department: its crew of lead agents (each with status dot, role and instance), the worker agents as small pills below them, and the tools that department's agents use. An empty department says agents land there as it goes live.
- Hover an agent for its description.

### What you can do

- Switch ventures with the buttons at the top.
- Open Optimal Engine or Comms from the two cards.
- **Broadcast**: the Wizard card has a box ("Chat with Wizard - reaches every agent"). Type a message and send it to broadcast to all agents. The last broadcast is kept on the card.

If the Conductor agent is missing from the database, the page shows "conductor missing" and a hint to run the seed.

### Demo mode

The org chart is built from the demo company's agents and ventures. Real installs start with the six seeded departments and no agents until you add them.

### How to: see who serves a venture

1. Open **Org chart**.
2. Click the venture name at the top.
3. Read the highlighted crews and the focus list. Agents that do not serve it fade.
4. Click **All ventures** to reset.

---

## Chats

**What it is for.** Every conversation with every agent in one place, plus the Wizard thread, which is pinned at the top.

### What you see

- A **Conversations** list on the left with a search box ("Search threads"). Pinned threads are marked.
- The thread on the right: your messages, the agent's replies, and small notes such as "read crm, email" when an agent used a tool to read your data.
- A header with the agent's name and a button: **Open Wizard** for the Wizard thread, or **Open agent** for an agent.
- A line under the header: the Wizard hands your message to the best-placed agent, and the reply also lands in that agent's thread. A direct chat is read-only: the agent can read your data but not change it.
- A message box. **Enter** sends; **Shift+Enter** adds a new line.

### What you can do

- **New chat**: top right. It switches the list to an agent picker with a search box ("Search agents"). Choose an agent to open a direct line.
- Send a message to the Wizard or to an agent. A failed send shows "Not sent" with a **Retry** button.
- When the Wizard routes your message, the answer shows "Answered by <agent>" with an **Open thread** link.
- Collapse the conversation list to a slim strip with the button at the top of the list.

### What it needs

Agent chat needs a model key: the AI Gateway key, `AI_GATEWAY_API_KEY`. Without it the message box is disabled and shows a *Not configured* badge with a *Set up* link. See [Integrations](../system/integrations.md).

### Demo mode

The threads are sample conversations, marked with a **Sample** badge, and sending is turned off ("Sample threads. Sending is off in this preview."). Nothing leaves your machine.

### How to: chat with an agent

1. Open **Chats**.
2. Click **New chat**, type part of the agent's name in the search box and click the agent. If you already have a thread with them, click it in the list instead.
3. Type your question in the message box. Ask what the agent can see, for example "What is open in my funnel?". It reads its connectors to answer.
4. Press **Enter**.
5. The agent's reply appears below. If it says "Not sent", click **Retry**.

You can also arrive here from a link that names an agent (`/chats?agent=<id>`), which opens straight on that thread.

---

## Tasks

**What it is for.** One view of all work on the board: tasks the agents are doing, tasks waiting on you, and your own to-do list.

### What you see

At the top right, a **range** pill: Last 7 days, 30 days (the default), 90 days or 12 months. Every number on the page uses this one window.

Then, from top to bottom:

1. **Five stat cards**: Total tasks (created in the range, with a change figure), In progress, Needs you (blocked until you act), Agent runtime (time agents spent running) and Overdue (past due and not done). A card shows a dash when there is nothing to measure, for example no due dates set, or no agent has run yet.
2. **Task overview**: a chart of pending and completed tasks, switchable between Daily, Monthly and Yearly.
3. **Schedule**: a day-by-day list of what is due, with arrows to move by day or by month. A day with nothing due says so.
4. **The board**: a **To-Do** list on the left (your own tasks, grouped as This week, This month, This quarter, Someday and Unsorted) and a week calendar on the right with hours down the side and a **Today** button.
5. **Workload overview**: a sortable table per agent with department and load level, with a switch to show only agents who have open work.
6. **Activity and Run outcomes**: when agents run during the week, and how many runs succeeded or failed. If no agent has run, the page says "No agent runs recorded yet".

### What you can do

- Change the range with the pill.
- **Add a to-do**: click the plus beside To-Do, pick a horizon, type "What needs doing?" and press Enter. Escape cancels.
- **Complete a to-do**: click the check beside it. It is marked done.
- **Add a to-do at a set time**: click an empty slot on the week calendar. A prompt asks for the task title.
- Sort the workload table by clicking its column heads.
- Open a task from a link such as `/tasks?task=<id>`. The board scrolls to it and shows it selected, with its owner, status and due date. If the task is gone, the page says it is no longer on the board.

Task states are Open, In progress, Blocked and Done.

### What it needs

Tasks live in FounderOS's own database, so no connector is required. Run figures come from agent runs recorded there.

### Demo mode

The page shows the demo company's tasks and run history. Tasks you add are saved to the demo data only.

### How to: add a task and hand work to an agent

The Tasks page creates tasks that you own. It has no field for assigning a task to an agent.

1. Open **Tasks**.
2. Click the plus beside **To-Do**, choose when it is due (This week to Someday), type the task and press Enter.
3. To put work on an agent, ask the Conductor on the [Agents](#agents) page, or message the agent in [Chats](#chats). Tasks that reach the board show up in the Agents page task lanes.
4. Track progress in the **Needs you**, **In progress** and **Overdue** cards.

---

## Workflows

**What it is for.** A canvas where you map a process as connected steps, each owned by a person or by a named agent, and see how much of it is human work and how much is agent work.

### What you see

- A top bar with the workflow name, a **New workflow** button, a **Version history** button and a save button that reads **Saved** or **Save changes**.
- Three tabs: **Editor**, **Executions** and **Tests**.
- The canvas with your steps and the connections between them, plus zoom, fit and undo controls.
- A **Human to agent** ratio meter. You can drag its marker to set a target ratio and double-click to clear it.
- A bottom bar with **Test workflow**, **Show chat** and a run log.

### What you can do

- **Create** a workflow and give it a name and description. Open any existing one from the workflows list.
- **Add steps** from the picker (press Cmd+K). Drag from one step's port to another to connect them. A step takes one incoming connection, and a loop back on itself is refused.
- **Bind a step** to a real roster agent, or to a person for a manual step.
- **Edit a step** in the inspector panel: duplicate it, switch it off, or mark an automation live.
- **Save** your changes. Every save is versioned; open the history to restore an older version. You can also duplicate, export as a JSON file, or delete a workflow from the menu.
- **Draft with Claude**: in the chat dock, describe the workflow you want ("Describe the workflow you want...") and a draft is offered for you to review before applying. It only fills the canvas; nothing is saved until you save. If the drafting assistant is not available on your machine, the chat says so and you build it by hand.
- **Executions** tab: recorded agent runs, with filters for All and Failed. Click a run to open its trace.
- **Tests** tab: currently says workflow tests are not built yet.

#### Test workflow actually runs agents

The **Test workflow** button runs each agent-bound step for real, one after another. A step owned by a person is not simulated; it is logged as a manual step. A step with no agent bound is skipped. Do not press it if you do not want those agents to run.

### What it needs

The canvas itself needs no connector. Some steps (the brand deal steps) read and write a rules file for the brand deal daemon. When that file is missing, those fields show *not configured* and a *Set up* link to the brand deal drafter's [agent setup](#agent-setup) page. The Draft with Claude feature needs the `claude` command-line tool on the machine running FounderOS.

### Demo mode

The demo company's workflows are shown. Saves go to the demo data only.

### How to: build a workflow

1. Open **Workflows** and click the **New workflow** button in the top bar.
2. Enter a name and an optional description, then create it.
3. Open the picker with Cmd+K and click a step type to add it. Repeat for each step.
4. Drag from a step's output port to the next step's input to connect them.
5. Click a step and use the inspector to name it and bind it to an agent or a person.
6. Click **Save changes**. The button reads **Saved** when done.
7. Optional: click **Test workflow** to run the bound agents, and watch the run log.

---

## Skills

**What it is for.** A library of the capabilities your agents can draw on. Each skill is a folder with a `SKILL.md` instruction file.

### What you see

- A search box ("Search skills"). Typing filters the cards and dims the non-matching branches in the hierarchy.
- A hierarchy of skills by domain and group, and a grid of skill cards with name, group and a short description.
- A note on where the list came from. When skills are found on the machine, it says how many were read live from `~/.claude/skills`, and opening a card shows the full `SKILL.md`. When none are found, it says it is showing the seeded catalog instead.

### What you can do

- Search, browse, and open a card to read the skill.
- **Describe a new skill**: a panel with a box ("What should this skill do?") and an optional name in kebab-case, such as `invoice-chaser`.

### What it needs

No connector. Skills are read from disk (`~/.claude/skills`). Creating a draft writes to that same folder, so it must be writable.

### Demo mode

If the machine has no skills folder, you see the seeded catalog. If it has one, you see your own real skills even in demo mode.

### How to: draft a new skill

1. Open **Skills**.
2. Open the **Describe a new skill** panel.
3. Describe what the skill should do in at least a sentence (the description needs 8 or more characters). Add a name if you want one.
4. Click **Propose placement**. It suggests where the skill belongs in your hierarchy, with up to two alternatives. This step writes nothing.
5. Pick a placement and click **Create draft skill**.
6. The page shows the new file path. The draft is only a stub. Open it and write the real instructions before first use.

---

## Compute

**What it is for.** The cloud computers your agents work on, with a live view of each desktop. It uses MIOSA as the provider. Nothing is stored in FounderOS; it reads MIOSA on every visit.

### What you see

- A **Computers** list: name, status, and size, template, resolution and region.
- A pill with your MIOSA credit balance, when MIOSA reports one.
- The selected computer's live desktop in a frame, with **Reconnect**, **Full screen** and **New tab** buttons. The desktop link is renewed automatically before it expires.
- Messages for each state: "Opening the desktop...", "This computer has no desktop.", or "This computer is <status>. Start it from MIOSA to see its desktop here."

### Not configured

Without a MIOSA key, the page shows a *Not configured* badge, "No MIOSA key on this machine." and a *Set up* link. Set `MIOSA_API_KEY` (create one with `miosa auth token create`). If MIOSA is configured but does not answer, you see "MIOSA did not answer" with the reason. If you have no machines, the page tells you to create one with `miosa computers create`.

### Demo mode

Four sample machines are listed. Live desktops are not part of the demo: connecting shows "Live desktops are not part of the demo."

### How to: view an agent's desktop

1. Set `MIOSA_API_KEY` (see [Integrations](../system/integrations.md)) and restart.
2. Open **Compute**.
3. Click a computer in the list. If it is running and has a desktop, it connects on its own.
4. Use **Full screen** or **New tab** for a bigger view, or **Reconnect** if the frame goes blank.
