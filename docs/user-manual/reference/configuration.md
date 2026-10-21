# Configuration reference

Every setting is an environment variable. Put them in a file called `.env.local` in the FounderOS folder (it is never committed to git). Use `.env.example` as the template: copy it to `.env.local` and fill in what you need.

- **Required?** Nothing is strictly required. FounderOS runs with an empty `.env.local`. "Required" below means required for that feature to work.
- Never share or commit real keys. The app shows saved keys masked.
- Restart FounderOS after hand-editing `.env.local`. Keys saved through the app take effect without a restart.
- Values in `<angle brackets>` are placeholders.

See also: [Settings](../system/settings.md), [Integrations](../system/integrations.md).

## Sign-in and server

| Variable | Purpose | Required? | Default |
|---|---|---|---|
| `GLADOS_PASSWORD_HASH` | Operator password hash. Written by Settings, Security. Do not set by hand. | No | none (no password) |
| `GLADOS_SESSION_SECRET` | Session secret. Written by Settings, Security. Do not set by hand. | No | none |
| `GLADOS_HOST` | Address to listen on once a password is set (a Tailscale IP, `0.0.0.0`). Refused until a password exists. | No | `127.0.0.1` |
| `PORT` | Port to serve on. | No | `4100` |
| `GLADOS_BRAND` | Empty shows FounderOS. `glados` shows the operator's own GladOS instance. | No | FounderOS |
| `GLADOS_TRUSTED_HOSTS` | Comma list of names that resolve to this machine (for example a filming alias). Ignored once a password is set. | No | none |
| `GLADOS_OPERATOR_NAME` | The name shown across the OS. | No | `Operator` |
| `GLADOS_DEFAULT_MODE` | `real` starts blank on `data/`. Otherwise a fresh install opens on the demo company. | No | demo |
| `GLADOS_DB` | Override the SQLite database path. | No | project default |
| `GLADOS_DATA_DIR` | Pins the data folder and turns the Filming switch off. | No | none |
| `DEMO_MODE` | `1` forces demo mode on, `0` forces it off for this process. Disables the Filming switch. | No | none |
| `NEXT_DIST_DIR` | Build folder. Preview uses `.next-preview`. | No | `.next` (dev), `.next-preview` (preview) |
| `GLADOS_WARM` | `0` skips the live-read cache warm-up at server start. | No | on |
| `GLADOS_SWR` | `0` turns the live-read cache off entirely. | No | on |
| `GLADOS_WRITES` | `1` allows outbound launches (Superset drafts, Trakyo links). Each still asks you to confirm. Forced off in Filming. | No | off |
| `GLADOS_CRON` | `1` runs scheduled agent jobs from this process every 60 seconds. Use on one always-on host only. Forced off in Filming. | No | off |
| `GLADOS_TZ` | Time zone for Content Lab's local times (for example `Europe/London`). | No | this machine's zone |

## Email

Up to four inboxes. Replace `n` with 1 to 4.

| Variable | Purpose | Required? | Default |
|---|---|---|---|
| `INBOX_n_HOST` | IMAP server, such as `imap.gmail.com`. | For email | none |
| `INBOX_n_USER` | Login (email address). | For email | none |
| `INBOX_n_PASS` | Password. For Gmail use an App Password. | For email | none |
| `INBOX_1_NAME` | Display name for the inbox. | No | none |
| `INBOX_1_PORT` | IMAP port. | No | `993` |
| `INBOX_n_SMTP_HOST` | SMTP server for sending replies. | No | the IMAP host with `imap.` changed to `smtp.` |
| `INBOX_n_SMTP_PORT` | SMTP port. | No | `465` |
| `COMMS_WORK_KEYWORDS` | Comma list of extra keywords (brands, key clients) that send a message to the Comms Work lane. | No | built-in work signals only |

## Messaging, recordings and social

