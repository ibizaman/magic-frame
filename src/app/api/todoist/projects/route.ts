import { NextResponse } from "next/server";
import { listProjects, TodoistError } from "@/lib/todoist/client";

export const dynamic = "force-dynamic";

/**
 * Read-only Projektliste — wird vom Editor-Inspector (Dropdown) gepollt,
 * damit der User beim Konfigurieren des Widgets seine Todoist-Projekte sieht.
 * Bewusst ohne Auth, weil das auch von der Live-View gerendert werden kann.
 * Der Token bleibt server-side; raus geht nur (id, name).
 */
export async function GET() {
  try {
    const list = await listProjects();
    return NextResponse.json({
      projects: list.map((p) => ({
        id: p.id,
        name: p.name,
        isInbox: !!p.is_inbox_project,
        parentId: p.parent_id,
      })),
    });
  } catch (err: any) {
    if (err instanceof TodoistError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: err?.message || "failed" }, { status: 500 });
  }
}
