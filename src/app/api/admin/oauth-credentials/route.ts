import { NextRequest, NextResponse } from "next/server";
import {
  verifySession,
  UnauthorizedError,
  unauthorizedResponse,
} from "@/lib/auth/dal";
import {
  getCalendarOAuthStatus,
  setCalendarOAuthCredentials,
  clearCalendarOAuthCredentials,
} from "@/lib/calendar-auth/credentials";

export const dynamic = "force-dynamic";

// GET — Status (Client-IDs sichtbar, Secrets nur als Boolean)
export async function GET() {
  try {
    await verifySession();
    return NextResponse.json(await getCalendarOAuthStatus());
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    return NextResponse.json({ error: "Interner Fehler." }, { status: 500 });
  }
}

// POST — Zugangsdaten speichern (nur Admin). Leere Felder bleiben unverändert.
export async function POST(req: NextRequest) {
  try {
    const session = await verifySession();
    if (session.role !== "admin") {
      return NextResponse.json(
        { error: "Nur Admins dürfen OAuth-Zugangsdaten setzen." },
        { status: 403 },
      );
    }
    const body = await req.json().catch(() => ({}));
    await setCalendarOAuthCredentials({
      googleClientId: body.googleClientId,
      googleClientSecret: body.googleClientSecret,
      msClientId: body.msClientId,
      msClientSecret: body.msClientSecret,
    });
    return NextResponse.json({ ok: true, status: await getCalendarOAuthStatus() });
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    console.error("oauth-credentials POST error", err);
    return NextResponse.json({ error: "Interner Fehler." }, { status: 500 });
  }
}

// DELETE — alle in der DB gespeicherten Zugangsdaten löschen (env-Fallback bleibt)
export async function DELETE() {
  try {
    const session = await verifySession();
    if (session.role !== "admin") {
      return NextResponse.json({ error: "Nur Admins." }, { status: 403 });
    }
    await clearCalendarOAuthCredentials();
    return NextResponse.json({ ok: true, status: await getCalendarOAuthStatus() });
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    return NextResponse.json({ error: "Interner Fehler." }, { status: 500 });
  }
}
