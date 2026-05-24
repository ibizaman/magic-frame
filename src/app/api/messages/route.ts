import { NextRequest, NextResponse } from "next/server";
import { resolveUserId } from "@/lib/auth/shortcut";
import { createMessage, listActiveMessages } from "@/lib/companion/messages";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const dashboardId = req.nextUrl.searchParams.get("dashboardId") ?? undefined;
  const messages = await listActiveMessages({ dashboardId });
  return NextResponse.json({ messages });
}

export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any = {};
  try { body = await req.json(); } catch {}
  const q = req.nextUrl.searchParams;

  const text = (body.text ?? q.get("text") ?? "").toString();
  if (!text.trim()) {
    return NextResponse.json({ error: "text erforderlich" }, { status: 400 });
  }
  const imageUrl = body.imageUrl ?? q.get("imageUrl") ?? null;
  const dashboardId = body.dashboardId ?? q.get("dashboardId") ?? null;
  const ttlSec = body.ttlSec !== undefined ? Number(body.ttlSec) : q.get("ttlSec") ? Number(q.get("ttlSec")) : null;

  const message = await createMessage({
    userId,
    text,
    imageUrl: imageUrl ? String(imageUrl) : null,
    targetDashboardId: dashboardId ? String(dashboardId) : null,
    ttlSec: ttlSec && Number.isFinite(ttlSec) ? ttlSec : null,
  });

  if ((global as any).LIVE_SYNC_IO) {
    (global as any).LIVE_SYNC_IO.emit("MESSAGE_POSTED", message);
  }
  return NextResponse.json({ message });
}
