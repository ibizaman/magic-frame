import { NextRequest, NextResponse } from "next/server";
import {
  verifySession,
  UnauthorizedError,
  unauthorizedResponse,
} from "@/lib/auth/dal";
import { prisma } from "@/lib/companion/prisma";
import { hashPassword } from "@/lib/auth/password";

export const dynamic = "force-dynamic";

function serialize(u: any) {
  return {
    id: u.id,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : u.createdAt,
    hasShortcutToken: !!u.shortcutToken,
  };
}

// GET /api/admin/users — Liste aller Nutzer
export async function GET() {
  try {
    const session = await verifySession();
    const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
    return NextResponse.json({
      users: users.map(serialize),
      currentUserId: session.userId,
      currentRole: session.role,
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    console.error("users list error", err);
    return NextResponse.json({ error: "Interner Fehler." }, { status: 500 });
  }
}

// POST /api/admin/users — neuen Nutzer anlegen (nur Admin)
export async function POST(req: NextRequest) {
  try {
    const session = await verifySession();
    if (session.role !== "admin") {
      return NextResponse.json(
        { error: "Nur Admins dürfen Nutzer anlegen." },
        { status: 403 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const emailRaw = body?.email;
    const password = body?.password;
    const role = body?.role === "viewer" ? "viewer" : "admin";

    if (typeof emailRaw !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { error: "E-Mail und Passwort erforderlich." },
        { status: 400 },
      );
    }
    const email = emailRaw.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Ungültige E-Mail." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Passwort muss mindestens 8 Zeichen haben." },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Diese E-Mail ist bereits vergeben." },
        { status: 409 },
      );
    }

    const user = await prisma.user.create({
      data: { email, passwordHash: hashPassword(password), role },
    });

    return NextResponse.json({ user: serialize(user) });
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    console.error("user create error", err);
    return NextResponse.json({ error: "Interner Fehler." }, { status: 500 });
  }
}
