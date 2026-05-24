import "server-only";
import type { DdnsProvider } from "../types";

// Docs: https://dns.hetzner.com/api-docs/
const HZ_BASE = "https://dns.hetzner.com/api/v1";

async function hz<T = any>(
  token: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${HZ_BASE}${path}`, {
    ...init,
    headers: {
      "Auth-API-Token": token,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    signal: AbortSignal.timeout(8000),
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.message || data?.error?.message || `Hetzner API ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

type HzZone = { id: string; name: string };
type HzRecord = {
  id: string;
  type: string;
  name: string; // Hetzner liefert Sub-Name relativ zur Zone (z. B. "home", "@" für apex)
  value: string;
  zone_id: string;
  ttl?: number;
};

export const hetznerProvider: DdnsProvider = {
  name: "hetzner",
  label: "Hetzner DNS",
  description:
    "Hetzner DNS via Auth-API-Token (in der Hetzner-DNS-Konsole erstellbar).",
  fields: [
    {
      key: "apiToken",
      label: "Auth-API-Token",
      type: "password",
      placeholder: "xxxxxxxxxxxxxxxxxx",
      help: "DNS-Console → Access Tokens → neuer Token.",
      required: true,
    },
    {
      key: "zone",
      label: "Zone (Domain)",
      type: "text",
      placeholder: "example.com",
      required: true,
    },
    {
      key: "record",
      label: "Record-Name (FQDN oder Sub)",
      type: "text",
      placeholder: "home.example.com oder home",
      help: "FQDN oder Sub-Name relativ zur Zone. „@\" = Apex.",
      required: true,
    },
  ],

  async update(p, ip) {
    const token = p.apiToken;
    const zoneName = p.zone.trim();
    let recordName = p.record.trim();

    // FQDN -> Sub relativ zur Zone
    if (recordName.endsWith("." + zoneName)) {
      recordName = recordName.slice(0, -1 * (zoneName.length + 1));
    } else if (recordName === zoneName) {
      recordName = "@";
    }

    const zonesRes = await hz<{ zones: HzZone[] }>(
      token,
      `/zones?name=${encodeURIComponent(zoneName)}`,
    );
    const zone = zonesRes.zones?.find((z) => z.name === zoneName);
    if (!zone) throw new Error(`Zone "${zoneName}" nicht gefunden.`);

    const recsRes = await hz<{ records: HzRecord[] }>(
      token,
      `/records?zone_id=${encodeURIComponent(zone.id)}`,
    );
    const existing = recsRes.records?.find(
      (r) => r.type === "A" && r.name === recordName,
    );

    let changed = false;
    let recordIp = ip;
    if (!existing) {
      const created = await hz<{ record: HzRecord }>(token, `/records`, {
        method: "POST",
        body: JSON.stringify({
          zone_id: zone.id,
          type: "A",
          name: recordName,
          value: ip,
          ttl: 60,
        }),
      });
      changed = true;
      recordIp = created.record.value;
    } else if (existing.value !== ip) {
      const upd = await hz<{ record: HzRecord }>(token, `/records/${existing.id}`, {
        method: "PUT",
        body: JSON.stringify({
          zone_id: zone.id,
          type: "A",
          name: recordName,
          value: ip,
          ttl: existing.ttl ?? 60,
        }),
      });
      changed = true;
      recordIp = upd.record.value;
    } else {
      recordIp = existing.value;
    }
    return { changed, recordIp };
  },
};
