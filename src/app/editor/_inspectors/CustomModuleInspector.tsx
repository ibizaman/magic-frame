"use client";

import { useEffect, useState } from "react";
import type { WidgetLayoutItem } from "../_types";
import { useT } from "@/lib/i18n/LocaleProvider";

type Field = {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "boolean" | "color" | "url";
  default?: any;
  placeholder?: string;
  help?: string;
  required?: boolean;
};

type ModuleDescriptor = {
  type: string;
  label: string;
  iconEmoji: string;
  description?: string;
  fields: Field[];
};

type Props = {
  widget: WidgetLayoutItem;
  updateConfig: (i: string, key: string, value: any) => void;
};

/**
 * Inspector für hochgeladene Custom-Module. Lädt das Manifest aus
 * /api/modules und rendert die im Manifest definierten Felder als
 * Input/Number/Boolean/Color/Textarea — abhängig vom field.type.
 */
export default function CustomModuleInspector({ widget, updateConfig }: Props) {
  const t = useT();
  const [mod, setMod] = useState<ModuleDescriptor | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/modules", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const found = (d.modules ?? []).find((m: any) => m.type === widget.type);
        if (found) {
          setMod(found);
          setError(null);
        } else {
          setError(t("Modul '{x}' nicht gefunden. Eventuell wurde es gelöscht oder deaktiviert.").replace("{x}", widget.type));
        }
      })
      .catch((e) => setError(e.message));
  }, [widget.type, t]);

  if (error) {
    return (
      <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
        {error}
      </div>
    );
  }
  if (!mod) {
    return <div className="text-sm text-[var(--mf-fg)]/40">{t("Lade…")}</div>;
  }

  const config = (widget.config as any) ?? {};

  return (
    <div className="space-y-4">
      <div className="text-xs text-[var(--mf-fg)]/50 bg-[var(--mf-ovl)]/30 light:bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 rounded-lg p-3 flex items-start gap-2">
        <span className="text-base leading-none">{mod.iconEmoji}</span>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-[var(--mf-fg)]/80">{mod.label}</div>
          {mod.description && <p className="mt-1 text-[12px]">{mod.description}</p>}
          <code className="block mt-1 text-[10px] font-mono text-[var(--mf-fg)]/40">{mod.type}</code>
        </div>
      </div>

      {mod.fields.length === 0 ? (
        <p className="text-sm text-[var(--mf-fg)]/50">
          {t("Dieses Modul hat keine konfigurierbaren Felder.")}
        </p>
      ) : (
        mod.fields.map((f) => {
          const v = config[f.key] ?? f.default ?? "";
          return (
            <div key={f.key}>
              <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">
                {f.label}
                {f.required ? "" : <span className="text-[var(--mf-fg)]/40 text-xs"> ({t("optional")})</span>}
              </label>
              {f.type === "textarea" ? (
                <textarea
                  value={v}
                  onChange={(e) => updateConfig(widget.i, f.key, e.target.value)}
                  placeholder={f.placeholder ?? ""}
                  rows={4}
                  className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-sm rounded-lg p-3 focus:outline-none focus:border-indigo-500 font-mono"
                />
              ) : f.type === "boolean" ? (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!v}
                    onChange={(e) => updateConfig(widget.i, f.key, e.target.checked)}
                    className="accent-indigo-500 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-sm text-[var(--mf-fg)]/80">{f.placeholder ?? f.label}</span>
                </label>
              ) : f.type === "number" ? (
                <input
                  type="number"
                  value={v === "" ? "" : Number(v)}
                  onChange={(e) =>
                    updateConfig(widget.i, f.key, e.target.value === "" ? "" : Number(e.target.value))
                  }
                  placeholder={f.placeholder ?? ""}
                  className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-sm rounded-lg p-3 focus:outline-none focus:border-indigo-500"
                />
              ) : f.type === "color" ? (
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={v || "#888888"}
                    onChange={(e) => updateConfig(widget.i, f.key, e.target.value)}
                    className="h-9 w-12 rounded border border-[var(--mf-bdr)]/10 bg-[var(--mf-surface)] cursor-pointer"
                  />
                  <input
                    type="text"
                    value={v}
                    onChange={(e) => updateConfig(widget.i, f.key, e.target.value)}
                    placeholder="#rrggbb"
                    className="flex-1 bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-sm rounded-lg p-3 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  {v && (
                    <button
                      onClick={() => updateConfig(widget.i, f.key, "")}
                      className="text-xs text-[var(--mf-fg)]/40 hover:text-[var(--mf-fg)] px-2 h-9"
                    >
                      ×
                    </button>
                  )}
                </div>
              ) : (
                <input
                  type={f.type === "url" ? "url" : "text"}
                  value={v}
                  onChange={(e) => updateConfig(widget.i, f.key, e.target.value)}
                  placeholder={f.placeholder ?? ""}
                  className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-sm rounded-lg p-3 focus:outline-none focus:border-indigo-500"
                />
              )}
              {f.help && <p className="text-[11px] text-[var(--mf-fg)]/40 mt-1">{f.help}</p>}
            </div>
          );
        })
      )}
    </div>
  );
}
