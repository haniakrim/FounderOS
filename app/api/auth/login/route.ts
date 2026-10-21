import { NextResponse } from 'next/server';
import { z } from 'zod';
import { SESSION_COOKIE, requestOriginOf } from '@/lib/auth-gate';
import {
  checkPassword,
  cookieFromHeader,
  clearFailures,
  clientKey,
  readAuthState,
  refreshSessionIssued,
  sessionIsValid,
  recordFailure,
  retryAfterMs,
  sessionCookieOptions,
  trustProxy,
  throttled,
} from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const state = readAuthState();
  if (!state.configured || !state.sessionSecret) {
    return NextResponse.json(
      { error: 'no password is set — open the console on the machine it runs on and set one in Setup' },
      { status: 409 },
    );
  }

  // Login CSRF: a hostile page must not be able to sign the operator in as
  // someone else's session. The gate skips this path, so check here.
  const origin = req.headers.get('origin');
  if (origin !== null && origin !== requestOriginOf(req.headers, trustProxy()).origin) {
    return NextResponse.json({ error: 'cross-origin request refused' }, { status: 403 });
  }

  const key = clientKey(req);
  // A holder of a currently valid session is not a guesser: never throttle them.
  const hasSession = sessionIsValid(cookieFromHeader(req.headers.get('cookie'), SESSION_COOKIE));
  if (!hasSession && throttled(key)) {
    const secs = Math.ceil(retryAfterMs(key) / 1000);
    return NextResponse.json(
      { error: `too many attempts — try again in ${secs < 90 ? `${secs}s` : `${Math.ceil(secs / 60)} min`}` },
      { status: 429, headers: { 'retry-after': String(secs) } },
    );
  }

  const parsed = z.object({ password: z.string().min(1).max(512) }).safeParse(
    await req.json().catch(() => null),
  );
  if (!parsed.success) return NextResponse.json({ error: 'bad request' }, { status: 400 });

  if (!checkPassword(parsed.data.password)) {
    recordFailure(key);
    return NextResponse.json({ error: 'wrong password' }, { status: 401 });
  }

  clearFailures(key);
  refreshSessionIssued();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, state.sessionSecret, sessionCookieOptions(req));
  return res;
}
