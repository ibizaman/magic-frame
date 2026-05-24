import "server-only";
import type { DdnsProvider } from "../types";

const CF_BASE = "https://api.cloudflare.com/client/v4";

async function cf<T = any>(
  token: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${CF_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    signal: AbortSignal.timeout(8000),
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) {
    const msg =
      (data?.errors && data.errors[0]?.message) ||
      data?.message ||
      `Cloudflare API error ${res.status}`;
    throw new Error(msg);
  }
  return data.result as T;
}

type CfRecord = {
  id: string;
  type: string;
  name: string;
  content: string;
  ttl: number;
  proxied?: boolean;
};

export const cloudflareProvider: DdnsProvider = {
  name: "cloudflare",
  label: "Cloudflare",
  description:
    "Cloudflare DNS via API-Token (Zone:Read + DNS:Edit). Update via offizielle Cloudflare-API.",
  fields: [
    {
      key: "apiToken",
      label: "API-Token",
      type: "password",
      placeholder: "eyJh…",
      help: "Token braucht Zone:Read + DNS:Edit für die Zone.",
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
      label: "Record-Name (FQDN)",
      type: "text",
      placeholder: "home.example.com",
      required: true,
    },
  ],

  async update(p, ip) {
    const token = p.apiToken;
    const zone = p.zone;
    const fqdn = p.record;

    const zones = await cf<Array<{ id: string; name: string }>>(
      token,
      `/zones?name=${encodeURIComponent(zone)}`,
    );
    if (!zones || zones.length === 0) {
      throw new Error(`Zone "${zone}" nicht gefunden (hat das Token Zugriff?)`);
    }
    const zoneId = zones[0].id;

    const recs = await cf<CfRecord[]>(
      token,
      `/zones/${zoneId}/dns_records?type=A&name=${encodeURIComponent(fqdn)}`,
    );
    let rec = recs && recs[0] ? recs[0] : null;
    let changed = false;
    if (!rec) {
      rec = await cf<CfRecord>(token, `/zones/${zoneId}/dns_records`, {
        method: "POST",
        body: JSON.stringify({ type: "A", name: fqdn, content: ip, ttl: 1 }),
      });
      changed = true;
    } else if (rec.content !== ip) {
      rec = await cf<CfRecord>(token, `/zones/${zoneId}/dns_records/${rec.id}`, {
        method: "PATCH",
        body: JSON.stringify({ content: ip }),
      });
      changed = true;
    }
    return { changed, recordIp: rec.content };
  },
};
