import { NextRequest, NextResponse } from "next/server";
import { getAppSettings } from "@/lib/settings/store";

export const dynamic = "force-dynamic";

/**
 * Server-side proxy for Home Assistant camera snapshots.
 *
 * GET /api/ha/camera/<entity_id>/snapshot
 *  → fetches HA's /api/camera_proxy/<entity_id> with the stored Bearer token
 *  → streams the JPEG back to the browser
 *
 * The HA token never reaches the browser. The browser only sees this app's
 * own URL, which is convenient for cache-busting (just append ?ts=…).
 *
 * No auth check on this route on purpose — the Live View is read-only and
 * loads the snapshot directly from a tablet without a session. The HA
 * connection itself acts as the access control (only entities your HA
 * exposes are reachable).
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ entity: string }> },
) {
  try {
    const { entity } = await context.params;
    if (!entity || !entity.includes(".")) {
      return NextResponse.json(
        { error: "Invalid entity ID" },
        { status: 400 },
      );
    }

    const settings = await getAppSettings();
    if (!settings.haUrl || !settings.haToken) {
      return NextResponse.json(
        { error: "Home Assistant not configured (Integrationen)." },
        { status: 400 },
      );
    }

    const base = settings.haUrl.replace(/\/+$/, "");
    const upstream = await fetch(
      `${base}/api/camera_proxy/${encodeURIComponent(entity)}`,
      {
        headers: { Authorization: `Bearer ${settings.haToken}` },
        cache: "no-store",
        // Tablets refresh every couple seconds, so an 8s upper bound is
        // generous. If the camera is slower than that the snapshot is stale
        // anyway and we'd rather fail fast than hang the request.
        signal: AbortSignal.timeout(8000),
      },
    );

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Home Assistant returned ${upstream.status}` },
        { status: 502 },
      );
    }

    const contentType =
      upstream.headers.get("content-type") || "image/jpeg";
    const body = await upstream.arrayBuffer();

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        // Browser must NEVER cache the snapshot — refresh comes from the
        // widget reassigning <img src> with a fresh ?ts= every interval.
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        Pragma: "no-cache",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Camera proxy failed" },
      { status: 500 },
    );
  }
}
