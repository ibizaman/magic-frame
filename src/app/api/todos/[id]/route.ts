import { NextRequest, NextResponse } from "next/server";
import { resolveUserId } from "@/lib/auth/shortcut";
import { removeTodo, toggleTodo, updateTodo } from "@/lib/companion/todos";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  let body: any = {};
  try { body = await req.json(); } catch {}

  // Nur {toggle:true} → umschalten
  if (body.toggle === true) {
    const t = await toggleTodo(id);
    if (!t) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if ((global as any).LIVE_SYNC_IO) {
      (global as any).LIVE_SYNC_IO.emit("TODOS_UPDATED");
    }
    return NextResponse.json({ todo: t });
  }

  const dueDate = body.dueDate !== undefined
    ? (body.dueDate ? new Date(String(body.dueDate)) : null)
    : undefined;
  if (dueDate && isNaN(dueDate.getTime())) {
    return NextResponse.json({ error: "ungültiges dueDate" }, { status: 400 });
  }
  const priorityRaw = body.priority;
  const priority = priorityRaw === "low" || priorityRaw === "normal" || priorityRaw === "high"
    ? priorityRaw
    : undefined;

  const todo = await updateTodo(id, {
    title: body.title,
    assignee: body.assignee !== undefined ? body.assignee : undefined,
    dueDate,
    priority,
  });
  if ((global as any).LIVE_SYNC_IO) {
    (global as any).LIVE_SYNC_IO.emit("TODOS_UPDATED");
  }
  return NextResponse.json({ todo });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await removeTodo(id);
  if ((global as any).LIVE_SYNC_IO) {
    (global as any).LIVE_SYNC_IO.emit("TODOS_UPDATED");
  }
  return NextResponse.json({ ok: true });
}
