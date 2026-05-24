import { NextResponse } from "next/server";
import {
  verifySession,
  UnauthorizedError,
  unauthorizedResponse,
} from "@/lib/auth/dal";
import { runDdnsNow } from "@/lib/ddns/runner";

export const dynamic = "force-dynamic";

/** Manueller Sofort-Update — vom „Jetzt aktualisieren"-Button. */
export async function POST() {
  try {
    await verifySession();
    const result = await runDdnsNow();
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 502 });
    }
    return NextResponse.json(result);
  } catch (err: any) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    return NextResponse.json({ error: err?.message || "failed" }, { status: 500 });
  }
}
