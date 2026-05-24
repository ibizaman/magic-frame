import { NextRequest, NextResponse } from "next/server";
import { verifySession, UnauthorizedError, unauthorizedResponse } from "@/lib/auth/dal";
import { baseUrl, encodeState, makeNonce, MICROSOFT_SCOPES } from "@/lib/calendar-auth/oauth";
import { getCalendarOAuthConfig } from "@/lib/calendar-auth/credentials";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession();
    const { msClientId: clientId } = await getCalendarOAuthConfig();
    if (!clientId) {
      return NextResponse.json(
        { error: "Microsoft Client-ID fehlt — bitte unter Integrationen eintragen." },
        { status: 500 },
      );
    }

    const proto = req.headers.get("x-forwarded-proto");
    const host = req.headers.get("host");
    const base = baseUrl(host, proto);
    const redirectUri = `${base}/api/auth/calendar/microsoft/callback`;

    const state = encodeState({ userId: session.userId!, nonce: makeNonce() });
    const authUrl = new URL("https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", MICROSOFT_SCOPES);
    authUrl.searchParams.set("response_mode", "query");
    authUrl.searchParams.set("state", state);

    return NextResponse.redirect(authUrl.toString(), { status: 302 });
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    console.error("[ms-start]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