| Variable | Purpose | Required? | Default |
|---|---|---|---|
| `SLACK_BOT_TOKEN` | Slack bot token (`xoxb-`). Scopes: `channels:read`, `channels:history`, `users:read`. | For Slack | none |
| `PLAUD_INGEST_TOKEN` | Long random string you choose. A relay sends Plaud recordings with it as a bearer token. | For Plaud | none |
| `FATHOM_API_KEY` | Fathom meeting list (read-only). | For Fathom | none |
| `VIDALYTICS_API_KEY` | Catalogue entry only. Nothing reads it yet. | No | none |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta WhatsApp Business number ID, for sending. | For sending | none |
| `WHATSAPP_ACCESS_TOKEN` | Meta WhatsApp Business access token, for sending. Reading needs no key. | For sending | none |
| `MANYCHAT_API_KEY` | ManyChat API key. | For ManyChat | none |
| `MANYCHAT_WEBHOOK_SECRET` | If set, the ManyChat webhook must send `x-manychat-secret` with this value. Leave blank only in development. | No | none |
| `BEEHIIV_API_KEY` | Beehiiv API key. | For Beehiiv | none |
| `BEEHIIV_PUBLICATION_ID` | Beehiiv publication ID (`pub_...`). Both Beehiiv variables are needed. | For Beehiiv | none |
| `ZERNIO_API_KEY` | Zernio cross-platform posting. | For Zernio | none |
| `NOTION_API_KEY` | Notion internal integration secret. Share pages with the integration. | For Notion | none |

## Payments and trading

| Variable | Purpose | Required? | Default |
|---|---|---|---|
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_live_` or `sk_test_`). | For Stripe | none |
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | PayPal credentials. | For PayPal | none |
| `SQUARE_ACCESS_TOKEN` | Square access token. | For Square | none |
| `WHOP_API_KEY` | Whop API key. | For Whop | none |
| `FANBASIS_KEY_1`, `FANBASIS_KEY_2` | FanBasis keys, one per account. | For FanBasis | none |
| `WISE_1_TOKEN`, `WISE_2_TOKEN` | Wise tokens, one per account. | For Wise | none |
| `TRADING_PUSH_TOKEN` | Long random string shared with the agent that pushes Robinhood snapshots. FounderOS never places orders. | For trading | none |
| `PHANTOM_WALLET_ADDRESS` | Public Solana address. Not a key. | For Phantom | none |
| `SOLANA_RPC_URL` | Solana RPC server. | No | `https://api.mainnet-beta.solana.com` |

## CRM, funnel and clients

| Variable | Purpose | Required? | Default |
|---|---|---|---|
| `ATTIO_API_KEY` | Attio CRM key (read-scoped). | For Attio | none |
| `GHL_API_KEY` | GoHighLevel Private Integration token. | For GoHighLevel | none |
| `GHL_LOCATION_ID` | GoHighLevel sub-account location ID. | For GoHighLevel | none |
| `WEBINARJAM_API_KEY` | WebinarJam account key. | For WebinarJam | none |
| `TRAKYO_API_KEY` | Trakyo API key. | For Trakyo | none |
| `TRAKYO_ACCOUNT_ID` | Agency keys only. | No | none |
| `SUPERSET_API_KEY` | Handed to the Superset CLI when a client draft is launched. | For Superset | none |
| `SUPERSET_BIN` | Path to the Superset CLI. | No | `superset` on your PATH |
| `SUPERSET_PROJECT_ID` | Default Superset project for launches. | No | none |
| `META_ADS_ACCESS_TOKEN` | Meta Ads access token. | For Meta Ads | none |

## Usage

| Variable | Purpose | Required? | Default |
|---|---|---|---|
| `USAGE_PUSH_TOKEN` | Long random string shared with other machines that push usage readings. | For pushing | none |
| `CLAUDE_PROJECTS_DIR` | Folder of Claude transcripts to read. | No | `~/.claude/projects` |
| `CODEX_SESSIONS_DIR` | Folder of Codex transcripts to read. | No | `~/.codex/sessions` |
| `GLADOS_USAGE_MACHINE` | This machine's name on the Usage board. | No | hostname |

