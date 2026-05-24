import "server-only";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Todoist-Integration: REST API v2 mit User-Token.
 * Token kommt aus Todoist → Einstellungen → Integrationen → Entwickler.
 * Wir speichern nur den Token — Projekte und Tasks werden live über die API gelesen.
 */
export type TodoistConfig = {
  apiToken: string;
};

export const DEFAULT_TODOIST_CONFIG: TodoistConfig = { apiToken: "" };

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

export async function getTodoistConfig(): Promise<TodoistConfig> {
  const extra = await readExtra();
  const raw = (extra.todoist as Partial<TodoistConfig>) ?? {};
  return {
    apiToken: typeof raw.apiToken === "string" ? raw.apiToken.trim() : "",
  };
}

export async function setTodoistConfig(patch: Partial<TodoistConfig>): Promise<TodoistConfig> {
  const cur = await getTodoistConfig();
  const next: TodoistConfig = { ...cur, ...patch };
  await writeExtra({ todoist: next });
  return next;
}
