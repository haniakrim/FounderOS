import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeEach, describe, expect, test } from 'vitest';
import {
  SESSION_ISSUED_KEY, clientKey, isSecureRequest, recordFailure, resetThrottle, retryAfterMs,
  sessionCookieOptions, sessionIsValid, setPassword, throttled,
} from '@/lib/auth';
import { requestOriginOf, decideGate } from '@/lib/auth-gate';
import { detectCloudflared, detectRemoteAccess, detectTailscale, parseTailscaleStatus, type Exec } from '@/lib/remote-access';

const prev = process.env.GLADOS_ENV_LOCAL;
beforeEach(() => {
  process.env.GLADOS_ENV_LOCAL = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'glados-ra-')), '.env.local');
  resetThrottle();
});
afterAll(() => {
  if (prev === undefined) delete process.env.GLADOS_ENV_LOCAL;
  else process.env.GLADOS_ENV_LOCAL = prev;
});

const h = (m: Record<string, string>) => ({ get: (k: string) => m[k.toLowerCase()] ?? null });

describe('rate limit and lockout', () => {
  test('locks after 8 failures, backs off, and a quiet hour forgets', () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 7; i++) recordFailure('a', t0 + i);
    expect(throttled('a', t0 + 10)).toBe(false);
    recordFailure('a', t0 + 8);
    expect(throttled('a', t0 + 9)).toBe(true);
    expect(retryAfterMs('a', t0 + 9)).toBeGreaterThan(50_000);
    const t1 = t0 + 61_000;
    expect(throttled('a', t1)).toBe(false);
    for (let i = 0; i < 8; i++) recordFailure('a', t1 + i);
    expect(retryAfterMs('a', t1 + 9)).toBeGreaterThan(110_000); // second lock doubles
    expect(throttled('b', t1)).toBe(false);
  });
  test('x-forwarded-for is ignored unless the proxy is trusted', () => {
    const req = new Request('http://x/', { headers: { 'x-forwarded-for': '9.9.9.9, 1.1.1.1' } });
    expect(clientKey(req, false)).toBe('direct');
    expect(clientKey(req, true)).toBe('1.1.1.1'); // rightmost entry: appended by our own proxy
  });
});

describe('cookie flags and proxy trust', () => {
  test('Secure only over https; forwarded proto needs trust', () => {
    const plain = new Request('http://localhost/x');
    const fwd = new Request('http://localhost/x', { headers: { 'x-forwarded-proto': 'https' } });
    expect(sessionCookieOptions(plain, false)).toMatchObject({ secure: false, httpOnly: true, sameSite: 'lax' });
    expect(sessionCookieOptions(fwd, false).secure).toBe(false);
    expect(sessionCookieOptions(fwd, true).secure).toBe(true);
    expect(isSecureRequest(new Request('https://os.example.com/x'), false)).toBe(true);
  });
  test('origin check ignores forwarded headers unless trusted', () => {
    const m = { host: 'internal:4100', 'x-forwarded-host': 'os.example.com', 'x-forwarded-proto': 'https' };
    expect(requestOriginOf(h(m)).origin).toBe('http://internal:4100');
    expect(requestOriginOf(h(m), true).origin).toBe('https://os.example.com');
    const base = { pathname: '/api/x', method: 'POST', hostname: 'os.example.com', configured: true, authed: true };
    expect(decideGate({ ...base, origin: 'https://evil.test', requestOrigin: 'https://os.example.com' }).kind).toBe('cross-origin');
    expect(decideGate({ ...base, origin: 'https://os.example.com', requestOrigin: 'https://os.example.com' }).kind).toBe('pass');
  });
});

describe('session expiry', () => {
  test('a secret older than 30 days stops validating', () => {
    const secret = setPassword('a fine passphrase');
    expect(sessionIsValid(secret)).toBe(true);
    const old = String(Date.now() - 31 * 86_400_000);
    const f = process.env.GLADOS_ENV_LOCAL!;
    fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace(new RegExp(`${SESSION_ISSUED_KEY}=\\d+`), `${SESSION_ISSUED_KEY}=${old}`));
    expect(sessionIsValid(secret)).toBe(false);
  });
});

const TS_UP = JSON.stringify({ BackendState: 'Running', Self: { DNSName: 'box.tail1234.ts.net.', TailscaleIPs: ['100.64.0.5'] } });
const enoent = () => Object.assign(new Error('nf'), { code: 'ENOENT' });

describe('detection parsing (mock exec)', () => {
  test('parses a running tailscale', () => {
    expect(parseTailscaleStatus(TS_UP)).toEqual({ up: true, state: 'Running', dnsName: 'box.tail1234.ts.net', ips: ['100.64.0.5'] });
    expect(parseTailscaleStatus('not json').up).toBe(false);
    expect(parseTailscaleStatus(JSON.stringify({ BackendState: 'Stopped', Self: { DNSName: 'x.' } })).dnsName).toBeNull();
  });
  test('not installed, installed-but-down, up', async () => {
    expect((await detectTailscale(async () => { throw enoent(); })).installed).toBe(false);
    const down = await detectTailscale(async () => { throw Object.assign(new Error('x'), { stdout: '' }); });
    expect(down).toMatchObject({ installed: true, up: false });
    expect(await detectTailscale(async () => ({ stdout: TS_UP }))).toMatchObject({ installed: true, up: true });
  });
  test('cloudflared version', async () => {
    expect(await detectCloudflared(async () => ({ stdout: 'cloudflared version 2025.1.0 (built x)' }))).toEqual({ installed: true, version: '2025.1.0' });
    expect((await detectCloudflared(async () => { throw enoent(); })).installed).toBe(false);
  });
  test('nothing configured = off; password + tailscale = ready with url', async () => {
    const none: Exec = async () => { throw enoent(); };
    const off = await detectRemoteAccess({ exec: none, env: {} as NodeJS.ProcessEnv, passwordSet: false });
    expect(off).toMatchObject({ status: 'off', bindHost: '127.0.0.1', loopbackOnly: true, tailscaleUrl: null });
    const on = await detectRemoteAccess({ exec: async (c) => { if (c === 'cloudflared') throw enoent(); return { stdout: TS_UP }; }, env: { PORT: '4100', GLADOS_TRUST_PROXY: '1' } as unknown as NodeJS.ProcessEnv, passwordSet: true });
    expect(on).toMatchObject({ status: 'ready', trustProxy: true, tailscaleUrl: 'https://box.tail1234.ts.net:4100' });
    expect(on.instructions.tailscale[0]).toContain('tailscale serve --bg');
  });
});
