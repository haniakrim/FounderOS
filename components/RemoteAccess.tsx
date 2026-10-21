'use client';

import { useEffect, useState } from 'react';
import type { RemoteAccessInfo } from '@/lib/remote-access';

/**
 * Remote access card inside Setup → Security. Everything shown comes from
 * GET /api/remote-access, which inspects the host. Nothing is claimed that was
 * not observed; with no password and a loopback bind it says Not configured.
 */
export function RemoteAccess() {
  const [info, setInfo] = useState<RemoteAccessInfo | null>(null);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    fetch('/api/remote-access', { cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<RemoteAccessInfo>) : Promise.reject(new Error(String(r.status)))))
      .then(setInfo)
      .catch(() => setFailed(true));
  }, []);

  const copy = async (key: string, lines: string[]) => {
    try {
      await navigator.clipboard.writeText(lines.filter((l) => !l.startsWith('#')).join('\n'));
      setCopied(key);
      setTimeout(() => setCopied(''), 1500);
    } catch {
      setCopied('');
    }
  };

  const row = 'flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-[12.5px]';
  const label = 'w-[132px] shrink-0 text-os-dim';
  const code = 'mt-1.5 overflow-x-auto rounded-md-t border border-os-border bg-os-bg px-3 py-2 font-mono text-[11.5px] leading-relaxed text-os-muted';

  return (
    <section id="remote-access" aria-label="Remote access" className="scroll-mt-24 mt-5 border-t border-os-border pt-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[13.5px] font-medium">Remote access</span>
        {info && (
          <span className="inline-flex items-center gap-2 rounded-[6px] border border-os-border-strong bg-os-surface2 px-3 py-1 text-[11.5px] text-os-muted">
            <span className={info.status === 'ready' ? 'dot ok' : 'dot warn'} />
            {info.status === 'off' ? 'Not configured' : info.status === 'ready' ? 'Reachable beyond this machine' : 'Password set, no route yet'}
          </span>
        )}
      </div>
      {failed && <p className="mt-2 text-[12px] text-os-muted">Could not read the host state.</p>}
      {!info && !failed && <p className="mt-2 text-[12px] text-os-dim">Checking this host…</p>}
      {info && (
        <div className="mt-3 space-y-1.5">
          <div className={row}><span className={label}>Bind address</span><span className="font-mono">{info.bindHost}:{info.port} {info.loopbackOnly ? '(this machine only)' : '(network)'}</span></div>
          <div className={row}><span className={label}>Password</span><span>{info.passwordSet ? 'Set' : 'Not set. Remote access stays off until one exists.'}{!info.passwordSet && <> <a href="#security" className="underline">Set up</a></>}</span></div>
          <div className={row}>
            <span className={label}>Tailscale</span>
            <span>
              {!info.tailscale.installed ? 'Not installed' : info.tailscale.up ? 'Up' : `Installed, not running${info.tailscale.state ? ` (${info.tailscale.state})` : ''}`}
              {info.tailscaleUrl && <> · <span className="font-mono">{info.tailscaleUrl}</span></>}
            </span>
          </div>
          <div className={row}><span className={label}>cloudflared</span><span>{info.cloudflared.installed ? `Installed${info.cloudflared.version ? ` ${info.cloudflared.version}` : ''}` : 'Not installed'}</span></div>
          <div className={row}><span className={label}>Trust proxy</span><span>{info.trustProxy ? 'On (GLADOS_TRUST_PROXY=1)' : 'Off. Set GLADOS_TRUST_PROXY=1 when a proxy serves https in front.'}</span></div>

          {!info.passwordSet ? (
            <p className="pt-2 text-[12px] text-os-muted">Set the operator password above first. The server refuses to leave loopback without one.</p>
          ) : (
            <div className="grid gap-4 pt-2 md:grid-cols-2">
              {([['tailscale', 'Tailscale serve (tailnet only)'], ['cloudflare', 'Cloudflare Tunnel (public hostname)']] as const).map(([k, title]) => (
                <div key={k}>
                  <div className="flex items-center gap-2 text-[12px] font-medium">
                    {title}
                    <button type="button" onClick={() => copy(k, info.instructions[k])} className="text-[11.5px] font-normal text-os-dim hover:text-os-text">
                      {copied === k ? 'copied' : 'copy'}
                    </button>
                  </div>
                  <pre className={code}>{info.instructions[k].join('\n')}</pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
