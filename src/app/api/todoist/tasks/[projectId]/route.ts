import { NextRequest, NextResponse } from "next/server";
import {
  listTasks,
  createTask,
  closeTask,
  reopenTask,
  deleteTask,
  updateTask,
  TodoistError,
} from "@/lib/todoist/client";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ projectId: string }> };

/** GET → offene Tasks im Projekt. */
export async function GET(_: NextRequest, ctx: Ctx) {
  try {
    const { projectId } = await ctx.params;
    if (!/^\d+$/.test(projectId)) {
      return NextResponse.json({ error: "Invalid projectId" }, { status: 400 });
    }
    const tasks = await listTasks(projectId);
    return NextResponse.json({
      projectId,
      tasks: tasks.map((t) => ({
        id: t.id,
        content: t.content,
        priority: t.priority,
        due: t.due ?? null,
        labels: t.labels ?? [],
        isCompleted: t.is_completed,
      })),
    });
  } catch (err: any) {
    if (err instanceof TodoistError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: err?.message || "failed" }, { status: 500 });
  }
}

/** POST { content, dueString?, priority? } → neuer Task. */
export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const { projectId } = await ctx.params;
    if (!/^\d+$/.test(projectId)) {
      return NextResponse.json({ error: "Invalid projectId" }, { status: 400 });
    }
    const body = await req.json();
    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (!content) return NextResponse.json({ error: "content required" }, { status: 400 });
    const task = await createTask({
      projectId,
      content,
      dueString: body.dueString,
      priority: body.priority,
    });
    return NextResponse.json({ task });
  } catch (err: any) {
    if (err instanceof TodoistError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: err?.message || "failed" }, { status: 500 });
  }
}

/**
 * PATCH { taskId, action } — Aktionen pro Task:
 *   action="close" | "reopen" | "rename" (mit content) | "update" (mit content/dueString/priority).
 */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    await ctx.params; // projectId nicht benoetigt — Todoist Task-IDs sind global
    const body = await req.json();
    const taskId = String(body.taskId ?? "");
    if (!taskId) return NextResponse.json({ error: "taskId required" }, { status: 400 });
    const action = String(body.action ?? "");
    if (action === "close") {
      await closeTask(taskId);
      return NextResponse.json({ ok: true });
    }
    if (action === "reopen") {
      await reopenTask(taskId);
      return NextResponse.json({ ok: true });
    }
    if (action === "rename" || action === "update") {
      const updated = await updateTask(taskId, {
        content: typeof body.content === "string" ? body.content : undefined,
        dueString: body.dueString,
        priority: body.priority,
      });
      return NextResponse.json({ task: updated });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    if (err instanceof TodoistError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: err?.message || "failed" }, { status: 500 });
  }
}

/** DELETE ?taskId=X */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    await ctx.params;
    const taskId = req.nextUrl.searchParams.get("taskId") ?? "";
    if (!taskId) return NextResponse.json({ error: "taskId required" }, { status: 400 });
    await deleteTask(taskId);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err instanceof TodoistError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: err?.message || "failed" }, { status: 500 });
  }
}
