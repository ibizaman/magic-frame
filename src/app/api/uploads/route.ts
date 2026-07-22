import { NextRequest, NextResponse } from "next/server";
import { verifySession, UnauthorizedError, unauthorizedResponse } from "@/lib/auth/dal";
import { listUploads, saveUpload, deleteUpload, ALLOWED, MAX_UPLOAD_BYTES } from "@/lib/uploads/store";

export const dynamic = "force-dynamic";

// Verwaltung eigener Bilder (Status-Karten & Co.). Alles hier ist
// session-geschützt — das Ausliefern der Dateien läuft über
// /api/uploads/[name] und ist bewusst offen, weil Displays keine Sitzung haben.

export async function GET() {
  try {
    await verifySession();
    return NextResponse.json({ uploads: await listUploads() });
  } catch (e) {
    if (e instanceof UnauthorizedError) return unauthorizedResponse();
    return NextResponse.json({ uploads: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    await verifySession();
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Keine Datei empfangen" }, { status: 400 });
    }
    if (!ALLOWED[file.type]) {
      return NextResponse.json(
        { error: "Nur PNG, JPEG, WebP oder GIF" },
        { status: 415 },
      );
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: `Datei ist zu groß (max. ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB)` },
        { status: 413 },
      );
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const saved = await saveUpload(file.name, file.type, buf);
    return NextResponse.json(saved);
  } catch (e: any) {
    if (e instanceof UnauthorizedError) return unauthorizedResponse();
    return NextResponse.json({ error: e?.message ?? "Upload fehlgeschlagen" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await verifySession();
    const name = req.nextUrl.searchParams.get("name") || "";
    const ok = await deleteUpload(name);
    return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
  } catch (e) {
    if (e instanceof UnauthorizedError) return unauthorizedResponse();
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
