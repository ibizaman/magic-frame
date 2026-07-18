import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

/**
 * Öffentliche, schlanke Versions-Auskunft — bewusst OHNE Auth: die
 * read-only Kiosk-Displays (/view) haben keine Session und nutzen das,
 * um nach einem Server-Update genau einmal automatisch neu zu laden
 * (Versions-Check beim Socket-Reconnect). Mehr als die Versionsnummer
 * gibt es hier nicht zu holen.
 */

let cached: string | null = null;

export async function GET() {
  if (!cached) {
    try {
      const pkg = JSON.parse(
        readFileSync(path.join(process.cwd(), "package.json"), "utf8"),
      );
      cached = pkg.version || "0.0.0";
    } catch {
      cached = "0.0.0";
    }
  }
  return NextResponse.json({ version: cached });
}
