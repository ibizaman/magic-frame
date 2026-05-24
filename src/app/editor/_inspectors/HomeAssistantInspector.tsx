"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import type { WidgetLayoutItem } from "../_types";
import type { HAEntitySlot } from "@/lib/widgets/ha-migration";
import IconPicker from "../_components/IconPicker";
import AccordionCard from "../_components/AccordionCard";
import { useT } from "@/lib/i18n/LocaleProvider";

type HomeAssistantInspectorProps = {
  widget: WidgetLayoutItem;
  updateConfig: (i: string, key: string, value: any) => void;
};

export default function HomeAssistantInspector({
  widget: activeWidget,
  updateConfig,
}: HomeAssistantInspectorProps) {
  const t = useT();
  const entities: HAEntitySlot[] =
    (activeWidget.config as any)?.entities ?? [];

  // Accordion: standardmäßig alle zu
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const setEntities = (next: HAEntitySlot[]) =>
    updateConfig(activeWidget.i, "entities", next);

  const addEntity = () => {
    setEntities([...entities, { entityId: "", color: "#EAB308" }]);
    setOpenIdx(entities.length); // neue Entity direkt aufklappen
  };

  const removeEntity = (idx: number) => {
    setEntities(entities.filter((_, i) => i !== idx));
    if (openIdx === idx) setOpenIdx(null);
  };

  const updateEntity = (idx: number, key: keyof HAEntitySlot, value: string) =>
    setEntities(
      entities.map((e, i) => (i === idx ? { ...e, [key]: value } : e)),
    );

  const moveEntity = (idx: number, direction: -1 | 1) => {
    const target = idx + direction;
    if (target < 0 || target >= entities.length) return;
    const next = [...entities];
    [next[idx], next[target]] = [next[target], next[idx]];
    setEntities(next);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {entities.map((entity, idx) => (
          <AccordionCard
            key={idx}
            open={openIdx === idx}
            onToggle={() => setOpenIdx(openIdx === idx ? null : idx)}
            dotColor={entity.color || "#EAB308"}
            title={entity.entityId || `${t("Entity")} ${idx + 1}`}
            onDelete={() => removeEntity(idx)}
            headerExtra={
              <div className="flex gap-0.5 shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); moveEntity(idx, -1); }}
                  disabled={idx === 0}
                  className="text-white/40 hover:text-white disabled:opacity-20 px-1.5 py-0.5 text-xs"
                  title={t("Nach oben")}
                >▲</button>
                <button
                  onClick={(e) => { e.stopPropagation(); moveEntity(idx, 1); }}
                  disabled={idx === entities.length - 1}
                  className="text-white/40 hover:text-white disabled:opacity-20 px-1.5 py-0.5 text-xs"
                  title={t("Nach unten")}
                >▼</button>
              </div>
            }
          >
            <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-white/50 block mb-2">
                {t("Entity-ID (z.B. light.kitchen)")}
              </label>
              <input
                type="text"
                value={entity.entityId || ""}
                placeholder="sensor.living_room_temp"
                onChange={(e) => updateEntity(idx, "entityId", e.target.value)}
                className="w-full bg-black border border-white/10 text-white font-sans text-sm rounded-lg p-3 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <IconPicker
              label={t("Icon")}
              value={entity.icon || ""}
              onChange={(iconId) => updateEntity(idx, "icon", iconId)}
              placeholder="mdi:home-assistant"
              quickPicks={[
                "mdi:lightbulb",
                "mdi:thermometer",
                "mdi:weather-night",
                "mdi:washing-machine",
                "mdi:tumble-dryer",
                "mdi:lock",
                "mdi:door",
                "mdi:window-open",
                "mdi:fan",
                "mdi:power-plug",
                "mdi:tv",
                "mdi:speaker",
              ]}
            />

            <details className="bg-black/30 rounded-lg border border-white/5 p-2">
              <summary className="text-[10px] font-medium text-blue-400 uppercase tracking-wider cursor-pointer select-none">
                {t("Sichtbarkeit abhängig von anderer Entity")}
              </summary>
              <div className="mt-2 space-y-2">
                <div>
                  <label className="text-[10px] font-medium text-blue-400 block mb-1 uppercase tracking-wider">
                    {t("Zeigen, wenn Entity")}
                  </label>
                  <input
                    type="text"
                    value={entity.showIfEntity || ""}
                    placeholder="z.B. switch.washer"
                    onChange={(e) => updateEntity(idx, "showIfEntity", e.target.value)}
                    className="w-full bg-black/50 border border-white/10 text-white/80 font-sans text-xs rounded-md p-2 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-blue-400 block mb-1 uppercase tracking-wider">
                    {t("… den Status hat")}
                  </label>
                  <input
                    type="text"
                    value={entity.showIfState || ""}
                    placeholder="z.B. on"
                    onChange={(e) => updateEntity(idx, "showIfState", e.target.value)}
                    className="w-full bg-black/50 border border-white/10 text-white/80 font-sans text-xs rounded-md p-2 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </details>

            <div>
              <label className="text-[10px] font-medium text-white/50 block mb-1 uppercase tracking-wider">
                {t("Verbergen wenn eigener Status =")}
              </label>
              <input
                type="text"
                value={entity.hideWhen || ""}
                placeholder="z.B. off oder idle"
                onChange={(e) => updateEntity(idx, "hideWhen", e.target.value)}
                className="w-full bg-black/50 border border-white/10 text-white/80 font-sans text-xs rounded-md p-2 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-medium text-white/50 block mb-1 uppercase tracking-wider">
                {t("Farbe")}
              </label>
              <div className="flex items-center gap-2">
                <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-white/10 shrink-0">
                  <input
                    type="color"
                    value={entity.color || "#EAB308"}
                    onChange={(e) => updateEntity(idx, "color", e.target.value)}
                    className="absolute -top-2 -left-2 w-20 h-20 cursor-pointer"
                  />
                </div>
                <input
                  type="text"
                  value={entity.color || "#EAB308"}
                  onChange={(e) => updateEntity(idx, "color", e.target.value)}
                  className="flex-1 bg-black/50 border border-white/10 text-white/70 font-mono text-xs rounded-md p-2 h-10 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <details className="bg-black/30 rounded-lg border border-white/5 p-2">
              <summary className="text-[10px] font-medium text-white/50 uppercase tracking-wider cursor-pointer select-none">
                {t("Farblogik (optional)")}
              </summary>
              <div className="mt-2 space-y-2">
                <div>
                  <label className="text-[10px] font-medium text-white/50 block mb-1 uppercase tracking-wider">
                    {t("Farbe nur bei Status (leer = immer)")}
                  </label>
                  <input
                    type="text"
                    value={entity.colorWhen || ""}
                    placeholder="z.B. on"
                    onChange={(e) => updateEntity(idx, "colorWhen", e.target.value)}
                    className="w-full bg-black/50 border border-white/10 text-white/70 font-sans text-xs rounded-md p-2 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-white/50 block mb-1 uppercase tracking-wider">
                    {t("Farbe anwenden auf")}
                  </label>
                  <select
                    value={entity.colorTarget || "icon"}
                    onChange={(e) => updateEntity(idx, "colorTarget", e.target.value)}
                    className="w-full bg-black/50 border border-white/10 text-white/80 font-sans text-xs rounded-md p-2 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="icon">{t("Nur Icon (Kreis)")}</option>
                    <option value="bg">{t("Ganze Kachel (Hintergrund)")}</option>
                  </select>
                </div>
              </div>
            </details>
            </div>
          </AccordionCard>
        ))}
      </div>

      <button
        onClick={addEntity}
        className="w-full flex items-center justify-center gap-2 border border-dashed border-white/20 hover:border-white/40 text-white/70 hover:text-white py-3 rounded-xl transition-colors text-sm"
      >
        <Plus size={16} /> {t("Entity hinzufügen")}
      </button>

      <div className="pt-4 border-t border-white/10">
        <label className="text-sm font-medium text-white/80 mb-2 flex justify-between">
          <span>{t("Kacheln: Theme (Hell/Dunkel)")}</span>
        </label>
        <select
          value={(activeWidget.config as any)?.cardTheme || "dark"}
          onChange={(e) =>
            updateConfig(activeWidget.i, "cardTheme", e.target.value)
          }
          className="w-full bg-black border border-white/10 text-white font-sans text-sm rounded-lg p-2 mb-4"
        >
          <option value="dark">{t("Dunkel (Standard)")}</option>
          <option value="light">{t("Hell (Weißes Glas)")}</option>
        </select>

        <label className="text-sm font-medium text-white/80 mb-2 flex justify-between">
          <span>{t("Hintergrund Kacheln (Deckkraft)")}</span>
          <span className="text-blue-400">
            {(activeWidget.config as any)?.cardOpacity !== undefined
              ? (activeWidget.config as any).cardOpacity
              : 40}
            %
          </span>
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={
            (activeWidget.config as any)?.cardOpacity !== undefined
              ? (activeWidget.config as any).cardOpacity
              : 40
          }
          onChange={(e) =>
            updateConfig(activeWidget.i, "cardOpacity", parseInt(e.target.value))
          }
          className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-500 bg-white/10 mb-4"
        />

        <label className="text-sm font-medium text-white/80 mb-2 flex justify-between">
          <span>{t("Hintergrund Kacheln (Unschärfe/Blur)")}</span>
          <span className="text-blue-400">
            {(activeWidget.config as any)?.cardBlur !== undefined
              ? (activeWidget.config as any).cardBlur
              : 12}
            px
          </span>
        </label>
        <input
          type="range"
          min="0"
          max="64"
          value={
            (activeWidget.config as any)?.cardBlur !== undefined
              ? (activeWidget.config as any).cardBlur
              : 12
          }
          onChange={(e) =>
            updateConfig(activeWidget.i, "cardBlur", parseInt(e.target.value))
          }
          className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-500 bg-white/10"
        />

        <label className="text-sm font-medium text-white/80 mb-2 mt-4 flex justify-between">
          <span>{t("Kacheln-Design")}</span>
        </label>
        <select
          value={(activeWidget.config as any)?.design || "cards"}
          onChange={(e) => updateConfig(activeWidget.i, "design", e.target.value)}
          className="w-full bg-black border border-white/10 text-white font-sans text-sm rounded-lg p-2 mb-4"
        >
          <option value="cards">{t("Kacheln (Standard)")}</option>
          <option value="minimal">{t("Minimal (nur Icons + Text)")}</option>
        </select>

        <label className="flex items-center gap-3 cursor-pointer group py-2">
          <div className="relative">
            <input
              type="checkbox"
              checked={(activeWidget.config as any)?.useLiveSync === true}
              onChange={(e) => updateConfig(activeWidget.i, "useLiveSync", e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-white/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-white/80 group-hover:text-white">{t("Live-Sync (WebSocket)")}</div>
            <div className="text-[11px] text-white/40 leading-snug">
              {t("Sofortige Updates via HA-WebSocket statt Polling. Empfohlen — spart Requests.")}
            </div>
          </div>
        </label>

        {(activeWidget.config as any)?.useLiveSync !== true && (
          <>
            <label className="text-sm font-medium text-white/80 mb-2 flex justify-between">
              <span>{t("Poll-Intervall")}</span>
              <span className="text-blue-400">{(activeWidget.config as any)?.refreshInterval ?? 5}s</span>
            </label>
            <input
              type="range"
              min="3"
              max="60"
              step="1"
              value={(activeWidget.config as any)?.refreshInterval ?? 5}
              onChange={(e) => updateConfig(activeWidget.i, "refreshInterval", parseInt(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-500 bg-white/10"
            />
          </>
        )}

        <div className="pt-4 mt-4 border-t border-white/10">
          <label className="flex items-center gap-3 cursor-pointer group mb-2">
            <div className="relative">
              <input
                type="checkbox"
                checked={(activeWidget.config as any)?.showSparkline === true}
                onChange={(e) => updateConfig(activeWidget.i, "showSparkline", e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-white/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
            </div>
            <span className="text-sm text-white/80 group-hover:text-white">{t("Verlaufs-Graph (Sparkline) anzeigen")}</span>
          </label>
          {(activeWidget.config as any)?.showSparkline && (
            <div>
              <label className="text-xs text-white/60 flex justify-between mb-1">
                <span>{t("Zeitraum")}</span>
                <span className="text-cyan-300">{(activeWidget.config as any)?.sparklineHours ?? 6}h</span>
              </label>
              <input
                type="range"
                min="1"
                max="48"
                step="1"
                value={(activeWidget.config as any)?.sparklineHours ?? 6}
                onChange={(e) => updateConfig(activeWidget.i, "sparklineHours", parseInt(e.target.value))}
                className="w-full h-1.5 rounded-lg accent-cyan-500 bg-white/10"
              />
              <p className="text-[11px] text-white/40 mt-1 leading-snug">
                {t("Nur numerische Entities (Sensoren) haben einen verwertbaren Verlauf. HA's History-API muss aktiv sein.")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
