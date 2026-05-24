import "server-only";

/**
 * Caddy-DNS-Provider-Registry für ACME DNS-01 Challenge.
 *
 * Jeder Provider hat eigene Auth-Felder (Token, Username+Password, KeyId+Secret,
 * etc.) — diese werden separat in der CaddyConfig pro Provider gespeichert.
 * Wer Cloudflare/Hetzner schon in DDNS hat, kann den Token mit einem Klick
 * "Aus DDNS übernehmen" rüber-kopieren — sonst hier direkt eingeben.
 *
 * `tlsBlock` rendert das `tls { dns <provider> ... }`-Snippet für den
 * Caddyfile-Generator. Jeder Provider hat seine eigene Syntax — z. B. nimmt
 * Cloudflare einen einzelnen Token-String, IONOS einen api_key, route53
 * eigene AWS-Felder.
 */
export type CaddyProviderFieldType = "text" | "password";

export type CaddyProviderField = {
  key: string;
  label: string;
  type: CaddyProviderFieldType;
  placeholder?: string;
  help?: string;
  required?: boolean;
};

export type CaddyDnsProviderName =
  | "cloudflare"
  | "hetzner"
  | "route53"
  | "digitalocean"
  | "duckdns"
  | "porkbun"
  | "namecheap"
  | "ionos"
  | "netcup"
  | "linode";

export type CaddyDnsProvider = {
  name: CaddyDnsProviderName;
  label: string;
  /** Welche Felder die UI rendern soll. */
  fields: CaddyProviderField[];
  /** Erzeugt den `tls { dns <name> ... }`-Block-Inhalt aus den Werten. */
  tlsBlock(params: Record<string, string>): string[];
  /**
   * Wenn dieser Provider seinen Token auch in der DDNS-Config haben kann,
   * Funktion die den Token aus dem DDNS-Bag zieht. Damit User „Aus DDNS
   * übernehmen" anklicken kann.
   */
  ddnsTokenSource?: (ddnsBag: Record<string, string>) => Partial<Record<string, string>>;
};

function indent(lines: string[]): string[] {
  return lines.map((l) => `    ${l}`);
}

