import { NextResponse } from "next/server";
import { listModules } from "@/lib/modules/store";

export const dynamic = "force-dynamic";

/**
 * Public-Read: Liste der aktiven Custom-Module mit ihren Manifesten.
 * Wird vom Live-View beim Mount geladen, damit sie weiß welche Custom-Types
 * existieren. Bundle wird per /api/modules/[type]/bundle.js separat geliefert.
 */
export async function GET() {
  try {
    const modules = await listModules({ enabledOnly: true });
    return NextResponse.json({
      modules: modules.map((m) => ({
        type: m.type,
        label: m.label,
        description: m.description,
        iconEmoji: m.iconEmoji,
        version: m.version,
        fields: m.manifest.fields ?? [],
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "failed" }, { status: 500 });
  }
}
