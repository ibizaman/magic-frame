import "server-only";
import { prisma } from "./prisma";

export type MessageRecord = {
  id: string;
  text: string;
  imageUrl: string | null;
  targetDashboardId: string | null;
  createdAt: string;
  expiresAt: string | null;
};

function serialize(m: any): MessageRecord {
  return {
    id: m.id,
    text: m.text,
    imageUrl: m.imageUrl,
    targetDashboardId: m.targetDashboardId,
    createdAt: m.createdAt.toISOString(),
    expiresAt: m.expiresAt ? m.expiresAt.toISOString() : null,
  };
}

export async function createMessage(params: {
  userId: string;
  text: string;
  imageUrl?: string | null;
  targetDashboardId?: string | null;
  ttlSec?: number | null;
}): Promise<MessageRecord> {
  const expiresAt = params.ttlSec && params.ttlSec > 0
    ? new Date(Date.now() + params.ttlSec * 1000)
    : null;
  const row = await prisma.boardMessage.create({
    data: {
      userId: params.userId,
      text: params.text.slice(0, 500),
      imageUrl: params.imageUrl ?? null,
      targetDashboardId: params.targetDashboardId ?? null,
      expiresAt,
    },
  });
  return serialize(row);
}

export async function listActiveMessages(params: {
  dashboardId?: string;
  limit?: number;
}): Promise<MessageRecord[]> {
  const now = new Date();
  const rows = await prisma.boardMessage.findMany({
    where: {
      dismissedAt: null,
      AND: [
        { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        params.dashboardId
          ? { OR: [{ targetDashboardId: null }, { targetDashboardId: params.dashboardId }] }
          : {},
      ],
    },
    orderBy: { createdAt: "desc" },
    take: params.limit ?? 20,
  });
  return rows.map(serialize);
}

export async function dismissMessage(id: string) {
  await prisma.boardMessage.update({
    where: { id },
    data: { dismissedAt: new Date() },
  });
}
