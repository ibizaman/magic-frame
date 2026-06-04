import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { getAppSettings } from '@/lib/settings/store';

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export const dynamic = 'force-dynamic';

// Holt die Asset-Liste je nach gewählter Immich-Quelle (issue #16, Schritt 2).
//   album      → /api/albums/{id}                  (Default, bisheriges Verhalten)
//   favorites  → POST /api/search/metadata {isFavorite}
//   memories   → GET /api/memories  (alle Rückblick-Assets zusammengeführt)
//   people     → POST /api/search/metadata {personIds}
// Alle Pfade liefern Immich-Assets mit (optional) exifInfo — die Metadata-/
// Proxy-Logik darunter bleibt identisch.
async function fetchImmichAssets(baseUrl: string, apiKey: string, wp: any): Promise<any[]> {
  const headers = { 'x-api-key': apiKey, 'Accept': 'application/json' };
  const mode = wp.immichMode || 'album';

  if (mode === 'favorites' || mode === 'people') {
    const body: any = { type: 'IMAGE', size: 250, withExif: true };
    if (mode === 'favorites') body.isFavorite = true;
    if (mode === 'people') {
      if (!wp.immichPersonId) throw new Error('Missing personId');
      body.personIds = [wp.immichPersonId];
    }
    const r = await fetch(`${baseUrl}/api/search/metadata`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`Immich search ${r.status}`);
    const d = await r.json();
    return d?.assets?.items ?? [];
  }

  if (mode === 'memories') {
    const r = await fetch(`${baseUrl}/api/memories`, { headers });
    if (!r.ok) throw new Error(`Immich memories ${r.status}`);
    const d = await r.json();
    const list = Array.isArray(d) ? d : [];
    // Jede Memory hat ein eigenes assets[]-Array — alle zusammenführen.
    return list.flatMap((m: any) => (Array.isArray(m?.assets) ? m.assets : []));
  }

  // album (default)
  if (!wp.immichAlbumId) throw new Error('Missing albumId');
  const r = await fetch(`${baseUrl}/api/albums/${wp.immichAlbumId}`, { headers });
  if (!r.ok) throw new Error(`Immich album ${r.statusText}`);
  const d = await r.json();
  return d?.assets ?? [];
}

export async function GET(req: NextRequest) {
  try {
     const dashboardId = req.nextUrl.searchParams.get('dashboardId') || "1";
     // en-US matches the Clock + Calendar + Weather widgets — gives
     // "May 27, 2026" for English and "27. Mai 2026" for German, so the
     // photo metadata under the wallpaper reads the same as the rest of
     // the dashboard.
     const dateLocale = req.nextUrl.searchParams.get('lang') === 'en' ? 'en-US' : 'de-DE';
     const dashboard = await prisma.dashboard.findUnique({ where: { id: dashboardId } });
     if (!dashboard || !dashboard.wallpaper) return new NextResponse("Not Found", { status: 404 });
     const wp = dashboard.wallpaper as any;

     if (wp.source !== 'immich') return new NextResponse("Not Immich", { status: 400 });
     // Per-View-Daten gewinnen, sonst globale Immich-Verbindung (issue #16).
     const settings = await getAppSettings();
     const immichUrl = wp.immichUrl || settings.immichUrl;
     const immichApiKey = wp.immichApiKey || settings.immichApiKey;
     if (!immichUrl || !immichApiKey) return new NextResponse("Missing Immich configuration", { status: 400 });

     const baseUrl = immichUrl.replace(/\/$/, "");

     const assets = await fetchImmichAssets(baseUrl, immichApiKey, wp);

     if (assets.length === 0) return new NextResponse("No assets found for this Immich source", { status: 404 });

     // Shuffle and select up to 200 assets
     const shuffled = assets.sort(() => 0.5 - Math.random());
     const selected = shuffled.slice(0, 200);

     const playlist = [];

     for (const asset of selected) {
        let metadata: any = undefined;

        if (wp.showMetadata) {
           metadata = {};
           const exif = asset.exifInfo;

           if (exif) {
              if (exif.dateTimeOriginal) {
                  const dateObj = new Date(exif.dateTimeOriginal);
                  if (!isNaN(dateObj.getTime())) {
                     const formattedDate = new Intl.DateTimeFormat(dateLocale, { day: '2-digit', month: 'long', year: 'numeric' }).format(dateObj);
                     metadata.dateTaken = formattedDate;
                  }
              }
              if (exif.model) {
                 metadata.cameraModel = exif.model;
              }
              if (exif.city || exif.state || exif.country) {
                 // Try to formulate a nice location name
                 const parts = [];
                 if (exif.city) parts.push(exif.city);
                 if (exif.state && !exif.city) parts.push(exif.state);
                 if (exif.country) parts.push(exif.country);
                 if (parts.length > 0) metadata.locationName = parts.join(', ');
              }
           }

           // Fallback to file creation date if no EXIF date
           if (!metadata.dateTaken && asset.fileCreatedAt) {
               const dateObj = new Date(asset.fileCreatedAt);
               if (!isNaN(dateObj.getTime())) {
                   const formattedDate = new Intl.DateTimeFormat(dateLocale, { day: '2-digit', month: 'long', year: 'numeric' }).format(dateObj);
                   metadata.dateTaken = formattedDate;
               }
           }
        }

        playlist.push({
           id: asset.id,
           // Points to our secure proxy
           url: `/api/wallpaper/immich?id=${asset.id}&dashboardId=${dashboardId}`,
           metadata
        });
     }

     return NextResponse.json(playlist);
  } catch (error) {
     console.error("Immich Playlist Error:", error);
     return new NextResponse("Internal Server Error", { status: 500 });
  }
}