## AI and knowledge

| Variable | Purpose | Required? | Default |
|---|---|---|---|
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway key. Enables agent chat and Wizard replies. | For chat | none |
| `LLM_PROVIDER` | `stub` gives deterministic offline answers for testing. | No | `gateway` |
| `LLM_MODEL` | `provider/model` routed through the gateway. | No | `anthropic/claude-sonnet-4-6` |
| `BRAIN_DIR` | The brain folder the Brain Files page maps. | No | `~/Desktop/brain`, then `~/Sync/brain` |
| `BRAIN_PROVIDER` | `stub` disables Optimal Engine. | No | `gbrain` |
| `GBRAIN_BIN` | Path to the `gbrain` CLI. | No | `gbrain` on your PATH |
| `GBRAIN_STORE` | Path to the brain store. | No | `knowledge/brain-store` |
| `GBRAIN_DISABLE_DIRECT_POOL` | Passed to the gbrain CLI. | No | `1` |
| `OBSIDIAN_VAULT` | Path to your markdown notes vault. | No | `~/Documents/Notes Vault` |

## Creative Engine

| Variable | Purpose | Required? | Default |
|---|---|---|---|
| `FOREPLAY_API_KEY` | Ad library for research and proof. Uses credits per call. | For Foreplay | none |
| `MIOSA_API_KEY` | Cloud computers on the Compute page. | For Compute | none |
| `ARCADS_BASIC_AUTH` | Arcads credentials: base64, or the full `Basic ...` value. | For Arcads | none |
| `CREATIVE_ENGINE_DRY` | `1` makes every Foreplay, Arcads and Claude call return sample data. Costs no credits; a badge is shown. | No | off |
| `CREATIVE_ENGINE_CREDIT_CAP` | Per-session Arcads credit ceiling. | No | `200` |
| `CREATIVE_ENGINE_STORE_DIR`, `CREATIVE_ENGINE_ASSET_DIR` | Override storage folders (used for tests). | No | built-in folders |

## Content Lab

Most of these are optional. Settings, Keys can write the operator names for you.

