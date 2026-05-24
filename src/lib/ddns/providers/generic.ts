import "server-only";
import type { DdnsProvider } from "../types";

/**
 * Generischer URL-DDNS-Provider — deckt DynDNS-v2-kompatible Dienste ab.
 *
 * User trägt eine Update-URL mit `{ip}`-Platzhalter ein. Beispiele:
 *   DuckDNS:  https://www.duckdns.org/update?domains=foo&token=TOKEN&ip={ip}
 *   Strato:   https://USER:PASS@dyndns.strato.com/nic/update?hostname=HOST&myip={ip}
 *   No-IP:    https://USER:PASS@dynupdate.no-ip.com/nic/update?hostname=HOST&myip={ip}
 *   All-Inkl: https://USER:PASS@dyndns.kasserver.com/?myip={ip}
 *   IONOS:    https://USER:PASS@update.dedyn.io/update?myipv4={ip}
 *
 * Antwort wird als "geändert" gewertet wenn `successContains` enthalten ist (Default: "good")
 * und als "unverändert" wenn `unchangedContains` enthalten ist (Default: "nochg").
 * Alles andere = Fehler.
 */
export const genericProvider: DdnsProvider = {
  name: "generic",
  label: "Generisch (URL / DynDNS v2)",
  description:
    "Universell für Strato, No-IP, DuckDNS, All-Inkl, IONOS, Selfhost.de & alle DynDNS-v2-kompatiblen Dienste. URL mit {ip}-Platzhalter.",
  fields: [
    {
      key: "updateUrl",
      label: "Update-URL",
      type: "url",
      placeholder: "https://user:pass@dyndns.example.com/nic/update?hostname=HOST&myip={ip}",
      help:
        "Platzhalter {ip} wird durch die aktuelle öffentliche IP ersetzt. Basic-Auth direkt in der URL möglich.",
      required: true,
    },
    {
      key: "successContains",
      label: "Erfolg-Marker (optional)",
      type: "text",
      placeholder: "good",
      help: "Substring in der Antwort, der „IP wurde gesetzt\" bedeutet. Default: good",
      defaultValue: "good",
    },
    {
      key: "unchangedContains",
      label: "Unverändert-Marker (optional)",
      type: "text",
      placeholder: "nochg",
      help: "Substring, der „IP war schon korrekt\" bedeutet. Default: nochg",
      defaultValue: "nochg",
    },
  ],

  async update(p, ip) {
    const tpl = (p.updateUrl || "").trim();
    if (!tpl) throw new Error("Update-URL fehlt.");
    if (!tpl.includes("{ip}")) {
      throw new Error("Update-URL muss den Platzhalter {ip} enthalten.");
    }
    const successMarker = (p.successContains || "good").toLowerCase();
    const unchangedMarker = (p.unchangedContains || "nochg").toLowerCase();

    const url = tpl.replace(/\{ip\}/g, encodeURIComponent(ip));

    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: {
        // Manche Provider (No-IP) verlangen einen User-Agent.
        "User-Agent": "MagicFrame-DDNS/1.0",
      },
      signal: AbortSignal.timeout(8000),
    });
    const text = (await res.text()).trim();
    const body = text.toLowerCase();

    if (!res.ok && !body.includes(successMarker) && !body.includes(unchangedMarker)) {
      throw new Error(`Update fehlgeschlagen (HTTP ${res.status}): ${text.slice(0, 200)}`);
    }

    if (body.includes(unchangedMarker)) {
      return { changed: false, recordIp: ip };
    }
    if (body.includes(successMarker)) {
      return { changed: true, recordIp: ip };
    }
    // Klassische DynDNS-Fehlerkürzel
    if (/(badauth|nohost|notfqdn|abuse|911|dnserr)/i.test(text)) {
      throw new Error(`DDNS-Provider meldet: ${text.slice(0, 200)}`);
    }
    // Manche Provider antworten ohne "good"/"nochg" — wenn HTTP 200, nehmen wir das als changed.
    if (res.ok) return { changed: true, recordIp: ip };
    throw new Error(`Unklare Antwort vom Provider: ${text.slice(0, 200) || `HTTP ${res.status}`}`);
  },
};
