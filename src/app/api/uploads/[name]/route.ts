import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { resolveInside, ALLOWED } from "@/lib/uploads/store";

export const dynamic = "force-dynamic";

const MIME_BY_EXT: Record<string, string> = Object.fromEntries(
  Object.entries(ALLOWED).map(([mime, ext]) => [ext, mime]),
);

// Liefert ein hochgeladenes Bild aus. Bewusst OHNE Session-Prüfung: die
// Displays rufen /view ohne Anmeldung auf und müssen die Bilder laden können
// — genauso wie beim HA-local- und Immich-Proxy. resolveInside() stellt
// sicher, dass nur Dateien aus dem Upload-Ordner herauskommen.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const full = resolveInside(decodeURIComponent(name));
  if (!full) return new NextResponse("Not found", { status: 404 });

  const ext = path.extname(full).toLowerCase();
  const mime = MIME_BY_EXT[ext];
  if (!mime) return new NextResponse("Not found", { status: 404 });

  try {
    const data = await fs.readFile(full);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
