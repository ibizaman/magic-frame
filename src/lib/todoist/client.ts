import "server-only";
import { getTodoistConfig } from "./store";

const TODOIST_BASE = "https://api.todoist.com/rest/v2";

export type TodoistProject = {
  id: string;
  name: string;
  color: string;
  is_favorite: boolean;
  is_inbox_project?: boolean;
  parent_id: string | null;
};

export type TodoistTask = {
  id: string;
  project_id: string;
  content: string;
  description?: string;
  is_completed: boolean;
  priority: 1 | 2 | 3 | 4; // 1 = lowest, 4 = highest (P1)
  due?: { date?: string; datetime?: string; string?: string; is_recurring?: boolean } | null;
  labels?: string[];
  order?: number;
  created_at?: string;
  url?: string;
};

class TodoistError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "TodoistError";
  }
}

async function call<T>(
  path: string,
  init?: RequestInit & { token?: string },
): Promise<T> {
  const token = init?.token ?? (await getTodoistConfig()).apiToken;
  if (!token) {
    throw new TodoistError(400, "Todoist nicht konfiguriert.");
  }
  const res = await fetch(`${TODOIST_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  // 204 No Content für close/reopen/delete
  if (res.status === 204) return undefined as T;
  const data: any = await res.json().catch(() => null);
  if (!res.ok) {
    const msg =
      (data && typeof data === "object" && (data.error || data.message)) ||
      `Todoist API ${res.status}`;
    throw new TodoistError(res.status, msg);
  }
  return data as T;
}

/** Verifiziert den Token (lädt nur ein Projekt — leichtester Endpoint). */
export async function verifyToken(token: string): Promise<boolean> {
  try {
    await call<TodoistProject[]>("/projects", { token, method: "GET" });
    return true;
  } catch {
    return false;
  }
}

export async function listProjects(): Promise<TodoistProject[]> {
  return call<TodoistProject[]>("/projects");
}

export async function listTasks(projectId: string): Promise<TodoistTask[]> {
  return call<TodoistTask[]>(`/tasks?project_id=${encodeURIComponent(projectId)}`);
}

export async function createTask(params: {
  projectId: string;
  content: string;
  description?: string;
  dueString?: string;
  priority?: 1 | 2 | 3 | 4;
}): Promise<TodoistTask> {
  return call<TodoistTask>(`/tasks`, {
    method: "POST",
    body: JSON.stringify({
      content: params.content,
      project_id: params.projectId,
      description: params.description,
      due_string: params.dueString,
      priority: params.priority,
    }),
  });
}

export async function updateTask(
  id: string,
  patch: Partial<{ content: string; description: string; dueString: string | null; priority: 1 | 2 | 3 | 4 }>,
): Promise<TodoistTask> {
  const body: Record<string, any> = {};
  if (patch.content !== undefined) body.content = patch.content;
  if (patch.description !== undefined) body.description = patch.description;
  if (patch.dueString !== undefined) body.due_string = patch.dueString ?? "";
  if (patch.priority !== undefined) body.priority = patch.priority;
  return call<TodoistTask>(`/tasks/${encodeURIComponent(id)}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function closeTask(id: string): Promise<void> {
  await call<void>(`/tasks/${encodeURIComponent(id)}/close`, { method: "POST" });
}

export async function reopenTask(id: string): Promise<void> {
  await call<void>(`/tasks/${encodeURIComponent(id)}/reopen`, { method: "POST" });
}

export async function deleteTask(id: string): Promise<void> {
  await call<void>(`/tasks/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export { TodoistError };
