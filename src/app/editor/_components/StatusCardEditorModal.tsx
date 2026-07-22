"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import StatusWidget from "@/components/widgets/StatusWidget";
import StatusCardFields from "./StatusCardFields";
import { useT } from "@/lib/i18n/LocaleProvider";
import { useViewTheme } from "@/lib/ui/view-theme";

type Display = { clientId: string; width: number; height: number; dpr: number };

// Fokussierter Karten-Editor: Felder links, die ECHTE Karte live gerendert
// rechts — mit echten HA-Daten über dieselbe SSE-Pipeline wie im View.
// ENTWURFS-SEMANTIK: Änderungen landen erst mit "Übernehmen" in der Config;
// Abbrechen / ✕ / Klick daneben verwirft. (Pilot für Issue #42.)

// Live-Vorschau einer Status-Karte, frei skalierbar (Breite/Höhe nur für die
// Vorschau — so sieht man, wie die Karte auf der eigenen Kachel wirkt, z. B.
// hoch für "Gestapelt"). `host` = Karten-Optik des Notification-Widgets.
export function StatusCardPreview({ card, host, defaultHeightEm = 5, font, gridW, gridH }: {
  card: Record<string, any>;
  host?: { cardOpacity?: number; cardBlur?: number; cardTheme?: string; showBorder?: boolean; borderColor?: string; borderWidth?: number } | null;
  defaultHeightEm?: number;
  /** Echte Schrift-Einstellungen des Widgets — damit die Vorschau wie der
   *  View rechnet: responsiveText = (fontSize/2) cqw (skaliert mit Breite),
   *  sonst feste px. Ohne Angabe: 20px fest. */
  font?: { size?: number; responsive?: boolean };
  /** Raster-Maße des Widgets (von 24 Spalten/Zeilen) — für die 1:1-Vorschau
   *  auf einer gemeldeten Display-Größe. */
  gridW?: number;
  gridH?: number;
}) {
  const t = useT();
  const viewTheme = useViewTheme();
  // Gestapelt/Zentriert brauchen von Haus aus mehr Höhe für eine ehrliche Vorschau.
  const tall = card.statusLayout === "stack" || card.statusLayout === "center";
  const [widthPct, setWidthPct] = useState(100);
  const [heightEm, setHeightEm] = useState<number | null>(null);
  const effHeight = heightEm ?? (tall ? Math.max(defaultHeightEm, 11) : defaultHeightEm);

  // Verbundene Displays dieses Views (Heartbeat-Registry) — OPTIONAL: nur
  // wenn ein Display bekannt ist, erscheint die 1:1-Auswahl. Default bleibt
  // manuell, mehrere Monitore = einfach das gewünschte wählen.
  const pathname = usePathname();
  const dashboardId = (pathname ?? "").split("/").filter(Boolean).pop() ?? "";
  const [displays, setDisplays] = useState<Display[]>([]);
  const [selected, setSelected] = useState<string>("manual");
  useEffect(() => {
    if (!dashboardId) return;
    fetch(`/api/view-clients?dashboardId=${encodeURIComponent(dashboardId)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.displays)) setDisplays(d.displays); })
      .catch(() => {});
  }, [dashboardId]);
  const display = displays.find((d) => d.clientId === selected) || null;

  // Karten-Breite messen (manueller Modus) → bei responsiveText skaliert die
  // Schrift wie im View mit der Breite.
  const cardRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [cardPx, setCardPx] = useState(0);
  const [availPx, setAvailPx] = useState(0);
  useEffect(() => {
    const el = cardRef.current, wrap = wrapRef.current;
    if (!wrap) return;
    const measure = () => { if (el) setCardPx(el.clientWidth); setAvailPx(wrap.clientWidth); };
    measure();
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(measure);
      if (el) ro.observe(el);
      ro.observe(wrap);
      return () => ro.disconnect();
    }
  }, [display !== null]);

  const fsSize = Number(font?.size) || 20;

  // ── 1:1-Modus: echte Kachel-Maße aus Display × Raster, runterskaliert ──
  const tileW = display ? Math.round(display.width * ((gridW ?? 24) / 24)) : 0;
  const baseFs = display
    ? (font?.responsive ? Math.max(9, (fsSize / 2) * (tileW / 100)) : fsSize)
    : (font?.responsive ? Math.max(9, (fsSize / 2) * (cardPx / 100)) : fsSize);
  const tileH = display
    ? (host || !gridH
        ? Math.round(effHeight * baseFs) // Notify-Karte: Höhe ist wirklich em-basiert
        : Math.round(display.height * (gridH / 24))) // Standalone: Raster-Höhe
    : 0;
  const scale = display && tileW > 0 ? Math.min(1, (availPx - 32) / tileW) : 1;

  // "auto"/nicht gesetzt → zentrale View-Einstellung, wie im Live-View.
  const themeChoice = host?.cardTheme ?? card.cardTheme;
  const isLight = themeChoice === "light" ? true : themeChoice === "dark" ? false : viewTheme === "light";
  const cardOpacity = host?.cardOpacity ?? 40;
  const cardBlur = host?.cardBlur ?? 12;
  const borderWidth = Math.max(0.25, Math.min(6, Number(host?.borderWidth) || 1));
  const chrome = host
    ? {
        backgroundColor: isLight ? `rgba(255,255,255,${cardOpacity / 100})` : `rgba(0,0,0,${cardOpacity / 100})`,
        backdropFilter: cardBlur > 0 ? `blur(${cardBlur}px)` : "none",
        border: host.showBorder !== false
          ? `${borderWidth}px solid ${host.borderColor ? host.borderColor + "80" : isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.12)"}`
          : "none",
      }
    : {};
  const previewCfg = {
    ...card,
    alwaysShow: true, // Vorschau zeigt die Karte auch ohne aktives Ereignis
    ...(host ? { cardTheme: isLight ? "light" : "dark", frameRadius: 24 } : {}),
  };
  return (
    <div>
      {/* Display-Auswahl — nur sichtbar, wenn Views ihre Größe gemeldet haben */}
      {displays.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          <button type="button" onClick={() => setSelected("manual")}
            className={`rounded-full px-2.5 py-1 text-[11px] border transition-colors ${selected === "manual" ? "border-sky-500 bg-sky-500/10 text-sky-400" : "border-[var(--mf-bdr)]/15 text-[var(--mf-fg)]/60 hover:border-[var(--mf-bdr)]/30"}`}>
            {t("Manuell")}
          </button>
          {displays.map((d) => (
            <button key={d.clientId} type="button" onClick={() => setSelected(d.clientId)}
              className={`rounded-full px-2.5 py-1 text-[11px] border transition-colors tabular-nums ${selected === d.clientId ? "border-sky-500 bg-sky-500/10 text-sky-400" : "border-[var(--mf-bdr)]/15 text-[var(--mf-fg)]/60 hover:border-[var(--mf-bdr)]/30"}`}>
              {d.width}×{d.height}
            </button>
          ))}
        </div>
      )}
      <div ref={wrapRef} className="rounded-2xl p-4 bg-gradient-to-br from-blue-500/15 via-purple-500/10 to-black/50 border border-[var(--mf-bdr)]/10 flex items-center justify-center overflow-hidden" style={{ minHeight: "8em" }}>
        {display ? (
          // 1:1-Vorschau: echte Kachel-Pixel, per transform in die Spalte skaliert.
          <div style={{ width: tileW * scale, height: tileH * scale }}>
            <div className="overflow-hidden rounded-3xl" style={{ width: tileW, height: tileH, fontSize: baseFs, transform: `scale(${scale})`, transformOrigin: "top left", ...chrome }}>
              <StatusWidget config={previewCfg} />
            </div>
          </div>
        ) : (
          <div ref={cardRef} className="overflow-hidden rounded-3xl"
            style={{ width: `${widthPct}%`, height: `${effHeight}em`, fontSize: baseFs, ...chrome }}>
            <StatusWidget config={previewCfg} />
          </div>
        )}
      </div>
      {display ? (
        <p className="text-[10px] text-[var(--mf-fg)]/40 mt-1.5 px-1 leading-relaxed">
          {t("1:1 vom Display gerechnet")} ({display.width}×{display.height}, {t("Maßstab")} {Math.round(scale * 100)}%).{" "}
          {t("Schrift")}: {font?.responsive ? t("responsive") : `${fsSize}px`}
        </p>
      ) : (
        <>
          {/* Vorschau-Größe — rein visuell, wird nicht gespeichert */}
          <div className="grid grid-cols-2 gap-3 mt-2.5">
            <div>
              <label className="text-[10px] text-[var(--mf-fg)]/40 mb-1 px-1 flex justify-between">
                <span>{t("Breite")}</span><span className="text-sky-400">{widthPct}%</span>
              </label>
              <input type="range" min={40} max={100} step={5} value={widthPct}
                onChange={(e) => setWidthPct(parseInt(e.target.value))}
                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-sky-500 bg-[var(--mf-elev)]/10" />
            </div>
            <div>
              <label className="text-[10px] text-[var(--mf-fg)]/40 mb-1 px-1 flex justify-between">
                <span>{t("Höhe")}</span><span className="text-sky-400">{effHeight}em</span>
              </label>
              <input type="range" min={3} max={18} step={0.5} value={effHeight}
                onChange={(e) => setHeightEm(parseFloat(e.target.value))}
                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-sky-500 bg-[var(--mf-elev)]/10" />
            </div>
          </div>
          <p className="text-[10px] text-[var(--mf-fg)]/40 mt-1.5 px-1 leading-relaxed">
            {t("Live-Vorschau mit echten Daten — Größe hier ist nur zum Ausprobieren, die echte Kachel bestimmt die Maße.")}{" "}
            {font?.responsive
              ? t("Schrift skaliert mit der Breite (responsive) — genau wie auf dem Display.")
              : `${t("Schrift fest:")} ${fsSize}px`}
          </p>
        </>
      )}
    </div>
  );
}

export default function StatusCardEditorModal({ card, onSave, onClose, host, heightEm, font, gridW, gridH }: {
  card: Record<string, any>;
  onSave: (card: Record<string, any>) => void;
  onClose: () => void;
  host?: React.ComponentProps<typeof StatusCardPreview>["host"];
  heightEm?: number;
  font?: React.ComponentProps<typeof StatusCardPreview>["font"];
  gridW?: number;
  gridH?: number;
}) {
  const t = useT();
  // Entwurf: lokale Kopie — erst "Übernehmen" schreibt in die Widget-Config.
  const [draft, setDraft] = useState<Record<string, any>>(() => ({ ...card }));
  const setField = (key: string, v: any) => setDraft((prev) => ({ ...prev, [key]: v }));

  return (
    <div className="fixed inset-0 bg-[var(--mf-backdrop)]/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[var(--mf-surface-2)] border border-[var(--mf-bdr)]/10 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[94vh] flex flex-col nodrag"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--mf-bdr)]/10 shrink-0">
          <div className="font-bold text-[var(--mf-fg)]">{t("Status-Karte bearbeiten")}</div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--mf-fg)]/50 hover:text-[var(--mf-fg)] hover:bg-[var(--mf-elev)]/10 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="grid md:grid-cols-[1fr_460px] gap-0 min-h-0 flex-1">
          {/* Felder — scrollen links */}
          <div className="overflow-y-auto p-6 order-2 md:order-1">
            <StatusCardFields value={draft} set={setField} />
          </div>
          {/* Live-Vorschau — bleibt rechts stehen */}
          <div className="p-6 md:border-l border-b md:border-b-0 border-[var(--mf-bdr)]/10 order-1 md:order-2 overflow-y-auto">
            <div className="md:sticky md:top-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--mf-fg)]/55 mb-2.5">{t("Live-Vorschau")}</div>
              <StatusCardPreview card={draft} host={host} defaultHeightEm={heightEm} font={font} gridW={gridW} gridH={gridH} />
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-[var(--mf-bdr)]/10 flex justify-between items-center shrink-0">
          <p className="text-[11px] text-[var(--mf-fg)]/40">{t("Änderungen werden erst mit Übernehmen gespeichert.")}</p>
          <div className="flex gap-2.5">
            <button onClick={onClose} className="px-5 h-10 rounded-lg border border-[var(--mf-bdr)]/15 text-[var(--mf-fg)]/70 text-sm font-medium hover:bg-[var(--mf-elev)]/10 hover:text-[var(--mf-fg)] transition-colors">
              {t("Abbrechen")}
            </button>
            <button onClick={() => { onSave(draft); onClose(); }} className="px-5 h-10 rounded-lg bg-sky-500/15 border border-sky-500/40 text-sky-400 text-sm font-medium hover:bg-sky-500/25 transition-colors">
              {t("Übernehmen")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
