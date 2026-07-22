"use client";

import React from "react";
import type { WidgetLayoutItem } from "../_types";
import { useT } from "@/lib/i18n/LocaleProvider";
import FeedListEditor from "../_components/FeedListEditor";

type Props = {
  widget: WidgetLayoutItem;
  updateConfig: (i: string, key: string, value: any) => void;
};

const INPUT =
  "w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-sm rounded-lg px-3 h-10 focus:outline-none focus:border-amber-500";

export default function RssInspector({ widget, updateConfig }: Props) {
  const t = useT();
  const cfg = (widget.config as any) ?? {};
  const set = (key: string, value: any) => updateConfig(widget.i, key, value);

  const feedsArr: string[] = Array.isArray(cfg.feeds)
    ? cfg.feeds
    : typeof cfg.feeds === "string" && cfg.feeds.trim()
      ? cfg.feeds.split(/[\n,]/).map((s: string) => s.trim()).filter(Boolean)
      : [];
  const mode: string = cfg.rssMode === "rotate" ? "rotate" : "list";
  const limit: number = cfg.limit ?? 8;
  const rotateSec: number = cfg.rotateSec ?? 8;
  const showSource: boolean = cfg.showSource !== false;
  const showDate: boolean = cfg.showDate !== false;
  const showImage: boolean = cfg.showImage === true;
  const showSummary: boolean = cfg.showSummary !== false;
  const showDots: boolean = cfg.showDots !== false;
  const linkable: boolean = cfg.linkable === true;
  const showQr: boolean = cfg.showQr === true;
  const titleLines: number = Number(cfg.titleLines) || 0; // 0 = Auto
  const descLines: number = Number(cfg.descLines) || 0;   // 0 = Auto
  const color: string = cfg.rssAccent ?? "#f59e0b";

  return (
    <div className="space-y-5">
      {/* Feed-URLs */}
      <div>
        <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">{t("Feed-URLs")}</label>
        <FeedListEditor key={widget.i} value={feedsArr} onChange={(urls) => set("feeds", urls)} t={t} />
        <p className="text-xs text-[var(--mf-fg)]/40 mt-1.5 px-1 leading-relaxed">
          {t("RSS oder Atom. Bis zu 8 Feeds werden zusammengeführt und nach Datum sortiert.")}
        </p>
      </div>

      {/* Darstellung: Liste vs. Rotator */}
      <div>
        <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">{t("Darstellung")}</label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { v: "list", label: t("Liste"), hint: t("mehrere untereinander") },
            { v: "rotate", label: t("Einzeln"), hint: t("wechselt automatisch") },
          ].map((opt) => {
            const active = mode === opt.v;
            return (
              <button
                key={opt.v}
                type="button"
                onClick={() => set("rssMode", opt.v)}
                className={`rounded-lg px-3 py-2.5 text-left transition-colors border ${
                  active
                    ? "border-amber-500 bg-amber-500/10"
                    : "border-[var(--mf-bdr)]/10 bg-[var(--mf-surface)] hover:border-[var(--mf-bdr)]/25"
                }`}
              >
                <div className={`text-sm font-medium ${active ? "text-amber-400" : "text-[var(--mf-fg)]/80"}`}>{opt.label}</div>
                <div className="text-[11px] text-[var(--mf-fg)]/40 mt-0.5">{opt.hint}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Anzahl Beiträge */}
      <div>
        <label className="text-sm font-medium text-[var(--mf-fg)]/80 mb-2 flex justify-between">
          <span>{t("Anzahl Beiträge")}</span>
          <span className="text-amber-400">{limit}</span>
        </label>
        <input
          type="range"
          min={1}
          max={30}
          step={1}
          value={limit}
          onChange={(e) => set("limit", parseInt(e.target.value))}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-amber-500 bg-[var(--mf-elev)]/10"
        />
      </div>

      {/* Wechsel-Intervall (nur im Rotator) */}
      {mode === "rotate" && (
        <div>
          <label className="text-sm font-medium text-[var(--mf-fg)]/80 mb-2 flex justify-between">
            <span>{t("Wechsel-Intervall")}</span>
            <span className="text-amber-400">{rotateSec}s</span>
          </label>
          <input
            type="range"
            min={3}
            max={60}
            step={1}
            value={rotateSec}
            onChange={(e) => set("rotateSec", parseInt(e.target.value))}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-amber-500 bg-[var(--mf-elev)]/10"
          />
        </div>
      )}

      {/* Elemente */}
      <div>
        <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">{t("Elemente")}</label>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {[
            { key: "showSource", label: t("Quelle"), checked: showSource, def: true },
            { key: "showDate", label: t("Datum"), checked: showDate, def: true },
            { key: "showSummary", label: t("Beschreibung"), checked: showSummary, def: true },
            { key: "showImage", label: t("Vorschaubild"), checked: showImage, def: false },
            { key: "showDots", label: t("Punkte"), checked: showDots, def: true },
          ].map((tgl) => (
            <label key={tgl.key} className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={tgl.checked}
                onChange={(e) => set(tgl.key, e.target.checked)}
                className="appearance-none w-5 h-5 border border-[var(--mf-bdr)]/20 rounded bg-[var(--mf-surface)] checked:bg-amber-500 checked:border-amber-500 transition-colors shrink-0"
              />
              <span className="text-sm text-[var(--mf-fg)]/80 group-hover:text-[var(--mf-fg)] transition-colors">{tgl.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Textzeilen */}
      <div>
        <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">{t("Textzeilen")}</label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="text-xs text-[var(--mf-fg)]/50 block mb-1.5 px-1">{t("Titel")}</span>
            <select value={titleLines} onChange={(e) => set("titleLines", Number(e.target.value))} className={INPUT}>
              <option value={0}>{t("Auto")}</option>
              {[1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <span className="text-xs text-[var(--mf-fg)]/50 block mb-1.5 px-1">{t("Beschreibung")}</span>
            <select value={descLines} onChange={(e) => set("descLines", Number(e.target.value))} className={INPUT}>
              <option value={0}>{t("Auto")}</option>
              {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
        <p className="text-xs text-[var(--mf-fg)]/40 mt-2 px-1 leading-relaxed">
          {t("Auto passt die Zeilen an die Kachelhöhe an. Ein fester Wert zeigt genau so viele Zeilen — bei knapper Kachel wird der Rest abgeschnitten.")}
        </p>
        {mode === "rotate" && (
          <div className="mt-3">
            <label className="text-xs text-[var(--mf-fg)]/50 block mb-1.5 px-1">{t("Wenn der Titel zu lang ist")}</label>
            <select value={cfg.textOverflow || "truncate"} onChange={(e) => set("textOverflow", e.target.value)} className={INPUT}>
              <option value="truncate">{t("Abschneiden (…)")}</option>
              <option value="shrink">{t("Verkleinern")}</option>
              <option value="scroll">{t("Laufschrift")}</option>
            </select>
          </div>
        )}
      </div>

      {/* Interaktion: Artikel öffnen */}
      <div>
        <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">{t("Beitrag öffnen")}</label>
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={linkable}
              onChange={(e) => set("linkable", e.target.checked)}
              className="appearance-none w-5 h-5 border border-[var(--mf-bdr)]/20 rounded bg-[var(--mf-surface)] checked:bg-amber-500 checked:border-amber-500 transition-colors shrink-0"
            />
            <span className="text-sm text-[var(--mf-fg)]/80 group-hover:text-[var(--mf-fg)] transition-colors">{t("Titel anklickbar (öffnet im neuen Tab)")}</span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={showQr}
              onChange={(e) => set("showQr", e.target.checked)}
              className="appearance-none w-5 h-5 border border-[var(--mf-bdr)]/20 rounded bg-[var(--mf-surface)] checked:bg-amber-500 checked:border-amber-500 transition-colors shrink-0"
            />
            <span className="text-sm text-[var(--mf-fg)]/80 group-hover:text-[var(--mf-fg)] transition-colors">{t("QR-Code zum Scannen (nur Einzeln-Modus)")}</span>
          </label>
        </div>
        <p className="text-xs text-[var(--mf-fg)]/40 mt-2 px-1 leading-relaxed">
          {mode === "rotate"
            ? t("Im Einzeln-Modus kannst du zwischen den Beiträgen wischen. QR-Code am Beitrag → mit dem Handy scannen und dort weiterlesen.")
            : t("Für den QR-Code den Einzeln-Modus wählen. Klickbare Titel funktionieren auch in der Liste.")}
        </p>
      </div>

      {/* Akzentfarbe */}
      <div>
        <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">{t("Akzentfarbe")}</label>
        <div className="flex gap-3">
          <input
            type="color"
            value={color}
            onChange={(e) => set("rssAccent", e.target.value)}
            className="h-10 w-10 rounded cursor-pointer shrink-0 border-0 bg-transparent p-0"
          />
          <input
            type="text"
            value={color}
            onChange={(e) => set("rssAccent", e.target.value)}
            className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] font-sans text-sm rounded-lg px-3 focus:outline-none focus:border-amber-500"
          />
        </div>
        <p className="text-xs text-[var(--mf-fg)]/40 mt-1.5 px-1">{t("Farbe der Quelle und der Pager-Punkte.")}</p>
      </div>
    </div>
  );
}
