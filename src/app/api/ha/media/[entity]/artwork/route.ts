import { NextRequest, NextResponse } from "next/server";
import { getAppSettings } from "@/lib/settings/store";

export const dynamic = "force-dynamic";

/**
 * Server-side proxy for a Home Assistant media_player's album artwork.
 *
 * GET /api/ha/media/<entity_id>/artwork
 *  → reads the entity state, grabs attributes.entity_picture (a relative
 *    HA URL that already carries a signed token), fetches it with the
 *    stored Bearer token and streams the image back.
 *
 * Same trust model as the camera snapshot proxy: the HA token never reaches
 * the browser, and the route is unauthenticated on purpose so a read-only
 * kiosk /view can load it without a session. Only entities your HA exposes
 * are reachable.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ entity: string }> },
) {
  try {
    const { entity } = await context.params;
    if (!entity || !entity.includes(".")) {
      return NextResponse.json({ error: "Invalid entity ID" }, { status: 400 });
    }

    const settings = await getAppSettings();
    if (!settings.haUrl || !settings.haToken) {
      return NextResponse.json(
        { error: "Home Assistant not configured (Integrationen)." },
        { status: 400 },
      );
    }

    const base = settings.haUrl.replace(/\/+$/, "");
    const auth = { Authorization: `Bearer ${settings.haToken}` };

    // 1) resolve the current entity_picture from the entity state
    const stateRes = await fetch(
      `${base}/api/states/${encodeURIComponent(entity)}`,
      { headers: auth, cache: "no-store", signal: AbortSignal.timeout(6000) },
    );
    if (!stateRes.ok) {
      return NextResponse.json(
        { error: `Home Assistant returned ${stateRes.status}` },
        { status: 502 },
      );
    }
    const state = await stateRes.json();
    // Most players expose attributes.entity_picture, but some local/DLNA
    // integrations (e.g. Samsung Smart Monitor) only set entity_picture_local.
    const pic: string | undefined =
      state?.attributes?.entity_picture || state?.attributes?.entity_picture_local;
    if (!pic) {
      // Nothing playing / no cover art available — 204 keeps the <img> quiet.
      return new NextResponse(null, { status: 204 });
    }

    // entity_picture is a path relative to the HA base (already token-signed).
    const artUrl = pic.startsWith("http") ? pic : `${base}${pic}`;
    const upstream = await fetch(artUrl, {
      headers: auth,
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Artwork fetch returned ${upstream.status}` },
        { status: 502 },
      );
    }

    const contentType = upstream.headers.get("content-type") || "image/jpeg";
    const body = await upstream.arrayBuffer();
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        // The widget cache-busts with ?ts= when the track changes, so the
        // browser must never serve a stale cover.
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        Pragma: "no-cache",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Artwork proxy failed" },
      { status: 500 },
    );
  }
}
