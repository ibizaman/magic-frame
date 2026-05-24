import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { verifyPassword } from "@/lib/auth/password";
import { getSession } from "@/lib/auth/session";
import { clientIp } from "@/lib/auth/ip";
import {
  assertNotLocked,
  recordAttempt,
  LockedError,
} from "@/lib/auth/lockout";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// 5 Minuten Fenster für TOTP-Eingabe nach erfolgreichem Passwort.
const TOTP_CHALLENGE_TTL_MS = 5 * 60 * 1000;

export async function POST(req: NextRequest) {
  const ip = clientIp(req);

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

  // Lockout-Check zuerst — verhindert dass wir bei gesperrten Konten überhaupt
  // Passwort-Hashes berechnen (kostet Zeit + leakt Information).
  try {
    await assertNotLocked(ip, normalizedEmail);
  } catch (err) {
    if (err instanceof LockedError) {
      await recordAttempt({ ip, email: normalizedEmail, success: false, reason: "locked" });
      return lockedResponse(err);
    }
    throw err;
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  const ok = user ? verifyPassword(password, user.passwordHash) : false;

  if (!user || !ok) {
    await recordAttempt({
      ip,
      email: normalizedEmail,
      success: false,
      reason: user ? "bad_pwd" : "no_user",
    });
    // Falls dieser Versuch das Limit gerissen hat → 423 zurück (sonst 401).
    try {
      await assertNotLocked(ip, normalizedEmail);
    } catch (err) {
      if (err instanceof LockedError) return lockedResponse(err);
    }
    return NextResponse.json(
      { error: "Email oder Passwort falsch." },
      { status: 401 },
    );
  }

  const session = await getSession();

  if (user.totpEnabled && user.totpSecret) {
    // Passwort ok — TOTP-Challenge öffnen, aber NICHT als eingeloggt markieren.
    session.userId = undefined;
    session.email = undefined;
    session.role = undefined;
    session.pendingTotpUserId = user.id;
    session.pendingTotpEmail = user.email;
    session.pendingTotpExpires = Date.now() + TOTP_CHALLENGE_TTL_MS;
    await session.save();
    // Den Passwort-Erfolg loggen wir NICHT als success — erst nach TOTP.
    return NextResponse.json({
      requireTotp: true,
      recoveryAvailable: !!user.recoveryCodes && user.recoveryCodes.length > 2,
    });
  }

  session.userId = user.id;
  session.email = user.email;
  session.role = user.role;
  session.pendingTotpUserId = undefined;
  session.pendingTotpEmail = undefined;
  session.pendingTotpExpires = undefined;
  await session.save();

  await recordAttempt({ ip, email: normalizedEmail, success: true, reason: "ok" });

  return NextResponse.json({
    user: { id: user.id, email: user.email, role: user.role },
  });
}

function lockedResponse(err: LockedError) {
  const seconds = Math.max(0, Math.ceil((err.until.getTime() - Date.now()) / 1000));
  return NextResponse.json(
    {
      error:
        err.kind === "ip"
          ? `IP gesperrt. Bitte in ${formatDuration(seconds)} erneut versuchen.`
          : `Konto gesperrt. Bitte in ${formatDuration(seconds)} erneut versuchen.`,
      lockedUntil: err.until.toISOString(),
      kind: err.kind,
    },
    { status: 423, headers: { "Retry-After": String(seconds) } },
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} s`;
  const min = Math.ceil(seconds / 60);
  if (min < 60) return `${min} min`;
  const h = Math.ceil(min / 60);
  return `${h} h`;
}
