import "server-only";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export type TimerRecord = {
  id: string;
  label: string;
  targetDashboardId: string | null;
  startedAt: string;
  durationMs: number;
  completedAt: string | null;
  dismissedAt: string | null;
};

function serialize(t: any): TimerRecord {
  return {
    id: t.id,
    label: t.label,
    targetDashboardId: t.targetDashboardId,
    startedAt: t.startedAt.toISOString(),
    durationMs: t.durationMs,
    completedAt: t.completedAt ? t.completedAt.toISOString() : null,
    dismissedAt: t.dismissedAt ? t.dismissedAt.toISOString() : null,
  };
}

export async function createTimer(params: {
  userId: string;
  label: string;
  durationMs: number;
  targetDashboardId?: string | null;
}): Promise<TimerRecord> {
  const row = await prisma.timer.create({
    data: {
      userId: params.userId,
      label: params.label || "Timer",
      durationMs: params.durationMs,
      targetDashboardId: params.targetDashboardId ?? null,
    },
  });
  return serialize(row);
}

export async function listActiveTimers(params: {
  dashboardId?: string;
}): Promise<TimerRecord[]> {
  const rows = await prisma.timer.findMany({
    where: {
      dismissedAt: null,
      OR: params.dashboardId
        ? [{ targetDashboardId: null }, { targetDashboardId: params.dashboardId }]
        : undefined,
    },
    orderBy: { startedAt: "asc" },
    take: 20,
  });
  return rows.map(serialize);
}

export async function dismissTimer(id: string) {
  await prisma.timer.update({
    where: { id },
    data: { dismissedAt: new Date() },
  });
}

export async function dismissAllExpired() {
  // Hilfsfunktion falls jemand später einen Cron-Cleanup möchte.
  const now = new Date();
  const rows = await prisma.timer.findMany({
    where: { dismissedAt: null, completedAt: null },
  });
  for (const r of rows) {
    if (r.startedAt.getTime() + r.durationMs + 60_000 < now.getTime()) {
      await prisma.timer.update({
        where: { id: r.id },
        data: { completedAt: new Date(r.startedAt.getTime() + r.durationMs) },
      });
    }
  }
}
