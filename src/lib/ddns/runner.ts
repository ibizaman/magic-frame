import "server-only";
import {
  getDdnsConfig,
  getDdnsState,
  setDdnsState,
  effectiveProviderParams,
  isProviderConfigured,
  type DdnsConfig,
  type DdnsState,
} from "./store";
import { getProvider } from "./providers";

async function getPublicIp(): Promise<string> {
  // ipify ist klein, kostenfrei und gibt nur die IP zurück (kein JSON nötig).
  const res = await fetch("https://api.ipify.org?format=text", {
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`ipify returned ${res.status}`);
  const ip = (await res.text()).trim();
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
    throw new Error(`Invalid IP from ipify: ${ip}`);
  }
  return ip;
}

export type DdnsRunResult = {
  ran: boolean;
  changed: boolean;
  ip: string | null;
  reason?: string;
  error?: string;
};

/** Background-Tick: führt nur aus, wenn enabled + intervalMin abgelaufen. */
export async function runDdnsTick(force = false): Promise<DdnsRunResult> {
  const cfg = await getDdnsConfig();
  if (!cfg.enabled && !force) return { ran: false, changed: false, ip: null, reason: "disabled" };
  if (!isProviderConfigured(cfg)) {
    return { ran: false, changed: false, ip: null, reason: "not configured" };
  }

  const state = await getDdnsState();
  if (!force && state.lastCheck) {
    const ageMs = Date.now() - new Date(state.lastCheck).getTime();
    if (ageMs < cfg.intervalMin * 60_000) {
      return { ran: false, changed: false, ip: state.currentIp, reason: "interval not elapsed" };
    }
  }

  return runDdnsNow(cfg);
}

/** Sofortiger Update-Lauf (egal ob enabled). Für „Update jetzt"-Button und tick(force). */
export async function runDdnsNow(cfgArg?: DdnsConfig): Promise<DdnsRunResult> {
  const cfg = cfgArg ?? (await getDdnsConfig());
  if (!isProviderConfigured(cfg)) {
    await setDdnsState({
      lastCheck: new Date().toISOString(),
      lastError: "Not configured",
    });
    return { ran: false, changed: false, ip: null, error: "Not configured" };
  }
  const now = new Date().toISOString();
  try {
    const ip = await getPublicIp();
    const provider = getProvider(cfg.provider);
    const params = effectiveProviderParams(cfg);
    const { changed, recordIp } = await provider.update(params, ip);
    const next: Partial<DdnsState> = {
      currentIp: ip,
      lastIp: recordIp,
      lastCheck: now,
      lastError: null,
    };
    if (changed) next.lastUpdate = now;
    await setDdnsState(next);
    return { ran: true, changed, ip };
  } catch (err: any) {
    await setDdnsState({
      lastCheck: now,
      lastError: err?.message || String(err),
    });
    return { ran: true, changed: false, ip: null, error: err?.message || String(err) };
  }
}
