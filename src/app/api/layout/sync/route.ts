import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { verifySession, UnauthorizedError, unauthorizedResponse } from "@/lib/auth/dal";
import { layoutSyncBodySchema } from "@/lib/widgets/schemas";
import { createSnapshot } from "@/lib/backups/snapshots";

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function POST(req: NextRequest) {
  try {
    await verifySession();
    const raw = await req.json();

    const parsed = layoutSyncBodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid layout payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { layout, wallpaper, settings, dashboardId: reqDashboardId } = parsed.data;

    const dashboardId = reqDashboardId || "1";

    // Auto-Snapshot: aktuellen (Pre-Save-)Stand sichern, bevor überschrieben wird.
    // Fehler hier dürfen den Save nicht blockieren.
    try {
      await createSnapshot(dashboardId, "auto-save");
    } catch (snapErr) {
      console.error("[sync] snapshot failed (non-fatal):", snapErr);
    }

    await prisma.dashboard.upsert({
      where: { id: dashboardId },
      update: {
        wallpaper: (wallpaper as any) ?? undefined,
        settings: (settings as any) ?? undefined,
      },
      create: {
        id: dashboardId,
        name: `View ${dashboardId}`,
        wallpaper: (wallpaper as any) ?? {},
        settings: (settings as any) ?? {},
      },
    });

    // Clear old layout and overwrite
    await prisma.widget.deleteMany({ where: { dashboardId } });

    for (const item of layout) {
      await prisma.widget.create({
        data: {
          id: item.i.startsWith(`${dashboardId}_`) ? item.i : `${dashboardId}_${item.i}`,
          type: item.type,
          label: item.label ?? "",
          x: item.x,
          y: item.y,
          w: item.w,
          h: item.h,
          bgOpacity: item.bgOpacity,
          config: (item.config as any) ?? {},
          dashboardId,
        },
      });
    }

    // Ping via den globalen Socket.IO-Server aus server.js, damit alle
    // verbundenen Displays das neue Layout sofort laden.
    if ((global as any).LIVE_SYNC_IO) {
      (global as any).LIVE_SYNC_IO.emit("LAYOUT_UPDATED");
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof UnauthorizedError) return unauthorizedResponse();
    console.error("[sync] error:", error);
    return NextResponse.json(
      {
        error: "Failed to save layout",
        details: {
          message: error?.message,
          code: error?.code,
          meta: error?.meta,
        },
      },
      { status: 500 },
    );
  }
}
