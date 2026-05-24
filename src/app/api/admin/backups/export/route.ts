import { NextResponse } from "next/server";
import {
  verifySession,
  UnauthorizedError,
  unauthorizedResponse,
} from "@/lib/auth/dal";
import { prisma } from "@/lib/companion/prisma";

export const dynamic = "force-dynamic";

// GET /api/admin/backups/export — JSON-Download aller Views
// (Layouts, Wallpapers, View-Settings). Globale Secrets (HA-Token) bewusst NICHT.
export async function GET() {
  try {
    await verifySession();

    const dashboards = await prisma.dashboard.findMany({
      include: { widgets: true },
      orderBy: { id: "asc" },
    });

    const backup = {
      magicFrameBackup: true,
      version: 1,
      exportedAt: new Date().toISOString(),
      dashboardCount: dashboards.length,
      dashboards: dashboards.map((d) => ({
        id: d.id,
        name: d.name,
        wallpaper: d.wallpaper ?? null,
        settings: d.settings ?? null,
        widgets: d.widgets.map((w) => ({
          id: w.id,
          type: w.type,
          label: w.label,
          config: w.config ?? {},
          bgOpacity: w.bgOpacity,
          x: w.x,
          y: w.y,
          w: w.w,
          h: w.h,
        })),
      })),
    };

    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="magicframe-backup-${date}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    console.error("backup export error", err);
    return NextResponse.json({ error: "Export fehlgeschlagen." }, { status: 500 });
  }
}
