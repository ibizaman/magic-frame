import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "@/lib/auth/password";
import { getSession } from "@/lib/auth/session";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function POST(req: NextRequest) {
  const existingCount = await prisma.user.count();
  if (existingCount > 0) {
    return NextResponse.json(
      { error: "Setup bereits abgeschlossen — bitte einloggen." },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email, password } = (body ?? {}) as {
    email?: unknown;
    password?: unknown;
  };

  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json(
      { error: "Email und Passwort erforderlich." },
      { status: 400 },
    );
  }

  const normalizedEmail = email.toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return NextResponse.json(
      { error: "Ungültige Email-Adresse." },
      { status: 400 },
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Passwort muss mindestens 8 Zeichen lang sein." },
      { status: 400 },
    );
  }

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash: hashPassword(password),
      role: "admin",
    },
  });

  const session = await getSession();
  session.userId = user.id;
  session.email = user.email;
  session.role = user.role;
  await session.save();

  return NextResponse.json({
    user: { id: user.id, email: user.email, role: user.role },
  });
}
