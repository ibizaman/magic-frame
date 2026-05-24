import { NextResponse } from "next/server";
import { verifySession, UnauthorizedError, unauthorizedResponse } from "@/lib/auth/dal";
import { getOrCreateShortcutToken, rotateShortcutToken } from "@/lib/auth/shortcut";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await verifySession();
    const token = await getOrCreateShortcutToken(session.userId!);
    return NextResponse.json({ token });
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

export async function POST() {
  // Rotation — alter Token wird ungültig.
  try {
    const session = await verifySession();
    const token = await rotateShortcutToken(session.userId!);
    return NextResponse.json({ token });
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
