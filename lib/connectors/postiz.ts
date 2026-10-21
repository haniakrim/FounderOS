/**
 * Postiz connector: self-hosted social scheduler (replaces Postly).
 * Docs: https://docs.postiz.com/public-api/introduction and
 * https://docs.postiz.com/public-api/openapi.json
 *
 *   Base URL  POSTIZ_URL is the instance root. The public API lives under
 *             `/api/public/v1` on a self-hosted instance (the cloud host is
 *             https://api.postiz.com/public/v1). A POSTIZ_URL that already
 *             ends in `/public/v1` is used as given.
 *   Auth      `Authorization: <api key>`  (no Bearer prefix)
 *   Reads     GET /integrations                  channels
 *             GET /posts?startDate&endDate       posts in a window (required)
 *             GET /analytics/{integration}?date  channel analytics, `date` = days back
 *   Writes    POST /posts  { type: draft|schedule|now, date, shortLink, tags, posts[] }
 *
 * Writes publish to real accounts, so the route that calls schedulePostizPost
 * sits behind GLADOS_WRITES=1 and an explicit confirm. Provider-specific
 * `settings` beyond `__type` are UNVERIFIED here: some channels need extra
 * fields and answer 400, which surfaces verbatim. fetch is injectable for
 * offline tests.
 */
import { z } from 'zod';
import { resolveCred, CRED_FILES } from '@/lib/creds';
import type { ConnectorStatus } from '@/lib/connectors/types';

type Fetch = typeof fetch;

export function postizUrl(): string | undefined {
  return resolveCred('POSTIZ_URL', [CRED_FILES.agentsEnv, CRED_FILES.socialMedia])?.trim() || undefined;
}

export function postizKey(): string | undefined {
  return resolveCred('POSTIZ_API_KEY', [CRED_FILES.agentsEnv, CRED_FILES.socialMedia])?.trim() || undefined;
}

export function postizConfigured(): boolean {
  return Boolean(postizUrl() && postizKey());
}

/** The /public/v1 base for an instance URL, or null when the URL is not http(s). */
export function postizApiBase(url: string): string | null {
  const trimmed = url.trim().replace(/\/+$/, '');
  if (!/^https?:\/\/[^/\s]+/i.test(trimmed)) return null;
  return /\/public\/v1$/.test(trimmed) ? trimmed : `${trimmed}/api/public/v1`;
}

export class PostizError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

const STATUS_MESSAGES: Record<number, string> = {
  400: 'Postiz rejected the request. This channel may need provider settings.',
  401: 'Postiz rejected the API key. Check POSTIZ_API_KEY.',
  404: 'Postiz endpoint not found. Check POSTIZ_URL points at the instance root.',
  429: 'Postiz rate limit reached. Wait before retrying.',
};

type Creds = { url?: string; key?: string };

async function request(
  path: string,
  opts: { method?: 'GET' | 'POST'; query?: Record<string, string>; body?: unknown; fetchFn?: Fetch; creds?: Creds } = {},
): Promise<unknown> {
  const url = opts.creds?.url ?? postizUrl();
  const key = opts.creds?.key ?? postizKey();
  if (!url || !key) throw new PostizError('Connect Postiz in Integrations first.', 503);
  const base = postizApiBase(url);
  if (!base) throw new PostizError('POSTIZ_URL must start with http:// or https://.', 503);
  const qs = opts.query ? `?${new URLSearchParams(opts.query).toString()}` : '';
  const headers: Record<string, string> = { Authorization: key, Accept: 'application/json' };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  let res: Response;
  try {
    res = await (opts.fetchFn ?? fetch)(`${base}${path}${qs}`, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
  } catch (err) {
    console.error('[postiz] unreachable:', err instanceof Error ? err.message : String(err));
    throw new PostizError('Postiz unreachable', 502);
  }
  if (!res.ok) throw new PostizError(STATUS_MESSAGES[res.status] ?? `Postiz answered HTTP ${res.status}.`, res.status);
  try {
    return await res.json();
  } catch {
    throw new PostizError('Postiz answered with a body that is not JSON.', 502);
  }
}

const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null);
const str = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : undefined);

/* ── channels ────────────────────────────────────────────────────────── */

export type PostizChannel = { id: string; name: string; platform: string; handle?: string; picture?: string; disabled: boolean };

