"use client";

import React from "react";
import { Plus, X } from "lucide-react";
import type { WidgetLayoutItem } from "../_types";
import { useT } from "@/lib/i18n/LocaleProvider";
import HAEntityInput from "../_components/HAEntityInput";

type Props = {
  widget: WidgetLayoutItem;
  updateConfig: (i: string, key: string, value: any) => void;
};

const INPUT =
  "w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-sm rounded-lg px-3 h-10 focus:outline-none focus:border-blue-500";

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  const t = useT();
  return (
    <label className="flex items-center gap-3 cursor-pointer group py-2">
      <div className="relative">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
        <div className="w-11 h-6 bg-[var(--mf-elev)]/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
      </div>
      <span className="text-sm font-medium text-[var(--mf-fg)]/80 group-hover:text-[var(--mf-fg)] transition-colors">{t(label)}</span>
    </label>
  );
}

function Slider({ label, value, unit, min, max, step, onChange }: { label: string; value: number; unit: string; min: number; max: number; step: number; onChange: (v: number) => void }) {
  const t = useT();
  return (
    <div>
      <label className="text-xs text-[var(--mf-fg)]/50 mb-1.5 flex justify-between">
        <span>{t(label)}</span>
        <span className="text-blue-400">{value}{unit}</span>
      </label>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-500 bg-[var(--mf-elev)]/10" />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const t = useT();
  return (
    <div className="border-t border-[var(--mf-bdr)]/10 pt-3">
      <div className="text-[10px] font-medium uppercase tracking-[0.15em] text-[var(--mf-fg)]/40 mb-2">{t(title)}</div>
      {children}
    </div>
  );
}

export function MediaPlayerInspector({ widget, updateConfig }: Props) {
  const t = useT();
  const cfg = (widget.config as any) ?? {};

  // Lokale Entwurfszeilen: die frisch hinzugefügte LEERE Zeile darf nicht
  // sofort aus der Config gefiltert werden (sonst erscheint sie nie) —
  // gespeichert werden nur ausgefüllte IDs, gerendert wird der Entwurf.
  const configIds: string[] = Array.from(new Set(
    (Array.isArray(cfg.entityIds) && cfg.entityIds.length
      ? cfg.entityIds
      : (cfg.entityId ? [cfg.entityId] : [])) as string[]
  ));
  const [players, setPlayersLocal] = React.useState<string[]>(configIds.length ? configIds : [""]);
  React.useEffect(() => {
    setPlayersLocal(configIds.length ? configIds : [""]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widget.i]);

  const commit = (next: string[]) => {
    setPlayersLocal(next.length ? next : [""]);
    // Dedupliziert speichern — derselbe Player zweimal ergäbe doppelte Punkte.
    updateConfig(widget.i, "entityIds", Array.from(new Set(next.map((x) => x.trim()).filter((x) => x !== ""))));
  };
  const updatePlayer = (idx: number, id: string) => commit(players.map((p, i) => (i === idx ? id : p)));
  const addPlayer = () => setPlayersLocal((prev) => [...prev, ""]);
  const removePlayer = (idx: number) => commit(players.filter((_, i) => i !== idx));

  const layout: string = cfg.layout || "auto";
  const artworkBg: boolean = cfg.artworkAsTileBg === true;

  return (
    <div className="space-y-4">
      {/* Darstellung */}
      <div>
        <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">{t("Darstellung")}</label>
        <select value={layout} onChange={(e) => updateConfig(widget.i, "layout", e.target.value)} className={INPUT}>
          <option value="auto">{t("Automatisch (nach Kachelform)")}</option>
          <option value="row">{t("Zeile")}</option>
          <option value="stack">{t("Hochkant")}</option>
          <option value="cover">{t("Cover (Art füllt Kachel)")}</option>
        </select>
        <p className="text-[11px] text-[var(--mf-fg)]/45 mt-1.5">
          {t("Größen, Layout und sichtbare Elemente passen sich automatisch der Kachel an — wird es zu klein, blenden sich Steuerung/Details sauber aus.")}
        </p>
        <div className="mt-3">
          <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">{t("Ausrichtung")}</label>
          <select value={cfg.align || "left"} onChange={(e) => updateConfig(widget.i, "align", e.target.value)} className={INPUT}>
            <option value="left">{t("Linksbündig")}</option>
            <option value="center">{t("Zentriert")}</option>
            <option value="right">{t("Rechtsbündig")}</option>
          </select>
        </div>
      </div>

      {/* Player */}
      <Section title="Media-Player">
        <div className="space-y-2">
          {players.map((p, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className="flex-1">
                <HAEntityInput value={p} onChange={(id) => updatePlayer(idx, id)} domains={["media_player"]} placeholder="media_player.wohnzimmer" />
              </div>
              {players.length > 1 && (
                <button onClick={() => removePlayer(idx)} className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-[var(--mf-fg)]/40 hover:text-red-400 hover:bg-red-500/10 transition-colors" aria-label={t("Entfernen")}>
                  <X size={15} />
                </button>
              )}
            </div>
          ))}
          <button onClick={addPlayer} className="flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors py-1">
            <Plus size={14} /> {t("Weiteren Player hinzufügen")}
          </button>
        </div>
        {players.length > 1 && (
          <Toggle label="Aktiven Player automatisch anzeigen" checked={cfg.autoFollow !== false} onChange={(v) => updateConfig(widget.i, "autoFollow", v)} />
        )}
      </Section>

      {/* Cover */}
      <Section title="Cover">
        {layout !== "cover" && (
          <Toggle label="Cover anzeigen" checked={cfg.showCover !== false} onChange={(v) => updateConfig(widget.i, "showCover", v)} />
        )}
        <div className="space-y-3 mt-1">
          {layout !== "cover" && cfg.showCover !== false && (
            <Slider label="Cover-Größe" value={cfg.coverScale ?? 100} unit="%" min={50} max={130} step={5}
              onChange={(v) => updateConfig(widget.i, "coverScale", v)} />
          )}
          <div>
            <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">{t("Cover-Ecken")}</label>
            <select value={cfg.coverCorners || "rounded"} onChange={(e) => updateConfig(widget.i, "coverCorners", e.target.value)} className={INPUT}>
              <option value="rounded">{t("Abgerundet")}</option>
              <option value="square">{t("Eckig")}</option>
              <option value="circle">{t("Vinyl (Kreis)")}</option>
            </select>
          </div>
          {(cfg.coverCorners || "rounded") === "circle" && (
            <Toggle label="Vinyl dreht sich beim Abspielen" checked={cfg.vinylSpin !== false} onChange={(v) => updateConfig(widget.i, "vinylSpin", v)} />
          )}
        </div>
      </Section>

      {/* Player-Punkte — nur relevant bei mehreren Playern */}
      {players.filter((p) => p.trim() !== "").length > 1 && (
        <Section title="Player-Punkte">
          <div>
            <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">{t("Punkte-Position")}</label>
            <select value={cfg.dotsPosition || "bottom-right"} onChange={(e) => updateConfig(widget.i, "dotsPosition", e.target.value)} className={INPUT}>
              <option value="bottom-right">{t("Unten rechts")}</option>
              <option value="top-right">{t("Oben rechts")}</option>
              <option value="bottom-center">{t("Unten mittig")}</option>
            </select>
          </div>
          <Toggle label="Nur bei Hover/Tippen anzeigen" checked={cfg.dotsShowOnInteract === true} onChange={(v) => updateConfig(widget.i, "dotsShowOnInteract", v)} />
          <p className="text-[11px] text-[var(--mf-fg)]/45 mt-1">
            {t("Wischen auf der Kachel wechselt den Player.")}
          </p>
        </Section>
      )}

      {/* Elemente */}
      <Section title="Elemente">
        <div className="mb-2">
          <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">{t("Wenn Text nicht passt")}</label>
          <select value={cfg.textOverflow || "truncate"} onChange={(e) => updateConfig(widget.i, "textOverflow", e.target.value)} className={INPUT}>
            <option value="truncate">{t("Abschneiden (…)")}</option>
            <option value="scroll">{t("Laufschrift")}</option>
            <option value="shrink">{t("Automatisch verkleinern")}</option>
          </select>
        </div>
        <Toggle label="Player-Name anzeigen" checked={cfg.showPlayerName === true} onChange={(v) => updateConfig(widget.i, "showPlayerName", v)} />
        <Toggle label="Interpret anzeigen" checked={cfg.showArtist !== false} onChange={(v) => updateConfig(widget.i, "showArtist", v)} />
        <Toggle label="Fortschritt anzeigen (Balken + Zeit)" checked={cfg.showProgress !== false} onChange={(v) => updateConfig(widget.i, "showProgress", v)} />
        {cfg.showProgress !== false && (
          <div className="flex items-center gap-2 py-1">
            <label className="text-sm font-medium text-[var(--mf-fg)]/80 flex-1">{t("Fortschritt-Farbe")}</label>
            <input type="color" value={cfg.accentColor || "#9ca3af"} onChange={(e) => updateConfig(widget.i, "accentColor", e.target.value)}
              className="w-9 h-9 rounded-lg border border-[var(--mf-bdr)]/10 bg-transparent cursor-pointer" />
            {cfg.accentColor && (
              <button onClick={() => updateConfig(widget.i, "accentColor", "")} className="text-xs text-[var(--mf-fg)]/50 hover:text-[var(--mf-fg)] px-2 py-1 rounded-lg bg-[var(--mf-elev)]/5 transition-colors">
                {t("Standard")}
              </button>
            )}
          </div>
        )}
        <Toggle label="Lautstärke-Regler anzeigen" checked={cfg.showVolume === true} onChange={(v) => updateConfig(widget.i, "showVolume", v)} />
        <Toggle label="Wiedergabe-Steuerung anzeigen" checked={cfg.showControls !== false} onChange={(v) => updateConfig(widget.i, "showControls", v)} />
        <p className="text-[11px] text-[var(--mf-fg)]/45 mt-1">
          {t("Zeitleiste antippen/ziehen springt im Track.")}
        </p>
      </Section>

      {/* Hintergrund */}
      <Section title="Hintergrund">
        {layout !== "cover" && (
          <>
            <Toggle label="Cover als Kachel-Hintergrund" checked={artworkBg} onChange={(v) => updateConfig(widget.i, "artworkAsTileBg", v)} />
            {artworkBg && (
              <div className="grid grid-cols-2 gap-3 mt-1 mb-2">
                <Slider label="Blur-Stärke" value={cfg.bgBlur ?? 28} unit="px" min={0} max={60} step={2}
                  onChange={(v) => updateConfig(widget.i, "bgBlur", v)} />
                <Slider label="Abdunkeln" value={cfg.bgDarken ?? 45} unit="%" min={0} max={85} step={5}
                  onChange={(v) => updateConfig(widget.i, "bgDarken", v)} />
              </div>
            )}
          </>
        )}
        {layout === "cover" && (
          <div className="mb-2">
            <Slider label="Text-Verlauf (nur Cover-Layout)" value={cfg.scrim ?? 70} unit="%" min={0} max={100} step={5}
              onChange={(v) => updateConfig(widget.i, "scrim", v)} />
          </div>
        )}
        <div className="space-y-3 mt-2">
          <div>
            <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">{t("Kachel-Theme")}</label>
            <select value={cfg.cardTheme === "light" ? "light" : "dark"} onChange={(e) => updateConfig(widget.i, "cardTheme", e.target.value)} className={INPUT}>
              <option value="dark">{t("Dunkel (Glas)")}</option>
              <option value="light">{t("Hell (weißes Glas)")}</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Slider label="Deckkraft" value={cfg.cardOpacity ?? 40} unit="%" min={0} max={100} step={5}
              onChange={(v) => updateConfig(widget.i, "cardOpacity", v)} />
            <Slider label="Unschärfe" value={cfg.cardBlur ?? 12} unit="px" min={0} max={30} step={1}
              onChange={(v) => updateConfig(widget.i, "cardBlur", v)} />
          </div>
        </div>
      </Section>

      {/* Verhalten */}
      <Section title="Verhalten">
        <Toggle label="Nur anzeigen wenn etwas läuft" checked={cfg.hideWhenIdle === true} onChange={(v) => updateConfig(widget.i, "hideWhenIdle", v)} />
      </Section>
    </div>
  );
}
