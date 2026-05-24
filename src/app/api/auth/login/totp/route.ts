import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { getSession } from "@/lib/auth/session";
import { clientIp } from "@/lib/auth/ip";
import {
  assertNotLocked,
  recordAttempt,
  LockedError,
} from "@/lib/auth/lockout";
import { verifyTotp, consumeRecoveryCode } from "@/lib/auth/totp";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Step 2 des Logins: TOTP-Code (oder Recovery-Code) verifizieren.
 * Nur erlaubt wenn die Session bereits eine pendingTotp-Challenge hat
 * (Passwort wurde erfolgreich geprüft, aber Login ist noch nicht abgeschlossen).
 */
export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const session = await getSession();

  if (!session.pendingTotpUserId || !session.pendingTotpEmail) {
    return NextResponse.json({ error: "Keine offene 2FA-Challenge." }, { status: 400 });
  }

  if (!session.pendingTotpExpires || Date.now() > session.pendingTotpExpires) {
    session.pendingTotpUserId = undefined;
    session.pendingTotpEmail = undefined;
    session.pendingTotpExpires = undefined;
    await session.save();
    return NextResponse.json(
      { error: "2FA-Challenge abgelaufen — bitte neu einloggen." },
      { status: 408 },
    );
  }

  const email = session.pendingTotpEmail;

  try {
    await assertNotLocked(ip, email);
  } catch (err) {
    if (err instanceof LockedError) {
      await recordAttempt({ ip, email, success: false, reason: "locked" });
      return lockedResponse(err);
    }
    throw err;
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const code = typeof body?.code === "string" ? body.code : "";
  const useRecovery = !!body?.useRecovery;

  const user = await prisma.user.findUnique({ where: { id: session.pendingTotpUserId } });
  if (!user || !user.totpEnabled || !user.totpSecret) {
    // Session zeigt auf einen User der inzwischen 2FA aus hat oder weg ist → reset.
    session.pendingTotpUserId = undefined;
    session.pendingTotpEmail = undefined;
    session.pendingTotpExpires = undefined;
    await session.save();
    return NextResponse.json({ error: "Bitte neu einloggen." }, { status: 400 });
  }

  let success = false;
  let newRecoveryCodes: string | null | undefined = undefined;

  if (useRecovery && user.recoveryCodes) {
    const stored = safeParse(user.recoveryCodes);
    const consumed = consumeRecoveryCode(stored, code);
    if (consumed) {
      success = true;
      newRecoveryCodes = JSON.stringify(consumed.remaining);
    }
  } else {
    success = await verifyTotp(user.totpSecret, code);
  }

  if (!success) {
    await recordAttempt({ ip, email, success: false, reason: "bad_totp" });
    try {
      await assertNotLocked(ip, email);
    } catch (err) {
      if (err instanceof LockedError) return lockedResponse(err);
    }
    return NextResponse.json(
      { error: useRecovery ? "Recovery-Code ungültig." : "TOTP-Code ungültig." },
      { status: 401 },
    );
  }

  // Erfolg → Recovery-Code-Verbrauch persistieren + Session voll authentifizieren
  if (newRecoveryCodes !== undefined) {
    await prisma.user.update({
      where: { id: user.id },
      data: { recoveryCodes: newRecoveryCodes },
    });
  }

  session.userId = user.id;
  session.email = user.email;
  session.role = user.role;
  session.pendingTotpUserId = undefined;
  session.pendingTotpEmail = undefined;
  session.pendingTotpExpires = undefined;
  await session.save();

  await recordAttempt({ ip, email, success: true, reason: useRecovery ? "ok_recovery" : "ok" });

  return NextResponse.json({
    user: { id: user.id, email: user.email, role: user.role },
    usedRecovery: useRecovery,
  });
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
