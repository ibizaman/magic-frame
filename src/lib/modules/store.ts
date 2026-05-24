import "server-only";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Manifest-Schema für hochgeladene Custom-Module.
 *
 * Wird beim Upload (POST /api/admin/modules) zusammen mit dem JS-Bundle
 * gespeichert. Felder werden vom Editor-Inspector dynamisch gerendert,
 * sodass jedes Modul seine eigenen Konfig-Felder definieren kann.
 */
export type ModuleManifestField = {
  key: string;
  label: string;
  type: "text" | "number" | "boolean" | "color" | "url" | "textarea";
  default?: string | number | boolean;
  placeholder?: string;
  help?: string;
  required?: boolean;
};

export type ModuleManifest = {
  /** z. B. "custom:hello" oder einfach "hello-v2" — wird automatisch zu custom:<name> wenn nicht schon mit custom: prefixed. */
  type: string;
  label: string;
  description?: string;
  iconEmoji?: string;
  version?: string;
  fields?: ModuleManifestField[];
  author?: string;
  homepage?: string;
};

export type CustomModuleRow = {
  id: string;
  type: string;
  label: string;
  description: string;
  iconEmoji: string;
  version: string;
  manifest: ModuleManifest;
  bundleSize: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export function parseManifest(raw: unknown): ModuleManifest {
  if (!raw || typeof raw !== "object") {
    throw new Error("Manifest muss ein JSON-Objekt sein.");
  }
  const m = raw as Record<string, any>;
  let type = String(m.type ?? "").trim();
  if (!type) throw new Error("Manifest: `type` fehlt.");
  // Auto-prefix damit Custom-Modul-Types nie mit Core-Widget-Types kollidieren
  if (!type.startsWith("custom:")) type = `custom:${type}`;
  if (!/^custom:[a-z0-9][a-z0-9_-]{0,63}$/i.test(type)) {
    throw new Error(`Manifest: ungültiger \`type\` "${type}" — nur a-z0-9_-, max 64 Zeichen.`);
  }
  const label = String(m.label ?? "").trim();
  if (!label) throw new Error("Manifest: `label` fehlt.");

  const rawFields = Array.isArray(m.fields) ? m.fields : [];
  const fields: ModuleManifestField[] = rawFields
    .filter((f: any) => f && typeof f === "object" && f.key)
    .map((f: any) => ({
      key: String(f.key),
      label: String(f.label ?? f.key),
      type:
        f.type === "number" || f.type === "boolean" || f.type === "color" || f.type === "url" || f.type === "textarea"
          ? f.type
          : "text",
      default: f.default,
      placeholder: f.placeholder ? String(f.placeholder) : undefined,
      help: f.help ? String(f.help) : undefined,
      required: !!f.required,
    }));

  return {
    type,
    label,
    description: m.description ? String(m.description) : "",
    iconEmoji: m.iconEmoji ? String(m.iconEmoji).slice(0, 4) : "🧩",
    version: m.version ? String(m.version) : "1.0.0",
    fields,
    author: m.author ? String(m.author) : undefined,
    homepage: m.homepage ? String(m.homepage) : undefined,
  };
}

function serialize(row: any): CustomModuleRow {
  return {
    id: row.id,
    type: row.type,
    label: row.label,
    description: row.description,
    iconEmoji: row.iconEmoji,
    version: row.version,
    manifest: JSON.parse(row.manifestJson),
    bundleSize: row.bundleJs.length,
    enabled: row.enabled,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listModules(opts?: { enabledOnly?: boolean }): Promise<CustomModuleRow[]> {
  const rows = await prisma.customModule.findMany({
    where: opts?.enabledOnly ? { enabled: true } : undefined,
    orderBy: { label: "asc" },
  });
  return rows.map(serialize);
}

export async function getModule(type: string): Promise<CustomModuleRow | null> {
  const row = await prisma.customModule.findUnique({ where: { type } });
  return row ? serialize(row) : null;
}

export async function getModuleBundle(type: string): Promise<string | null> {
  const row = await prisma.customModule.findUnique({
    where: { type },
    select: { bundleJs: true, enabled: true },
  });
  if (!row || !row.enabled) return null;
  return row.bundleJs;
}

export async function upsertModule(input: {
  manifest: ModuleManifest;
  bundleJs: string;
}): Promise<CustomModuleRow> {
  if (!input.bundleJs || input.bundleJs.length < 20) {
    throw new Error("Bundle leer oder zu kurz.");
  }
  if (input.bundleJs.length > 2 * 1024 * 1024) {
    throw new Error("Bundle > 2 MB — bitte schlanker bauen.");
  }
  if (!input.bundleJs.includes("registerWidget")) {
    throw new Error("Bundle ruft `MagicFrame.registerWidget(...)` nicht auf — falsch gebaut?");
  }
  const m = input.manifest;
  const row = await prisma.customModule.upsert({
    where: { type: m.type },
    create: {
      type: m.type,
      label: m.label,
      description: m.description ?? "",
      iconEmoji: m.iconEmoji ?? "🧩",
      version: m.version ?? "1.0.0",
      manifestJson: JSON.stringify(m),
      bundleJs: input.bundleJs,
      enabled: true,
    },
    update: {
      label: m.label,
      description: m.description ?? "",
      iconEmoji: m.iconEmoji ?? "🧩",
      version: m.version ?? "1.0.0",
      manifestJson: JSON.stringify(m),
      bundleJs: input.bundleJs,
    },
  });
  return serialize(row);
}

export async function setModuleEnabled(id: string, enabled: boolean): Promise<CustomModuleRow> {
  const row = await prisma.customModule.update({
    where: { id },
    data: { enabled },
  });
  return serialize(row);
}

export async function deleteModule(id: string): Promise<void> {
  await prisma.customModule.delete({ where: { id } });
}
