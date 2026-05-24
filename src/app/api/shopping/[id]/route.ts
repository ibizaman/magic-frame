import { NextRequest, NextResponse } from "next/server";
import { resolveUserId } from "@/lib/auth/shortcut";
import { removeItem, toggleItem } from "@/lib/companion/shopping";

export const dynamic = "force-dynamic";

// Toggle: checked ↔ uncheckd
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const item = await toggleItem(id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if ((global as any).LIVE_SYNC_IO) {
    (global as any).LIVE_SYNC_IO.emit("SHOPPING_UPDATED");
  }
  return NextResponse.json({ item });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await removeItem(id);
  if ((global as any).LIVE_SYNC_IO) {
    (global as any).LIVE_SYNC_IO.emit("SHOPPING_UPDATED");
  }
  return NextResponse.json({ ok: true });
}
