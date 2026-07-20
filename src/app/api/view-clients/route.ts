import { NextRequest, NextResponse } from "next/server";
import { verifySession, UnauthorizedError, unauthorizedResponse } from "@/lib/auth/dal";
import { reportViewClient, listViewClients } from "@/lib/view-clients/store";

export const dynamic = "force-dynamic";

// POST: Heartbeat der Displays (öffentlich wie /view selbst — Kiosks haben
// keine Session). Nur geclampte Zahlen, In-Memory, fire-and-forget im Client.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const dashboardId = String(body?.dashboardId || "").slice(0, 64);
    const clientId = String(body?.clientId || "").slice(0, 32);
    const width = Math.round(Number(body?.width));
    const height = Math.round(Number(body?.height));
    const dpr = Number(body?.dpr) || 1;
    if (!dashboardId || !clientId || !Number.isFinite(width) || !Number.isFinite(height)) {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }
    reportViewClient({
      clientId,
      dashboardId,
      width: Math.max(120, Math.min(10000, width)),
      height: Math.max(120, Math.min(10000, height)),
      dpr: Math.max(0.5, Math.min(4, dpr)),
    });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
}

// GET: Liste der aktiven Displays eines Views — nur für den Editor (Session).
export async function GET(req: NextRequest) {
  try {
    await verifySession();
    const dashboardId = req.nextUrl.searchParams.get("dashboardId") || "";
    if (!dashboardId) return NextResponse.json({ displays: [] });
    return NextResponse.json({
      displays: listViewClients(dashboardId).map((c) => ({
        clientId: c.clientId,
        width: c.width,
        height: c.height,
        dpr: c.dpr,
      })),
    });
  } catch (e) {
    if (e instanceof UnauthorizedError) return unauthorizedResponse();
    return NextResponse.json({ displays: [] });
  }
}
