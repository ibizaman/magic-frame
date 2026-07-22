import { promises as fs } from "fs";
import path from "path";

// Eigene Bilder, die direkt in Magic Frame hochgeladen werden — z. B.
// freigestellte PNGs für Status-Karten, damit man dafür nicht im
// HA-www-Ordner hantieren muss.
//
// Ablage im bestehenden Wallpaper-Volume (/app/wallpapers), Unterordner
// "uploads": das Volume ist in jeder Installation schon eingebunden, also
// braucht es KEINE Änderung an docker-compose oder den K8s-Manifesten.
const BASE_DIR = process.env.WALLPAPER_DIR || "/app/wallpapers";
export const UPLOAD_DIR = path.join(BASE_DIR, "uploads");

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB

// SVG bewusst NICHT erlaubt: SVG kann Skript enthalten und würde von der
// gleichen Herkunft ausgeliefert.
export const ALLOWED: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

/**
 * Macht aus einem beliebigen Namen einen sicheren Dateinamen.
 * Verzeichniswechsel ist ausgeschlossen: nur der Basename wird verwendet und
 * alles außer harmlosen Zeichen ersetzt.
 */
export function safeName(input: string, ext: string): string {
  const base = path.basename(String(input || "bild"));
  const stem = base
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "bild";
  return `${stem}${ext}`;
}

async function ensureDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

/** Prüft, dass der Pfad wirklich unter UPLOAD_DIR liegt. */
export function resolveInside(name: string): string | null {
  const clean = path.basename(String(name || ""));
  if (!clean || clean.startsWith(".")) return null;
  const full = path.resolve(UPLOAD_DIR, clean);
  const root = path.resolve(UPLOAD_DIR);
  if (full !== root && !full.startsWith(root + path.sep)) return null;
  return full;
}

export async function listUploads(): Promise<{ name: string; size: number; url: string }[]> {
  try {
    await ensureDir();
    const entries = await fs.readdir(UPLOAD_DIR, { withFileTypes: true });
    const out: { name: string; size: number; url: string }[] = [];
    for (const e of entries) {
      if (!e.isFile()) continue;
      if (!Object.values(ALLOWED).includes(path.extname(e.name).toLowerCase())) continue;
      const st = await fs.stat(path.join(UPLOAD_DIR, e.name));
      out.push({ name: e.name, size: st.size, url: `/api/uploads/${encodeURIComponent(e.name)}` });
    }
    return out.sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

/** Schreibt die Datei; hängt bei Namenskollision -2, -3 … an. */
export async function saveUpload(fileName: string, mime: string, data: Buffer): Promise<{ name: string; url: string }> {
  const ext = ALLOWED[mime];
  if (!ext) throw new Error("Nicht unterstütztes Bildformat");
  if (data.byteLength > MAX_UPLOAD_BYTES) throw new Error("Datei ist zu groß");
  await ensureDir();

  let name = safeName(fileName, ext);
  const stem = name.slice(0, -ext.length);
  let i = 2;
  while (true) {
    try {
      await fs.access(path.join(UPLOAD_DIR, name));
      name = `${stem}-${i++}${ext}`;
    } catch {
      break; // frei
    }
  }
  await fs.writeFile(path.join(UPLOAD_DIR, name), data);
  return { name, url: `/api/uploads/${encodeURIComponent(name)}` };
}

export async function deleteUpload(name: string): Promise<boolean> {
  const full = resolveInside(name);
  if (!full) return false;
  try {
    await fs.unlink(full);
    return true;
  } catch {
    return false;
  }
}
