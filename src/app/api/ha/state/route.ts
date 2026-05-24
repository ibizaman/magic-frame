import { NextRequest, NextResponse } from "next/server";
import { getAppSettings } from "@/lib/settings/store";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
     const entityId = req.nextUrl.searchParams.get('entityId');
     const idsParam = req.nextUrl.searchParams.get('ids');

     if (!entityId && !idsParam) return new NextResponse("Missing entity IDs", { status: 400 });

     // Support both old `entityId` and new `ids=A,B,C`
     const rawIds = idsParam ? idsParam.split(',') : [entityId as string];
     const entities = rawIds.map(e => e.trim()).filter(e => e);

     const settings = await getAppSettings();
     if (!settings.haUrl || !settings.haToken) {
        return new NextResponse("Home Assistant not configured", { status: 400 });
     }

     const fetchEntity = async (id: string) => {
        const url = `${settings.haUrl.replace(/\/$/, '')}/api/states/${id}`;
        const response = await fetch(url, {
           headers: {
              "Authorization": `Bearer ${settings.haToken}`,
              "Content-Type": "application/json",
           },
           cache: 'no-store'
        });
        if (!response.ok) return null;
        return response.json();
     };

     const results = await Promise.all(entities.map(id => fetchEntity(id)));
     
     const dict: Record<string, any> = {};
     entities.forEach((id, index) => {
         if (results[index]) dict[id] = results[index];
     });

     return NextResponse.json(dict);
  } catch (error) {
     console.error("HA Proxy Error:", error);
     return new NextResponse("Internal Proxy Error", { status: 500 });
  }
}
