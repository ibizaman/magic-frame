import { NextRequest, NextResponse } from "next/server";
import { resolveUserId } from "@/lib/auth/shortcut";
import { createTodo, listTodos } from "@/lib/companion/todos";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const assignee = req.nextUrl.searchParams.get("assignee") ?? undefined;
  const includeDoneHoursRaw = req.nextUrl.searchParams.get("includeDoneHours");
  const includeDoneHours = includeDoneHoursRaw ? Number(includeDoneHoursRaw) : undefined;
  const todos = await listTodos({ assignee, includeDoneHours });
  return NextResponse.json({ todos });
}

export async function POST(req: NextRequest) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any = {};
  try { body = await req.json(); } catch {}
  const q = req.nextUrl.searchParams;

  const title = (body.title ?? q.get("title") ?? "").toString().trim();
  if (!title) return NextResponse.json({ error: "title erforderlich" }, { status: 400 });

  const assignee = body.assignee ?? q.get("assignee") ?? null;
  const dueRaw = body.dueDate ?? q.get("dueDate");
  const dueDate = dueRaw ? new Date(String(dueRaw)) : null;
  if (dueDate && isNaN(dueDate.getTime())) {
    return NextResponse.json({ error: "ungültiges dueDate (ISO 8601)" }, { status: 400 });
  }
  const priorityRaw = (body.priority ?? q.get("priority") ?? "normal").toString();
  const priority = priorityRaw === "low" || priorityRaw === "high" ? priorityRaw : "normal";

  const todo = await createTodo({
    userId,
    title,
    assignee: assignee ? String(assignee) : null,
    dueDate,
    priority,
  });
  if ((global as any).LIVE_SYNC_IO) {
    (global as any).LIVE_SYNC_IO.emit("TODOS_UPDATED");
  }
  return NextResponse.json({ todo });
}