| Variable | Purpose | Required? | Default |
|---|---|---|---|
| `APIFY_API_TOKEN` | Apify token for your posts, tracked creators, discovery and Radar. The only required Lab key. | For Content Lab | none |
| `OPENAI_API_KEY` | Whisper speech-to-text. Without it, captions only. | No | none |
| `LAB_YT_CLIENT_ID`, `LAB_YT_CLIENT_SECRET` | YouTube Analytics OAuth client from Google Cloud. | For YouTube | none |
| `LAB_YT_REFRESH_TOKEN`, `LAB_YT_CHANNEL_ID`, `LAB_YT_CONNECTED_AT` | Written by Connect YouTube. Never paste. | No | none |
| `LAB_YT_REDIRECT_URI` | OAuth redirect address. | No | `http://localhost:<port>/api/lab/oauth/youtube/callback` |
| `LAB_IG_APP_ID`, `LAB_IG_APP_SECRET` | Instagram insights: your Meta app. | For Instagram | none |
| `LAB_IG_ACCESS_TOKEN`, `LAB_IG_TOKEN_EXPIRES_AT`, `LAB_IG_USER_ID` | Written by Connect Instagram, or pasted. | No | none |
| `LAB_IG_REDIRECT_URI` | OAuth redirect address. | No | `http://localhost:<port>/api/lab/oauth/instagram/callback` |
| `PRODUCTHUNT_TOKEN` | Product Hunt developer token, a Radar source. | No | none |
| `GITHUB_TOKEN` | Fine-grained token with no scopes, for the GitHub fake-star filter. | No | none |
| `LAB_APIFY_CAP_USD` | Monthly Apify spend cap in USD. 0 is off. | No | `98` |
| `LAB_APIFY_SYNC_CAP_USD` | Cap for daily sync, discovery and Google Trends. | No | `46` |
| `LAB_APIFY_SNAPSHOTS_CAP_USD` | Cap for your posts at fixed ages. | No | `22` |
| `LAB_APIFY_X_CAP_USD` | Cap for your X posts. | No | `10` |
| `LAB_APIFY_VERIFY_CAP_USD` | Cap for actor checks. | No | `1` |
| `LAB_APIFY_RADAR_X_CAP_USD` | Cap for the Radar X watch list. | No | `15` |
| `LAB_APIFY_RADAR_TIKTOK_CAP_USD` | Cap for Radar TikTok Creative Center. | No | `3` |
| `LAB_APIFY_RADAR_PRODUCTHUNT_CAP_USD` | Cap for Radar Product Hunt (actor path). | No | `1` |
| `LAB_STT_CAP_USD` | Speech-to-text cap. | No | `13` |
| `LAB_STT_CONTROLS_CAP_USD` | Whisper for comparison posts. | No | `3` |
| `LAB_COMMENTS_CAP_USD`, `LAB_DOWNLOADS_CAP_USD`, `LAB_EMBED_CAP_USD` | Caps for comments, video downloads and OpenAI embeddings. | No | `0` (off) |
| `LAB_RUN_MAX_USD` | Ceiling for one Apify run. | No | `3` |
| `LAB_COMMENTS` | `1` turns the comments line on (cap must be above 0). | No | off |
| `LAB_TIKTOK_DOWNLOADS` | `1` turns TikTok video downloads on (cap must be above 0). | No | off |
| `LAB_TIKTOK_DOWNLOAD_PRICE_USD` | Override the video-download price. | No | price book |
| `LAB_EMBED_PROVIDER` | `local` (free) or `openai`. | No | `local` |
| `LAB_FRAMES` | `1` turns frame contact sheets on. Needs `ffmpeg` and `ffprobe`. | No | off |
| `LAB_JUDGE` | `0` disables the pairwise hook judge. | No | on |
| `LAB_JUDGE_MODEL` | Model for the judge. | No | the Claude CLI default |
| `LAB_GROUNDING_CONTROL` | Share of new drafts in the control arm, 0 to 0.5. | No | `0` |
| `LAB_COMMENT_SALT` | Written once by the Lab. Never shown or pasted. | No | none |
| `LAB_X_POLL_MIN` | X watch list interval in minutes, minimum 60. Settings, Schedule overrides it. | No | `120` |
| `LAB_BRIEF_TELEGRAM` | `1` sends the morning brief through the Wizard. | No | off |
| `LAB_DRY` | `1` makes every Apify, speech and AI call return sample data, with no network. | No | off |
| `LAB_FIXTURE_SCENARIO` | Filming only: `full`, `thin`, `fresh`, `quiet`, `blocked`, `running` or `degraded`. | No | `full` |
| `LAB_SYNC_WAIT_MIN` | Minutes the sync command waits on Apify runs. | No | `20` |
| `LAB_DISSECT_MODEL` | Model for dissection. | No | the Claude CLI default |

## Agent health checks

Each falls back to a sensible default.

| Variable | Purpose | Required? | Default |
|---|---|---|---|
| `BDPILOT_STATE` | Brand-deal daemon state file. | No | `~/.config/bdpilot/state.json` |
| `BDPILOT_BOT_URL` | Brand-deal approval bot link (`https://t.me/<bot>`). Brand Deals hides its Telegram link until set. | No | none |
| `BRAND_DEALS_SKILL` | Drafting playbook skill file. | No | `~/.claude/skills/brand-deals/SKILL.md` |
| `GSEND_BIN` | Verified sender binary. | No | `~/bin/gsend` |
| `GSEND_QUEUE_PLIST` | Its queue daemon definition, if it has one. | No | none |
| `GLADOS_AUTOMATION_DIR` | Scheduled-job folder. | No | `~/Sync/brain/Automation` or `~/Desktop/brain/Automation` |
| `GLADOS_AGENT_JOB_PREFIX` | Launchd label prefix used to count agent jobs. | No | `glados.agent.` |
