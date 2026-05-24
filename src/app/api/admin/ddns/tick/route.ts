import { NextRequest, NextResponse } from "next/server";
import { runDdnsTick } from "@/lib/ddns/runner";

export const dynamic = "force-dynamic";

/**
 * Internal-Background-Tick: aufgerufen vom Node-Server (server.js) im Intervall.
 * Nur von localhost akzeptiert (kein Login nötig, aber auch keine externe Triggerbarkeit).
 */
export async function POST(req: NextRequest) {
  const xff = req.headers.get("x-forwarded-for") ?? "";
  const host = req.headers.get("host") ?? "";
  const remote = (req as any).ip ?? "";
  const isLocal =
    xff === "" &&
    (host.startsWith("localhost") ||
      host.startsWith("127.0.0.1") ||
      host.startsWith("::1") ||
      remote === "" ||
      remote === "127.0.0.1" ||
      remote === "::1");
  if (!isLocal) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  try {
    const result = await runDdnsTick(false);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "failed" }, { status: 500 });
  }
}
