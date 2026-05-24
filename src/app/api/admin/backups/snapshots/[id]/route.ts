import { NextRequest, NextResponse } from "next/server";
import {
  verifySession,
  UnauthorizedError,
  unauthorizedResponse,
} from "@/lib/auth/dal";
import { prisma } from "@/lib/companion/prisma";

export const dynamic = "force-dynamic";

// DELETE /api/admin/backups/snapshots/[id] — Snapshot verwerfen
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await verifySession();
    const { id } = await params;
    await prisma.snapshot.delete({ where: { id } }).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    return NextResponse.json({ error: "Interner Fehler." }, { status: 500 });
  }
}
