import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  verifySession,
  UnauthorizedError,
  unauthorizedResponse,
} from "@/lib/auth/dal";
import {
  generateTotpSecret,
  otpauthUrl,
  qrDataUrl,
  verifyTotp,
  generateRecoveryCodes,
  hashRecoveryCode,
  formatSecretForDisplay,
} from "@/lib/auth/totp";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * GET — startet die Einrichtung: erzeugt ein neues Secret (oder gibt das
 * existierende, noch nicht bestätigte zurück) und liefert QR + otpauth-URL.
 * Wird das Setup nicht via POST bestätigt, bleibt das Secret im User-Datensatz,
 * aber `totpEnabled=false` — d. h. der nächste GET kann es weiterverwenden
 * (kein zweiter QR-Code wenn der erste schon gescannt wurde).
 */
export async function GET() {
  try {
    const session = await verifySession();
    const user = await prisma.user.findUnique({ where: { id: session.userId! } });
    if (!user) return NextResponse.json({ error: "User nicht gefunden." }, { status: 404 });

    if (user.totpEnabled) {
      return NextResponse.json({ enabled: true });
    }

    let secret = user.totpSecret;
    if (!secret) {
      secret = generateTotpSecret();
      await prisma.user.update({
        where: { id: user.id },
        data: { totpSecret: secret },
      });
    }
    const url = otpauthUrl(secret, user.email);
    const qr = await qrDataUrl(url);
    return NextResponse.json({
      enabled: false,
      secret,
      secretFormatted: formatSecretForDisplay(secret),
      otpauth: url,
      qr,
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

/**
 * POST { code } — bestätigt den ersten Code, aktiviert 2FA und liefert
 * frische Recovery-Codes (einmalig im Klartext).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await verifySession();
    const user = await prisma.user.findUnique({ where: { id: session.userId! } });
    if (!user) return NextResponse.json({ error: "User nicht gefunden." }, { status: 404 });
    if (user.totpEnabled) {
      return NextResponse.json({ error: "2FA ist bereits aktiv." }, { status: 400 });
    }
    if (!user.totpSecret) {
      return NextResponse.json(
        { error: "Bitte zuerst GET aufrufen, um ein Secret zu erzeugen." },
        { status: 400 },
      );
    }
    const body = await req.json().catch(() => ({}));
    const code = typeof body.code === "string" ? body.code : "";
    if (!(await verifyTotp(user.totpSecret, code))) {
      return NextResponse.json(
        { error: "Code ungültig — bitte aktuellen Code aus der Authenticator-App eingeben." },
        { status: 401 },
      );
    }

    const recoveryCodes = generateRecoveryCodes();
    const hashed = recoveryCodes.map(hashRecoveryCode);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        totpEnabled: true,
        recoveryCodes: JSON.stringify(hashed),
      },
    });

    return NextResponse.json({
      ok: true,
      recoveryCodes, // Klartext NUR jetzt — danach nie wieder.
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

/** DELETE — Setup abbrechen wenn noch nicht aktiviert. */
export async function DELETE() {
  try {
    const session = await verifySession();
    const user = await prisma.user.findUnique({ where: { id: session.userId! } });
    if (!user) return NextResponse.json({ error: "User nicht gefunden." }, { status: 404 });
    if (user.totpEnabled) {
      return NextResponse.json({ error: "2FA ist aktiv — bitte /disable verwenden." }, { status: 400 });
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { totpSecret: null },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
