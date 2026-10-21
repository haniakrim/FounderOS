import { NextResponse } from 'next/server';
import { loadPostizOverview } from '@/lib/connectors/postiz';
import { filmingMode } from '@/lib/paths';
import { setupHrefFor } from '@/lib/integrations-catalog';
import { writesEnabled } from '@/lib/gates';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Postiz channels, scheduled and recent posts, and per-channel analytics.
    Filming mode never calls out: it answers not_configured. */
export async function GET() {
  const overview = filmingMode() ? ({ state: 'not_configured' } as const) : await loadPostizOverview();
  return NextResponse.json({ ...overview, setupHref: setupHrefFor('postiz'), writes: writesEnabled() });
}
