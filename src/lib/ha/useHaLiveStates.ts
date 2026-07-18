"use client";

import { useEffect, useRef, useState } from "react";

type State = {
  states: Record<string, any>;
  connected: boolean;
  error: string | null;
};

/**
 * Subscribes an einem persistenten SSE-Stream zu HA-States für die
 * angegebenen Entity-IDs. Der erste Snapshot kommt direkt nach der
 * Verbindung, danach reine state_changed-Deltas.
 *
 * WICHTIG: Alle Hook-Instanzen einer Seite teilen sich EINEN EventSource.
 * Früher öffnete jede Instanz ihren eigenen Stream — ab ~6 Widgets war das
 * Browser-Limit von 6 gleichzeitigen HTTP/1.1-Verbindungen pro Host
 * erschöpft und die Seite blockierte komplett (Bilder/APIs hingen ewig).
 * Der Singleton unten hält die Vereinigungsmenge aller angeforderten IDs
 * und öffnet den Stream (debounced) genau einmal neu, wenn sie sich ändert.
 *
 * Wenn `enabled=false` oder kein EventSource-Support, registriert sich der
 * Caller nicht und kann aufs Polling zurückfallen.
 */

// ── Seitenweiter Shared-Stream (Modul-Singleton) ──
const consumers = new Map<number, Set<string>>();
let nextConsumerId = 1;
let es: EventSource | null = null;
let openKey = ""; // IDs, die aktuell auf der Leitung abonniert sind
let sharedConnected = false;
const stateCache: Record<string, any> = {};
const listeners = new Set<() => void>();
let reopenTimer: ReturnType<typeof setTimeout> | null = null;

function unionKey(): string {
  const set = new Set<string>();
  for (const ids of consumers.values()) for (const id of ids) set.add(id);
  return Array.from(set).sort().join(",");
}

function notifyAll() {
  for (const l of Array.from(listeners)) l();
}

function syncStream() {
  if (reopenTimer) clearTimeout(reopenTimer);
  // Debounce: beim Seitenaufbau registrieren sich viele Widgets kurz
  // nacheinander — erst sammeln, dann EINEN Stream öffnen statt 6× neu.
  reopenTimer = setTimeout(() => {
    reopenTimer = null;
    const key = unionKey();
    if (key === openKey && es) return;
    if (es) {
      es.close();
      es = null;
    }
    openKey = key;
    if (!key) {
      sharedConnected = false;
      notifyAll();
      return;
    }
    const stream = new EventSource(`/api/ha/stream?ids=${encodeURIComponent(key)}`);
    es = stream;
    stream.onopen = () => {
      sharedConnected = true;
      notifyAll();
    };
    stream.onerror = () => {
      sharedConnected = false;
      notifyAll();
      // Browser handhabt automatischen Reconnect — nicht manuell schließen.
    };
    stream.onmessage = (ev) => {
      if (!ev.data) return;
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "snapshot") {
          Object.assign(stateCache, msg.states ?? {});
          if (typeof msg.connected === "boolean") sharedConnected = msg.connected;
          notifyAll();
        } else if (msg.type === "state") {
          const e = msg.entity;
          if (!e?.entity_id) return;
          stateCache[e.entity_id] = e;
          notifyAll();
        }
      } catch {
        /* ignore malformed */
      }
    };
  }, 150);
}

function pick(ids: string[]): Record<string, any> {
  const out: Record<string, any> = {};
  for (const id of ids) if (stateCache[id] !== undefined) out[id] = stateCache[id];
  return out;
}

export function useHaLiveStates(entityIds: string[], enabled: boolean = true): State {
  const idsKey = entityIds
    .filter((i) => !!i && i.trim() !== "")
    .sort()
    .join(",");

  const idsRef = useRef<string[]>([]);
  idsRef.current = idsKey ? idsKey.split(",") : [];

  // Erst-Render: was der Cache schon hat, sofort liefern (Remounts flackern nicht).
  const [states, setStates] = useState<Record<string, any>>(() => pick(idsRef.current));
  const [connected, setConnected] = useState(sharedConnected);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !idsKey) {
      setStates({});
      setConnected(false);
      return;
    }
    if (typeof window === "undefined" || typeof EventSource === "undefined") {
      setError("EventSource nicht verfügbar");
      return;
    }

    const myId = nextConsumerId++;
    consumers.set(myId, new Set(idsRef.current));

    // Nur neu rendern, wenn sich MEINE Teilmenge tatsächlich geändert hat —
    // sonst zöge jedes state_changed irgendeiner Entität alle Widgets mit.
    let lastSig = "";
    const listener = () => {
      const mine = pick(idsRef.current);
      const sig = idsRef.current
        .map((id) => `${id}:${mine[id]?.last_updated ?? mine[id]?.state ?? ""}`)
        .join("|") + `#${sharedConnected}`;
      if (sig === lastSig) return;
      lastSig = sig;
      setStates(mine);
      setConnected(sharedConnected);
    };
    listeners.add(listener);
    syncStream();
    listener(); // initialer Stand aus dem Cache

    return () => {
      listeners.delete(listener);
      consumers.delete(myId);
      syncStream(); // Vereinigungsmenge schrumpft ggf. / Stream schließt bei 0
    };
  }, [idsKey, enabled]);

  return { states, connected, error };
}
