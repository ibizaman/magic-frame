import { NextResponse } from "next/server";
import {
  verifySession,
  UnauthorizedError,
  unauthorizedResponse,
} from "@/lib/auth/dal";
import { prisma } from "@/lib/companion/prisma";
import { createSnapshot, MAX_SNAPSHOTS } from "@/lib/backups/snapshots";

export const dynamic = "force-dynamic";

const REASON_LABELS: Record<string, string> = {
  "auto-save": "vor Speichern",
  manual: "manuell",
  "pre-import": "vor Import",
  "pre-restore": "vor Wiederherstellen",
};

// GET /api/admin/backups/snapshots — die letzten Versionen
export async function GET() {
  try {
    await verifySession();
    const rows = await prisma.snapshot.findMany({
      orderBy: { createdAt: "desc" },
      take: MAX_SNAPSHOTS,
    });
    const snapshots = rows.map((s) => {
      const data = (s.data as any) ?? {};
      return {
        id: s.id,
        dashboardId: s.dashboardId,
        dashboardName: s.dashboardName,
        reason: s.reason,
        reasonLabel: REASON_LABELS[s.reason] ?? s.reason,
        widgetCount: Array.isArray(data.widgets) ? data.widgets.length : 0,
        createdAt: s.createdAt.toISOString(),
      };
    });
    return NextResponse.json({ snapshots });
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    console.error("snapshots list error", err);
    return NextResponse.json({ error: "Interner Fehler." }, { status: 500 });
  }
}

// POST /api/admin/backups/snapshots — manueller Snapshot ALLER Views
export async function POST() {
  try {
    await verifySession();
    const dashboards = await prisma.dashboard.findMany({ select: { id: true } });
    let count = 0;
    for (const d of dashboards) {
      await createSnapshot(d.id, "manual");
      count++;
    }
    return NextResponse.json({ ok: true, count });
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    console.error("manual snapshot error", err);
    return NextResponse.json({ error: "Interner Fehler." }, { status: 500 });
  }
}
