import { NextRequest, NextResponse } from "next/server";
import { verifySession, UnauthorizedError, unauthorizedResponse } from "@/lib/auth/dal";
import { deleteAccount, listAccounts } from "@/lib/calendar-auth/store";
import { getCalendarOAuthStatus } from "@/lib/calendar-auth/credentials";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await verifySession();
    const accounts = await listAccounts(session.userId!);
    const status = await getCalendarOAuthStatus();
    return NextResponse.json({
      accounts,
      googleConfigured: status.googleConfigured,
      microsoftConfigured: status.microsoftConfigured,
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await verifySession();
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    await deleteAccount(session.userId!, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
