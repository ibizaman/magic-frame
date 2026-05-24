import "server-only";
import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export type SessionData = {
  userId?: string;
  email?: string;
  role?: string;
  // Zwischenstand nach erfolgreichem Passwort, aber bevor TOTP eingegeben wurde.
  // Solange pendingTotpUserId gesetzt und userId leer ist, ist der User NICHT
  // authentifiziert — verifySession() lehnt ab.
  pendingTotpUserId?: string;
  pendingTotpEmail?: string;
  pendingTotpExpires?: number; // unix ms
};

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET env var muss gesetzt sein und mindestens 32 Zeichen haben.",
    );
  }
  return secret;
}

function getSessionOptions(): SessionOptions {
  return {
    cookieName: "magic_session",
    password: getSessionSecret(),
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.COOKIE_SECURE === "true",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    },
  };
}

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), getSessionOptions());
}
