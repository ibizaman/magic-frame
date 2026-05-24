import { NextResponse } from "next/server";
import {
  verifySession,
  UnauthorizedError,
  unauthorizedResponse,
} from "@/lib/auth/dal";
import { prisma } from "@/lib/companion/prisma";
import os from "node:os";
import { readFileSync } from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

let cachedVersion: string | null = null;
function appVersion(): string {
  if (cachedVersion) return cachedVersion;
  try {
    const pkg = JSON.parse(
      readFileSync(path.join(process.cwd(), "package.json"), "utf8"),
    );
    cachedVersion = pkg.version || "?";
  } catch {
    cachedVersion = "?";
  }
  return cachedVersion!;
}

export async function GET() {
  try {
    await verifySession();

    let dbOk = true;
    let userCount = 0;
    try {
      userCount = await prisma.user.count();
    } catch {
      dbOk = false;
    }

    const mem = process.memoryUsage();
    return NextResponse.json({
      appVersion: appVersion(),
      node: process.version,
      nextRuntime: "nodejs",
      platform: `${os.type()} ${os.release()} · ${os.arch()}`,
      hostname: os.hostname(),
      processUptimeSec: Math.floor(process.uptime()),
      hostUptimeSec: Math.floor(os.uptime()),
      memory: {
        rssBytes: mem.rss,
        heapUsedBytes: mem.heapUsed,
        hostTotalBytes: os.totalmem(),
        hostFreeBytes: os.freemem(),
      },
      cpuCount: os.cpus().length,
      loadAvg: os.loadavg().map((n) => Math.round(n * 100) / 100),
      dbOk,
      userCount,
      cookieSecure: process.env.COOKIE_SECURE === "true",
      now: new Date().toISOString(),
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorizedResponse();
    console.error("server-info error", err);
    return NextResponse.json({ error: "Interner Fehler." }, { status: 500 });
  }
}
