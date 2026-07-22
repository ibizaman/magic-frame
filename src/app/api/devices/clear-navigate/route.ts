import { NextRequest } from "next/server";
import { emitToDisplays } from "@/lib/devices/control";

export const dynamic = "force-dynamic";

/** Erzwungenen View aufheben — jedes Display kehrt zu seinem eigenen zurück. */
export async function POST(req: NextRequest) {
  return emitToDisplays(req, "CLEAR_NAVIGATE");
}
