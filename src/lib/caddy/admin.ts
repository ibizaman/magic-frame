import "server-only";
import { writeFile, readFile, mkdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { setCaddyState } from "./store";

// Im Container ist das Caddy-Config-Volume unter /caddy/config gemountet.
// Caddy mountet das gleiche Volume unter /etc/caddy — schreibt also App rein,
// liest Caddy raus.
const CADDY_CONFIG_DIR = process.env.CADDY_CONFIG_DIR || "/caddy/config";
const CADDY_FILE = join(CADDY_CONFIG_DIR, "Caddyfile");

const CADDY_ADMIN = process.env.CADDY_ADMIN_URL || "http://caddy:2019";

/**
 * Schreibt das Caddyfile ins Shared-Volume und triggert via Admin-API einen
 * Reload. Caddy parsed dabei das neue File, validiert es und lädt es atomar —
 * wenn das fehlschlägt, läuft die alte Config weiter.
 */
export async function writeAndReload(caddyfile: string): Promise<{
  ok: boolean;
  reloaded: boolean;
  error?: string;
}> {
  try {
    await mkdir(CADDY_CONFIG_DIR, { recursive: true });
    await writeFile(CADDY_FILE, caddyfile, "utf-8");
  } catch (e: any) {
    const msg = `Caddyfile schreiben fehlgeschlagen: ${e?.message || e}`;
    await setCaddyState({ lastError: msg });
    return { ok: false, reloaded: false, error: msg };
  }

  // Reload via Admin-API. Caddy unterstützt `POST /load` mit JSON-Config —
  // wir nutzen den Endpoint `/load` mit Header `Content-Type: text/caddyfile`,
  // dann adaptiert Caddy selbst und reloaded. Das ist atomar.
  try {
    const res = await fetch(`${CADDY_ADMIN}/load`, {
      method: "POST",
      headers: { "Content-Type": "text/caddyfile" },
      body: caddyfile,
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const msg = `Caddy-Reload fehlgeschlagen (HTTP ${res.status}): ${text.slice(0, 300)}`;
      await setCaddyState({ lastError: msg });
      return { ok: false, reloaded: false, error: msg };
    }
  } catch (e: any) {
    const msg = `Caddy-Admin nicht erreichbar: ${e?.message || e}`;
    await setCaddyState({ lastError: msg });
    return { ok: false, reloaded: false, error: msg };
  }

  await setCaddyState({
    lastReload: new Date().toISOString(),
    lastError: null,
  });
  return { ok: true, reloaded: true };
}

/** Liest den letzten gespeicherten Caddyfile-Inhalt — für UI-Preview. */
export async function readCurrentCaddyfile(): Promise<string | null> {
  try {
    return await readFile(CADDY_FILE, "utf-8");
  } catch {
    return null;
  }
}

/**
 * Fragt die Caddy-Admin-API nach dem aktuellen Status — ob er antwortet und
 * welche Config geladen ist. Wir lesen `/config/` und schauen ob da TLS-Apps
 * konfiguriert sind.
 */
export async function fetchCaddyStatus(): Promise<{
  reachable: boolean;
  tlsMode: boolean;
  certSubject?: string | null;
  certNotAfter?: string | null;
}> {
  try {
    const res = await fetch(`${CADDY_ADMIN}/config/apps/tls/certificates/automate`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) {
      // /load mit Caddyfile speichert die Config — der Pfad existiert vielleicht
      // nicht. Trotzdem reachable=true.
      return { reachable: true, tlsMode: false };
    }
    const data: any = await res.json().catch(() => null);
    const subjects: string[] = Array.isArray(data) ? data : [];
    if (subjects.length === 0) {
      return { reachable: true, tlsMode: false };
    }
    return {
      reachable: true,
      tlsMode: true,
      certSubject: subjects.join(", "),
      // notAfter könnten wir aus /pki/ca/local oder dem Cert-File lesen,
      // ist aber komplexer. Lassen wir vorerst leer und ergänzen wenn nötig.
      certNotAfter: null,
    };
  } catch {
    return { reachable: false, tlsMode: false };
  }
}

/** Maintenance: liefert mtime des Caddyfiles — nützlich um „letzte Änderung" zu zeigen. */
export async function caddyfileMtime(): Promise<string | null> {
  try {
    const st = await stat(CADDY_FILE);
    return st.mtime.toISOString();
  } catch {
    return null;
  }
}
