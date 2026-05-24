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

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/** POST { password } — deaktiviert 2FA komplett (löscht Secret + Recovery-Codes). */
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

    await prisma.user.update({
      where: { id: user.id },
      data: {
        totpEnabled: false,
        totpSecret: null,
        recoveryCodes: null,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
