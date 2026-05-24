import { NextRequest, NextResponse } from "next/server";
import { resolveUserId } from "@/lib/auth/shortcut";
import { createTimer, listActiveTimers } from "@/lib/timers/store";

export const dynamic = "force-dynamic";

// GET /api/timers?dashboardId=tablet
// Öffentlich für Boards — Session nicht erzwungen, damit der View-Renderer
// sie ohne Login-Cookie abrufen kann (Tablets laufen als Kiosk).
export async function GET(req: NextRequest) {
  const dashboardId = req.nextUrl.searchParams.get("dashboardId") ?? undefined;
  const timers = await listActiveTimers({ dashboardId });
  return NextResponse.json({ timers });
}

// POST /api/timers
// Body (JSON):  { label?, minutes?, seconds?, durationMs?, dashboardId? }
// Oder per Shortcut-Form:  ?key=<token>&label=Pasta&minutes=10&dashboardId=tablet
// Ein iOS-Shortcut kann also einfach POST auf die URL mit Query-Params machen.
export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // Shortcut sendet ggf. keinen Body
  }
  const q = req.nextUrl.searchParams;

  const label =
    body.label ?? q.get("label") ?? "Timer";
  const dashboardId =
    body.dashboardId ?? q.get("dashboardId") ?? null;

  let durationMs: number | null = null;
  if (typeof body.durationMs === "number") durationMs = body.durationMs;
  else if (q.get("durationMs")) durationMs = parseInt(q.get("durationMs")!, 10);
  else {
    const min = Number(body.minutes ?? q.get("minutes") ?? 0);
    const sec = Number(body.seconds ?? q.get("seconds") ?? 0);
    if (min > 0 || sec > 0) durationMs = min * 60_000 + sec * 1_000;
  }
  if (!durationMs || !Number.isFinite(durationMs) || durationMs < 1000) {
    return NextResponse.json(
      { error: "durationMs (or minutes/seconds) ≥ 1s erforderlich" },
      { status: 400 },
    );
  }
  // Hartes Cap bei 24h damit ein Tipp-Fehler keinen 10-Jahres-Timer erzeugt.
  durationMs = Math.min(durationMs, 24 * 60 * 60 * 1000);

  const timer = await createTimer({
    userId,
    label: String(label).slice(0, 40),
    durationMs,
    targetDashboardId: dashboardId ? String(dashboardId) : null,
  });

  // Live-Sync: Socket broadcast
  if ((global as any).LIVE_SYNC_IO) {
    (global as any).LIVE_SYNC_IO.emit("TIMER_STARTED", timer);
  }

  return NextResponse.json({ timer });
}
