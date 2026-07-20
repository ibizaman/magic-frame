// In-Memory-Registry der verbundenen Displays: jeder offene /view meldet
// per Heartbeat seine Viewport-Größe. Lebt wie der HA-Bridge-Cache im
// Prozessspeicher (Single-Instance-App) — kein DB-Schema, kein Breaking.
// Genutzt von der Karten-Vorschau im Editor ("echte Display-Größe").

export type ViewClient = {
  clientId: string;
  dashboardId: string;
  width: number;
  height: number;
  dpr: number;
  lastSeen: number;
};

const clients = new Map<string, ViewClient>();
const MAX_CLIENTS = 300;
const ACTIVE_MS = 3 * 60 * 1000; // nach 3 min ohne Heartbeat gilt ein Display als weg

export function reportViewClient(c: Omit<ViewClient, "lastSeen">) {
  if (clients.size >= MAX_CLIENTS && !clients.has(c.clientId)) {
    // Ältesten Eintrag verdrängen — schützt den Speicher vor Müll-Clients.
    let oldestKey = "";
    let oldest = Infinity;
    for (const [k, v] of clients) if (v.lastSeen < oldest) { oldest = v.lastSeen; oldestKey = k; }
    if (oldestKey) clients.delete(oldestKey);
  }
  clients.set(c.clientId, { ...c, lastSeen: Date.now() });
}

export function listViewClients(dashboardId: string): ViewClient[] {
  const now = Date.now();
  const out: ViewClient[] = [];
  for (const c of clients.values()) {
    if (c.dashboardId === dashboardId && now - c.lastSeen < ACTIVE_MS) out.push(c);
  }
  // Stabil sortieren: größtes Display zuerst (meist der Hauptmonitor).
  return out.sort((a, b) => b.width - a.width);
}
