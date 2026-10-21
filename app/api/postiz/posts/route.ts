import { NextResponse } from 'next/server';
import {
  PostizError,
  PostizValidationError,
  postizConfigured,
  schedulePostizPost,
  validatePostizSchedule,
} from '@/lib/connectors/postiz';
import { gateResponse } from '@/lib/gates';
import { setupHrefFor } from '@/lib/integrations-catalog';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Schedule a post through Postiz. Publishes to a real account, so: 403 unless
 * GLADOS_WRITES=1, 409 unless `confirm: true`, 503 when Postiz is not set up.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const refused = gateResponse('GLADOS_WRITES', body);
  if (refused) return refused;
  if (!postizConfigured()) return NextResponse.json({ error: 'Postiz is not configured', setupHref: setupHrefFor('postiz') }, { status: 503 });
  try {
    const input = validatePostizSchedule(body ?? {});
    const created = await schedulePostizPost(input);
    return NextResponse.json({ ok: true, created });
  } catch (err) {
    if (err instanceof PostizValidationError) return NextResponse.json({ error: err.message }, { status: 400 });
    if (err instanceof PostizError) {
      console.error('[postiz]', err.message);
      return NextResponse.json({ error: err.status === 503 ? err.message : 'Postiz unreachable' }, { status: err.status === 503 ? 503 : 502 });
    }
    return NextResponse.json({ error: 'Postiz request failed' }, { status: 502 });
  }
}