export const CADDY_DNS_PROVIDERS: Record<CaddyDnsProviderName, CaddyDnsProvider> = {
  cloudflare: {
    name: "cloudflare",
    label: "Cloudflare",
    fields: [
      {
        key: "apiToken",
        label: "API-Token",
        type: "password",
        placeholder: "eyJh…",
        help: "Cloudflare API-Token mit Zone:Read + DNS:Edit. Identisch zum DDNS-Token.",
        required: true,
      },
    ],
    tlsBlock(p) {
      return ["tls {", ...indent([`dns cloudflare ${p.apiToken}`]), "}"];
    },
    ddnsTokenSource: (b) => ({ apiToken: b.apiToken }),
  },

  hetzner: {
    name: "hetzner",
    label: "Hetzner DNS",
    fields: [
      {
        key: "apiToken",
        label: "Auth-API-Token",
        type: "password",
        help: "Hetzner DNS Console → Access Tokens. Identisch zum DDNS-Token.",
        required: true,
      },
    ],
    tlsBlock(p) {
      return ["tls {", ...indent([`dns hetzner ${p.apiToken}`]), "}"];
    },
    ddnsTokenSource: (b) => ({ apiToken: b.apiToken }),
  },

  route53: {
    name: "route53",
    label: "AWS Route 53",
    fields: [
      { key: "accessKeyId", label: "AWS Access Key ID", type: "text", required: true },
      { key: "secretAccessKey", label: "AWS Secret Access Key", type: "password", required: true },
      { key: "region", label: "AWS Region", type: "text", placeholder: "us-east-1" },
    ],
    tlsBlock(p) {
      const lines = [
        "dns route53 {",
        `    access_key_id ${p.accessKeyId}`,
        `    secret_access_key ${p.secretAccessKey}`,
      ];
      if (p.region) lines.push(`    region ${p.region}`);
      lines.push("}");
      return ["tls {", ...indent(lines), "}"];
    },
  },

  digitalocean: {
    name: "digitalocean",
    label: "DigitalOcean",
    fields: [
      { key: "authToken", label: "API-Token", type: "password", required: true },
    ],
    tlsBlock(p) {
      return ["tls {", ...indent([`dns digitalocean ${p.authToken}`]), "}"];
    },
  },

  duckdns: {
    name: "duckdns",
    label: "DuckDNS",
    fields: [
      {
        key: "apiToken",
        label: "DuckDNS-Token",
        type: "password",
        help: "Aus dem DuckDNS-Konto. Hostname muss in den DuckDNS-Domains existieren.",
        required: true,
      },
    ],
    tlsBlock(p) {
      return ["tls {", ...indent([`dns duckdns ${p.apiToken}`]), "}"];
    },
  },

  porkbun: {
    name: "porkbun",
    label: "Porkbun",
    fields: [
      { key: "apiKey", label: "API-Key", type: "password", required: true },
      { key: "apiSecret", label: "API-Secret", type: "password", required: true },
    ],
    tlsBlock(p) {
      return [
        "tls {",
        ...indent([
          "dns porkbun {",
          `    api_key ${p.apiKey}`,
          `    api_secret_key ${p.apiSecret}`,
          "}",
        ]),
        "}",
      ];
    },
  },

  namecheap: {
    name: "namecheap",
    label: "Namecheap",
    fields: [
      { key: "user", label: "Username", type: "text", required: true },
      { key: "apiKey", label: "API-Key", type: "password", required: true },
      {
        key: "apiEndpoint",
        label: "API-Endpoint (optional)",
        type: "text",
        placeholder: "https://api.namecheap.com/xml.response",
      },
    ],
    tlsBlock(p) {
      const lines = [
        "dns namecheap {",
        `    user ${p.user}`,
        `    api_key ${p.apiKey}`,
      ];
      if (p.apiEndpoint) lines.push(`    api_endpoint ${p.apiEndpoint}`);
      lines.push("}");
      return ["tls {", ...indent(lines), "}"];
    },
  },

  ionos: {
    name: "ionos",
    label: "IONOS",
    fields: [
      {
        key: "apiToken",
        label: "API-Token",
        type: "password",
        help: "Aus dem IONOS Developer Portal (publicKey.secret).",
        required: true,
      },
    ],
    tlsBlock(p) {
      return ["tls {", ...indent([`dns ionos ${p.apiToken}`]), "}"];
    },
  },

  netcup: {
    name: "netcup",
    label: "Netcup",
    fields: [
      { key: "customerNumber", label: "Kunden-Nr", type: "text", required: true },
      { key: "apiKey", label: "API-Key", type: "password", required: true },
      { key: "apiPassword", label: "API-Passwort", type: "password", required: true },
    ],
    tlsBlock(p) {
      return [
        "tls {",
        ...indent([
          "dns netcup {",
          `    customer_number ${p.customerNumber}`,
          `    api_key ${p.apiKey}`,
          `    api_password ${p.apiPassword}`,
          "}",
        ]),
        "}",
      ];
    },
  },

  linode: {
    name: "linode",
    label: "Linode",
    fields: [
      { key: "apiToken", label: "API-Token", type: "password", required: true },
    ],
    tlsBlock(p) {
      return ["tls {", ...indent([`dns linode ${p.apiToken}`]), "}"];
    },
  },
};

export const CADDY_DNS_PROVIDER_NAMES = Object.keys(CADDY_DNS_PROVIDERS) as CaddyDnsProviderName[];

export function getCaddyProvider(name: CaddyDnsProviderName): CaddyDnsProvider {
  return CADDY_DNS_PROVIDERS[name];
}

export function listCaddyProviderDescriptors() {
  return CADDY_DNS_PROVIDER_NAMES.map((n) => {
    const p = CADDY_DNS_PROVIDERS[n];
    return {
      name: p.name,
      label: p.label,
      fields: p.fields,
      hasDdnsBridge: !!p.ddnsTokenSource,
    };
  });
}
