import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Listet alle Immich-Alben für gegebene Credentials.
 * POST { url, apiKey } → { albums: [{ id, albumName, assetCount }] }
 *
 * Bewusst credential-in-body (analog zu /api/webdav/browse), damit der Editor
 * Alben live laden kann, BEVOR die Wallpaper-Config gespeichert ist. Es wird
 * nichts persistiert.
 */
export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    /* leer */
  }
  const url = body.url as string | undefined;
  const apiKey = body.apiKey as string | undefined;

  if (!url || !apiKey) {
    return NextResponse.json(
      { error: "Immich-URL und API-Key sind erforderlich." },
      { status: 400 },
    );
  }

  const baseUrl = String(url).replace(/\/+$/, "");

  try {
    const res = await fetch(`${baseUrl}/api/albums`, {
      headers: { "x-api-key": apiKey, Accept: "application/json" },
      // 10s reicht im LAN; verhindert Hänger wenn die URL nicht stimmt.
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      let msg = `Immich antwortete mit Status ${res.status}.`;
      if (res.status === 401 || res.status === 403)
        msg = "API-Key ungültig oder hat keine Album-Leserechte.";
      return NextResponse.json({ error: msg }, { status: res.status === 401 ? 401 : 502 });
    }

    const data = await res.json();
    const albums = (Array.isArray(data) ? data : [])
      .map((a: any) => ({
        id: String(a.id),
        albumName: a.albumName ?? "(ohne Name)",
        assetCount: typeof a.assetCount === "number" ? a.assetCount : (a.assets?.length ?? 0),
      }))
      .sort((a: any, b: any) => a.albumName.localeCompare(b.albumName, "de"));

    return NextResponse.json({ albums });
  } catch (error: any) {
    console.error("Immich Albums Error:", error?.message || error);
    const isTimeout = error?.name === "TimeoutError" || error?.name === "AbortError";
    return NextResponse.json(
      {
        error: isTimeout
          ? "Zeitüberschreitung — ist die Immich-URL korrekt und im selben Netz erreichbar?"
          : "Konnte Immich nicht erreichen. URL korrekt? (z.B. http://192.168.x.x:2283)",
      },
      { status: 500 },
    );
  }
}
