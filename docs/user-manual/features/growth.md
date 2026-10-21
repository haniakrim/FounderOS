# Growth

The Growth area is about getting attention and turning it into leads: your social accounts, paid ads, ad creative, a single analytics view, the Content Lab, and the pages you give away to collect leads.

| Page | Address | Use it to |
|---|---|---|
| [Social](#social) | `/social` | See audience and posting across platforms, queue posts, answer Instagram DMs |
| [Platform page](#platform-page) | `/social/<platform>` | Dig into one platform's follower history |
| [Newsletter (Beehiiv)](#newsletter-beehiiv) | `/social/beehiiv` | See your email list and past issues |
| [AdPilot](#adpilot) | `/adpilot` | Watch paid campaigns and research what ads work in your niche |
| [Creative Engine](#creative-engine) | `/creative-engine` | Turn a concept into researched angles, scripts, briefs and UGC or motion video |
| [Analytics](#analytics) | `/analytics` | One page of headline numbers across audience, money, inboxes and agents |
| [Content Lab](#content-lab) | `/lab` and six sub-pages | Learn what works in your niche and plan content that fits |
| [Lead Magnets](#lead-magnets) | `/lead-magnets` | Keep a record of the free pages that collect leads |

Three things apply to every page below:

- **Demo mode.** A fresh install opens on a fictional company. Everything you see is sample data and nothing real is read, posted or spent. Turn it off in Settings (the switch is called Filming mode). See [Settings](../system/settings.md).
- **Not configured.** When a page needs a connector you have not set up, it says so with a *Not configured* badge and a *Set up* link instead of showing made-up numbers. Connector keys are covered in [Integrations](../system/integrations.md).
- **Appearance.** Settings offers more than one look. The content and controls are the same in each; only the layout and styling change.

---

## Social

**What it is for.** The hub for your audience. It shows how many followers you have on each platform, how fast they are growing, what you have posted, and the Instagram messages waiting for a reply. It also holds the composer for queuing new posts.

### What you need

- **Zernio** (`ZERNIO_API_KEY`) for follower counts and posting history. A status chip at the top shows whether Zernio is answering. If it is not, a *Set up* link appears. Posting history that cannot be read shows "?" and "Zernio not answering", never zero.
- **ManyChat** for Instagram DMs. See [Instagram DM inbox](#instagram-dm-inbox).
- **Beehiiv** for the email list (see [Newsletter](#newsletter-beehiiv)).

### What you see

The title line gives total reach, posts in the last 30 days, posts queued and DM threads. Links at top right open Beehiiv and the Social agent.

- **Accounts.** One tile per platform (Instagram, TikTok, X, YouTube, LinkedIn) plus the email list. Each shows followers, 7-day growth and its share of total reach. Click a tile to open that [platform page](#platform-page); the email tile opens the newsletter.
- **Volume card.** Total audience with a short caption and a meter per channel.
- **Posting activity.** Posts out through Zernio in the last 30 days, as a line.
- **Platform mix.** Which platform you posted on most.
- **Needs reply.** How many Instagram DM threads are waiting on you.
- **Stat strip.** *Total reach*, *Audience growth* (with the platform that is leading), *Total DMs* and the *Instagram DMs* tile.
- **Audience over time and consistency.** A chart of combined audience with your posting days, and a pie of audience share by channel.
- **Recent posts.** Your latest posts from Zernio, newest first, with a *view* link. If Zernio has no history yet, the card shows a few sample posts and is labelled "sample". Engagement numbers are not shown for live posts, because they sit behind a paid Zernio add-on. The card never invents them.
- **Publish.** The post composer and queue.

### What you can do

- Open any platform or the newsletter.
- Read and reply to Instagram DMs.
- Queue posts.

### Instagram DM inbox

Click the *Instagram DMs* tile to open the inbox in a pop-up. It shows conversations on the left, the messages on the right, and a reply box ("Reply to <name>"; Command or Control plus Enter sends).

- A small marker on a thread means it needs a reply.
- The header says **live - manychat** once real DMs have arrived, or **seeded** before that.
- DMs arrive only when ManyChat posts them to FounderOS (`/api/webhooks/manychat`). ManyChat's own API cannot list DMs.
- A reply is sent through ManyChat for real. If it fails, you see the error ("connect ManyChat (MANYCHAT_API_KEY) to reply") and no message is stored, so the inbox never shows a reply that did not go out.
- `MANYCHAT_WEBHOOK_SECRET`, if set, must match the `x-manychat-secret` header ManyChat sends.

### Post composer and queue

1. In **Publish**, type a caption. The default platforms are Instagram and TikTok; click any of Instagram, TikTok, X, YouTube, LinkedIn to switch it on or off.
2. Add media: drag files into the drop area, click it to pick files, or paste a media URL. Files upload through Zernio. Each shows its name with a remove button.
3. Optionally set a date and time under **Schedule**.
4. Click the post button. "queued" appears with the platform count.

The post is saved in the queue with the status *queued*. The composer itself does not publish. The Social agent on the Agents page picks queued posts up and publishes them through Zernio (the note beside the button says scheduled posts go out at their time). The queue below the composer lists what is waiting, each with its platforms and either "queued" or its scheduled time.

You need a caption and at least one platform. The composer will not submit while media is still uploading.

### Demo mode

In demo mode the page shows the demo company's accounts, a seeded DM inbox and the demo posting history. Nothing is posted and replies are not sent.

---

## Platform page

**What it is for.** The detail behind one account tile, at `/social/instagram`, `/social/tiktok`, `/social/twitter`, `/social/youtube` or `/social/linkedin`.

**What you see.**

- **Follower history.** One bar per snapshot with the exact count and change on hover, plus growth badges for 7 days, 30 days, 60 days and all time. The latest snapshot and where it came from are listed below.
- **Volume card.** Current followers with a short caption.
- **Growth windows.** Percent change over 7, 30 and 60 days and all time. A window with not enough history says so instead of showing 0.
- **Daily gains.** How many of the last 30 days had a gain.
- **A 30-day change card.**
- Buttons to go back to Social and to open the profile on the platform.

If the platform is not connected, the page says "<platform> is not connected yet" with a *Set up* link. An unknown platform name gives a not-found page.

---

## Newsletter (Beehiiv)

**What it is for.** Your email list and what you have sent.

**What you need.** Both `BEEHIIV_API_KEY` and `BEEHIIV_PUBLICATION_ID`.

**What you see.** A status chip: *beehiiv live*, or *Not configured* with a *Set up* link. Without the keys the page shows a seeded preview and labels it "seeded preview - not connected to Beehiiv", so you can see the layout without trusting the numbers.

- **Sends.** Recipients across every issue, oldest to newest, as a line.
- **Volume card.** Subscriber count.
- **Open rate.** Average and the last six issues.
- **Engagement.** Total link clicks, unsubscribes and spam reports.
- **Best open.** The issue with the best open rate.
- **Issue list.** Every past issue.

---

## AdPilot

**What it is for.** Two things on one page. The top half is a deck for your paid campaigns. The bottom half is an *ad library*, a research tool that shows what ads competitors in your niche have kept running.

### What you need

- **Campaigns** appear only when an ad account is connected and synced (Meta Ads). They are never added by hand. Until then the deck says "No ad account connected" with a *Connect Meta Ads* link.
- **Ad library** needs a Foreplay key (`FOREPLAY_API_KEY`). Without it the library shows "No Foreplay key yet" and a *Set up* link.
- **Ask Adscout** needs the Claude command-line tool on this computer. Without it, an honest "unavailable" message appears.

### What you see

**Header.** A link to the [Creative Engine](#creative-engine) showing how many campaigns it holds. A status chip shows when the ad account was last synced.

**Campaign deck.**

- A globe of lead locations.
- A rail of your campaigns. Click to select one, or several, and use the filter box to narrow them.
- **Spend** over time for the selected campaigns.
- A **delivery** matrix of spend by campaign per day. Daily delivery arrives with the sync.
- A **ROAS** ring (revenue against spend).
- **Results** (leads, bookings, purchases) and **Audience** (age, gender, placements).

The numbers change with the campaigns you select. In demo mode they are staged data and the chip says so.

**Ad library**, with five tabs:

| Tab | What it is |
|---|---|
| For you | A wall of tracked ads, ranked |
| Search | Describe a concept and get proven ads for it |
| Saved | Ads you saved (your swipe file) |
| Watchlist | Brands you track |
| Activity | Signals from your watched brands |

Activity signals read: *launched* (a new ad), *proven* (it has been running long enough to count), *killed*, *scaling up* and *pulling back*.

A credits card shows your remaining Foreplay credits, when the library was last refreshed, and a **Refresh data** button.

### What you can do

- Select campaigns and read their numbers.
- **Ask Adscout** a question in plain words, for example "what's working in my niche right now?". It answers from the ads already stored on your computer, so it costs **zero** Foreplay credits.
- **Search** a concept: it expands your words into several searches against Foreplay and ranks the ads by how long they have run. Choose *Proven for* a number of days and a *Format* (all, video or image). This **spends credits**, and asks for a second click first.
- **Save** an ad, **watch** a brand, and open an ad for its full dossier: emotional drivers, hook, transcript and landing page.
- **Refresh data** pulls new ads and signals for every watched brand. It spends one call per brand and asks you to click twice (the button then reads *Confirm refresh*).

### How to

**Find ads that work in your niche**

1. Open `/adpilot` and scroll to the ad library. Check the credits card.
2. Click **Search**.
3. Describe a concept ("how to price a service for a small agency") and choose the days and format.
4. Confirm the credit spend. Results are ranked by how long ads kept running, which is the best sign an ad pays for itself.
5. Click the bookmark on any ad to save it.

**Track a competitor**

1. Click **Watchlist**.
2. Type the brand's domain (for example `brand.com`) and add it. A message says "Watching <brand>. Refresh data to pull its ads."
3. Click **Refresh data** (and confirm) to pull its ads. New launches then show up on **Activity**.
4. To stop, remove the brand. An *Undo* appears briefly.

### Demo mode

In demo mode the deck shows staged campaign data and a chip says it is not a live ad account. The library shows the demo store.

---

## Creative Engine

**What it is for.** A guided workshop for making ads. You describe an idea in a sentence. It researches proven ads, proposes angles, writes scripts, produces a brief with proof, and can make a video. It lives under AdPilot. (The old address `/ad-engine` redirects here.)

### What you need

- **Foreplay** (`FOREPLAY_API_KEY`) for research. Without it, research is off and the page says "Research needs the Foreplay key" with a *Set up* link.
- **Arcads** (`ARCADS_BASIC_AUTH`) for actors, voices and video. Without it the video screens say "Arcads is not connected" and offer **Connect Arcads**.
- The Claude command-line tool for writing angles and scripts.

### What you see

The page opens on a dashboard with two tabs, **Engine** and **Runs**, and a row of tools:

| Tool | What it does |
|---|---|
| New concept | Starts a fresh campaign in the Creative generator |
| All campaigns | Switch, rename or delete campaigns (keyboard: arrows, Enter, R to rename, Delete) |
| Creative generator | Concept, research and angles |
| Ad scripter | Writes and edits scripts |
| Briefings | Briefs with their proof tables |
| UGC video | Makes a talking-actor video |
| Motion console | A detailed control panel for generated motion video |
| Proof library | Your saved ads, watched brands and signals |
| Runs | Everything that is processing or has finished |

The Engine tab shows the current campaign, a **proof strength** gauge (the median number of days the proven ads kept running; 90 days is full marks, under 45 is "thin proof"), Arcads credits spent this month, a *Ready for you* area with scripts and briefs you can ship, and a timeline of the run in progress.

### What you can do

1. **Creative generator.** Write the idea (one sentence about the outcome your customer wants), a product and an audience. Pick a depth: *light* (4 searches), *standard* (6) or *deep* (8). The engine searches Foreplay and shows what it found. Angles are marked **Strong** (backed by proven ads) or **Plausible**. You can filter to *Proven only*, open an ad to see its transcript and landing page, tick the angles you want, and set how many ads you want. You can re-run the research live, which asks before it spends credits.
2. **Ad scripter.** Pick a framework (for example hook-show-demo-result-verdict, problem-agitate-solve, testimonial-arc), a tone, a product intro and a call to action. Click to write. A script has beats (what is said and what is on screen); you can edit any beat, ask for a rewrite with an instruction, and keep versions. Scripts contain spoken words only, no stage directions. **Approve** a version to unlock the next steps: **Make a brief**, **UGC video** and **Motion video**.
3. **Briefings.** Each brief carries its proof table and a driver fingerprint of what moves buyers.
4. **UGC video.** Choose an actor, a voice and a situation, pick an approved script and click generate. A cost panel shows your Arcads balance and your session cap. You must confirm: "Spends Arcads credits on one UGC video, charged on submit". A rejection by the content check is not refunded.
5. **Motion console.** Build a video prompt from a scene tree (parts you can hide or lock), presets and references. A **cost preview** shows exactly what Generate will send and charge before you commit. Running jobs can be abandoned (Arcads may still finish them, and nothing is refunded).
6. **Credits & health.** Foreplay and Arcads status, balance, this month's credits and the session cap. Engine settings let you set a **session credit cap** and reset the session count (with a short Undo).

### Money safety

Every action that spends credits asks first, shows the cost, and respects the session cap. If a request would pass the cap you have to choose **Pass the cap once** or cancel. The Runs list is worked out from the real status of each job, and nothing is marked done by the page itself.

### How to

**Go from idea to a script**

1. Open `/creative-engine`. Click **New concept**.
2. Type your idea, product and audience. Pick a depth. Click the generate button.
3. Read the angles. Tick two or three and click continue.
4. In the Ad scripter, pick a framework and write. Edit the beats you do not like.
5. Click **Approve** on the best version.
6. Click **Make a brief**, or **UGC video** to turn it into a video.

**Connect Arcads**

1. Click **Connect** on the Motion console, or **Connect Arcads** on the UGC screen.
2. Paste the key and click **Save**. Then click **Run the free checks** to confirm sign-in, catalog and balance.
3. Pick or create the Arcads *product* generations are filed under. Creating one asks first.

### Dry run and sample

If `CREATIVE_ENGINE_DRY=1` is set, every request returns fixtures and costs zero credits, and a badge says so. Opening `/creative-engine?sample=1` previews every widget on a fictional, read-only sample campaign that is never saved. In demo mode, requests run as fixtures and nothing is charged.

---

## Analytics

**What it is for.** One page of headline numbers from across the business, so you do not have to open six pages.

### What you see

**Metric tiles.** Each tile is a real reading from a connector or an honest *pending*. A tile is "live" only when its value is above zero.

| Tile | Source |
|---|---|
| Total audience | Zernio follower counts, with the change over 7 days |
| Subscribers | Beehiiv |
| Open Pipeline (deals) | Attio |
| Stripe Available | Stripe |
| Agent Runs | Your own run log, with runs in the last 7 days |
| Unread, all inboxes | Email |
| Brain-store Pages | Your knowledge store |
| Dictations | Wispr Flow |

A badge shows "N live, M pending". A tile that is not live moves to the **Awaiting credentials** list, with a *Set up* link to the connector that fixes it.

**Distribution.** Three donut charts: *Audience share* by channel, *Agent runs by agent*, and *Run outcomes* (succeeded or failed, with the percent ok).

**Agent run volume, 14 days.** A chart of runs per day. If there are none it says "No agent runs recorded yet" or "No runs in the last 14 days" rather than drawing a flat line.

**Audience by platform.** Each platform's followers with 7-day growth. A link opens Social.

### What you can do

Analytics is a reading page. Click a tile to open the page behind it. There are no forms.

### Demo mode

The demo company's connectors are scripted, so most tiles are live with invented values.

---

## Content Lab

**What it is for.** The Content Lab studies your niche so you stop guessing. It reads public posts from your accounts and the creators you track, works out what makes some posts break out, watches for launches you could cover early, and helps you write scripts that fit the pattern. Every prediction it makes is written down before you post and graded afterwards, so you can see whether to trust it.

It lives under `/lab` with seven pages, switched from a bar across the top: **Today**, **Radar**, **Breakouts**, **Playbook**, **Studio**, **Ledger** and **Creatorverse**.

### What you need

| Need | Why | Without it |
|---|---|---|
| Apify key (`APIFY_API_TOKEN`) | Reads public posts from your accounts and tracked creators. The only required key | The page says "Content Lab needs an Apify key" and offers **Set up** or **Preview with sample data** |
| Claude command-line tool | Writes scripts, generates ideas, judges hooks | Those buttons say "The claude CLI is not on this host" |
| OpenAI key (optional) | Speech-to-text for video transcripts | Captions only |
| YouTube and Instagram connection (optional) | Retention (where viewers left) and insights | Retention shows "Connect YouTube or Instagram in Setup" |
| Product Hunt and GitHub tokens (optional) | Extra Radar sources | Radar uses the others |

Apify, OpenAI and the optional keys are managed in the Lab's own **Setup** panel (Keys tab), not on the Settings page.

### Shared controls on every Lab page

- **Setup** (top bar) opens a side sheet with five tabs: **Checklist**, **Keys**, **Sources**, **Schedule** and **Spend**.
- **Create** offers the page's main actions: **Add source**, **New idea**, **Log a test**, **Generate ideas**, **Log an outside score**, **Run now**.
- A search pill says **Ask the Lab** and opens a question box.
- A status line shows "Synced <age> ago" or "Never synced", and this month's Apify spend against its cap.
- A banner appears when the Lab is empty ("Add your accounts to start. The first run reads your last 30 posts per account"), thin ("numbers with fewer than 5 posts behind them say 'not enough yet'") or paused.
- Every figure that rests on very few posts says **not enough yet** instead of guessing.

### Today

The overview. A brief, your own posts, launches, ideas and how the system is doing.

- Hero numbers: *Your posts vs your normal* and *Breakouts in your niche*, with a platform switch and a week or month scrubber.
- **Brief** (a one-sentence finding such as which hook form lifts breakouts in a format) and **Ask the Lab** (type a question about your niche; examples are shown). The brief needs at least eight breakouts in one format. A **Make this** button turns it into an idea.
- **Your posts**: judged at their age against your normal, so a young post is not called low.
- **Launch radar**: events with an open window.
- **Next to make**: open ideas, launches first, each with **Write script** or **Open script**.
- **Pipeline**: counts of posts *Scraped*, *Transcribed* and *Dissected*, plus spend against the cap, with a link to spend and runs.
- **Ledger** summary and a **Finish setting up** checklist.

### Radar

Watches for AI launches you could cover early. It reads Hacker News, Hugging Face, GitHub, vendor changelogs and (with keys) X, Product Hunt and TikTok Creative Center.

- **Launch timeline**: each launch with pings by source and the coverage wave once its window opens. Filter by class (*Spike*, *Adopted*, *Not classed*) and window (*Open*, *Closing*, *Closed*).
- **Topic tide**: weekly posts per topic over 12 weeks.
- **Rising topics**: timing, momentum and who has covered it.
- **Lead-time ledger**: how early Radar fires, by class and source.
- **Sources**: how many posts, creators and breakouts per source, and which you have covered.

Click a launch to see its wave, angles and sources, and create an idea from it. You can dismiss a launch. Its pings are kept so it is not created again.

### Breakouts

The posts in your niche that beat their creator's normal.

- **The Field**: a chart with breakout ratio across and depth up, with your own posts ringed. Posts fall into four quadrants: *Ideal*, *Loyal*, *Clickbait* and *Dud*.
- Filters: **Platform**, **Format**, **Quadrant**, **Days** (7, 30 or 90), **Dual-High only**, and **Mine only**. Dual-High needs age-matched ratios.
- Click a post for its sheet: Overview, Transcript, Contact sheet (the first three seconds and the rest), Metrics and Comments. You can mark a post as an *outside push*, add it to a test, or open the original.

### Playbook

What the Lab has learned, as rules with evidence.

- **Formats** to pick from, and a **Beat shape** chart: where the time goes in breakouts and in yours.
- **What lifts breakouts**: features such as hook form, opener, structure, pacing and call to action, with lift and a 90 percent interval. Only what clears the statistical bar is shown; the rest is counted as hidden.
- **Your DNA** and **Gaps**.
- **Script rules**: the rule pack checked against your own posts ("Your data agrees" or "disagrees").

It fills in after posts are dissected. Until then it says how long that should take.

### Studio

Where ideas become scripts.

- **Ideas**: grouped as *Window open*, *Early*, *No window*, *Used* and *Dismissed*. **Generate ideas** reads your breakouts and open launches and keeps the ten most different. **New idea** needs a title of at least eight characters. **Ground it** attaches real posts as support.
- **Your audience keeps asking**: questions that three people asked on two or more posts become idea seeds.
- **Selected idea**: what people think versus what is actually true, the target shape, hooks that work here, variants and grounding posts.
- **Scripts**: write a script from an idea, edit its beats, and check it against the gate. The gate blocks dashes, banned words, hedging, engagement-bait calls to action, and word counts well off budget, and runs one more model check. Nothing is shown as ready until it passes. A prediction is **frozen once** when you commit, and graded seven days after posting.
- Per idea: **Send to Creative Engine**, **Ask the Wizard**, **Mark used**, **Dismiss** (with a reason) and **Reopen**.

### Ledger

The Lab's honesty page.

- **Calibration** and **Reliability**: how often its forecasts hit.
- **Predictors** and **Predictions**: every frozen forecast, what it said, what happened, and whether it was a hit, a miss or still pending.
- **Tests**: a test compares two or three hooks on the same body, as Trial Reels (judged at 72 hours on shares per reach) or as a YouTube Test and Compare you report by hand. **Log a test** to start one. Results can confirm or contradict a Playbook rule.
- **Planner**: suggests what to test next. It opens after enough posts have 72-hour results.
- **Retention**: where viewers left (needs YouTube or Instagram connected).
- **Log an outside score**: record a score from another tool so it is graded with the rest.

### Creatorverse

A map of the creators you track, sized by audience, with links between those who cover similar ground. Search for a creator, show or hide kinds and platforms, colour by kind or platform, zoom, and go full screen. Click a creator for audience, breakouts in 30 days, posts stored and main topic, with links to their breakouts and to Setup. There is also a keyboard-friendly table of every creator.

### Setup sheet

- **Checklist**: the steps left to finish, required ones first.
- **Keys**: paste or remove each key. Each shows a state: *Connected*, *Not connected*, *Expiring*, *Error* or *Not configured*, with a **Check again** button. YouTube and Instagram connect through a sign-in flow.
- **Sources**: your own accounts (*owned*), creators you *track*, suggestions to **Track** or **Ignore**, an X *watch list*, and the Radar feeds.
- **Schedule**: every automatic job, how often it runs, a **Run now** button, and a master **Pause**.
- **Spend**: monthly caps in dollars per provider and per line, what has been spent and reserved, and a run log. A cap of 0 turns that line off.

### How to

**Start the Lab on your own accounts**

1. Open `/lab` and click **Set up**.
2. In **Keys**, paste your Apify token and save. It should turn *Connected*.
3. In **Sources**, choose Owned, pick a platform, type your handle and click **Add**. Add a few creators you admire under Tracked.
4. In **Schedule**, click **Run now** on *Daily sync*. The first run reads your last 30 posts per account.
5. In **Spend**, check the monthly cap is one you accept.
6. Return to **Today**. It fills in as posts are transcribed and dissected.

**Turn an idea into a frozen prediction**

1. Open **Studio** and select an idea, or click **Generate ideas**.
2. Click **Write script**. Read the checks.
3. Fix anything the gate flags. When it passes, freeze the prediction.
4. Post your video. Seven days later the **Ledger** grades the prediction.

### Sample preview and demo mode

Add `?sample=1` to any Lab address (for example `/lab?sample=1`) on a blank install to preview every page on badged, read-only sample data. Real data always wins over the sample once it exists. In demo mode the Lab shows its scripted world and nothing is charged.

---

## Lead Magnets

**What it is for.** A register of the free pages you give away to collect leads: what each one offers, where it lives, where its leads go and whether it is live. Nothing is published from here. It is a record.

### What you need

Nothing for the register itself. To count leads per page you would need Trakyo, but today the page does not count them (see below).

### What you see

- **Pages shipped**: a bar chart of how many went live per week over the last 12 weeks.
- **Where leads land**: the split of live pages between *Email list* and *Booking*. If nothing is live: "Nothing live yet. Set a page to Live to see where its leads go."
- **All pages**: a table with Name, What they get, Link (with a copy button), Lands, Campaign, Captures, Status and Went live. Filter chips for the four statuses: **Draft**, **Live**, **Paused**, **Archived**.
- **Captures** says "not tracked" with the reason, never 0. Without Trakyo, a *Captures not tracked* tag and a *Set up* link appear. Even with Trakyo keyed, the Trakyo API cannot count leads per landing page, so the column stays "not tracked". That is intentional and honest.

### What you can do

- **Register a page**: name, what they get (the offer), live URL (must be a secure `https` link), where leads land (Email list or Booking), the campaign it was built for, status, the date it went live and notes.
- Change a page's status straight from its row.
- **Edit** or **Delete** a row. Deleting removes the record, not the page itself.
- Copy or open the link.

### How to

**Register a lead magnet**

1. Open `/lead-magnets` and click **Register a page** (or the add button in the header).
2. Enter a name, the offer, and the live `https://` URL.
3. Choose where leads land and, if you know it, the campaign.
4. Set the status. Choose **Live** and set the date it went live if it already is.
5. Save. The row appears and the charts update.

**Use it from an agent**

The content-generation skill can register a page by posting the same fields to `/api/lead-magnets`. The record then appears here.

### Demo mode

In demo mode the page shows four invented pages with a **Sample data** badge. On a real install with no pages, add `?sample=1` to preview the same set. Buttons that would change data are disabled in demo mode.
