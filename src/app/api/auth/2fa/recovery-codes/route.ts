import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  verifySession,
  UnauthorizedError,
  unauthorizedResponse,
} from "@/lib/auth/dal";
import { verifyPassword } from "@/lib/auth/password";
import { generateRecoveryCodes, hashRecoveryCode } from "@/lib/auth/totp";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/** GET — liefert nur die *Anzahl* verbliebener Codes (Klartext ist weg). */
export async function GET() {
  try {
    const session = await verifySession();
    const user = await prisma.user.findUnique({ where: { id: session.userId! } });
    if (!user) return NextResponse.json({ error: "User nicht gefunden." }, { status: 404 });
    if (!user.totpEnabled) return NextResponse.json({ enabled: false, remaining: 0 });
    const list = safeParse(user.recoveryCodes);
    return NextResponse.json({ enabled: true, remaining: list.length });
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

/**
 * POST { password } — generiert neue Codes (Klartext im Response, einmalig)
 * und ersetzt damit alle alten.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await verifySession();
    const user = await prisma.user.findUnique({ where: { id: session.userId! } });
    if (!user) return NextResponse.json({ error: "User nicht gefunden." }, { status: 404 });
    if (!user.totpEnabled) {
      return NextResponse.json({ error: "2FA ist nicht aktiv." }, { status: 400 });
    }
    const body = await req.json().catch(() => ({}));
    const password = typeof body.password === "string" ? body.password : "";
    if (!verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: "Passwort falsch." }, { status: 401 });
    }

    const recoveryCodes = generateRecoveryCodes();
    const hashed = recoveryCodes.map(hashRecoveryCode);
    await prisma.user.update({
      where: { id: user.id },
      data: { recoveryCodes: JSON.stringify(hashed) },
    });
    return NextResponse.json({ ok: true, recoveryCodes });
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

function safeParse(s: string | null): string[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
