"use client";

import React, { useRef, useState } from "react";
import { Trash2, Upload } from "lucide-react";
import HAEntityInput from "./HAEntityInput";
import IconPicker from "./IconPicker";
import { useHaLiveStates } from "@/lib/ha/useHaLiveStates";
import { useT } from "@/lib/i18n/LocaleProvider";

// Gemeinsame Felder einer Status-Karte — genutzt vom eigenständigen
// StatusInspector UND vom Karten-Listen-Editor im Notification-Inspector.
// `value` ist ein flaches Config-Objekt, `set` schreibt einen Key.

const INPUT =
  "w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-sm rounded-lg px-3 h-10 focus:outline-none focus:border-sky-500";
const ENTITY_INPUT =
  "w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-sm p-2 rounded-lg focus:border-sky-500 outline-none";

/**
 * Lädt ein Bild direkt in Magic Frame hoch und setzt die URL. Der native
 * Datei-Knopf wird versteckt (seine Beschriftung kommt vom Browser, nicht
 * von uns) und durch einen eigenen ersetzt.
 */
function ImageUploadButton({ onUploaded }: { onUploaded: (url: string) => void }) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const upload = async (file: File) => {
    setBusy(true);
    setErr("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d?.error || t("Upload fehlgeschlagen"));
      onUploaded(d.url);
    } catch (e: any) {
      setErr(e?.message || t("Upload fehlgeschlagen"));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="mt-1.5">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="sr-only"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--mf-bdr)]/15 px-2.5 py-1.5 text-[11px] text-[var(--mf-fg)]/70 hover:text-[var(--mf-fg)] hover:border-[var(--mf-bdr)]/30 transition-colors disabled:opacity-50"
      >
        <Upload size={12} />
        {busy ? t("Lädt hoch…") : t("Eigenes Bild hochladen")}
      </button>
      {err && <p className="text-[10px] text-red-400 mt-1 px-1">{err}</p>}
    </div>
  );
}

