import { NextResponse } from "next/server";
import { getAppSettings } from "@/lib/settings/store";

export const dynamic = "force-dynamic";

/** Liefert alle todo.* Entities aus Home Assistant (Name + Item-Count). */
export async function GET() {
  try {
    const settings = await getAppSettings();
    if (!settings.haUrl || !settings.haToken) {
      return NextResponse.json(
        { error: "Home Assistant not configured (Integrationen)." },
        { status: 400 },
      );
    }
    const base = settings.haUrl.replace(/\/+$/, "");
    const res = await fetch(`${base}/api/states`, {
      headers: {
        Authorization: `Bearer ${settings.haToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Home Assistant returned ${res.status}` },
        { status: 502 },
      );
    }
    const all = (await res.json()) as any[];
    const lists = all
      .filter((e) => typeof e.entity_id === "string" && e.entity_id.startsWith("todo."))
      .map((e) => {
        // Neuere todo-Plattform: attributes.items = [{summary, status, uid}, ...]
        // Ältere shopping_list: attributes.all_items oder state-Count
        const attr = e.attributes || {};
        const items = Array.isArray(attr.items)
          ? attr.items
          : Array.isArray(attr.all_items)
            ? attr.all_items
            : [];
        return {
          entityId: e.entity_id,
          name: attr.friendly_name || e.entity_id.replace(/^todo\./, ""),
          itemCount: items.length,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json({ lists });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Unknown error" },
      { status: 500 },
    );
  }
}
