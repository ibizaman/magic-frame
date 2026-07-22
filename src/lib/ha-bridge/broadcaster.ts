import "server-only";
import WebSocket from "ws";
import { EventEmitter } from "events";
import { getAppSettings } from "@/lib/settings/store";

/**
 * Persistenter HA-WebSocket-Client mit:
 *  - lazy connect (erst bei erster Subscription)
 *  - automatischem auth / subscribe_events
 *  - Reconnect mit Exponential Backoff
 *  - In-Memory-Cache der letzten bekannten States (für Snapshots
 *    an neu hinzukommende SSE-Clients)
 *
 * Als Prozess-Singleton auf `global.__haBroadcaster`, damit er
 * Hot-Reload in Next.js Dev und API-Route-Re-Imports überlebt.
 */
class HaBroadcaster extends EventEmitter {
  private ws: WebSocket | null = null;
  private msgId = 1;
  private reconnectDelay = 2000;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private subscriberCount = 0;
  private connecting = false;
  private connected = false;
  private stateCache = new Map<string, any>();

  constructor() {
    super();
    this.setMaxListeners(1000);
  }

  /** Returns the last known state for an entity (or undefined). */
  getCached(entityId: string): any | undefined {
    return this.stateCache.get(entityId);
  }

  /** Returns a fresh dict of {entityId: state} for the given ids. */
  getCachedMany(entityIds: string[]): Record<string, any> {
    const out: Record<string, any> = {};
    for (const id of entityIds) {
      const s = this.stateCache.get(id);
      if (s) out[id] = s;
    }
    return out;
  }

  isConnected(): boolean {
    return this.connected;
  }

  addSubscriber() {
    this.subscriberCount++;
    this.ensureConnected();
  }

  removeSubscriber() {
    this.subscriberCount = Math.max(0, this.subscriberCount - 1);
    // Intentionally keep connection open even at 0 subscribers — ein
    // paar Sekunden später kommt meist der nächste Client, und der
    // Cache ist dann schon warm.
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.ensureConnected();
    }, this.reconnectDelay);
    this.reconnectDelay = Math.min(60_000, this.reconnectDelay * 2);
  }

  private async ensureConnected() {
    if (this.connected || this.connecting) return;
    const settings = await getAppSettings();
    if (!settings.haUrl || !settings.haToken) {
      // Keine Config — Reconnect macht hier auch nichts besser, bis
      // der Nutzer die Settings eingibt. Wir lassen aber das
      // reconnectTimer-Flag stehen, sodass ein späterer Subscriber
      // einen neuen Versuch startet.
      return;
    }

    this.connecting = true;

    try {
      const base = settings.haUrl.replace(/\/$/, "");
      const wsUrl = base.replace(/^http/i, "ws") + "/api/websocket";

      // Socket LOKAL festhalten: bei einem Reconnect zeigt this.ws sonst
      // schon auf die neue, noch verbindende Verbindung — ein verspäteter
      // Handler der alten hat dann auf die neue gesendet und den Prozess
      // mit "WebSocket is not open: readyState 0" aussteigen lassen.
      const ws = new WebSocket(wsUrl);
      this.ws = ws;
      const send = (payload: any) => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
      };

      ws.on("message", (data) => {
        let msg: any;
        try {
          msg = JSON.parse(data.toString());
        } catch {
          return;
        }

        if (msg.type === "auth_required") {
          send({ type: "auth", access_token: settings.haToken });
        } else if (msg.type === "auth_ok") {
          this.connected = true;
          this.connecting = false;
          this.reconnectDelay = 2000;
          this.emit("open");
          // Initialer Snapshot + Event-Subscription
          send({ id: this.msgId++, type: "get_states" });
          send({
            id: this.msgId++,
            type: "subscribe_events",
            event_type: "state_changed",
          });
        } else if (msg.type === "result" && Array.isArray(msg.result)) {
          // get_states-Antwort
          for (const entity of msg.result) {
            if (entity?.entity_id) this.stateCache.set(entity.entity_id, entity);
          }
          this.emit("snapshot");
        } else if (
          msg.type === "event" &&
          msg.event?.event_type === "state_changed"
        ) {
          const entity = msg.event.data?.new_state;
          if (entity?.entity_id) {
            this.stateCache.set(entity.entity_id, entity);
            this.emit("state", entity);
          }
        } else if (msg.type === "auth_invalid") {
          console.error("[HA Broadcaster] auth_invalid — HA-Token prüfen.");
          this.connecting = false;
          ws.close();
          // Kein automatischer Reconnect bei Auth-Fehler — sonst DoS auf HA.
          return;
        }
      });

      ws.on("close", () => {
        // Nur reagieren, wenn das noch DIE aktuelle Verbindung ist.
        if (this.ws !== ws) return;
        this.connected = false;
        this.connecting = false;
        if (this.subscriberCount > 0) this.scheduleReconnect();
      });

      ws.on("error", (err) => {
        console.error("[HA Broadcaster] WS error:", err);
        // close-Event folgt; Reconnect läuft dort.
      });
    } catch (e) {
      this.connecting = false;
      console.error("[HA Broadcaster] connect failed:", e);
      this.scheduleReconnect();
    }
  }
}

export function getBroadcaster(): HaBroadcaster {
  const g = global as any;
  if (!g.__haBroadcaster) {
    g.__haBroadcaster = new HaBroadcaster();
  }
  return g.__haBroadcaster as HaBroadcaster;
}
