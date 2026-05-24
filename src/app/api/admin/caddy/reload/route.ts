import { NextResponse } from "next/server";
import {
  verifySession,
  UnauthorizedError,
  unauthorizedResponse,
} from "@/lib/auth/dal";
import { getCaddyConfig } from "@/lib/caddy/store";
import { generateCaddyfile } from "@/lib/caddy/generate";
import { writeAndReload } from "@/lib/caddy/admin";

export const dynamic = "force-dynamic";

/** Erzwingt einen Reload mit der aktuellen Config (z. B. nach DDNS-Token-Update). */
export async function POST() {
  try {
    await verifySession();
    const cfg = await getCaddyConfig();
    const { caddyfile, warnings } = await generateCaddyfile(cfg);
    const r = await writeAndReload(caddyfile);
    return NextResponse.json({ ...r, warnings });
  } catch (err: any) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    return NextResponse.json({ error: err?.message || "failed" }, { status: 500 });
  }
}