function Seg({ value, options, onChange }: { value: string; options: { v: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => {
        const active = value === o.v;
        return (
          <button key={o.v} type="button" onClick={() => onChange(o.v)}
            className={`rounded-lg px-2 py-2 text-xs font-medium transition-colors border ${
              active ? "border-sky-500 bg-sky-500/10 text-sky-400" : "border-[var(--mf-bdr)]/10 bg-[var(--mf-surface)] text-[var(--mf-fg)]/70 hover:border-[var(--mf-bdr)]/25"
            }`}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export default function StatusCardFields({ value, set }: {
  value: Record<string, any>;
  set: (key: string, v: any) => void;
}) {
  const t = useT();
  const imageMode: string = value.imageMode === "url" || value.imageMode === "icon" ? value.imageMode : "entity";
  // Live-Zustand des Auslösers — nimmt Neulingen das Raten ("charging" vs "on"):
  // wir zeigen, was die Entität JETZT meldet, ein Klick übernimmt es.
  const triggerId: string = (value.statusEntity || "").trim();
  const live = useHaLiveStates(triggerId ? [triggerId] : [], Boolean(triggerId));
  const liveState: string = live.states[triggerId]?.state ?? "";
  const applyState = (s: string) => {
    const cur = (value.statusStates || "").trim();
    const list = cur.split(",").map((x: string) => x.trim().toLowerCase()).filter(Boolean);
    if (list.includes(s.toLowerCase())) return;
    set("statusStates", cur ? `${cur}, ${s}` : s);
  };
  const details: { entity?: string; label?: string }[] = Array.isArray(value.statusDetails) ? value.statusDetails : [];
  const setDetail = (idx: number, key: "entity" | "label", v: string) => {
    const next = details.map((d, i) => (i === idx ? { ...d, [key]: v } : d));
    set("statusDetails", next);
  };

  return (
    <div className="space-y-4">
      {/* Auslöser */}
      <div>
        <label className="text-xs text-[var(--mf-fg)]/50 block mb-1.5">{t("Entität (Auslöser)")}</label>
        <HAEntityInput value={value.statusEntity || ""} onChange={(v) => set("statusEntity", v)}
          placeholder="sensor.auto_ladestatus" className={ENTITY_INPUT} />
        <label className="text-xs text-[var(--mf-fg)]/50 block mb-1.5 mt-2.5">{t("Aktiv bei Zustand")}</label>
        <input value={value.statusStates || ""} onChange={(e) => set("statusStates", e.target.value)}
          placeholder="on, charging, printing" spellCheck={false} className={INPUT} />
        {triggerId && liveState && (
          <button type="button" onClick={() => applyState(liveState)}
            className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-sky-500/40 bg-sky-500/10 px-2.5 py-1 text-[11px] text-sky-400 hover:bg-sky-500/20 transition-colors">
            <span className="opacity-70">{t("Zustand jetzt:")}</span>
            <span className="font-semibold">{liveState}</span>
            <span className="opacity-70">— {t("klicken zum Übernehmen")}</span>
          </button>
        )}
        <p className="text-[10px] text-[var(--mf-fg)]/40 mt-1 px-1">{t("Mehrere mit Komma. Leer = aktiv, sobald der Zustand nicht aus/idle ist. Achtung: binary_sensor-Entitäten melden on/off — nicht charging o. ä.")}</p>
        <label className="text-xs text-[var(--mf-fg)]/50 block mb-1.5 mt-2.5">{t("Auffällig bei Zustand")}</label>
        <input value={value.alertStates || ""} onChange={(e) => set("alertStates", e.target.value)}
          placeholder="fertig" spellCheck={false} className={INPUT} />
        <p className="text-[10px] text-[var(--mf-fg)]/40 mt-1 px-1">{t("Bei diesen Zuständen färbt sich die Karte kräftig ein und pulsiert — für alles, was niemand übersehen soll.")}</p>
        {(value.alertStates || "").trim() !== "" && (
          <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2 px-1">
            {([
              ["alertPulse", "Pulsieren"],
              ["alertRing", "Alarm-Ring"],
            ] as [string, string][]).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox"
                  checked={value[key] !== false}
                  onChange={(e) => set(key, e.target.checked)}
                  className="accent-sky-500" />
                <span className="text-xs text-[var(--mf-fg)]/70">{t(label)}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Darstellung */}
      <div>
        <label className="text-xs text-[var(--mf-fg)]/50 block mb-1.5">{t("Darstellung")}</label>
        <Seg value={value.statusLayout === "stack" || value.statusLayout === "center" ? value.statusLayout : "bar"}
          onChange={(v) => set("statusLayout", v)}
          options={[{ v: "bar", label: t("Zeile") }, { v: "stack", label: t("Gestapelt") }, { v: "center", label: t("Zentriert") }]} />
      </div>

      {/* Bild */}
      <div>
        <label className="text-xs text-[var(--mf-fg)]/50 block mb-1.5">{t("Bild")}</label>
        <Seg value={imageMode} onChange={(v) => set("imageMode", v)}
          options={[{ v: "entity", label: t("Aus Entität") }, { v: "url", label: t("Eigene URL") }, { v: "icon", label: t("Nur Icon") }]} />
        {imageMode === "entity" && (
          <div className="mt-2">
            <HAEntityInput value={value.imageEntity || ""} onChange={(v) => set("imageEntity", v)}
              placeholder={t("leer = Auslöser-Entität")} className={ENTITY_INPUT} />
            <p className="text-[10px] text-[var(--mf-fg)]/40 mt-1 px-1">{t("Jede Entität mit Bild: image.*, camera.*, media_player.*, person.* …")}</p>
          </div>
        )}
        {imageMode === "url" && (
          <div className="mt-2">
            <input value={value.imageUrl || ""} onChange={(e) => set("imageUrl", e.target.value)}
              placeholder="/local/car/auto.png oder https://…" spellCheck={false} className={INPUT} />
            {/* Eigenes Bild direkt hochladen — erspart das Ablegen im
                HA-www-Ordner und das Raten von Pfaden. */}
            <ImageUploadButton onUploaded={(url) => set("imageUrl", url)} />
            <p className="text-[10px] text-[var(--mf-fg)]/40 mt-1 px-1">{t("Pfade aus dem HA-www-Ordner funktionieren direkt: /local/…")}</p>
          </div>
        )}
        {imageMode !== "icon" && (
          <div className="mt-2">
            <label className="text-[10px] text-[var(--mf-fg)]/40 block mb-1 px-1">{t("Bild-Stil")}</label>
            <Seg value={value.imageStyle === "free" ? "free" : "box"} onChange={(v) => set("imageStyle", v)}
              options={[{ v: "box", label: t("Kachel (Foto/Cover)") }, { v: "free", label: t("Freigestellt (PNG)") }]} />
          </div>
        )}
        <div className="mt-2">
          <label className="text-[10px] text-[var(--mf-fg)]/40 mb-1 px-1 flex justify-between">
            <span>{t("Bild-Größe")}</span>
            <span className="text-sky-400">{Number(value.imageScale) || 100}%</span>
          </label>
          <input type="range" min={50} max={200} step={10}
            value={Number(value.imageScale) || 100}
            onChange={(e) => set("imageScale", parseInt(e.target.value))}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-sky-500 bg-[var(--mf-elev)]/10" />
        </div>
        <div className="mt-2">
          <label className="text-[10px] text-[var(--mf-fg)]/40 block mb-1 px-1">{imageMode === "icon" ? t("Icon") : t("Icon (Fallback, wenn kein Bild da ist)")}</label>
          <IconPicker value={value.icon || ""} onChange={(v) => set("icon", v)} placeholder="mdi:ev-station" defaultPrefix="mdi" />
        </div>
      </div>

      {/* Titel */}
      <div>
        <label className="text-xs text-[var(--mf-fg)]/50 block mb-1.5">{t("Titel")}</label>
        <input value={value.label || ""} onChange={(e) => set("label", e.target.value)}
          placeholder={t("Standard: Name der Entität")} className={INPUT} />
      </div>

      {/* Detail-Entitäten */}
      <div>
        <label className="text-xs text-[var(--mf-fg)]/50 block mb-1.5">{t("Detail-Entitäten")}</label>
        <div className="space-y-2">
          {details.map((d, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <HAEntityInput value={d.entity || ""} onChange={(v) => setDetail(i, "entity", v)}
                  placeholder="sensor.auto_ladestand" className={ENTITY_INPUT} />
              </div>
              <input value={d.label || ""} onChange={(e) => setDetail(i, "label", e.target.value)}
                placeholder={t("Label")} className="w-24 bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-sm rounded-lg px-2 h-10 focus:outline-none focus:border-sky-500" />
              <button onClick={() => set("statusDetails", details.filter((_, x) => x !== i))}
                className="shrink-0 w-8 h-8 flex items-center justify-center rounded text-[var(--mf-fg)]/40 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {details.length < 4 && (
            <button onClick={() => set("statusDetails", [...details, { entity: "", label: "" }])}
              className="text-xs font-medium text-sky-400 hover:text-sky-300 transition-colors py-1">
              + {t("Detail hinzufügen")}
            </button>
          )}
        </div>
        <p className="text-[10px] text-[var(--mf-fg)]/40 mt-1 px-1">{t("Live-Werte wie Ladestand oder Restzeit, mit optionalem Label.")}</p>
      </div>

      {/* Tipp-Aktion */}
      <div>
        <label className="text-xs text-[var(--mf-fg)]/50 block mb-1.5">{t("Beim Antippen auslösen (optional)")}</label>
        <HAEntityInput value={value.tapEntity || ""} onChange={(v) => set("tapEntity", v)}
          placeholder="input_button.waschmaschine_quittiert_v2" className={ENTITY_INPUT} />
        <p className="text-[10px] text-[var(--mf-fg)]/40 mt-1 px-1">{t("Tippen auf die Karte drückt Tasten, schaltet Schalter oder startet Skripte — z. B. Wäsche direkt an der Karte quittieren. Nur für Touch-Displays relevant.")}</p>
      </div>

      {/* Fortschritt */}
      <div>
        <label className="text-xs text-[var(--mf-fg)]/50 block mb-1.5">{t("Fortschritt (0–100, optional)")}</label>
        <HAEntityInput value={value.progressEntity || ""} onChange={(v) => set("progressEntity", v)}
          placeholder="sensor.druck_fortschritt" className={ENTITY_INPUT} />
        <p className="text-[10px] text-[var(--mf-fg)]/40 mt-1 px-1">{t("Zeigt einen Balken — Ladestand, Druck-Fortschritt …")}</p>
        {(value.progressEntity || "").trim() !== "" && (
          <div className="mt-2 space-y-2">
            <Seg value={value.progressStyle === "ring" ? "ring" : "bar"} onChange={(v) => set("progressStyle", v)}
              options={[{ v: "bar", label: t("Balken unten") }, { v: "ring", label: t("Kreis rechts") }]} />
            {value.progressStyle === "ring" && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox"
                  checked={value.progressShowPercent !== false}
                  onChange={(e) => set("progressShowPercent", e.target.checked)}
                  className="accent-sky-500" />
                <span className="text-xs text-[var(--mf-fg)]/70">{t("% im Kreis anzeigen")}</span>
              </label>
            )}
          </div>
        )}
      </div>

      {/* Optionen */}
      <div className="flex flex-wrap gap-x-6 gap-y-2.5">
        {([
          ["showState", "Zustand anzeigen", true],
          ["artworkAsTileBg", "Bild als Hintergrund (Blur)", true],
          ["alwaysShow", "Auch ohne Ereignis anzeigen", false],
        ] as [string, string, boolean][]).map(([key, label, defOn]) => (
          <label key={key} className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox"
              checked={defOn ? value[key] !== false : value[key] === true}
              onChange={(e) => set(key, e.target.checked)}
              className="accent-sky-500" />
            <span className="text-xs text-[var(--mf-fg)]/70">{t(label)}</span>
          </label>
        ))}
      </div>

      {/* Hintergrund-Blur feinjustieren */}
      {value.artworkAsTileBg !== false && (
        <div className="space-y-2.5">
          <div>
            <label className="text-[10px] text-[var(--mf-fg)]/40 mb-1 px-1 flex justify-between">
              <span>{t("Hintergrund-Blur")}</span>
              <span className="text-sky-400">{Number(value.bgBlur) || 16}px</span>
            </label>
            <input type="range" min={4} max={60} step={2}
              value={Number(value.bgBlur) || 16}
              onChange={(e) => set("bgBlur", parseInt(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-sky-500 bg-[var(--mf-elev)]/10" />
          </div>
          <div>
            <label className="text-[10px] text-[var(--mf-fg)]/40 mb-1 px-1 flex justify-between">
              <span>{t("Hintergrund-Füllung")}</span>
              <span className="text-sky-400">{Number(value.bgZoom) || 120}%</span>
            </label>
            <input type="range" min={100} max={300} step={10}
              value={Number(value.bgZoom) || 120}
              onChange={(e) => set("bgZoom", parseInt(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-sky-500 bg-[var(--mf-elev)]/10" />
            <p className="text-[10px] text-[var(--mf-fg)]/40 mt-1 px-1">{t("Hoch drehen, bis die Farbe die ganze Karte füllt.")}</p>
          </div>
        </div>
      )}

      {/* Akzentfarbe */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-[var(--mf-fg)]/70 flex-1">{t("Akzentfarbe")}</span>
        <input type="color" value={value.color || "#0ea5e9"} onChange={(e) => set("color", e.target.value)}
          className="h-9 w-9 rounded cursor-pointer shrink-0 border-0 bg-transparent p-0" />
      </div>
    </div>
  );
}
