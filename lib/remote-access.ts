import { execFile } from 'node:child_process';
import { isConfigured } from '@/lib/auth';
import { isLoopbackHost } from '@/lib/auth-gate';

/**
 * Honest remote-access detection for Setup → Security. Reads the bind host,
 * whether a password exists, and (optionally) whether the Tailscale and
 * cloudflared CLIs are installed and up. Nothing here changes state, and
 * nothing is reported that was not observed.
 */

export type Exec = (cmd: string, args: string[]) => Promise<{ stdout: string }>;

export type TailscaleInfo = {
  installed: boolean;
  up: boolean;
  /** Backend state as Tailscale reports it (Running, Stopped, NeedsLogin ...). */
  state: string | null;
  /** MagicDNS name without the trailing dot. */
  dnsName: string | null;
  ips: string[];
};

export type RemoteAccessInfo = {
  bindHost: string;
  port: string;
  loopbackOnly: boolean;
  passwordSet: boolean;
  trustProxy: boolean;
  tailscale: TailscaleInfo;
  cloudflared: { installed: boolean; version: string | null };
  /** off: loopback only. ready: a password exists and something can carry traffic in. */
  status: 'off' | 'password-only' | 'ready';
  tailscaleUrl: string | null;
  instructions: { tailscale: string[]; cloudflare: string[] };
};

const defaultExec: Exec = (cmd, args) =>
  new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: 4000, maxBuffer: 1 << 20 }, (err, stdout) => {
      if (err && !stdout) reject(err);
      else resolve({ stdout: String(stdout) });
    });
  });

const TAILSCALE_BINS = ['tailscale', '/Applications/Tailscale.app/Contents/MacOS/Tailscale'];

/** Pure parser for `tailscale status --json` output. */
export function parseTailscaleStatus(stdout: string): Omit<TailscaleInfo, 'installed'> {
  const none = { up: false, state: null, dnsName: null, ips: [] as string[] };
  let j: unknown;
  try {
    j = JSON.parse(stdout);
  } catch {
    return none;
  }
  if (!j || typeof j !== 'object') return none;
  const o = j as { BackendState?: unknown; Self?: { DNSName?: unknown; TailscaleIPs?: unknown } };
  const state = typeof o.BackendState === 'string' ? o.BackendState : null;
  const dns = typeof o.Self?.DNSName === 'string' ? o.Self.DNSName.replace(/\.$/, '') : '';
  const ips = Array.isArray(o.Self?.TailscaleIPs) ? o.Self!.TailscaleIPs.filter((x): x is string => typeof x === 'string') : [];
  const up = state === 'Running';
  return { up, state, dnsName: up && dns ? dns : null, ips: up ? ips : [] };
}

export async function detectTailscale(exec: Exec = defaultExec): Promise<TailscaleInfo> {
  for (const bin of TAILSCALE_BINS) {
    try {
      const { stdout } = await exec(bin, ['status', '--json']);
      return { installed: true, ...parseTailscaleStatus(stdout) };
    } catch (e) {
      if ((e as NodeJS.ErrnoException)?.code === 'ENOENT') continue;
      // Binary exists but exited non-zero (daemon stopped, logged out).
      const out = (e as { stdout?: unknown })?.stdout;
      return { installed: true, ...(typeof out === 'string' && out ? parseTailscaleStatus(out) : { up: false, state: null, dnsName: null, ips: [] }) };
    }
  }
  return { installed: false, up: false, state: null, dnsName: null, ips: [] };
}

export async function detectCloudflared(exec: Exec = defaultExec): Promise<{ installed: boolean; version: string | null }> {
  try {
    const { stdout } = await exec('cloudflared', ['--version']);
    const m = /version\s+(\S+)/i.exec(stdout);
    return { installed: true, version: m ? m[1] : null };
  } catch (e) {
    if ((e as NodeJS.ErrnoException)?.code === 'ENOENT') return { installed: false, version: null };
    return { installed: true, version: null };
  }
}

export function buildInstructions(port: string, dnsName: string | null) {
  return {
    tailscale: [
      `tailscale serve --bg --https=${port} localhost:${port}`,
      `# then open https://${dnsName ?? '<this-machine>.<tailnet>.ts.net'}:${port}`,
      `tailscale serve --bg --https=${port} off   # to stop sharing`,
      '# put GLADOS_TRUST_PROXY=1 in .env.local and restart, so https is recognised',
    ],
    cloudflare: [
      'cloudflared tunnel login',
      'cloudflared tunnel create founderos',
      'cloudflared tunnel route dns founderos os.example.com',
      `cloudflared tunnel run --url http://localhost:${port} founderos`,
      '# put GLADOS_TRUST_PROXY=1 in .env.local and restart. Keep GLADOS_HOST unset (loopback).',
    ],
  };
}

export async function detectRemoteAccess(opts: { exec?: Exec; env?: NodeJS.ProcessEnv; passwordSet?: boolean } = {}): Promise<RemoteAccessInfo> {
  const env = opts.env ?? process.env;
  const exec = opts.exec ?? defaultExec;
  const bindHost = (env.GLADOS_HOST || '127.0.0.1').trim();
  const port = (env.PORT || '4100').trim();
  const passwordSet = opts.passwordSet ?? isConfigured();
  const trustProxy = (env.GLADOS_TRUST_PROXY ?? '').trim() === '1';
  const [tailscale, cloudflared] = await Promise.all([detectTailscale(exec), detectCloudflared(exec)]);
  const loopbackOnly = isLoopbackHost(bindHost);
  const carrier = tailscale.up || cloudflared.installed || !loopbackOnly;
  const status = !passwordSet ? 'off' : carrier ? 'ready' : 'password-only';
  return {
    bindHost,
    port,
    loopbackOnly,
    passwordSet,
    trustProxy,
    tailscale,
    cloudflared,
    status,
    tailscaleUrl: tailscale.dnsName ? `https://${tailscale.dnsName}:${port}` : null,
    instructions: buildInstructions(port, tailscale.dnsName),
  };
}
