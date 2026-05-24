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
 * Wenn `enabled=false` oder kein EventSource-Support, wird kein
 * Stream geöffnet und der Caller muss (oder kann) aufs Polling
 * zurückfallen.
 */
export function useHaLiveStates(entityIds: string[], enabled: boolean = true): State {
  const [states, setStates] = useState<Record<string, any>>({});
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastIdsKey = useRef<string>("");

  const idsKey = entityIds
    .filter((i) => !!i && i.trim() !== "")
    .sort()
    .join(",");

  useEffect(() => {
    if (!enabled) {
      setConnected(false);
      return;
    }
    if (!idsKey) {
      setStates({});
      setConnected(false);
      return;
    }
    if (typeof window === "undefined" || typeof EventSource === "undefined") {
      setError("EventSource nicht verfügbar");
      return;
    }

    lastIdsKey.current = idsKey;
    const url = `/api/ha/stream?ids=${encodeURIComponent(idsKey)}`;
    const es = new EventSource(url);

    es.onopen = () => {
      setConnected(true);
      setError(null);
    };
    es.onerror = () => {
      setConnected(false);
      // Browser handhabt automatischen Reconnect — nicht manuell schließen.
    };

    es.onmessage = (ev) => {
      if (!ev.data) return;
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "snapshot") {
          setStates(msg.states ?? {});
          if (typeof msg.connected === "boolean") setConnected(msg.connected);
        } else if (msg.type === "state") {
          const e = msg.entity;
          if (!e?.entity_id) return;
          setStates((prev) => ({ ...prev, [e.entity_id]: e }));
        }
      } catch {
        /* ignore malformed */
      }
    };

    return () => {
      es.close();
    };
  }, [idsKey, enabled]);

  return { states, connected, error };
}
