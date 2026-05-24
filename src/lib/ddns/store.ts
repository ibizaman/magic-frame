import "server-only";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import type { ProviderName } from "./types";
import { PROVIDER_NAMES, getProvider } from "./providers";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Pro Provider eigener Konfig-Bag (flach im JSON gespeichert), damit der User beim
 * Provider-Wechsel seine Eingaben pro Provider behält.
 */
export type DdnsConfig = {
  enabled: boolean;
  provider: ProviderName;
  intervalMin: number;
  /** Pro Provider eigene String-Map (siehe Provider.fields). */
  providerConfig: Partial<Record<ProviderName, Record<string, string>>>;
};

export type DdnsState = {
  currentIp: string | null;
  lastIp: string | null;
  lastCheck: string | null;
  lastUpdate: string | null;
  lastError: string | null;
};

export const DDNS_DEFAULT_CONFIG: DdnsConfig = {
  enabled: false,
  provider: "cloudflare",
  intervalMin: 5,
  providerConfig: {},
};

export const DDNS_DEFAULT_STATE: DdnsState = {
  currentIp: null,
  lastIp: null,
  lastCheck: null,
  lastUpdate: null,
  lastError: null,
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

/**
 * Liest Config aus DB und migriert ggf. das alte (flache) Cloudflare-Schema
 * auf das neue `providerConfig`-Layout.
 */
export async function getDdnsConfig(): Promise<DdnsConfig> {
  const extra = await readExtra();
  const raw = (extra.ddns?.config as Record<string, any>) ?? {};

  const provider: ProviderName = PROVIDER_NAMES.includes(raw.provider)
    ? raw.provider
    : "cloudflare";

  // Migration: altes Schema { apiToken, zone, record } auf Top-Level → in providerConfig.cloudflare
  let providerConfig: DdnsConfig["providerConfig"] = raw.providerConfig ?? {};
  if (
    !providerConfig.cloudflare &&
    (raw.apiToken || raw.zone || raw.record)
  ) {
    providerConfig = {
      ...providerConfig,
      cloudflare: {
        apiToken: String(raw.apiToken ?? ""),
        zone: String(raw.zone ?? ""),
        record: String(raw.record ?? ""),
      },
    };
  }

  return {
    enabled: !!raw.enabled,
    provider,
    intervalMin: clampInterval(raw.intervalMin),
    providerConfig,
  };
}

function clampInterval(v: any): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 5;
  return Math.max(1, Math.min(1440, Math.floor(n)));
}

export async function setDdnsConfig(patch: Partial<DdnsConfig>): Promise<DdnsConfig> {
  const cur = await getDdnsConfig();
  const next: DdnsConfig = {
    ...cur,
    ...patch,
    intervalMin: clampInterval(patch.intervalMin ?? cur.intervalMin),
    providerConfig: { ...cur.providerConfig, ...(patch.providerConfig ?? {}) },
  };
  const extra = await readExtra();
  const ddns = (extra.ddns as any) ?? {};
  await writeExtra({ ddns: { ...ddns, config: next } });
  return next;
}

export async function getDdnsState(): Promise<DdnsState> {
  const extra = await readExtra();
  const s = (extra.ddns?.state as Partial<DdnsState>) ?? {};
  return { ...DDNS_DEFAULT_STATE, ...s };
}

export async function setDdnsState(patch: Partial<DdnsState>) {
  const extra = await readExtra();
  const ddns = (extra.ddns as any) ?? {};
  const cur: DdnsState = { ...DDNS_DEFAULT_STATE, ...(ddns.state ?? {}) };
  const next: DdnsState = { ...cur, ...patch };
  await writeExtra({ ddns: { ...ddns, state: next } });
  return next;
}

/**
 * Liefert die effektiven Felder für den aktuell gewählten Provider — inkl.
 * Defaults für leere optionale Felder.
 */
export function effectiveProviderParams(cfg: DdnsConfig): Record<string, string> {
  const p = getProvider(cfg.provider);
  const stored = cfg.providerConfig[cfg.provider] ?? {};
  const out: Record<string, string> = {};
  for (const f of p.fields) {
    const v = stored[f.key];
    if (v && v.length > 0) out[f.key] = v;
    else if (f.defaultValue) out[f.key] = f.defaultValue;
    else out[f.key] = "";
  }
  return out;
}

/** True wenn alle Pflicht-Felder des aktuellen Providers gesetzt sind. */
export function isProviderConfigured(cfg: DdnsConfig): boolean {
  const p = getProvider(cfg.provider);
  const params = effectiveProviderParams(cfg);
  return p.fields.every((f) => !f.required || (params[f.key] && params[f.key].length > 0));
}
