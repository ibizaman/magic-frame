import { NextRequest, NextResponse } from "next/server";
import { getAppSettings } from "@/lib/settings/store";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
     const body = await req.json();
     if (!body.entityId) return new NextResponse("Missing entityId", { status: 400 });

     const entityId = body.entityId;
     const serviceName = body.service || 'toggle';
     const domain = body.domain || 'homeassistant'; // Most toggles can be done via homeassistant.toggle

     const settings = await getAppSettings();
     if (!settings.haUrl || !settings.haToken) {
        return new NextResponse("Home Assistant not configured", { status: 400 });
     }

     const cleanHaUrl = settings.haUrl.replace(/\/+$/, '');
     const url = `${cleanHaUrl}/api/services/${domain}/${serviceName}`;
     
     console.log(`[HA Action] Sending POST to ${url} with entity_id: ${entityId}, payload:`, JSON.stringify(body.data));

     const res = await fetch(url, {
         method: 'POST',
         headers: {
             'Authorization': `Bearer ${settings.haToken}`,
             'Content-Type': 'application/json'
         },
         body: JSON.stringify({ entity_id: entityId, ...(body.data || {}) }),
         // Timeout 5 seconds to prevent hanging the proxy
         signal: AbortSignal.timeout(5000)
     });

     if (!res.ok) {
         return new NextResponse(`HA returned error: ${res.status}`, { status: res.status });
     }

     const data = await res.json();
     return NextResponse.json({ success: true, response: data });

  } catch (error) {
     console.error("[HA Action Error]", error);
     return new NextResponse("Action failed", { status: 500 });
  }
}
