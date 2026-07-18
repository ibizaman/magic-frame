import { NextRequest, NextResponse } from "next/server";
import { getAppSettings } from "@/lib/settings/store";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
     const body = await req.json();
     if (!body.entityId) return new NextResponse("Missing entityId", { status: 400 });

     const entityId = body.entityId;
     let serviceName = body.service || 'toggle';
     let domain = body.domain || 'homeassistant'; // Most toggles can be done via homeassistant.toggle

     const settings = await getAppSettings();
     if (!settings.haUrl || !settings.haToken) {
        return new NextResponse("Home Assistant not configured", { status: 400 });
     }

     const cleanHaUrl = settings.haUrl.replace(/\/+$/, '');

     // #45: HA kennt kein lock.toggle — homeassistant.toggle überspringt
     // Lock-Entities stillschweigend. Deshalb: aktuellen Zustand holen und
     // gezielt lock.lock / lock.unlock aufrufen. Schlägt die Zustandsabfrage
     // fehl, bleibt das bisherige Verhalten (generischer Toggle) bestehen.
     if (serviceName === 'toggle' && domain === 'homeassistant' && String(entityId).startsWith('lock.')) {
        try {
           const st = await fetch(`${cleanHaUrl}/api/states/${entityId}`, {
              headers: { 'Authorization': `Bearer ${settings.haToken}` },
              signal: AbortSignal.timeout(4000),
           });
           if (st.ok) {
              const s = await st.json();
              domain = 'lock';
              serviceName = s.state === 'locked' ? 'unlock' : 'lock';
           }
        } catch { /* Zustand nicht ermittelbar — generischer Toggle als Fallback */ }
     }

     // Tasten kennen kein toggle — homeassistant.toggle überspringt sie
     // stillschweigend. Direkt drücken (Tipp-Aktion der Status-Karten u. a.).
     if (serviceName === 'toggle' && domain === 'homeassistant') {
        const eid = String(entityId);
        if (eid.startsWith('input_button.')) { domain = 'input_button'; serviceName = 'press'; }
        else if (eid.startsWith('button.')) { domain = 'button'; serviceName = 'press'; }
     }

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