export function parsePostizChannels(raw: unknown): PostizChannel[] {
  if (!Array.isArray(raw)) return [];
  const out: PostizChannel[] = [];
  for (const item of raw) {
    const c = obj(item);
    const id = str(c?.id);
    if (!c || !id) continue;
    out.push({
      id,
      name: str(c.name) ?? id,
      platform: str(c.identifier) ?? 'unknown',
      handle: str(c.profile),
      picture: str(c.picture),
      disabled: c.disabled === true,
    });
  }
  return out;
}

export async function listPostizChannels(fetchFn?: Fetch, creds?: Creds): Promise<PostizChannel[]> {
  return parsePostizChannels(await request('/integrations', { fetchFn, creds }));
}

/* ── posts ───────────────────────────────────────────────────────────── */

export type PostizPostState = 'QUEUE' | 'PUBLISHED' | 'ERROR' | 'DRAFT';
export type PostizPost = {
  id: string;
  content: string;
  publishDate: string;
  state: PostizPostState | 'UNKNOWN';
  releaseUrl?: string;
  error?: string;
  channel: { id: string; name: string; platform: string };
};

const STATES = new Set(['QUEUE', 'PUBLISHED', 'ERROR', 'DRAFT']);

export function parsePostizPosts(raw: unknown): PostizPost[] {
  const arr = Array.isArray(obj(raw)?.posts) ? (obj(raw)!.posts as unknown[]) : [];
  const out: PostizPost[] = [];
  for (const item of arr) {
    const p = obj(item);
    const id = str(p?.id);
    const publishDate = str(p?.publishDate);
    if (!p || !id || !publishDate) continue;
    const integ = obj(p.integration);
    out.push({
      id,
      content: typeof p.content === 'string' ? p.content : '',
      publishDate,
      state: typeof p.state === 'string' && STATES.has(p.state) ? (p.state as PostizPostState) : 'UNKNOWN',
      releaseUrl: str(p.releaseURL),
      error: str(p.error),
      channel: { id: str(integ?.id) ?? '', name: str(integ?.name) ?? 'Unknown channel', platform: str(integ?.providerIdentifier) ?? 'unknown' },
    });
  }
  return out.sort((a, b) => a.publishDate.localeCompare(b.publishDate));
}

export async function listPostizPosts(startDate: Date, endDate: Date, fetchFn?: Fetch, creds?: Creds): Promise<PostizPost[]> {
  const raw = await request('/posts', {
    query: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
    fetchFn,
    creds,
  });
  return parsePostizPosts(raw);
}

export class PostizValidationError extends Error {}

export type PostizScheduleInput = {
  channelId: string;
  /** provider identifier of the channel (becomes settings.__type) */
  platform: string;
  content: string;
  /** ISO date-time; required for `schedule`, ignored for `now` */
  date: string;
  mode?: 'schedule' | 'now' | 'draft';
};

const ScheduleSchema = z.object({
  channelId: z.string().trim().min(1).max(200),
  platform: z.string().regex(/^[a-z0-9_-]{1,40}$/),
  content: z.string().trim().min(1).max(5000),
  date: z.string().max(100).optional(),
  mode: z.enum(['schedule', 'now', 'draft']).optional(),
});

export function validatePostizSchedule(input: Partial<PostizScheduleInput>): PostizScheduleInput {
  const parsed = ScheduleSchema.safeParse(input ?? {});
  if (!parsed.success) {
    const f = parsed.error.issues[0];
    const field = String(f?.path[0] ?? '');
    const msg: Record<string, string> = {
      channelId: 'Pick a channel.',
      platform: 'The channel platform is missing or invalid.',
      content: 'Write the post text (1 to 5000 characters).',
      mode: 'Mode must be schedule, now or draft.',
      date: 'Pick a valid date and time.',
    };
    throw new PostizValidationError(msg[field] ?? 'Invalid post.');
  }
  const { channelId, platform, content } = parsed.data;
  const mode = parsed.data.mode ?? 'schedule';
  const date = mode === 'now' ? new Date().toISOString() : parsed.data.date ?? '';
  const t = Date.parse(date);
  if (Number.isNaN(t)) throw new PostizValidationError('Pick a valid date and time.');
  if (mode === 'schedule' && t <= Date.now()) throw new PostizValidationError('Schedule time must be in the future.');
  return { channelId, platform, content, date: new Date(t).toISOString(), mode };
}

