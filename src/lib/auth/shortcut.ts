import "server-only";
import { NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { getSession } from "./session";
import crypto from "crypto";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Beide Authentifizierungs-Wege zulassen:
//   - iron-session-Cookie (Browser-Editor)
//   - ?key=<token> Query-Param oder Authorization: Bearer <token> (Shortcuts)
export async function resolveUserId(req: NextRequest): Promise<string | null> {
  // Session-Cookie zuerst
  try {
    const session = await getSession();
    if (session.userId) return session.userId;
  } catch {}

  // Dann Token via Query oder Header
  const tokenFromQuery = req.nextUrl.searchParams.get("key");
  const authHeader = req.headers.get("authorization");
  const bearerMatch = authHeader?.match(/^Bearer\s+(.+)$/i);
  const token = tokenFromQuery || bearerMatch?.[1];
  if (!token || token.length < 16) return null;

  const user = await prisma.user.findUnique({
    where: { shortcutToken: token },
    select: { id: true },
  });
  return user?.id ?? null;
}

export async function getOrCreateShortcutToken(userId: string): Promise<string> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { shortcutToken: true },
  });
  if (u?.shortcutToken) return u.shortcutToken;
  const token = crypto.randomBytes(24).toString("base64url");
  await prisma.user.update({
    where: { id: userId },
    data: { shortcutToken: token },
  });
  return token;
}

export async function rotateShortcutToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(24).toString("base64url");
  await prisma.user.update({
    where: { id: userId },
    data: { shortcutToken: token },
  });
  return token;
}
