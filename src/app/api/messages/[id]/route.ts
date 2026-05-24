import { NextRequest, NextResponse } from "next/server";
import { resolveUserId } from "@/lib/auth/shortcut";
import { dismissMessage } from "@/lib/companion/messages";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await dismissMessage(id);

  if ((global as any).LIVE_SYNC_IO) {
    (global as any).LIVE_SYNC_IO.emit("MESSAGE_DISMISSED", { id });
  }
  return NextResponse.json({ ok: true });
}