/** Create a post. Returns Postiz's `[{ postId, integration }]`. */
export async function schedulePostizPost(input: PostizScheduleInput, fetchFn?: Fetch, creds?: Creds): Promise<{ postId: string; integration: string }[]> {
  const raw = await request('/posts', {
    method: 'POST',
    fetchFn,
    creds,
    body: {
      type: input.mode ?? 'schedule',
      date: input.date,
      shortLink: false,
      tags: [],
      posts: [
        {
          integration: { id: input.channelId },
          value: [{ content: input.content, image: [] }],
          settings: { __type: input.platform },
        },
      ],
    },
  });
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((r) => {
    const o = obj(r);
    const postId = str(o?.postId);
    return o && postId ? [{ postId, integration: str(o.integration) ?? input.channelId }] : [];
  });
}

/* ── analytics ───────────────────────────────────────────────────────── */

export type PostizMetric = { label: string; latest: number | null; percentageChange: number | null; points: { date: string; total: number }[] };

export function parsePostizAnalytics(raw: unknown): PostizMetric[] {
  if (!Array.isArray(raw)) return [];
  const out: PostizMetric[] = [];
  for (const item of raw) {
    const m = obj(item);
    const label = str(m?.label);
    if (!m || !label) continue;
    const points = (Array.isArray(m.data) ? m.data : []).flatMap((d) => {
      const o = obj(d);
      const total = Number(o?.total);
      const date = str(o?.date);
      return o && date && Number.isFinite(total) ? [{ date, total }] : [];
    });
    const pct = typeof m.percentageChange === 'number' && Number.isFinite(m.percentageChange) ? m.percentageChange : null;
    out.push({ label, latest: points.length ? points[points.length - 1].total : null, percentageChange: pct, points });
  }
  return out;
}

export async function postizChannelAnalytics(channelId: string, days = 30, fetchFn?: Fetch, creds?: Creds): Promise<PostizMetric[]> {
  return parsePostizAnalytics(await request(`/analytics/${encodeURIComponent(channelId)}`, { query: { date: String(days) }, fetchFn, creds }));
}

/* ── overview for the Social page ────────────────────────────────────── */

export type PostizOverview =
  | { state: 'not_configured' }
  | { state: 'error'; message: string }
  | {
      state: 'ready';
      channels: PostizChannel[];
      upcoming: PostizPost[];
      recent: PostizPost[];
      /** per channel id; a channel whose analytics call failed is absent (never zeroed) */
      analytics: Record<string, PostizMetric[]>;
    };

const DAY = 86_400_000;

export async function loadPostizOverview(fetchFn?: Fetch, now = new Date(), creds?: Creds): Promise<PostizOverview> {
  if (!(creds ? creds.url && creds.key : postizConfigured())) return { state: 'not_configured' };
  try {
    const [channels, upcoming, recent] = await Promise.all([
      listPostizChannels(fetchFn, creds),
      listPostizPosts(now, new Date(now.getTime() + 30 * DAY), fetchFn, creds),
      listPostizPosts(new Date(now.getTime() - 30 * DAY), now, fetchFn, creds),
    ]);
    const analytics: Record<string, PostizMetric[]> = {};
    // Analytics are per channel and some platforms have none: skip failures, keep the rest.
    await Promise.all(
      channels
        .filter((c) => !c.disabled)
        .slice(0, 8)
        .map(async (c) => {
          try {
            const m = await postizChannelAnalytics(c.id, 30, fetchFn, creds);
            if (m.length) analytics[c.id] = m;
          } catch {
            /* no analytics for this channel */
          }
        }),
    );
    return { state: 'ready', channels, upcoming: upcoming.filter((p) => p.state === 'QUEUE' || p.state === 'DRAFT'), recent: recent.reverse(), analytics };
  } catch (err) {
    return { state: 'error', message: err instanceof Error ? err.message : String(err) };
  }
}

/* ── connector status ────────────────────────────────────────────────── */

export async function postizStatus(fetchFn?: Fetch): Promise<ConnectorStatus> {
  const base = { id: 'postiz', name: 'Postiz (Scheduler)', kind: 'social' } as const;
  if (!postizConfigured()) {
    return { ...base, state: 'not_configured', detail: 'Self-hosted scheduler. Set POSTIZ_URL (instance root) and POSTIZ_API_KEY (Postiz, Settings, Public API).' };
  }
  try {
    const channels = await listPostizChannels(fetchFn);
    return { ...base, state: 'connected', detail: `${channels.length} channel${channels.length === 1 ? '' : 's'}`, meta: { channels: channels.length } };
  } catch (err) {
    return { ...base, state: 'error', detail: `Postiz is configured but the API call failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}
