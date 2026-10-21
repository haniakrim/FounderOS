import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { readEnvLocal, removeEnvLocal, upsertEnvLocal } from '@/lib/creds';

/**
 * Operator password + session secret. Both live in `.env.local` on the host,
 * written by the app from Setup → Security, never in git:
 *
 *   GLADOS_PASSWORD_HASH   scrypt:<N>:<r>:<p>:<salt hex>:<key hex>
 *   GLADOS_SESSION_SECRET  64 hex chars; the value the session cookie carries
 *
 * `.env.local` is read fresh on every call (lib/creds), so a password set in
 * the UI takes effect without a restart. The session secret rotates whenever
 * the password is set or changed, which signs every other device out.
 *
 * Forgot the password: delete the GLADOS_PASSWORD_HASH line from .env.local,
 * restart, and set a new one from the machine the app runs on.
 */

export const PASSWORD_HASH_KEY = 'GLADOS_PASSWORD_HASH';
export const SESSION_SECRET_KEY = 'GLADOS_SESSION_SECRET';
export const SESSION_ISSUED_KEY = 'GLADOS_SESSION_ISSUED';
/** A session secret older than this stops working (the cookie maxAge matches). */
export const SESSION_MAX_AGE_S = 60 * 60 * 24 * 30;
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 512;

