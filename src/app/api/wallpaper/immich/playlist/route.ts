import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
     const dashboardId = req.nextUrl.searchParams.get('dashboardId') || "1";
     const dateLocale = req.nextUrl.searchParams.get('lang') === 'en' ? 'en-GB' : 'de-DE';
     const dashboard = await prisma.dashboard.findUnique({ where: { id: dashboardId } });
     if (!dashboard || !dashboard.wallpaper) return new NextResponse("Not Found", { status: 404 });
     const wp = dashboard.wallpaper as any;

     if (wp.source !== 'immich') return new NextResponse("Not Immich", { status: 400 });
     if (!wp.immichUrl || !wp.immichApiKey || !wp.immichAlbumId) return new NextResponse("Missing Immich configuration", { status: 400 });

     const baseUrl = wp.immichUrl.replace(/\/$/, "");
     
     // Fetch Album info from Immich
     const res = await fetch(`${baseUrl}/api/albums/${wp.immichAlbumId}`, {
        headers: {
           'x-api-key': wp.immichApiKey,
           'Accept': 'application/json'
        }
     });

     if (!res.ok) {
        throw new Error(`Immich API error: ${res.statusText}`);
     }

     const albumData = await res.json();
     const assets = albumData.assets || [];

     if (assets.length === 0) return new NextResponse("No assets found in Immich album", { status: 404 });

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
