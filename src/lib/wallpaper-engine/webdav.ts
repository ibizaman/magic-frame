/**
 * Normalisiert eine vom User eingegebene WebDAV-Server-URL, bevor sie an die
 * `webdav`-Lib (`createClient`) geht.
 *
 * Hintergrund (#29): Die `webdav`-Lib parst die URL intern mit `url-parse`.
 * Fehlt das Protokoll (z. B. nur "192.168.1.1:8249"), landet host:port komplett
 * im Pfad — host/port bleiben leer — und die Lib baut daraus einen kaputten
 * Request à la "192.168.1.1://8249/", der mit ERR_INVALID_URL scheitert.
 *
 * Defensive Lösung: führendes/abschließendes Whitespace strippen und ein
 * "http://" ergänzen, wenn kein http(s)-Protokoll vorhanden ist. URLs, die
 * bereits korrekt mit Protokoll beginnen, bleiben 1:1 unverändert.
 */
export function normalizeWebdavUrl(raw: string | null | undefined): string {
  const url = (raw ?? "").trim();
  if (!url) return url;
  if (!/^https?:\/\//i.test(url)) {
    return "http://" + url;
  }
  return url;
}
