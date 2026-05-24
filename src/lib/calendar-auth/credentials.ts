import "server-only";
import { prisma } from "@/lib/companion/prisma";

// OAuth-Client-Zugangsdaten für Kalender-Provider.
// Quelle: AppSettings.extra.oauth (in der UI setzbar) mit Fallback auf env-Vars.
// Client-IDs sind nicht geheim; die Secrets werden nie an die UI zurückgegeben.

export type OAuthCreds = {
  googleClientId: string;
  googleClientSecret: string;
  msClientId: string;
  msClientSecret: string;
  msTenant: string;
};

const KEYS: (keyof OAuthCreds)[] = [
  "googleClientId",
  "googleClientSecret",
  "msClientId",
  "msClientSecret",
  "msTenant",
];

async function readExtra(): Promise<any> {
  try {
    const row = await prisma.appSettings.findUnique({ where: { id: "global" } });
    return (row?.extra as any) ?? {};
  } catch {
    return {};
  }
}

export async function getCalendarOAuthConfig(): Promise<OAuthCreds> {
  const stored = (await readExtra())?.oauth ?? {};
  return {
    googleClientId: stored.googleClientId || process.env.GOOGLE_CLIENT_ID || "",
    googleClientSecret: stored.googleClientSecret || process.env.GOOGLE_CLIENT_SECRET || "",
    msClientId: stored.msClientId || process.env.MS_CLIENT_ID || "",
    msClientSecret: stored.msClientSecret || process.env.MS_CLIENT_SECRET || "",
    msTenant: stored.msTenant || process.env.MS_TENANT || "common",
  };
}

export async function getCalendarOAuthStatus() {
  const stored = (await readExtra())?.oauth ?? {};
  const c = await getCalendarOAuthConfig();
  return {
    googleConfigured: !!c.googleClientId && !!c.googleClientSecret,
    microsoftConfigured: !!c.msClientId && !!c.msClientSecret,
    // Client-IDs zur Anzeige (nicht geheim). Secrets nur als Boolean.
    googleClientId: c.googleClientId,
    msClientId: c.msClientId,
    googleSecretSet: !!c.googleClientSecret,
    msSecretSet: !!c.msClientSecret,
    // Stammen die Werte aus env (read-only) oder aus der DB (UI-editierbar)?
    googleFromEnv: !stored.googleClientId && !!process.env.GOOGLE_CLIENT_ID,
    microsoftFromEnv: !stored.msClientId && !!process.env.MS_CLIENT_ID,
  };
}

export async function setCalendarOAuthCredentials(
  patch: Partial<OAuthCreds>,
): Promise<void> {
  const extra = await readExtra();
  const oauth: Record<string, string> = { ...(extra.oauth ?? {}) };
  for (const k of KEYS) {
    const v = patch[k];
    if (typeof v !== "string") continue;
    const trimmed = v.trim();
    // Nicht-leer → setzen. Leer → unverändert lassen (Secrets nicht versehentlich
    // löschen). Komplettes Zurücksetzen läuft über clearCalendarOAuthCredentials.
    if (trimmed) oauth[k] = trimmed;
  }
  await prisma.appSettings.upsert({
    where: { id: "global" },
    update: { extra: { ...extra, oauth } as any, updatedAt: new Date() },
    create: { id: "global", haUrl: "", haToken: "", extra: { oauth } as any },
  });
}

export async function clearCalendarOAuthCredentials(): Promise<void> {
  const extra = await readExtra();
  const next = { ...extra };
  delete next.oauth;
  await prisma.appSettings.upsert({
    where: { id: "global" },
    update: { extra: next as any, updatedAt: new Date() },
    create: { id: "global", haUrl: "", haToken: "" },
  });
}
