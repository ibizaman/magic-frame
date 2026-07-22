import { NextRequest, NextResponse } from "next/server";
import { emitToDisplays, readDashboardId } from "@/lib/devices/control";

export const dynamic = "force-dynamic";

/** Alle Displays auf einen View schalten. Body oder Query: dashboardId. */
export async function POST(req: NextRequest) {
  const dashboardId = await readDashboardId(req);
  if (!dashboardId) {
    return NextResponse.json({ error: "dashboardId fehlt" }, { status: 400 });
  }
  return emitToDisplays(req, "FORCE_NAVIGATE", dashboardId);
}
