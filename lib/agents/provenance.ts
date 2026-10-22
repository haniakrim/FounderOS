/**
 * Provenance for agent results: a short "why" and the list of records, URLs
 * or files the agent used. Parsed defensively from whatever the agent hands
 * back; anything missing stays missing and the UI says "No sources given".
 * Nothing here ever invents a reason or a source.
 */

export type Provenance = { why: string | null; sources: string[] };

export const NO_SOURCES_LABEL = "No sources given";
export const NO_WHY_LABEL = "No reason given";

const MAX_WHY = 400;
const MAX_SOURCES = 12;
const MAX_SOURCE_LEN = 300;

/** Appended to prompts for agents that answer in prose. */
export const PROVENANCE_PROMPT = [
  "End your answer with a fenced block on its own lines, exactly in this shape:",
  "```provenance",
  '{"why":"one short sentence on why you gave this answer","sources":["record id, URL or file path you actually used"]}',
  "```",
  'List only sources you really read in this session. If you used none, send an empty "sources" array. Never invent a source.',
].join("\n");

const FENCE = /```provenance\s*\n([\s\S]*?)```/;

const clean = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const t = v.replace(/\s+/g, " ").trim();
  return t ? t.slice(0, max) : null;
};

/** Coerce an unknown value into a bounded, de-duplicated provenance. */
export function normalizeProvenance(raw: unknown): Provenance {
  const o =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const list = Array.isArray(o.sources) ? o.sources : [];
  const sources: string[] = [];
  for (const s of list) {
    const c = clean(s, MAX_SOURCE_LEN);
    if (c && !sources.includes(c)) sources.push(c);
    if (sources.length >= MAX_SOURCES) break;
  }
  return { why: clean(o.why, MAX_WHY), sources };
}

/** Pull the fenced block out of an agent reply. Malformed block = empty provenance, text untouched. */
export function parseProvenance(reply: string): {
  text: string;
  provenance: Provenance;
} {
  const str = typeof reply === "string" ? reply : "";
  const m = str.match(FENCE);
  if (!m) return { text: str.trim(), provenance: { why: null, sources: [] } };
  let provenance: Provenance = { why: null, sources: [] };
  try {
    provenance = normalizeProvenance(JSON.parse(m[1]));
  } catch {
    // malformed: show the reply, claim nothing
  }
  return { text: str.replace(FENCE, "").trim(), provenance };
}

export const hasProvenance = (p: Provenance | null | undefined): boolean =>
  Boolean(p && (p.why || p.sources.length));

/** Plain-text lines for surfaces that only show text (chat). Always states the gap honestly. */
export function provenanceLines(p: Provenance): string {
  return [`Why: ${p.why ?? NO_WHY_LABEL}`, `Sources: ${p.sources.length ? p.sources.join('; ') : NO_SOURCES_LABEL}`].join('\n');
}
