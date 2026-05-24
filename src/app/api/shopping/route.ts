import { NextRequest, NextResponse } from "next/server";
import { resolveUserId } from "@/lib/auth/shortcut";
import { addItems, clearChecked, listItems } from "@/lib/companion/shopping";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = await listItems();
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any = {};
  try { body = await req.json(); } catch {}
  const q = req.nextUrl.searchParams;

  // text → einzelner Artikel. items → Array (Shortcut kann beides).
  const raw = body.items ?? body.text ?? q.get("items") ?? q.get("text");
  let texts: string[] = [];
  if (Array.isArray(raw)) texts = raw.map(String);
  else if (typeof raw === "string") {
    // Erlaube Komma-getrennt: "Milch, Brot, Käse"
    texts = raw.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
  }
  if (texts.length === 0) {
    return NextResponse.json({ error: "text oder items erforderlich" }, { status: 400 });
  }

  const items = await addItems({ userId, texts });
  if ((global as any).LIVE_SYNC_IO) {
    (global as any).LIVE_SYNC_IO.emit("SHOPPING_UPDATED");
  }
  return NextResponse.json({ items });
}

// DELETE /api/shopping → löscht alle abgehakten Artikel
export async function DELETE(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await clearChecked();
  if ((global as any).LIVE_SYNC_IO) {
    (global as any).LIVE_SYNC_IO.emit("SHOPPING_UPDATED");
  }
  return NextResponse.json({ ok: true });
}
