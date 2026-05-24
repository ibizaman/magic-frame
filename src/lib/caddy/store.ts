import "server-only";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  CADDY_DNS_PROVIDER_NAMES,
  type CaddyDnsProviderName,
} from "./providers";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Caddy als integrierter Reverse-Proxy. Default (mode=managed, enabled=false
 * oder domain leer) = transparenter HTTP-Proxy auf :80 → app:3000 ohne TLS.
 *
 * mode="managed": App generiert Caddyfile aus Domain + Provider-Config
 * mode="custom":  User hat sein eigenes Caddyfile reingeschrieben (Escape-Hatch
 *                  für Edge-Cases die unsere Provider-Liste nicht abdeckt).
 *
 * `providerConfig` ist pro Provider ein eigener String-Bag (Felder kommen aus
 * der Caddy-Provider-Registry — pro Provider eigene Auth-Felder).
 */
export type CaddyConfig = {
  enabled: boolean;
  mode: "managed" | "custom";
  domain: string;
  acmeEmail: string;
  challenge: "dns" | "http";
  dnsProvider: CaddyDnsProviderName;
  redirectHttp: boolean;
  extraDomains: string[];
  /** Pro DNS-Provider eigene Auth-Felder (siehe CADDY_DNS_PROVIDERS[x].fields). */
  providerConfig: Partial<Record<CaddyDnsProviderName, Record<string, string>>>;
  /** User-eigenes Caddyfile, nur relevant wenn mode=custom. */
  customCaddyfile: string;
};

export type CaddyStatus = {
  reachable: boolean;
  tlsMode: boolean;
  version?: string;
  certSubject?: string | null;
  certNotAfter?: string | null;
  lastReload?: string | null;
  lastError?: string | null;
};

export const DEFAULT_CADDY_CONFIG: CaddyConfig = {
  enabled: false,
  mode: "managed",
  domain: "",
  acmeEmail: "",
  challenge: "dns",
  dnsProvider: "cloudflare",
  redirectHttp: true,
  extraDomains: [],
  providerConfig: {},
  customCaddyfile: "",
};

async function readExtra(): Promise<Record<string, any>> {
  const row = await prisma.appSettings.findUnique({ where: { id: "global" } });
  return (row?.extra as Record<string, any>) ?? {};
}

async function writeExtra(patch: Record<string, any>) {
  const cur = await readExtra();
  const next = { ...cur, ...patch };
  await prisma.appSettings.upsert({
    where: { id: "global" },
    update: { extra: next, updatedAt: new Date() },
    create: { id: "global", haUrl: "", haToken: "", extra: next, updatedAt: new Date() },
  });
}

export async function getCaddyConfig(): Promise<CaddyConfig> {
  const extra = await readExtra();
  const raw = (extra.caddy?.config as Record<string, any>) ?? {};
  const dnsProvider = CADDY_DNS_PROVIDER_NAMES.includes(raw.dnsProvider as any)
    ? (raw.dnsProvider as CaddyDnsProviderName)
    : "cloudflare";

  // Backward compat: alte Schema hatte nur `apiToken` flach unter caddy.config.
  // Wenn vorhanden, in providerConfig.<dnsProvider> migrieren.
  let providerConfig: CaddyConfig["providerConfig"] = raw.providerConfig ?? {};
  if (
    raw.apiToken &&
    !providerConfig[dnsProvider]?.apiToken
  ) {
    providerConfig = {
      ...providerConfig,
      [dnsProvider]: { ...(providerConfig[dnsProvider] ?? {}), apiToken: String(raw.apiToken) },
    };
  }

  return {
    enabled: !!raw.enabled,
    mode: raw.mode === "custom" ? "custom" : "managed",
    domain: typeof raw.domain === "string" ? raw.domain.trim() : "",
    acmeEmail: typeof raw.acmeEmail === "string" ? raw.acmeEmail.trim() : "",
    challenge: raw.challenge === "http" ? "http" : "dns",
    dnsProvider,
    redirectHttp: raw.redirectHttp !== false,
    extraDomains: Array.isArray(raw.extraDomains)
      ? raw.extraDomains.filter((s: any): s is string => typeof s === "string" && s.length > 0)
      : [],
    providerConfig,
    customCaddyfile: typeof raw.customCaddyfile === "string" ? raw.customCaddyfile : "",
  };
}

export async function setCaddyConfig(patch: Partial<CaddyConfig>): Promise<CaddyConfig> {
  const cur = await getCaddyConfig();
  const next: CaddyConfig = {
    ...cur,
    ...patch,
    providerConfig: { ...cur.providerConfig, ...(patch.providerConfig ?? {}) },
  };
  const extra = await readExtra();
  const caddyExtra = (extra.caddy as any) ?? {};
  await writeExtra({ caddy: { ...caddyExtra, config: next } });
  return next;
}

export async function getCaddyState(): Promise<{
  lastReload: string | null;
  lastError: string | null;
  certInfo: { subject?: string; notAfter?: string } | null;
}> {
  const extra = await readExtra();
  const s = (extra.caddy?.state as any) ?? {};
  return {
    lastReload: s.lastReload ?? null,
    lastError: s.lastError ?? null,
    certInfo: s.certInfo ?? null,
  };
}

export async function setCaddyState(patch: {
  lastReload?: string | null;
  lastError?: string | null;
  certInfo?: { subject?: string; notAfter?: string } | null;
}) {
  const extra = await readExtra();
  const caddyExtra = (extra.caddy as any) ?? {};
  const cur = caddyExtra.state ?? {};
  const next = { ...cur, ...patch };
  await writeExtra({ caddy: { ...caddyExtra, state: next } });
  return next;
}
