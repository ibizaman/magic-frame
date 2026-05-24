import { NextResponse } from "next/server";
import {
  verifySession,
  UnauthorizedError,
  unauthorizedResponse,
} from "@/lib/auth/dal";

export const dynamic = "force-dynamic";

// GET /api/admin/session-info — Sicherheits-Status der Session/Cookies
export async function GET() {
  try {
    const session = await verifySession();
    const secret = process.env.SESSION_SECRET || "";
    return NextResponse.json({
      email: session.email,
      role: session.role,
      cookieName: "magic_session",
      cookieSecure: process.env.COOKIE_SECURE === "true",
      sameSite: "lax",
      httpOnly: true,
      lifetimeDays: 30,
      // Nur die Stärke melden, niemals das Secret selbst.
      secretStrength: secret.length >= 32 ? "stark" : "schwach",
      secretLength: secret.length,
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    return NextResponse.json({ error: "Interner Fehler." }, { status: 500 });
  }
}
