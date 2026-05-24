import { NextResponse } from "next/server";
import { getAppSettings } from "@/lib/settings/store";

export const dynamic = "force-dynamic";

type HAState = {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
  last_changed?: string;
  last_updated?: string;
};

export async function GET() {
  try {
    const settings = await getAppSettings();
    if (!settings.haUrl || !settings.haToken) {
      return NextResponse.json(
        { error: "Home Assistant not configured" },
        { status: 400 },
      );
    }

    const url = `${settings.haUrl.replace(/\/$/, "")}/api/states`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${settings.haToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `HA returned ${res.status}` },
        { status: 502 },
      );
    }

    const all: HAState[] = await res.json();
    const notifications = all
      .filter((s) => s.entity_id.startsWith("persistent_notification."))
      .map((s) => ({
        id: s.attributes?.notification_id ?? s.entity_id,
        entityId: s.entity_id,
        title: s.attributes?.title ?? "Benachrichtigung",
        message: s.attributes?.message ?? "",
        createdAt: s.attributes?.created_at ?? s.last_changed ?? s.last_updated,
        status: s.state,
      }));

    return NextResponse.json({ notifications });
  } catch (err: any) {
    console.error("[ha-notifications] error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Failed" },
      { status: 500 },
    );
  }
}
