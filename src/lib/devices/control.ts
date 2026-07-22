import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { resolveUserId } from "@/lib/auth/shortcut";

// Steuerbefehle an die Displays. Früher hat der Browser sie direkt als
// Socket-Event geschickt und der Server hat sie ungeprüft an alle
// weitergereicht — wer den Server erreichte, konnte damit jedes Display
// umschalten oder neu laden (#63). Jetzt geht das nur noch über diese
// Routen, und die verlangen eine Anmeldung.
//
// resolveUserId akzeptiert beides: das Editor-Cookie und den Shortcut-Token
// (?key=… oder Authorization: Bearer …). Damit können auch HA-Automationen
// per rest_command steuern, ohne einen Socket-Client zu brauchen.

export async function emitToDisplays(
  req: NextRequest,
  event: string,
  payload?: unknown,
): Promise<NextResponse> {
  const userId = await resolveUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const io = (global as any).LIVE_SYNC_IO;
  if (!io) {
    return NextResponse.json(
      { error: "Live-Sync ist nicht verfügbar" },
      { status: 503 },
    );
  }
  if (payload === undefined) io.emit(event);
  else io.emit(event, payload);
  return NextResponse.json({ ok: true });
}

/** dashboardId aus JSON-Body oder Query lesen — beides ist bequem für HA. */
export async function readDashboardId(req: NextRequest): Promise<string | null> {
  const fromQuery = req.nextUrl.searchParams.get("dashboardId");
  if (fromQuery) return fromQuery;
  try {
    const body = await req.json();
    const id = body?.dashboardId;
    return typeof id === "string" && id ? id : null;
  } catch {
    return null; // kein Body = alle Displays
  }
}
