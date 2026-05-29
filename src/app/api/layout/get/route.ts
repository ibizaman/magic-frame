import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { migrateLayoutConfigs } from "@/lib/widgets/ha-migration";

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function GET(req: NextRequest) {
  try {
    const dashboardId = req.nextUrl.searchParams.get('dashboardId') || "1";
    
    const dashboard = await prisma.dashboard.findUnique({
      where: { id: dashboardId },
      include: { widgets: true }
    });

    if (!dashboard) {
       return NextResponse.json({ layout: [], wallpaper: null, settings: null }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } });
    }

    // Map to react-grid-layout format. Return the label verbatim (empty stays
    // empty) — the editor derives the display title from the widget type via
    // widgetTitle() and localises it. Injecting a German default here used to
    // be a second source of untranslated widget titles (issue #7).
    const rawLayout = dashboard.widgets.map(w => ({
      i: w.id,
      x: w.x,
      y: w.y,
      w: w.w,
      h: w.h,
      type: w.type,
      bgOpacity: w.bgOpacity,
      config: w.config,
      label: typeof w.label === "string" ? w.label : "",
    }));

    const layout = migrateLayoutConfigs(rawLayout);

    return NextResponse.json({ 
      layout, 
      wallpaper: dashboard.wallpaper, 
      settings: dashboard.settings 
    }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ layout: [], wallpaper: null, settings: null });
  }
}
