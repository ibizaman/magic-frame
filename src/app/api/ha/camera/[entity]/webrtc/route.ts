import { NextRequest, NextResponse } from "next/server";
import { getAppSettings } from "@/lib/settings/store";

export const dynamic = "force-dynamic";

/**
 * WebRTC signaling proxy for Home Assistant cameras.
 *
 * POST /api/ha/camera/<entity_id>/webrtc
 *   body: { offer: "<sdp>" }
 *   returns: { answer: "<sdp>" }  on success
 *            { error: "..."   }  on failure
 *
 * HA exposes its WebRTC support through the WebSocket API only — there's
 * no REST endpoint. So we open a short-lived WebSocket to HA per request:
 *   1. Connect to ws://…/api/websocket
 *   2. Wait for `auth_required`
 *   3. Send `{type: "auth", access_token}`
 *   4. Wait for `auth_ok`
 *   5. Send `{id: 1, type: "camera/webrtc/offer", entity_id, offer}`
 *   6. Wait for the matching `result` message with the answer
 *   7. Close
 *
 * The browser uses the returned answer to complete its RTCPeerConnection.
 * The HA token never reaches the browser — this route does the auth dance
 * on its behalf.
 *
 * Requires HA's `webrtc` capability (built-in for go2rtc-backed setups,
 * also works for cameras whose integration ships its own webrtc_offer
 * provider, e.g. Reolink/UniFi via go2rtc, ESPHome cameras, etc.).
 */

const WS_TIMEOUT_MS = 12_000;

type WSMessage = {
  id?: number;
  type?: string;
  success?: boolean;
  result?: any;
  error?: { code?: string; message?: string };
  message?: string;
};

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ entity: string }> },
) {
  try {
    const { entity } = await context.params;
    if (!entity || !entity.includes(".")) {
      return NextResponse.json({ error: "Invalid entity ID" }, { status: 400 });
    }
    const { offer } = (await request.json().catch(() => ({}))) as { offer?: string };
    if (!offer || typeof offer !== "string") {
      return NextResponse.json({ error: "Missing SDP offer" }, { status: 400 });
    }

    const settings = await getAppSettings();
    if (!settings.haUrl || !settings.haToken) {
      return NextResponse.json(
        { error: "Home Assistant not configured (Integrationen)." },
        { status: 400 },
      );
    }

    const wsUrl =
      settings.haUrl
        .replace(/^https?:\/\//, (m) => (m === "https://" ? "wss://" : "ws://"))
        .replace(/\/+$/, "") + "/api/websocket";

    const answer = await signal(wsUrl, settings.haToken, entity, offer);
    return NextResponse.json({ answer });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "WebRTC signaling failed" },
      { status: 502 },
    );
  }
}

/**
 * Runs the full WS auth + offer/answer dance against HA. Resolves with
 * the answer SDP. Rejects with a clear Error if any step fails or times
 * out — the catch in POST() turns that into the JSON 502.
 */
function signal(
  wsUrl: string,
  token: string,
  entity: string,
  offer: string,
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    // Node 22+ has WebSocket as a global. Magic Frame's container uses
    // node:20-alpine — that version got native WebSocket as well, so this
    // works without an extra `ws` dep.
    const ws = new WebSocket(wsUrl);

    let cmdId = 1;
    let settled = false;
    const finish = (err: Error | null, value?: string) => {
      if (settled) return;
      settled = true;
      try {
        ws.close();
      } catch {}
      if (err) reject(err);
      else resolve(value || "");
    };

    const timer = setTimeout(
      () => finish(new Error(`WebSocket signaling timed out after ${WS_TIMEOUT_MS}ms`)),
      WS_TIMEOUT_MS,
    );

    ws.addEventListener("error", () => {
      clearTimeout(timer);
      finish(new Error("WebSocket connection error"));
    });

    ws.addEventListener("close", () => {
      clearTimeout(timer);
      if (!settled) finish(new Error("WebSocket closed before answer arrived"));
    });

    ws.addEventListener("message", (ev: MessageEvent) => {
      let msg: WSMessage;
      try {
        msg = JSON.parse(ev.data as string) as WSMessage;
      } catch {
        return;
      }

      if (msg.type === "auth_required") {
        ws.send(JSON.stringify({ type: "auth", access_token: token }));
        return;
      }
      if (msg.type === "auth_invalid") {
        clearTimeout(timer);
        finish(new Error(msg.message || "HA rejected token"));
        return;
      }
      if (msg.type === "auth_ok") {
        ws.send(
          JSON.stringify({
            id: cmdId,
            type: "camera/webrtc/offer",
            entity_id: entity,
            offer,
          }),
        );
        return;
      }

      // Result for our command. HA replies in two shapes depending on
      // version: either a single `result` with {answer} (success) or
      // subscribe-style `event` with the same payload. Newer versions
      // also tend to use `webrtc/answer`. Handle both shapes defensively.
      if (msg.id === cmdId) {
        clearTimeout(timer);
        if (msg.success === false) {
          finish(
            new Error(
              msg.error?.message || msg.error?.code || "HA rejected webrtc offer",
            ),
          );
          return;
        }
        const answer =
          (msg.result && (msg.result.answer || msg.result.sdp)) ||
          msg.result;
        if (typeof answer === "string" && answer.length > 0) {
          finish(null, answer);
        } else if (msg.type === "result" && answer && typeof answer === "object") {
          // Sometimes wrapped one level deeper.
          const nested = (answer as any).answer || (answer as any).sdp;
          if (typeof nested === "string") finish(null, nested);
          else finish(new Error("HA returned no answer SDP"));
        } else {
          finish(new Error("HA returned no answer SDP"));
        }
      }
    });
  });
}