// ':' as the separator on purpose: Next's env loader expands `$WORD`, and a
// `$`-delimited hash would come through process.env mangled.
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 32 } as const;
const MAX_N = 1 << 20;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const key = scryptSync(password, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('hex'), key.toString('hex')].join(':');
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(':');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, nRaw, rRaw, pRaw, saltHex, keyHex] = parts;
  const N = Number(nRaw);
  const r = Number(rRaw);
  const p = Number(pRaw);
  const hex = /^[0-9a-f]+$/i;
  if (![N, r, p].every((v) => Number.isInteger(v) && v > 0) || N > MAX_N) return false;
  if (!hex.test(saltHex) || !hex.test(keyHex) || keyHex.length % 2 !== 0) return false;
  const expected = Buffer.from(keyHex, 'hex');
  let actual: Buffer;
  try {
    actual = scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length, { N, r, p });
  } catch {
    return false;
  }
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Constant-time compare so a secret cannot be guessed a character at a time. */
export function sameSecret(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export type AuthState = { configured: boolean; passwordHash?: string; sessionSecret?: string };

export function readAuthState(): AuthState {
  const env = readEnvLocal();
  const passwordHash = env[PASSWORD_HASH_KEY]?.trim() || undefined;
  const sessionSecret = env[SESSION_SECRET_KEY]?.trim() || undefined;
  return { configured: Boolean(passwordHash && sessionSecret), passwordHash, sessionSecret };
}

export function isConfigured(): boolean {
  return readAuthState().configured;
}

/** Epoch ms the current session secret was issued; undefined for installs that predate expiry. */
export function sessionIssuedAt(): number | undefined {
  const n = Number(readEnvLocal()[SESSION_ISSUED_KEY]);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** True once the secret is older than SESSION_MAX_AGE_S. Unknown age = not expired. */
export function sessionExpired(now = Date.now()): boolean {
  const at = sessionIssuedAt();
  return at !== undefined && now - at > SESSION_MAX_AGE_S * 1000;
}

export function sessionIsValid(cookie: string | undefined | null): boolean {
  const { configured, sessionSecret } = readAuthState();
  if (!configured || !cookie || !sessionSecret) return false;
  if (sessionExpired()) return false;
  return sameSecret(cookie, sessionSecret);
}

export function checkPassword(password: string): boolean {
  const { configured, passwordHash } = readAuthState();
  return configured && !!passwordHash && verifyPassword(password, passwordHash);
}

/** Null when acceptable, otherwise the message to show the operator. */
export function passwordShapeError(password: unknown): string | null {
  if (typeof password !== 'string') return 'password must be text';
  if (password.length < MIN_PASSWORD_LENGTH) return `password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  if (password.length > MAX_PASSWORD_LENGTH) return `password must be at most ${MAX_PASSWORD_LENGTH} characters`;
  if (password.trim() !== password) return 'password cannot start or end with whitespace';
  if (/[\r\n]/.test(password)) return 'password cannot contain line breaks';
  return null;
}

function newSecret(): string {
  return randomBytes(32).toString('hex');
}

/** Write a new hash and a fresh session secret. Returns the secret to put in
 *  the caller's cookie so this device stays signed in. */
export function setPassword(password: string): string {
  const secret = newSecret();
  upsertEnvLocal({ [PASSWORD_HASH_KEY]: hashPassword(password), [SESSION_SECRET_KEY]: secret, [SESSION_ISSUED_KEY]: String(Date.now()) });
  return secret;
}

/** Login: keep the secret (other devices stay signed in), restart the 30-day clock. */
export function refreshSessionIssued(now = Date.now()): void {
  upsertEnvLocal({ [SESSION_ISSUED_KEY]: String(now) });
}

/** New session secret, same password: every other device is signed out. */
export function rotateSession(): string {
  const secret = newSecret();
  upsertEnvLocal({ [SESSION_SECRET_KEY]: secret, [SESSION_ISSUED_KEY]: String(Date.now()) });
  return secret;
}

export function removePassword(): void {
  removeEnvLocal([PASSWORD_HASH_KEY, SESSION_SECRET_KEY, SESSION_ISSUED_KEY]);
}

/** GLADOS_TRUST_PROXY=1: believe x-forwarded-* headers. Off by default, because
 *  anyone who can reach the port directly can forge them. Turn it on only when
 *  a proxy you control (tailscale serve, cloudflared, nginx) is the sole way in. */
export function trustProxy(): boolean {
  return (process.env.GLADOS_TRUST_PROXY ?? '').trim() === '1';
}

/** Was this request made over https? Forwarded proto counts only with trustProxy. */
export function isSecureRequest(req?: Request, trust = trustProxy()): boolean {
  if (!req) return false;
  if (trust) {
    const proto = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase();
    if (proto) return proto === 'https';
  }
  try {
    return new URL(req.url).protocol === 'https:';
  } catch {
    return false;
  }
}

export function sessionCookieOptions(req?: Request, trust = trustProxy()) {
  return {
    httpOnly: true, // JavaScript on the page can never read it
    sameSite: 'lax' as const, // not sent on cross-site POSTs → blocks CSRF
    path: '/',
    maxAge: SESSION_MAX_AGE_S,
    secure: isSecureRequest(req, trust), // Secure only over https, or plain-http localhost would lose the cookie
  };
}

/* ---- online-guessing throttle + lockout ----
 * 8 failures inside a minute lock the client out; each further lockout doubles
 * (1m, 2m, 4m ... capped at 15m) until a success or an hour of quiet. */

type Attempt = { n: number; at: number; strikes: number; lockedUntil: number };
const attempts = new Map<string, Attempt>();
const WINDOW_MS = 60_000;
const MAX_TRIES = 8;
const MAX_LOCK_MS = 15 * 60_000;
const FORGET_MS = 60 * 60_000;
const MAX_KEYS = 5000;
const SHARED_KEY = 'direct';

/** Who is knocking. Forwarded headers are forgeable, so they are read only with
 *  trustProxy. Then: cf-connecting-ip (set by Cloudflare) wins, else the
 *  RIGHTMOST x-forwarded-for entry (the one our own proxy appended; earlier
 *  entries are client-supplied). Otherwise every caller shares one bucket. */
export function clientKey(req: Request, trust = trustProxy()): string {
  if (!trust) return SHARED_KEY;
  const cf = req.headers.get('cf-connecting-ip')?.trim();
  if (cf) return cf;
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const last = xff.split(',').map((p) => p.trim()).filter(Boolean).pop();
    if (last) return last;
  }
  return req.headers.get('x-real-ip')?.trim() || SHARED_KEY;
}

/* Global failure counter: many distinct keys failing is one distributed guess. */
const GLOBAL_WINDOW_MS = 15 * 60_000;
const GLOBAL_MAX = 100;
let globalFails: number[] = [];
let globalLockedUntil = 0;
/** The shared bucket never locks longer than this, so a stranger cannot lock the operator out for long. */
export const SHARED_MAX_LOCK_MS = 60_000;

export function throttled(key: string, now = Date.now()): boolean {
  return retryAfterMs(key, now) > 0;
}

/** Milliseconds until this client may try again; 0 when free. */
export function retryAfterMs(key: string, now = Date.now()): number {
  let wait = globalLockedUntil > now ? globalLockedUntil - now : 0;
  const rec = attempts.get(key);
  if (rec && rec.lockedUntil > now) wait = Math.max(wait, rec.lockedUntil - now);
  return wait;
}

export function recordFailure(key: string, now = Date.now()): void {
  globalFails = globalFails.filter((t) => now - t < GLOBAL_WINDOW_MS);
  globalFails.push(now);
  if (globalFails.length >= GLOBAL_MAX) {
    globalLockedUntil = now + GLOBAL_WINDOW_MS;
    globalFails = [];
  }
  if (attempts.size >= MAX_KEYS && !attempts.has(key)) {
    const oldest = attempts.keys().next().value;
    if (oldest !== undefined) attempts.delete(oldest);
  }
  const prev = attempts.get(key);
  const fresh = !prev || now - prev.at > FORGET_MS;
  const strikes = fresh ? 0 : prev.strikes;
  const inWindow = !fresh && now - prev.at < WINDOW_MS && prev.lockedUntil <= now;
  const n = inWindow ? prev.n + 1 : 1;
  attempts.delete(key); // re-insert so Map order tracks recency
  if (n >= MAX_TRIES) {
    const cap = key === SHARED_KEY ? SHARED_MAX_LOCK_MS : MAX_LOCK_MS;
    const lock = Math.min(cap, WINDOW_MS * 2 ** strikes);
    attempts.set(key, { n: 0, at: now, strikes: strikes + 1, lockedUntil: now + lock });
    return;
  }
  attempts.set(key, { n, at: inWindow ? prev.at : now, strikes, lockedUntil: fresh ? 0 : prev.lockedUntil });
}

export function clearFailures(key: string): void {
  attempts.delete(key);
}

/** For tests. */
export function resetThrottle(): void {
  attempts.clear();
  globalFails = [];
  globalLockedUntil = 0;
}

export function cookieFromHeader(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq <= 0) continue;
    if (part.slice(0, eq).trim() === name) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return undefined;
}
