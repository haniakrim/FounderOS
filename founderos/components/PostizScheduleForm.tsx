'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock } from 'lucide-react';

type Channel = { id: string; name: string; platform: string };

/** Schedule a post through Postiz. Posts to a real account: asks for a confirm
    step first, and the route refuses unless GLADOS_WRITES=1. */
export function PostizScheduleForm({ channels, writes }: { channels: Channel[]; writes: boolean }) {
  const router = useRouter();
  const [channelId, setChannelId] = useState(channels[0]?.id ?? '');
  const [content, setContent] = useState('');
  const [when, setWhen] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function send() {
    const channel = channels.find((c) => c.id === channelId);
    if (!channel) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/postiz/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId,
          platform: channel.platform,
          content,
          date: when ? new Date(when).toISOString() : '',
          mode: 'schedule',
          confirm: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setMsg({ ok: true, text: 'Scheduled in Postiz.' });
      setContent('');
      setConfirming(false);
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Failed' });
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  }

  const ready = channelId && content.trim() && when;
  return (
    <div className="flex flex-col gap-3">
      <select
        aria-label="Channel"
        value={channelId}
        onChange={(e) => setChannelId(e.target.value)}
        className="rounded-sm-t border border-os-border bg-os-surface2 px-3 py-2 text-[13px] text-os-text"
      >
        {channels.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} ({c.platform})
          </option>
        ))}
      </select>
      <textarea
        aria-label="Post text"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        placeholder="Write the post"
        className="w-full resize-none rounded-sm-t border border-os-border bg-os-surface2 px-3 py-2.5 text-[13px] leading-relaxed text-os-text outline-none placeholder:text-os-dim focus:border-os-border-strong"
      />
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="datetime-local"
          aria-label="Schedule time"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          className="rounded-sm-t border border-os-border bg-os-surface2 px-3 py-2 text-[13px] text-os-text"
        />
        {confirming ? (
          <>
            <button type="button" onClick={send} disabled={busy} className="pressable rounded-full border border-os-border-strong px-4 py-2 text-[13px] text-os-text">
              {busy ? 'Scheduling' : 'Confirm: publish to the real channel'}
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="text-[12px] text-os-dim">
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={!ready || !writes}
            title={writes ? undefined : 'Writes are off. Set GLADOS_WRITES=1 on this instance.'}
            className="pressable inline-flex items-center gap-1.5 rounded-full border border-os-border px-4 py-2 text-[13px] text-os-muted hover:text-os-text disabled:opacity-50"
          >
            <Clock className="h-3.5 w-3.5" /> Schedule
          </button>
        )}
      </div>
      {!writes && <p className="text-[12px] text-os-dim">Scheduling is off on this instance (GLADOS_WRITES is not 1).</p>}
      {msg && <p className={`text-[12px] ${msg.ok ? 'text-os-ok' : 'text-os-err'}`}>{msg.text}</p>}
    </div>
  );
}
