import type { PostizOverview } from '@/lib/connectors/postiz';
import { SlabCard, Chip } from '@/founderos/components/slab';
import { SetupLink } from '@/components/SetupLink';
import { PostizScheduleForm } from '@/founderos/components/PostizScheduleForm';

function when(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/** Postiz: channels, scheduled posts, post history and channel analytics.
    Unconfigured shows the honest empty state with a Set up link; nothing is invented. */
export function PostizPanel({ overview, setupHref, writes, i = 10 }: { overview: PostizOverview; setupHref: string; writes: boolean; i?: number }) {
  if (overview.state === 'not_configured') {
    return (
      <SlabCard i={i} title="Postiz" sub="scheduler" className="mt-6" action={<Chip>Not configured</Chip>}>
        <div className="flex flex-col items-start gap-3 px-6 pb-6 pt-4">
          <p className="text-[13px] text-os-muted">Connect a self-hosted Postiz to see channels, scheduled posts and channel analytics here, and to schedule posts.</p>
          <SetupLink href={setupHref} hint="Set POSTIZ_URL and POSTIZ_API_KEY" />
        </div>
      </SlabCard>
    );
  }
  if (overview.state === 'error') {
    return (
      <SlabCard i={i} title="Postiz" sub="scheduler" className="mt-6" action={<Chip tone="err">Error</Chip>}>
        <div className="flex flex-col items-start gap-3 px-6 pb-6 pt-4">
          <p className="text-[13px] text-os-muted">Postiz did not answer: {overview.message}</p>
          <SetupLink href={setupHref} label="Check settings" />
        </div>
      </SlabCard>
    );
  }
  const { channels, upcoming, recent, analytics } = overview;
  const active = channels.filter((c) => !c.disabled);
  return (
    <SlabCard i={i} title="Postiz" sub={`${channels.length} channels · ${upcoming.length} scheduled`} className="mt-6" action={<Chip tone="ok">Connected</Chip>}>
      <div className="grid grid-cols-3 gap-6 px-6 pb-6 pt-4 max-[1200px]:grid-cols-1">
        <div>
          <h3 className="mb-2 text-[13px] font-medium text-os-text">Channels</h3>
          {channels.length === 0 ? (
            <p className="text-[12.5px] text-os-dim">No channels connected in Postiz yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {channels.map((c) => {
                const metrics = analytics[c.id] ?? [];
                return (
                  <li key={c.id} className="rounded-sm-t border border-os-border bg-os-surface2 px-3 py-2">
                    <div className="flex items-center justify-between gap-2 text-[13px]">
                      <span className="truncate text-os-text">{c.name}</span>
                      <span className="font-mono text-[11px] text-os-dim">{c.disabled ? 'disabled' : c.platform}</span>
                    </div>
                    {metrics.length > 0 && (
                      <p className="mt-1 font-mono text-[11px] text-os-muted">
                        {metrics
                          .slice(0, 3)
                          .map((m) => `${m.label} ${m.latest ?? ' - '}${m.percentageChange != null ? ` (${m.percentageChange > 0 ? '+' : ''}${m.percentageChange}%)` : ''}`)
                          .join(' · ')}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div>
          <h3 className="mb-2 text-[13px] font-medium text-os-text">Scheduled</h3>
          {upcoming.length === 0 ? (
            <p className="text-[12.5px] text-os-dim">Nothing scheduled in the next 30 days.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {upcoming.slice(0, 6).map((p) => (
                <li key={p.id} className="rounded-sm-t border border-os-border bg-os-surface2 px-3 py-2 text-[12.5px]">
                  <p className="line-clamp-2 text-os-text">{p.content || '(no text)'}</p>
                  <p className="mt-1 font-mono text-[11px] text-os-dim">
                    {p.channel.name} · {when(p.publishDate)} · {p.state.toLowerCase()}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <h3 className="mb-2 mt-4 text-[13px] font-medium text-os-text">Recent</h3>
          {recent.length === 0 ? (
            <p className="text-[12.5px] text-os-dim">No posts in the last 30 days.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {recent.slice(0, 5).map((p) => (
                <li key={p.id} className="rounded-sm-t border border-os-border bg-os-surface2 px-3 py-2 text-[12.5px]">
                  <p className="line-clamp-2 text-os-text">{p.content || '(no text)'}</p>
                  <p className="mt-1 font-mono text-[11px] text-os-dim">
                    {p.channel.name} · {when(p.publishDate)} · {p.state === 'ERROR' ? `failed${p.error ? `: ${p.error}` : ''}` : p.state.toLowerCase()}
                    {p.releaseUrl && (
                      <>
                        {' · '}
                        <a href={p.releaseUrl} target="_blank" rel="noreferrer" className="text-os-accent">
                          open
                        </a>
                      </>
                    )}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className="mb-2 text-[13px] font-medium text-os-text">Schedule a post</h3>
          {active.length === 0 ? (
            <p className="text-[12.5px] text-os-dim">Connect a channel in Postiz to schedule posts.</p>
          ) : (
            <PostizScheduleForm channels={active.map((c) => ({ id: c.id, name: c.name, platform: c.platform }))} writes={writes} />
          )}
        </div>
      </div>
    </SlabCard>
  );
}
