import "server-only";
import crypto from "node:crypto";

export function baseUrl(hostHeader: string | null, protoHeader: string | null): string {
  const env = process.env.APP_BASE_URL?.trim();
  if (env) return env.replace(/\/$/, "");
  if (hostHeader) {
    const proto = protoHeader || (hostHeader.startsWith("localhost") ? "http" : "http");
    return `${proto}://${hostHeader}`.replace(/\/$/, "");
  }
  return "";
}

export type OauthState = { userId: string; nonce: string };

export function encodeState(state: OauthState): string {
  const json = JSON.stringify(state);
  return Buffer.from(json, "utf8").toString("base64url");
}

export function decodeState(raw: string | null): OauthState | null {
  if (!raw) return null;
  try {
    const json = Buffer.from(raw, "base64url").toString("utf8");
    const parsed = JSON.parse(json);
    if (typeof parsed?.userId !== "string" || typeof parsed?.nonce !== "string") return null;
    return parsed as OauthState;
  } catch {
    return null;
  }
}

export function makeNonce(): string {
  return crypto.randomBytes(16).toString("hex");
}

export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar.readonly",
].join(" ");

export const MICROSOFT_SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
  "Calendars.Read",
  "User.Read",
].join(" ");
