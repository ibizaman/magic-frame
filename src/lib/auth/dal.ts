import "server-only";
import { NextResponse } from "next/server";
import { getSession, type SessionData } from "./session";

export async function verifySession(): Promise<SessionData> {
  const session = await getSession();
  if (!session.userId) {
    throw new UnauthorizedError();
  }
  return session;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function withAuth<T>(
  handler: (session: SessionData) => Promise<T> | T,
): Promise<T | NextResponse> {
  try {
    const session = await verifySession();
    return await handler(session);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return unauthorizedResponse();
    }
    throw err;
  }
}
