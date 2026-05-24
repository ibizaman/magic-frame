import "server-only";
import { NextRequest } from "next/server";

/**
 * Bestimmt die Client-IP für Brute-Force-Tracking.
 *
 * Im DDNS-Setup steht die App direkt am Internet (Port 80 → Docker → Node).
 * `x-forwarded-for` kann aber gesetzt sein, wenn ein Reverse-Proxy (z. B.
 * Cloudflare-Tunnel, nginx-Proxy-Manager) davor läuft. Wir trauen dem Header
 * nur, wenn die direkte Quelle als „trusted" eingestuft ist (RFC1918) — sonst
 * könnte ein Angreifer beliebige IPs faken.
 */
export function clientIp(req: NextRequest): string {
  const direct =
    (req as any).ip ||
    req.headers.get("x-real-ip") ||
    "0.0.0.0";

  const xff = req.headers.get("x-forwarded-for");
  if (xff && isPrivate(direct)) {
    // Nimm die linkeste Adresse (= der ursprüngliche Client). Trim falls Liste.
    const first = xff.split(",")[0]?.trim();
    if (first) return normalize(first);
  }
  return normalize(direct);
}

function normalize(ip: string): string {
  // IPv6-Mapped IPv4 (::ffff:1.2.3.4) → 1.2.3.4
  const m = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (m) return m[1];
  return ip;
}

function isPrivate(ip: string): boolean {
  const n = normalize(ip);
  if (n === "127.0.0.1" || n === "::1") return true;
  // 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16
  if (/^10\./.test(n)) return true;
  if (/^192\.168\./.test(n)) return true;
  const m = n.match(/^172\.(\d+)\./);
  if (m) {
    const o2 = parseInt(m[1], 10);
    if (o2 >= 16 && o2 <= 31) return true;
  }
  // IPv6 ULA fc00::/7
  if (/^f[cd]/i.test(n)) return true;
  return false;
}
