import { NextRequest, NextResponse } from "next/server";
import { getModuleBundle } from "@/lib/modules/store";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ type: string }> };

/**
 * Liefert das JS-Bundle eines Custom-Moduls als application/javascript.
 * Wird vom Live-View-Runtime per <script src> nachgeladen.
 * Public — kein Auth, weil die Live-View auch ohne Editor-Session läuft.
 * Disabled Module geben 404 zurück.
 */
export async function GET(_: NextRequest, ctx: Ctx) {
  const { type } = await ctx.params;
  const decoded = decodeURIComponent(type);
  const bundle = await getModuleBundle(decoded);
  if (!bundle) {
    return new NextResponse("// not found or disabled", {
      status: 404,
      headers: { "Content-Type": "application/javascript; charset=utf-8" },
    });
  }
  return new NextResponse(bundle, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      // Versionierung via ?v=… am Loader; selber cachen wir kurz.
      "Cache-Control": "public, max-age=60, must-revalidate",
    },
  });
}
