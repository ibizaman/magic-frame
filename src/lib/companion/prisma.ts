import "server-only";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

// Singleton über global, damit Hot-Reload keine zweiten Pools anlegt.
declare global {
  var __companionPrisma: PrismaClient | undefined;
}
export const prisma: PrismaClient =
  global.__companionPrisma ?? new PrismaClient({ adapter });
if (process.env.NODE_ENV !== "production") global.__companionPrisma = prisma;
