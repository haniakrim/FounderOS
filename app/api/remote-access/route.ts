import { NextResponse } from 'next/server';
import { detectRemoteAccess } from '@/lib/remote-access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Read-only detection for Setup → Security. Behind the session gate like every other route. */
export async function GET() {
  return NextResponse.json(await detectRemoteAccess(), { headers: { 'cache-control': 'no-store' } });
}
