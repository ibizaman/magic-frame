import "server-only";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export type AppSettingsShape = {
  haUrl: string;
  haToken: string;
};

async function legacyFromDashboardOne(): Promise<Partial<AppSettingsShape>> {
  try {
    const d = await prisma.dashboard.findUnique({ where: { id: "1" } });
    const s = d?.settings as any;
    if (s && (s.haUrl || s.haToken)) {
      return { haUrl: s.haUrl ?? "", haToken: s.haToken ?? "" };
    }
  } catch {}
  return {};
}

export async function getAppSettings(): Promise<AppSettingsShape> {
  const row = await prisma.appSettings.findUnique({ where: { id: "global" } });
  if (row && (row.haUrl || row.haToken)) {
    return { haUrl: row.haUrl, haToken: row.haToken };
  }
  const legacy = await legacyFromDashboardOne();
  if (row) {
    return { haUrl: row.haUrl || legacy.haUrl || "", haToken: row.haToken || legacy.haToken || "" };
  }
  return { haUrl: legacy.haUrl ?? "", haToken: legacy.haToken ?? "" };
}

export async function updateAppSettings(patch: Partial<AppSettingsShape>) {
  const now = new Date();
  await prisma.appSettings.upsert({
    where: { id: "global" },
    update: {
      ...(patch.haUrl !== undefined ? { haUrl: patch.haUrl } : {}),
      ...(patch.haToken !== undefined ? { haToken: patch.haToken } : {}),
      updatedAt: now,
    },
    create: {
      id: "global",
      haUrl: patch.haUrl ?? "",
      haToken: patch.haToken ?? "",
    },
  });
}
