import { NextRequest, NextResponse } from "next/server";
import { getAppSettings } from "@/lib/settings/store";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ entity: string }> };

async function haFetch(path: string, init?: RequestInit) {
  const settings = await getAppSettings();
  if (!settings.haUrl || !settings.haToken) {
    throw new Error("Home Assistant not configured.");
  }
  const base = settings.haUrl.replace(/\/+$/, "");
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${settings.haToken}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  return res;
}

function validateEntity(raw: string): string | null {
  // Erwartet "todo.shopping_list" o.ä. — nur einfache Domain.entity-Form akzeptieren.
  if (!/^todo\.[a-z0-9_]+$/.test(raw)) return null;
  return raw;
}

/** Liest Items aus dem Entity-State. */
export async function GET(_: NextRequest, ctx: Ctx) {
  const { entity } = await ctx.params;
  const entityId = validateEntity(entity);
  if (!entityId) {
    return NextResponse.json({ error: "Invalid entity id" }, { status: 400 });
  }
  try {
    const res = await haFetch(`/api/states/${entityId}`);
    if (!res.ok) {
      return NextResponse.json(
        { error: `HA returned ${res.status}` },
        { status: res.status === 404 ? 404 : 502 },
      );
    }
    const data = await res.json();
    const attr = data.attributes || {};
    const raw: any[] = Array.isArray(attr.items)
      ? attr.items
      : Array.isArray(attr.all_items)
        ? attr.all_items
        : [];
    const items = raw.map((it, idx) => {
      if (typeof it === "string") {
        return { uid: `s${idx}`, summary: it, status: "needs_action" as const };
      }
      return {
        uid: it.uid ?? `s${idx}`,
        summary: it.summary ?? it.name ?? String(it),
        status: (it.status as "needs_action" | "completed") ?? "needs_action",
      };
    });
    return NextResponse.json({ entityId, items });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "failed" }, { status: 500 });
  }
}

/** Fügt einen Item hinzu — todo.add_item */
export async function POST(req: NextRequest, ctx: Ctx) {
  const { entity } = await ctx.params;
  const entityId = validateEntity(entity);
  if (!entityId) return NextResponse.json({ error: "Invalid entity id" }, { status: 400 });
  try {
    const body = await req.json();
    const item = String(body.item ?? "").trim();
    if (!item) return NextResponse.json({ error: "Empty item" }, { status: 400 });
    const res = await haFetch(`/api/services/todo/add_item`, {
      method: "POST",
      body: JSON.stringify({ entity_id: entityId, item }),
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `HA returned ${res.status}` },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "failed" }, { status: 500 });
  }
}

/** Update eines Items (Status toggle oder rename) — todo.update_item */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { entity } = await ctx.params;
  const entityId = validateEntity(entity);
  if (!entityId) return NextResponse.json({ error: "Invalid entity id" }, { status: 400 });
  try {
    const body = await req.json();
    const item = String(body.item ?? "").trim();
    if (!item) return NextResponse.json({ error: "Empty item" }, { status: 400 });
    const payload: Record<string, any> = { entity_id: entityId, item };
    if (body.status) payload.status = body.status;
    if (body.rename) payload.rename = String(body.rename);
    const res = await haFetch(`/api/services/todo/update_item`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `HA returned ${res.status}` },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "failed" }, { status: 500 });
  }
}

/** Entfernt ein Item oder alle erledigten — todo.remove_item / todo.remove_completed_items */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { entity } = await ctx.params;
  const entityId = validateEntity(entity);
  if (!entityId) return NextResponse.json({ error: "Invalid entity id" }, { status: 400 });
  try {
    const completedAll = req.nextUrl.searchParams.get("completed") === "1";
    if (completedAll) {
      const res = await haFetch(`/api/services/todo/remove_completed_items`, {
        method: "POST",
        body: JSON.stringify({ entity_id: entityId }),
      });
      if (!res.ok) {
        return NextResponse.json({ error: `HA returned ${res.status}` }, { status: 502 });
      }
      return NextResponse.json({ ok: true });
    }
    const item = String(req.nextUrl.searchParams.get("item") ?? "").trim();
    if (!item) return NextResponse.json({ error: "Empty item" }, { status: 400 });
    const res = await haFetch(`/api/services/todo/remove_item`, {
      method: "POST",
      body: JSON.stringify({ entity_id: entityId, item }),
    });
    if (!res.ok) {
      return NextResponse.json({ error: `HA returned ${res.status}` }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "failed" }, { status: 500 });
  }
}
