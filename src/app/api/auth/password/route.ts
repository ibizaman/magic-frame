import { NextRequest, NextResponse } from "next/server";
import {
  verifySession,
  UnauthorizedError,
  unauthorizedResponse,
} from "@/lib/auth/dal";
import { prisma } from "@/lib/companion/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

export const dynamic = "force-dynamic";

// POST /api/auth/password  { currentPassword, newPassword }
export async function POST(req: NextRequest) {
  try {
    const session = await verifySession();
    const body = await req.json().catch(() => ({}));
    const currentPassword = body?.currentPassword;
    const newPassword = body?.newPassword;

    if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
      return NextResponse.json(
        { error: "Aktuelles und neues Passwort erforderlich." },
        { status: 400 },
      );
    }
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Neues Passwort muss mindestens 8 Zeichen haben." },
        { status: 400 },
      );
    }
    if (newPassword === currentPassword) {
      return NextResponse.json(
        { error: "Neues Passwort muss sich vom aktuellen unterscheiden." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({ where: { id: session.userId! } });
    if (!user) return unauthorizedResponse();

    if (!verifyPassword(currentPassword, user.passwordHash)) {
      return NextResponse.json(
        { error: "Aktuelles Passwort ist falsch." },
        { status: 403 },
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashPassword(newPassword) },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    console.error("password change error", err);
    return NextResponse.json({ error: "Interner Fehler." }, { status: 500 });
  }
}
