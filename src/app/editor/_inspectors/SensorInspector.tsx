"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import type { WidgetLayoutItem } from "../_types";
import { useT } from "@/lib/i18n/LocaleProvider";
import HAEntityInput from "../_components/HAEntityInput";
import IconPicker from "../_components/IconPicker";
import AccordionCard from "../_components/AccordionCard";

type Props = {
  widget: WidgetLayoutItem;
  updateConfig: (i: string, key: string, value: any) => void;
};

type Slot = { entityId?: string; icon?: string; label?: string; color?: string; unit?: string; decimals?: number };

const INPUT =
  "w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-sm rounded-lg px-3 h-10 focus:outline-none focus:border-blue-500";

export function SensorInspector({ widget, updateConfig }: Props) {
  const t = useT();
  const cfg = (widget.config as any) ?? {};
  const design: string = cfg.design === "grid" ? "grid" : "cards";
  const iconFrame: boolean = cfg.iconFrame === true;
  const slots: Slot[] = Array.isArray(cfg.entities) ? cfg.entities : [];
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const setSlots = (next: Slot[]) => updateConfig(widget.i, "entities", next);
  const addSlot = () => {
    setSlots([...slots, { entityId: "" }]);
    setOpenIdx(slots.length);
  };
  const removeSlot = (idx: number) => {
    setSlots(slots.filter((_, i) => i !== idx));
    if (openIdx === idx) setOpenIdx(null);
  };
  const updateSlot = (idx: number, key: keyof Slot, value: any) =>
    setSlots(slots.map((s, i) => (i === idx ? { ...s, [key]: value } : s)));
  const moveSlot = (idx: number, dir: number) => {
    const target = idx + dir;
    if (target < 0 || target >= slots.length) return;
    const next = [...slots];
    [next[idx], next[target]] = [next[target], next[idx]];
    setSlots(next);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">{t("Darstellung")}</label>
          <select
            value={design}
            onChange={(e) => updateConfig(widget.i, "design", e.target.value)}
            className={INPUT}
          >
            <option value="cards">{t("Cards (Zeilen)")}</option>
            <option value="grid">{t("Kacheln (Grid)")}</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">{t("Kachel-Theme")}</label>
          <select
            value={cfg.cardTheme === "light" ? "light" : "dark"}
            onChange={(e) => updateConfig(widget.i, "cardTheme", e.target.value)}
            className={INPUT}
          >
            <option value="dark">{t("Dunkel (Glas)")}</option>
            <option value="light">{t("Hell (weißes Glas)")}</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[var(--mf-fg)]/50 mb-1.5 flex justify-between">
              <span>{t("Deckkraft")}</span>
              <span className="text-blue-400">{cfg.cardOpacity ?? 40}%</span>
            </label>
            <input
              type="range" min="0" max="100" step="5" value={cfg.cardOpacity ?? 40}
              onChange={(e) => updateConfig(widget.i, "cardOpacity", parseInt(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-500 bg-[var(--mf-elev)]/10"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--mf-fg)]/50 mb-1.5 flex justify-between">
              <span>{t("Unschärfe")}</span>
              <span className="text-blue-400">{cfg.cardBlur ?? 12}px</span>
            </label>
            <input
              type="range" min="0" max="40" step="2" value={cfg.cardBlur ?? 12}
              onChange={(e) => updateConfig(widget.i, "cardBlur", parseInt(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-500 bg-[var(--mf-elev)]/10"
            />
          </div>
        </div>

        <label className="flex items-center gap-3 cursor-pointer group">
          <div className="relative">
            <input
              type="checkbox"
              checked={iconFrame}
              onChange={(e) => updateConfig(widget.i, "iconFrame", e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-[var(--mf-elev)]/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
          </div>
          <span className="text-sm font-medium text-[var(--mf-fg)]/80 group-hover:text-[var(--mf-fg)] transition-colors">{t("Icon mit Rahmen")}</span>
        </label>

        <div>
          <label className="text-sm font-medium text-[var(--mf-fg)]/80 mb-2 flex justify-between">
            <span>{t("Icon-Größe")}</span>
            <span className="text-blue-400">{Math.round((cfg.iconSize ?? 1) * 100)}%</span>
          </label>
          <input
            type="range" min="0.6" max="2.4" step="0.1" value={cfg.iconSize ?? 1}
            onChange={(e) => updateConfig(widget.i, "iconSize", parseFloat(e.target.value))}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-500 bg-[var(--mf-elev)]/10"
          />
        </div>

        {iconFrame && (
          <div>
            <label className="text-sm font-medium text-[var(--mf-fg)]/80 mb-2 flex justify-between">
              <span>{t("Kasten-Größe")}</span>
              <span className="text-blue-400">{Math.round((cfg.frameScale ?? 1) * 100)}%</span>
            </label>
            <input
              type="range" min="0.6" max="2" step="0.1" value={cfg.frameScale ?? 1}
              onChange={(e) => updateConfig(widget.i, "frameScale", parseFloat(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-500 bg-[var(--mf-elev)]/10"
            />
          </div>
        )}
      </div>

      <div className="space-y-3">
        {slots.length === 0 && (
          <p className="text-xs text-[var(--mf-fg)]/40 px-1">{t("Noch keine Sensoren — unten hinzufügen.")}</p>
        )}
        {slots.map((slot, idx) => (
          <AccordionCard
            key={idx}
            open={openIdx === idx}
            onToggle={() => setOpenIdx(openIdx === idx ? null : idx)}
            dotColor={slot.color || "#14b8a6"}
            title={(slot.label && slot.label.trim()) || slot.entityId || `${t("Sensor")} ${idx + 1}`}
            onDelete={() => removeSlot(idx)}
            headerExtra={
              <div className="flex gap-0.5 shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); moveSlot(idx, -1); }}
                  disabled={idx === 0}
                  className="text-[var(--mf-fg)]/40 hover:text-[var(--mf-fg)] disabled:opacity-20 px-1.5 py-0.5 text-xs"
                  title={t("Nach oben")}
                >▲</button>
                <button
                  onClick={(e) => { e.stopPropagation(); moveSlot(idx, 1); }}
                  disabled={idx === slots.length - 1}
                  className="text-[var(--mf-fg)]/40 hover:text-[var(--mf-fg)] disabled:opacity-20 px-1.5 py-0.5 text-xs"
                  title={t("Nach unten")}
                >▼</button>
              </div>
            }
          >
            <div className="space-y-3">
              <HAEntityInput
                value={slot.entityId || ""}
                onChange={(v) => updateSlot(idx, "entityId", v)}
                placeholder="sensor.pool_temperature"
                clearable
              />

              <IconPicker
                label={t("Icon")}
                value={slot.icon || ""}
                onChange={(iconId) => updateSlot(idx, "icon", iconId)}
                placeholder="mdi:gauge"
                defaultPrefix="mdi"
              />

              <div>
                <label className="text-xs text-[var(--mf-fg)]/50 block mb-1.5">{t("Icon-Farbe")}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={slot.color || "#14b8a6"}
                    onChange={(e) => updateSlot(idx, "color", e.target.value)}
                    className="h-9 w-14 bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 rounded-lg cursor-pointer"
                  />
                  {slot.color ? (
                    <button
                      type="button"
                      onClick={() => updateSlot(idx, "color", undefined)}
                      className="text-xs text-[var(--mf-fg)]/50 hover:text-[var(--mf-fg)]"
                    >
                      {t("Standard")}
                    </button>
                  ) : (
                    <span className="text-xs text-[var(--mf-fg)]/40">{t("Standard (keine Farbe)")}</span>
                  )}
                </div>
              </div>

              <input
                type="text"
                value={slot.label || ""}
                onChange={(e) => updateSlot(idx, "label", e.target.value)}
                placeholder={t("Label (leer = HA-Name)")}
                className={INPUT}
              />

              <div>
                <label className="text-xs text-[var(--mf-fg)]/50 block mb-1.5">{t("Einheit / Nachkommastellen")}</label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={slot.unit || ""}
                    onChange={(e) => updateSlot(idx, "unit", e.target.value)}
                    placeholder="°C"
                    className={INPUT}
                  />
                  <select
                    value={typeof slot.decimals === "number" ? String(slot.decimals) : "auto"}
                    onChange={(e) =>
                      updateSlot(idx, "decimals", e.target.value === "auto" ? undefined : parseInt(e.target.value))
                    }
                    className={INPUT}
                  >
                    <option value="auto">{t("Auto")}</option>
                    <option value="0">0</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                  </select>
                </div>
              </div>
            </div>
          </AccordionCard>
        ))}
      </div>

      <button
        type="button"
        onClick={addSlot}
        className="w-full flex items-center justify-center gap-2 bg-[var(--mf-elev)]/10 hover:bg-[var(--mf-elev)]/20 text-[var(--mf-fg)] py-2.5 rounded-lg text-sm font-medium transition-colors"
      >
        <Plus size={16} /> {t("Sensor hinzufügen")}
      </button>

      <div className="border-t border-[var(--mf-bdr)]/10 pt-4 space-y-3">
        <label className="flex items-center gap-3 cursor-pointer group">
          <div className="relative">
            <input
              type="checkbox"
              checked={cfg.showSparkline === true}
              onChange={(e) => updateConfig(widget.i, "showSparkline", e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-[var(--mf-elev)]/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
          </div>
          <span className="text-sm font-medium text-[var(--mf-fg)]/80 group-hover:text-[var(--mf-fg)] transition-colors">{t("Verlauf anzeigen (Sparkline)")}</span>
        </label>
        {cfg.showSparkline === true && (
          <div>
            <label className="text-sm font-medium text-[var(--mf-fg)]/80 mb-2 flex justify-between">
              <span>{t("Zeitraum")}</span>
              <span className="text-blue-400">{cfg.sparklineHours ?? 6}h</span>
            </label>
            <input
              type="range" min="1" max="48" step="1" value={cfg.sparklineHours ?? 6}
              onChange={(e) => updateConfig(widget.i, "sparklineHours", parseInt(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-500 bg-[var(--mf-elev)]/10"
            />
            <p className="text-xs text-[var(--mf-fg)]/40 mt-1.5 px-1">
              {t("Nur Zahlen-Entities (Sensoren) haben einen sinnvollen Verlauf. HA-History muss aktiv sein.")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
