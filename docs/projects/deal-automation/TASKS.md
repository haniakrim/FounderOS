# Deal automation (Phase 3 and 4 of /setup)

Decided 2026-10-24 (delegated by the operator: "do what is recommended").

## Decision: WhatsApp ingestion uses the Cloud API, not the bridge
- The Cloud API is official, runs on the VPS (https://srv2050873.hstgr.cloud) and needs no Full Disk Access on the Mac mini.
- The bridge reads `ChatStorage.sqlite` on one Mac, breaks on macOS updates and cannot run on the VPS.
- Consequence: the `whatsapp-fda` step is not needed and stays unticked. Revisit only if the Cloud API is refused.

## Build order (each agent flips `active` only when it runs for real)
1. Deal Scanner: scheduled inbound scan through the IMAP connector (`lib/connectors/email.ts`), classify each thread into a deal state (rules in `lib/brand-deal-rules.ts`), draft replies through the verified sender. Needs: `INBOX_1_PASS`, the brand-deals playbook skill.
2. Deal Alerts daemon: deal-closed and action-needed pushes to Telegram. Needs: the scanner, `DEAL_ALERTS_BOT_TOKEN` (BotFather).
3. Team daily briefing: digest from the scanner's data after the last send window. Needs: the scanner.
4. Automation jobs: reconcile, heartbeat, newsletter, operator. The plists lived on the Mac mini (`~/Sync/brain/Automation`); on the VPS use systemd timers or cron.

## Waiting on the operator
- [ ] BotFather token for the alerts bot (`DEAL_ALERTS_BOT_TOKEN`)
- [ ] Inbox app password (`INBOX_1_PASS`)
- [ ] Trakyo application (outward message; draft on request)
- [ ] Union brain store: the brand knowledge bases to fold in
