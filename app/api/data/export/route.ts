import { NextResponse } from "next/server";
import { filmingMode } from "@/lib/paths";
import { buildExport, DEMO_REFUSAL } from "@/lib/data-export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Everything the user owns, as one download: a SQLite snapshot plus the brain folder. */
export async function GET() {
  if (filmingMode())
    return NextResponse.json(
      { ok: false, error: DEMO_REFUSAL },
      { status: 409 },
    );
  try {
    const { stream, filename } = await buildExport();
    return new Response(stream, {
      headers: {
        "content-type": "application/gzip",
        "content-disposition": `attachment; filename="${filename}"`,
        "cache-control": "no-store",
      },
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: `Export failed: ${e instanceof Error ? e.message : String(e)}`,
      },
      { status: 500 },
    );
  }
}
