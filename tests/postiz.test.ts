import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => {} }) }));
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import {
  PostizValidationError,
  loadPostizOverview,
  parsePostizAnalytics,
  parsePostizChannels,
  parsePostizPosts,
  postizApiBase,
  postizChannelAnalytics,
  postizStatus,
  schedulePostizPost,
  validatePostizSchedule,
} from '@/lib/connectors/postiz';
import { PostizPanel } from '@/founderos/components/PostizPanel';
import { INTEGRATIONS, setupHrefFor } from '@/lib/integrations-catalog';

const creds = { url: 'https://postiz.example.com/', key: 'k-123' };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status });
const CHANNELS = [
  { id: 'c1', name: 'Founder X', identifier: 'x', profile: 'founder', disabled: false },
  { id: 'c2', name: 'Old', identifier: 'linkedin', disabled: true },
];
const POSTS = {
  posts: [
    { id: 'p1', content: 'hello', publishDate: '2099-01-02T10:00:00.000Z', state: 'QUEUE', integration: { id: 'c1', providerIdentifier: 'x', name: 'Founder X' } },
    { id: 'p0', content: 'old', publishDate: '2020-01-02T10:00:00.000Z', state: 'ERROR', error: 'boom', integration: { id: 'c1', providerIdentifier: 'x', name: 'Founder X' } },
  ],
};
const ANALYTICS = [{ label: 'Followers', data: [{ total: '10', date: '2026-01-01' }, { total: '12', date: '2026-01-02' }], percentageChange: 20 }];

afterEach(() => {
  delete process.env.POSTIZ_URL;
  delete process.env.POSTIZ_API_KEY;
});

describe('postiz client', () => {
  it('builds the public API base', () => {
    expect(postizApiBase('https://p.example.com/')).toBe('https://p.example.com/api/public/v1');
    expect(postizApiBase('https://api.postiz.com/public/v1')).toBe('https://api.postiz.com/public/v1');
    expect(postizApiBase('ftp://x')).toBeNull();
  });

  it('sends the raw key in Authorization and parses channels', async () => {
    let seen: { url: string; auth: string | null } | null = null;
    const f = (async (url: string, init: RequestInit) => {
      seen = { url, auth: new Headers(init.headers).get('Authorization') };
      return json(CHANNELS);
    }) as unknown as typeof fetch;
    const { listPostizChannels } = await import('@/lib/connectors/postiz');
    const ch = await listPostizChannels(f, creds);
    expect(seen).toEqual({ url: 'https://postiz.example.com/api/public/v1/integrations', auth: 'k-123' });
    expect(ch.map((c) => c.platform)).toEqual(['x', 'linkedin']);
    expect(parsePostizChannels({})).toEqual([]);
  });

  it('parses posts and analytics defensively', () => {
    expect(parsePostizPosts(POSTS).map((p) => p.id)).toEqual(['p0', 'p1']);
    expect(parsePostizPosts(null)).toEqual([]);
    expect(parsePostizAnalytics(ANALYTICS)[0]).toMatchObject({ label: 'Followers', latest: 12, percentageChange: 20 });
    expect(parsePostizAnalytics('x')).toEqual([]);
  });

  it('posts the documented schedule body', async () => {
    let body: any;
    const f = (async (_u: string, init: RequestInit) => {
      body = JSON.parse(String(init.body));
      return json([{ postId: 'n1', integration: 'c1' }]);
    }) as unknown as typeof fetch;
    const input = validatePostizSchedule({ channelId: 'c1', platform: 'x', content: ' hi ', date: '2099-01-01T00:00:00Z' });
    const out = await schedulePostizPost(input, f, creds);
    expect(out).toEqual([{ postId: 'n1', integration: 'c1' }]);
    expect(body).toMatchObject({ type: 'schedule', shortLink: false, tags: [], posts: [{ integration: { id: 'c1' }, value: [{ content: 'hi', image: [] }], settings: { __type: 'x' } }] });
  });

  it('validates input', () => {
    expect(() => validatePostizSchedule({ platform: 'x', content: 'a', date: '2099-01-01' })).toThrow(PostizValidationError);
    expect(() => validatePostizSchedule({ channelId: 'c', platform: 'x', content: '', date: '2099-01-01' })).toThrow('Write');
    expect(() => validatePostizSchedule({ channelId: 'c', platform: 'x', content: 'a', date: '2001-01-01' })).toThrow('future');
  });

  it('maps HTTP errors to honest messages', async () => {
    const f = (async () => json({}, 401)) as unknown as typeof fetch;
    await expect(postizChannelAnalytics('c1', 7, f, creds)).rejects.toThrow('API key');
  });

  it('overview: not_configured without creds, ready with them, error on failure', async () => {
    expect(await loadPostizOverview()).toEqual({ state: 'not_configured' });
    const f = (async (url: string) => {
      if (url.includes('/integrations')) return json(CHANNELS);
      if (url.includes('/analytics/c1')) return json(ANALYTICS);
      return json(POSTS);
    }) as unknown as typeof fetch;
    const o = await loadPostizOverview(f, new Date('2026-06-01T00:00:00Z'), creds);
    expect(o.state).toBe('ready');
    if (o.state === 'ready') {
      expect(o.channels).toHaveLength(2);
      expect(o.analytics.c1[0].label).toBe('Followers');
      expect(o.analytics.c2).toBeUndefined(); // disabled channel never queried or zeroed
      expect(o.upcoming.every((p) => p.state === 'QUEUE')).toBe(true);
    }
    const bad = (async () => json({}, 500)) as unknown as typeof fetch;
    expect((await loadPostizOverview(bad, new Date(), creds)).state).toBe('error');
  });

  it('status is Not configured without keys', async () => {
    expect((await postizStatus()).state).toBe('not_configured');
  });
});

describe('postiz registry and page states', () => {
  it('is in the catalogue with both env keys and a setup href', () => {
    const e = INTEGRATIONS.find((i) => i.slug === 'postiz');
    expect(e).toMatchObject({ connectorId: 'postiz', envKeys: ['POSTIZ_URL', 'POSTIZ_API_KEY'] });
    expect(setupHrefFor('postiz')).toBe('/integrations#postiz');
  });

  it('panel: unconfigured shows Not configured + Set up', () => {
    const html = renderToStaticMarkup(createElement(PostizPanel, { overview: { state: 'not_configured' }, setupHref: '/integrations#postiz', writes: false }));
    expect(html).toContain('Not configured');
    expect(html).toContain('Set up');
    expect(html).toContain('/integrations#postiz');
  });

  it('panel: error state names the failure', () => {
    const html = renderToStaticMarkup(createElement(PostizPanel, { overview: { state: 'error', message: 'HTTP 500' }, setupHref: '/x', writes: false }));
    expect(html).toContain('HTTP 500');
  });

  it('panel: ready lists channels, scheduled posts, analytics and the schedule form', () => {
    const html = renderToStaticMarkup(
      createElement(PostizPanel, {
        setupHref: '/x',
        writes: true,
        overview: {
          state: 'ready',
          channels: parsePostizChannels(CHANNELS),
          upcoming: parsePostizPosts(POSTS).filter((p) => p.state === 'QUEUE'),
          recent: parsePostizPosts(POSTS).filter((p) => p.state === 'ERROR'),
          analytics: { c1: parsePostizAnalytics(ANALYTICS) },
        },
      }),
    );
    expect(html).toContain('Founder X');
    expect(html).toContain('Followers 12');
    expect(html).toContain('hello');
    expect(html).toContain('failed: boom');
    expect(html).toContain('Schedule');
  });
});
