import { NextRequest, NextResponse } from "next/server";
import { resolveUserId } from "@/lib/auth/shortcut";
import { dismissTimer } from "@/lib/timers/store";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await dismissTimer(id);

  if ((global as any).LIVE_SYNC_IO) {
    (global as any).LIVE_SYNC_IO.emit("TIMER_DISMISSED", { id });
  }

  return NextResponse.json({ ok: true });
}
