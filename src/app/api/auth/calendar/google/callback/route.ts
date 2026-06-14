import { NextRequest, NextResponse } from "next/server";
import { baseUrl, decodeState } from "@/lib/calendar-auth/oauth";
import { upsertAccount } from "@/lib/calendar-auth/store";
import { getCalendarOAuthConfig } from "@/lib/calendar-auth/credentials";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const code = params.get("code");
  const rawState = params.get("state");
  const error = params.get("error");

  const returnTo = `/editor/integrations?calendar=google`;

  // Externe Base-URL für ALLE Redirects — nicht req.url, denn hinter dem
  // Reverse-Proxy ist das die interne localhost:3000-URL (genau dort landete
  // der User-Redirect). x-forwarded-host bevorzugen, APP_BASE_URL gewinnt. (#31)
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

  const { googleClientId: clientId, googleClientSecret: clientSecret } =
    await getCalendarOAuthConfig();
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL(`${returnTo}&err=not_configured`, base));
  }

  try {
    const redirectUri = `${base}/api/auth/calendar/google/callback`;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) {
      const body = await tokenRes.text();
      console.error("[google-callback] token exchange failed:", body);
      return NextResponse.redirect(new URL(`${returnTo}&err=token_exchange`, base));
    }
    const token = await tokenRes.json();

    // Userinfo via OpenID
    let email: string | null = null;
    let name: string | null = null;
    try {
      const info = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
        headers: { Authorization: `Bearer ${token.access_token}` },
      });
      if (info.ok) {
        const u = await info.json();
        email = u.email ?? null;
        name = u.name ?? email;
      }
    } catch {}

    await upsertAccount({
      userId: state.userId,
      provider: "google",
      accountEmail: email,
      accountName: name,
      accessToken: token.access_token,
      refreshToken: token.refresh_token ?? null,
      expiresAt: new Date(Date.now() + (token.expires_in ?? 3600) * 1000),
      scope: token.scope ?? null,
    });

    return NextResponse.redirect(new URL(`${returnTo}&ok=1`, base));
  } catch (err) {
    console.error("[google-callback] error:", err);
    return NextResponse.redirect(new URL(`${returnTo}&err=exception`, base));
  }
}
