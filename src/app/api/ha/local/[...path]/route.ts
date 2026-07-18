import { NextRequest, NextResponse } from "next/server";
import { getAppSettings } from "@/lib/settings/store";

export const dynamic = "force-dynamic";

/**
 * Proxy für Dateien aus Home Assistants www-Ordner (/local/…).
 *
 * GET /api/ha/local/car/auto.png → ${haUrl}/local/car/auto.png
 *
 * Damit funktioniert im Status-Widget ein Bild-Pfad wie
 * "/local/car/auto.png" direkt — der Frame muss HA nicht selbst erreichen,
 * die App holt das Bild (gleiches Vertrauensmodell wie der Artwork-Proxy).
 * HA liefert /local/* ohne Auth aus; der Token wird trotzdem mitgeschickt,
 * falls ein Auth-Proxy davor hängt.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await context.params;
    const parts = (path || []).filter((p) => p && p !== "." && p !== "..");
    if (parts.length === 0) {
      return NextResponse.json({ error: "Missing path" }, { status: 400 });
    }

    const settings = await getAppSettings();
    if (!settings.haUrl) {
      return NextResponse.json(
        { error: "Home Assistant not configured (Integrationen)." },
        { status: 400 },
      );
    }

    const base = settings.haUrl.replace(/\/+$/, "");
    const url = `${base}/local/${parts.map(encodeURIComponent).join("/")}`;
    const upstream = await fetch(url, {
      headers: settings.haToken ? { Authorization: `Bearer ${settings.haToken}` } : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Home Assistant returned ${upstream.status}` },
        { status: 502 },
      );
    }

    const contentType = upstream.headers.get("content-type") || "image/png";
    const body = await upstream.arrayBuffer();
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        // Statische www-Dateien ändern sich selten — kurz cachen entlastet HA.
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Local file proxy failed" },
      { status: 500 },
    );
  }
}
