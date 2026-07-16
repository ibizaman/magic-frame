"use client";

import React from "react";
import type { WidgetLayoutItem } from "../_types";
import { useT } from "@/lib/i18n/LocaleProvider";
import IconPicker from "../_components/IconPicker";

type Props = {
  widget: WidgetLayoutItem;
  updateConfig: (i: string, key: string, value: any) => void;
};

const INPUT =
  "w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-sm rounded-lg px-3 h-10 focus:outline-none focus:border-cyan-500";

function Seg({ value, options, onChange }: { value: string; options: { v: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => {
        const active = value === o.v;
        return (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange(o.v)}
            className={`rounded-lg px-2 py-2 text-xs font-medium transition-colors border ${
              active ? "border-cyan-500 bg-cyan-500/10 text-cyan-400" : "border-[var(--mf-bdr)]/10 bg-[var(--mf-surface)] text-[var(--mf-fg)]/70 hover:border-[var(--mf-bdr)]/25"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function ColorRow({ label, value, fallback, onChange }: { label: string; value: string; fallback: string; onChange: (v: string) => void }) {
  const v = value || fallback;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-[var(--mf-fg)]/70 flex-1">{label}</span>
      <input type="color" value={v} onChange={(e) => onChange(e.target.value)} className="h-9 w-9 rounded cursor-pointer shrink-0 border-0 bg-transparent p-0" />
      <input type="text" value={v} onChange={(e) => onChange(e.target.value)} className="w-24 bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] font-sans text-xs rounded-lg px-2 h-9 focus:outline-none focus:border-cyan-500" />
    </div>
  );
}

export default function QrInspector({ widget, updateConfig }: Props) {
  const t = useT();
  const cfg = (widget.config as any) ?? {};
  const set = (key: string, value: any) => updateConfig(widget.i, key, value);

  const type: string = cfg.qrType || "wifi";
  const gradient: string = cfg.gradient || "none";
  const bgMode: string = cfg.bgMode || "solid";
  const solid = bgMode !== "transparent";
  const showLabel = cfg.showLabel !== false;

  return (
    <div className="space-y-5">
      {/* Inhalt */}
      <div>
        <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">{t("Inhalt")}</label>
        <Seg
          value={type}
          onChange={(v) => set("qrType", v)}
          options={[{ v: "wifi", label: t("WLAN") }, { v: "url", label: t("Link") }, { v: "text", label: t("Text") }]}
        />
        {type === "wifi" ? (
          <div className="mt-3 space-y-2.5">
            <input value={cfg.wifiSsid || ""} onChange={(e) => set("wifiSsid", e.target.value)} placeholder={t("WLAN-Name (SSID)")} spellCheck={false} className={INPUT} />
            {cfg.wifiEncryption !== "nopass" && (
              <input value={cfg.wifiPassword || ""} onChange={(e) => set("wifiPassword", e.target.value)} placeholder={t("Passwort")} spellCheck={false} className={INPUT} />
            )}
            <div className="grid grid-cols-2 gap-2.5">
              <select value={cfg.wifiEncryption || "WPA"} onChange={(e) => set("wifiEncryption", e.target.value)} className={INPUT}>
                <option value="WPA">WPA/WPA2/WPA3</option>
                <option value="WEP">WEP</option>
                <option value="nopass">{t("Offen (kein Passwort)")}</option>
              </select>
              <label className="flex items-center gap-2.5 cursor-pointer group px-1">
                <input type="checkbox" checked={cfg.wifiHidden === true} onChange={(e) => set("wifiHidden", e.target.checked)} className="appearance-none w-5 h-5 border border-[var(--mf-bdr)]/20 rounded bg-[var(--mf-surface)] checked:bg-cyan-500 checked:border-cyan-500 transition-colors shrink-0" />
                <span className="text-sm text-[var(--mf-fg)]/80 group-hover:text-[var(--mf-fg)]">{t("Verstecktes Netz")}</span>
              </label>
            </div>
            <p className="text-xs text-[var(--mf-fg)]/40 px-1 leading-relaxed">{t("Gäste scannen den Code und verbinden sich automatisch.")}</p>
          </div>
        ) : (
          <div className="mt-3">
            <input value={cfg.content || ""} onChange={(e) => set("content", e.target.value)} placeholder={type === "url" ? "https://…" : t("Beliebiger Text")} spellCheck={false} className={INPUT} />
          </div>
        )}
      </div>

      {/* Größe */}
      <div>
        <label className="text-sm font-medium text-[var(--mf-fg)]/80 mb-2 flex justify-between">
          <span>{t("Größe")}</span>
          <span className="text-cyan-400">{Math.round(Number(cfg.qrScale) || 100)}%</span>
        </label>
        <input
          type="range"
          min={20}
          max={100}
          step={5}
          value={Number(cfg.qrScale) || 100}
          onChange={(e) => set("qrScale", parseInt(e.target.value))}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-cyan-500 bg-[var(--mf-elev)]/10"
        />
        <p className="text-xs text-[var(--mf-fg)]/40 mt-1.5 px-1">{t("Kleiner = dezent in einer Ecke. Größer = füllt die Kachel.")}</p>
      </div>

      {/* Modul-Stil */}
      <div>
        <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">{t("Form der Punkte")}</label>
        <Seg
          value={cfg.dotStyle || "rounded"}
          onChange={(v) => set("dotStyle", v)}
          options={[{ v: "square", label: t("Eckig") }, { v: "rounded", label: t("Rund") }, { v: "dots", label: t("Punkte") }, { v: "classy", label: t("Kreise") }]}
        />
        <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2 mt-3">{t("Ecken-Augen")}</label>
        <Seg
          value={cfg.eyeStyle || "rounded"}
          onChange={(v) => set("eyeStyle", v)}
          options={[{ v: "square", label: t("Eckig") }, { v: "rounded", label: t("Rund") }, { v: "circle", label: t("Kreis") }]}
        />
      </div>

      {/* Farben */}
      <div>
        <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">{t("Farbe")}</label>
        <Seg
          value={gradient}
          onChange={(v) => set("gradient", v)}
          options={[{ v: "none", label: t("Einfarbig") }, { v: "linear", label: t("Verlauf") }, { v: "radial", label: t("Strahlend") }]}
        />
        <div className="mt-3 space-y-2.5">
          <ColorRow label={gradient === "none" ? t("Farbe") : t("Farbe 1")} value={cfg.color1 || ""} fallback={solid ? "#0f172a" : "#ffffff"} onChange={(v) => set("color1", v)} />
          {gradient !== "none" && (
            <ColorRow label={t("Farbe 2")} value={cfg.color2 || ""} fallback={solid ? "#6366f1" : "#cbd5e1"} onChange={(v) => set("color2", v)} />
          )}
        </div>
      </div>

      {/* Hintergrund */}
      <div>
        <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">{t("Hintergrund")}</label>
        <Seg
          value={bgMode}
          onChange={(v) => set("bgMode", v)}
          options={[{ v: "solid", label: t("Fläche (präsent)") }, { v: "transparent", label: t("Transparent (dezent)") }]}
        />
        {solid ? (
          <div className="mt-3">
            <ColorRow label={t("Hintergrundfarbe")} value={cfg.bgColor || ""} fallback="#ffffff" onChange={(v) => set("bgColor", v)} />
          </div>
        ) : (
          <p className="text-xs text-[var(--mf-fg)]/40 mt-2 px-1 leading-relaxed">{t("Ohne Fläche liegt der Code direkt auf dem Wallpaper — achte auf genug Kontrast, sonst lässt er sich schlecht scannen.")}</p>
        )}
      </div>

      {/* Center-Icon */}
      <div>
        <label className="text-sm font-medium text-[var(--mf-fg)]/80 mb-2 flex items-center justify-between">
          <span>{t("Icon in der Mitte")}</span>
          {cfg.centerIcon && (
            <button onClick={() => set("centerIcon", "")} className="text-xs text-[var(--mf-fg)]/50 hover:text-[var(--mf-fg)]">{t("Entfernen")}</button>
          )}
        </label>
        <IconPicker value={cfg.centerIcon || ""} onChange={(v) => set("centerIcon", v)} placeholder="mdi:wifi" defaultPrefix="mdi" />
        <p className="text-xs text-[var(--mf-fg)]/40 mt-1.5 px-1">{t("Fehlerkorrektur wird automatisch erhöht, damit der Code trotzdem scannbar bleibt.")}</p>
      </div>

      {/* Beschriftung */}
      <div>
        <label className="flex items-center gap-2.5 cursor-pointer group mb-2">
          <input type="checkbox" checked={showLabel} onChange={(e) => set("showLabel", e.target.checked)} className="appearance-none w-5 h-5 border border-[var(--mf-bdr)]/20 rounded bg-[var(--mf-surface)] checked:bg-cyan-500 checked:border-cyan-500 transition-colors shrink-0" />
          <span className="text-sm font-medium text-[var(--mf-fg)]/80 group-hover:text-[var(--mf-fg)]">{t("Beschriftung anzeigen")}</span>
        </label>
        {showLabel && (
          <input value={cfg.label || ""} onChange={(e) => set("label", e.target.value)} placeholder={type === "wifi" ? t("Standard: WLAN-Name") : t("z. B. Speisekarte")} className={INPUT} />
        )}
      </div>
    </div>
  );
}
