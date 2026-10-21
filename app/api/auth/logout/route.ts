import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth-gate';
import { sessionCookieOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, '', { ...sessionCookieOptions(req), maxAge: 0 });
  return res;
}
