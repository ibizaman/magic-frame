import { NextRequest, NextResponse } from "next/server";
import { baseUrl, decodeState, MICROSOFT_SCOPES } from "@/lib/calendar-auth/oauth";
import { upsertAccount } from "@/lib/calendar-auth/store";
import { getCalendarOAuthConfig } from "@/lib/calendar-auth/credentials";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const code = params.get("code");
  const rawState = params.get("state");
  const error = params.get("error");

  const returnTo = `/editor/integrations?calendar=microsoft`;

  // Externe Base-URL für alle Redirects — nicht req.url (hinter dem Proxy die
  // interne localhost:3000-URL). x-forwarded-host bevorzugen, APP_BASE_URL
  // gewinnt. (#31, gleicher Bug wie bei Google)
  const proto = req.headers.get("x-forwarded-proto");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const base = baseUrl(host, proto) || req.nextUrl.origin;

  if (error) {
    return NextResponse.redirect(new URL(`${returnTo}&err=${encodeURIComponent(error)}`, base));
  }
  if (!code) {
    return NextResponse.redirect(new URL(`${returnTo}&err=no_code`, base));
  }

  const state = decodeState(rawState);
  if (!state) {
    return NextResponse.redirect(new URL(`${returnTo}&err=bad_state`, base));
  }

  const { msClientId: clientId, msClientSecret: clientSecret } =
    await getCalendarOAuthConfig();
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL(`${returnTo}&err=not_configured`, base));
  }

  try {
    const redirectUri = `${base}/api/auth/calendar/microsoft/callback`;

    const tokenRes = await fetch(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
          scope: MICROSOFT_SCOPES,
        }),
      },
    );
    if (!tokenRes.ok) {
      const body = await tokenRes.text();
      console.error("[ms-callback] token exchange failed:", body);
      return NextResponse.redirect(new URL(`${returnTo}&err=token_exchange`, base));
    }
    const token = await tokenRes.json();

    let email: string | null = null;
    let name: string | null = null;
    try {
      const me = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: { Authorization: `Bearer ${token.access_token}` },
      });
      if (me.ok) {
        const u = await me.json();
        email = u.mail ?? u.userPrincipalName ?? null;
        name = u.displayName ?? email;
      }
    } catch {}

    await upsertAccount({
      userId: state.userId,
      provider: "microsoft",
      accountEmail: email,
      accountName: name,
      accessToken: token.access_token,
      refreshToken: token.refresh_token ?? null,
      expiresAt: new Date(Date.now() + (token.expires_in ?? 3600) * 1000),
      scope: token.scope ?? MICROSOFT_SCOPES,
    });

    return NextResponse.redirect(new URL(`${returnTo}&ok=1`, base));
  } catch (err) {
    console.error("[ms-callback]", err);
    return NextResponse.redirect(new URL(`${returnTo}&err=exception`, base));
  }
}
