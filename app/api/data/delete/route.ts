import { NextResponse } from "next/server";
import { filmingMode } from "@/lib/paths";
import { clearExportTemp, DEMO_REFUSAL, wipeDatabase } from "@/lib/data-export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Delete all of the user's data. Needs `{ "confirm": "DELETE" }`. Same-origin
 * and sign-in checks for this POST run in middleware.ts (lib/auth-gate.ts).
 * Never runs in demo mode, so demo-data/ is never touched.
 */
export async function POST(req: Request) {
  if (filmingMode())
    return NextResponse.json(
      { ok: false, error: DEMO_REFUSAL },
      { status: 409 },
    );
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = null;
  }
  if (
    !body ||
    typeof body !== "object" ||
    (body as { confirm?: unknown }).confirm !== "DELETE"
  ) {
    return NextResponse.json(
      { ok: false, error: 'Send { "confirm": "DELETE" } to delete all data.' },
      { status: 400 },
    );
  }
  try {
    const { removed } = wipeDatabase();
    const tempCleared = clearExportTemp();
    return NextResponse.json({
      ok: true,
      removed: removed.length,
      tempCleared,
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: `Delete failed: ${e instanceof Error ? e.message : String(e)}`,
      },
      { status: 500 },
    );
  }
}
