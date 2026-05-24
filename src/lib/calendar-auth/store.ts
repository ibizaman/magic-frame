import "server-only";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export type Provider = "google" | "microsoft";

export async function listAccounts(userId: string) {
  const rows = await prisma.calendarAuth.findMany({
    where: { userId },
    orderBy: [{ provider: "asc" }, { createdAt: "asc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    provider: r.provider as Provider,
    accountEmail: r.accountEmail,
    accountName: r.accountName,
    expiresAt: r.expiresAt,
    hasRefresh: !!r.refreshToken,
  }));
}

export async function upsertAccount(params: {
  userId: string;
  provider: Provider;
  accountEmail: string | null;
  accountName: string | null;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date;
  scope: string | null;
}) {
  const { userId, provider, accountEmail } = params;
  // @@unique([userId, provider, accountEmail]) — Null-Emails können in PG
  // mehrfach auftreten. Wir key auf "" als Surrogat, wenn keine Email
  // geliefert wird.
  const keyEmail = accountEmail ?? "";
  const existing = await prisma.calendarAuth.findFirst({
    where: { userId, provider, accountEmail: keyEmail },
  });
  if (existing) {
    return prisma.calendarAuth.update({
      where: { id: existing.id },
      data: {
        accountName: params.accountName,
        accessToken: params.accessToken,
        refreshToken: params.refreshToken ?? existing.refreshToken,
        expiresAt: params.expiresAt,
        scope: params.scope,
      },
    });
  }
  return prisma.calendarAuth.create({
    data: {
      userId,
      provider,
      accountEmail: keyEmail,
      accountName: params.accountName,
      accessToken: params.accessToken,
      refreshToken: params.refreshToken,
      expiresAt: params.expiresAt,
      scope: params.scope,
    },
  });
}

export async function deleteAccount(userId: string, id: string) {
  return prisma.calendarAuth.deleteMany({ where: { id, userId } });
}

export async function getFreshAccessToken(accountId: string, userId: string): Promise<string | null> {
  const row = await prisma.calendarAuth.findFirst({ where: { id: accountId, userId } });
  if (!row) return null;

  const now = Date.now();
  // 60s Puffer, damit wir nicht mitten im Request ablaufen.
  if (row.expiresAt.getTime() - now > 60_000) {
    return row.accessToken;
  }

  if (!row.refreshToken) return null;

  if (row.provider === "google") {
    const refreshed = await refreshGoogleToken(row.refreshToken);
    if (!refreshed) return null;
    await prisma.calendarAuth.update({
      where: { id: row.id },
      data: {
        accessToken: refreshed.accessToken,
        expiresAt: new Date(Date.now() + refreshed.expiresInSec * 1000),
      },
    });
    return refreshed.accessToken;
  }

  if (row.provider === "microsoft") {
    const refreshed = await refreshMicrosoftToken(row.refreshToken);
    if (!refreshed) return null;
    await prisma.calendarAuth.update({
      where: { id: row.id },
      data: {
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken ?? row.refreshToken,
        expiresAt: new Date(Date.now() + refreshed.expiresInSec * 1000),
      },
    });
    return refreshed.accessToken;
  }

  return null;
}

async function refreshGoogleToken(refreshToken: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return { accessToken: data.access_token as string, expiresInSec: data.expires_in as number };
}

async function refreshMicrosoftToken(refreshToken: string) {
  const clientId = process.env.MS_CLIENT_ID;
  const clientSecret = process.env.MS_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
      scope: "offline_access Calendars.Read User.Read",
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return {
    accessToken: data.access_token as string,
    refreshToken: data.refresh_token as string | undefined,
    expiresInSec: data.expires_in as number,
  };
}
