/**
 * The true sync direction of every connector, read from its code (F3).
 * "Sync" is a claim competitors make loosely; here a connector is `two-way`
 * only when its code both reads from AND writes to the service.
 *
 *  read       fetches from the service; nothing is ever sent back
 *  write      only sends/creates in the service; never reads it back
 *  two-way    both reads from and writes to the service
 *  webhook-in the service (or an agent) pushes to us; we never pull or send
 */
export type SyncDirection = "read" | "write" | "two-way" | "webhook-in";

export type ConnectorSync = {
  sync: SyncDirection;
  /** The lib/connectors/*.ts modules (basename) this connector is made of. */
  files: string[];
  /** For write / two-way: the symbols in those files that send, create or update. */
  writes?: string[];
};

export const CONNECTOR_SYNC: Record<string, ConnectorSync> = {
  gbrain: { sync: "two-way", files: ["gbrain"], writes: ["capture"] },
  llm: { sync: "read", files: ["llm"] },
  whatsapp: {
    sync: "two-way",
    files: ["whatsapp", "whatsapp-send"],
    writes: ["sendWhatsAppMessage"],
  },
  zernio: { sync: "read", files: ["zernio"] },
  beehiiv: { sync: "read", files: ["beehiiv"] },
  manychat: {
    sync: "two-way",
    files: ["manychat", "manychat-webhook"],
    writes: ["sendManyChatText"],
  },
  attio: { sync: "read", files: ["attio"] },
  webinarjam: { sync: "read", files: ["webinarjam"] },
  trakyo: {
    sync: "two-way",
    files: ["trakyo"],
    writes: ["createTrakyoContent", "createTrakyoLink"],
  },
  "meta-ads": { sync: "read", files: ["meta-ads"] },
  foreplay: { sync: "read", files: ["foreplay"] },
  apify: { sync: "read", files: ["apify", "openai-stt"] },
  ghl: { sync: "read", files: ["ghl"] },
  arcads: { sync: "read", files: ["arcads"] },
  wispr: { sync: "read", files: ["wispr"] },
  "local-stack": { sync: "read", files: ["local-stack"] },
  obsidian: { sync: "read", files: ["obsidian"] },
  miro: { sync: "read", files: ["miro"] },
  email: { sync: "two-way", files: ["email"], writes: ["sendEmailReply"] },
  calendar: { sync: "read", files: ["gcal"] },
  slack: { sync: "two-way", files: ["slack"], writes: ["sendSlackMessage"] },
  postiz: { sync: "two-way", files: ["postiz"], writes: ["schedulePostizPost"] },
  payments: { sync: "read", files: ["payments"] },
  notion: { sync: "read", files: ["notion"] },
  robinhood: { sync: "webhook-in", files: ["robinhood"] },
  phantom: { sync: "read", files: ["phantom"] },
  plaud: { sync: "webhook-in", files: ["plaud"] },
  fathom: { sync: "read", files: ["fathom"] },
  superset: {
    sync: "write",
    files: ["superset"],
    writes: ["launchSupersetDraft"],
  },
};

export const SYNC_LABEL: Record<SyncDirection, string> = {
  read: "Read only",
  write: "Write only",
  "two-way": "Two-way",
  "webhook-in": "Inbound push",
};

export const SYNC_DETAIL: Record<SyncDirection, string> = {
  read: "Pulls data in. Nothing is sent back to the service.",
  write: "Sends or creates things in the service. Does not read it back.",
  "two-way": "Reads from the service and writes back to it.",
  "webhook-in": "The service pushes data to us. We do not pull or send.",
};
