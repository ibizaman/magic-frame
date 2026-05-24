export type HAEntitySlot = {
  entityId?: string;
  icon?: string;
  color?: string;
  hideWhen?: string;
  colorWhen?: string;
  colorTarget?: string;
  showIfEntity?: string;
  showIfState?: string;
  tapAction?: string;
  tapActionEntity?: string;
};

const SLOT_FIELDS: (keyof HAEntitySlot)[] = [
  "entityId",
  "icon",
  "color",
  "hideWhen",
  "colorWhen",
  "colorTarget",
  "showIfEntity",
  "showIfState",
  "tapAction",
  "tapActionEntity",
];

const LEGACY_SUFFIXES = ["", "2", "3", "4"] as const;

function pickLegacySlot(
  config: Record<string, unknown>,
  suffix: string,
): HAEntitySlot {
  const out: HAEntitySlot = {};
  for (const field of SLOT_FIELDS) {
    const raw = config[`${field}${suffix}`];
    if (typeof raw === "string" && raw.trim() !== "") {
      out[field] = raw;
    }
  }
  return out;
}

export function migrateHomeAssistantConfig(
  config: unknown,
): Record<string, unknown> {
  if (!config || typeof config !== "object") return {};
  const src = config as Record<string, unknown>;

  if (Array.isArray(src.entities)) return src;

  const slots = LEGACY_SUFFIXES.map((suffix) => pickLegacySlot(src, suffix))
    .filter((slot) => slot.entityId);

  const cleaned: Record<string, unknown> = { ...src };
  for (const suffix of LEGACY_SUFFIXES) {
    for (const field of SLOT_FIELDS) {
      delete cleaned[`${field}${suffix}`];
    }
  }
  cleaned.entities = slots;
  return cleaned;
}

export function migrateLayoutConfigs<T extends { type: string; config: unknown }>(
  widgets: T[],
): T[] {
  return widgets.map((w) =>
    w.type === "HomeAssistantWidget.tsx"
      ? { ...w, config: migrateHomeAssistantConfig(w.config) }
      : w,
  );
}
