import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { getSession } from "@/lib/auth/session";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  let needsSetup = false;
  try {
    needsSetup = (await prisma.user.count()) === 0;
  } catch {
    needsSetup = false;
  }

  if (!session.userId) {
    return NextResponse.json({ user: null, needsSetup }, { status: 200 });
  }
  return NextResponse.json({
    user: {
      id: session.userId,
      email: session.email,
      role: session.role,
    },
    needsSetup,
  });
}
