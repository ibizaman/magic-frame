import { NextRequest, NextResponse } from "next/server";
import { verifySession, UnauthorizedError, unauthorizedResponse } from "@/lib/auth/dal";
import { baseUrl, encodeState, makeNonce, GOOGLE_SCOPES } from "@/lib/calendar-auth/oauth";
import { getCalendarOAuthConfig } from "@/lib/calendar-auth/credentials";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession();
    const { googleClientId: clientId } = await getCalendarOAuthConfig();
    if (!clientId) {
      return NextResponse.json(
        { error: "Google Client-ID fehlt — bitte unter Integrationen eintragen." },
        { status: 500 },
      );
    }

    // Hinter einem Reverse-Proxy ist req.headers.host oft der interne Upstream
    // (localhost:3000); der echte externe Host steht in x-forwarded-host. Den
    // bevorzugen, damit die redirect_uri zur Google-Console-URL passt (#31).
    const proto = req.headers.get("x-forwarded-proto");
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    const base = baseUrl(host, proto);
    const redirectUri = `${base}/api/auth/calendar/google/callback`;

    const state = encodeState({ userId: session.userId!, nonce: makeNonce() });
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", GOOGLE_SCOPES);
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");
    authUrl.searchParams.set("state", state);

    return NextResponse.redirect(authUrl.toString(), { status: 302 });
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    console.error("[google-start]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
