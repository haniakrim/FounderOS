import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Liveness probe for hosts (Railway healthcheckPath). Answers 200 and nothing
 * else: no database read, no env value, no version, no path. A process that can
 * answer this is up; it says nothing about integrations. It must be listed in
 * OPEN_PATHS (lib/auth-gate.ts) or the gate answers 401/503 to the probe.
 */
export function GET() {
  return NextResponse.json({ ok: true }, { headers: { 'cache-control': 'no-store' } });
}
