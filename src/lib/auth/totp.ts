import "server-only";
import {
  generateSecret as otpGenerateSecret,
  generateURI as otpGenerateURI,
  verify as otpVerify,
} from "otplib";
import QRCode from "qrcode";
import { randomBytes } from "node:crypto";
import { hashPassword, verifyPassword } from "./password";

// otplib v13 hat eine async API; defaults: TOTP, SHA-1, 30s Periode, 6 Stellen.
// Wir erlauben ±1 Period (= 30 s vor/zurück) Drift via afterTimeStep/beforeTimeStep
// um leichte Uhrabweichungen zwischen Server und Authenticator-App zu tolerieren.

const TOTP_TOLERANCE = { afterTimeStep: 1, beforeTimeStep: 1 } as const;

/** Neues Base32-Secret (32 Zeichen / 20 Byte) für einen User generieren. */
export function generateTotpSecret(): string {
  return otpGenerateSecret();
}

/**
 * otpauth://-URL für QR-Code. Issuer = "Magic Frame", Label = User-Email,
 * sodass Authenticator-Apps die richtigen Namen anzeigen.
 */
export function otpauthUrl(secret: string, accountEmail: string): string {
  return otpGenerateURI({
    strategy: "totp",
    issuer: "Magic Frame",
    label: accountEmail,
    secret,
  });
}

/** Data-URL für QR-Code (lässt sich direkt in <img src> stecken). */
export async function qrDataUrl(otpauth: string): Promise<string> {
  return QRCode.toDataURL(otpauth, { margin: 1, scale: 6 });
}

export async function verifyTotp(secret: string, token: string): Promise<boolean> {
  if (!secret || !token) return false;
  const clean = token.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(clean)) return false;
  try {
    const r = await otpVerify({
      secret,
      token: clean,
      strategy: "totp",
      ...TOTP_TOLERANCE,
    });
    return !!r.valid;
  } catch {
    return false;
  }
}

/* ---------------- Recovery-Codes ---------------- */
// 10 Codes à 10 Zeichen, gruppiert XXXXX-XXXXX. Werden gehasht in DB gespeichert,
// im Klartext nur einmal beim Generieren angezeigt.

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // ohne I, O, 0, 1 — leichter abzutippen

export function generateRecoveryCodes(count = 10): string[] {
  const codes: string[] = [];
  while (codes.length < count) {
    const buf = randomBytes(10);
    let s = "";
    for (const b of buf) s += ALPHABET[b % ALPHABET.length];
    codes.push(`${s.slice(0, 5)}-${s.slice(5)}`);
  }
  return codes;
}

export function hashRecoveryCode(code: string): string {
  return hashPassword(canonRecoveryCode(code));
}

export function canonRecoveryCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * Sucht in der Liste gehashter Codes einen, der zum eingegebenen Code passt,
 * entfernt ihn (one-shot) und liefert die neue verbleibende Liste zurück.
 * Liefert `null`, wenn kein Code passt.
 */
export function consumeRecoveryCode(
  hashedCodes: string[],
  input: string,
): { remaining: string[] } | null {
  for (let i = 0; i < hashedCodes.length; i++) {
    if (verifyPassword(canonRecoveryCode(input), hashedCodes[i])) {
      const remaining = [...hashedCodes];
      remaining.splice(i, 1);
      return { remaining };
    }
  }
  return null;
}

/** Hilfsfunktion: secret-fragment für UI-Anzeige unter dem QR. */
export function formatSecretForDisplay(secret: string): string {
  return secret.match(/.{1,4}/g)?.join(" ") ?? secret;
}
