"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, ExternalLink, Trash2, ArrowRight, Monitor, Smartphone, Clock as ClockIcon, CloudSun, Calendar as CalendarIcon, Zap, Bell, Power, Timer as TimerIcon, MessageSquare, ShoppingCart, ClipboardList } from "lucide-react";
import { useT } from "@/lib/i18n/LocaleProvider";

type Orientation = "portrait" | "landscape";
type LayoutItem = { i: string; type: string; x: number; y: number; w: number; h: number };
type Dashboard = { id: string; name: string; orientation?: Orientation; layout?: LayoutItem[] };

const WIDGET_META: Record<string, { color: string; Icon: any }> = {
  "ClockWidget.tsx":           { color: "rgba(59,130,246,0.55)",  Icon: ClockIcon },      // blue
  "WeatherWidget.tsx":         { color: "rgba(6,182,212,0.55)",   Icon: CloudSun },       // cyan
  "CalendarWidget.tsx":        { color: "rgba(139,92,246,0.55)",  Icon: CalendarIcon },   // violet
  "HomeAssistantWidget.tsx":   { color: "rgba(34,197,94,0.55)",   Icon: Zap },            // green
  "HANotificationWidget.tsx":  { color: "rgba(249,115,22,0.55)",  Icon: Bell },           // orange
  "ButtonWidget.tsx":          { color: "rgba(245,158,11,0.55)",  Icon: Power },          // amber
  "TimerWidget.tsx":           { color: "rgba(16,185,129,0.55)",  Icon: TimerIcon },      // emerald
  "MessagesWidget.tsx":        { color: "rgba(217,70,239,0.55)",  Icon: MessageSquare },  // fuchsia
  "ShoppingListWidget.tsx":    { color: "rgba(234,179,8,0.55)",   Icon: ShoppingCart },   // yellow
  "TodosWidget.tsx":           { color: "rgba(99,102,241,0.55)",  Icon: ClipboardList },  // indigo
};

// Konstanten aus dem Editor-Canvas: 24 Spalten; für Höhe nehmen wir max-y + h
// aus dem gespeicherten Layout (oder 24 als Fallback).
const GRID_COLS = 24;
function LayoutPreview({ layout, orientation }: { layout?: LayoutItem[]; orientation: Orientation }) {
  const t = useT();
  const items = Array.isArray(layout) ? layout : [];
  const aspect = orientation === "landscape" ? "16 / 9" : "9 / 16";
  const rows = Math.max(24, ...items.map((w) => (w.y ?? 0) + (w.h ?? 0)));

  return (
    <div
       className="w-full bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-black/40 border border-white/10 rounded-lg relative overflow-hidden"
       style={{ aspectRatio: aspect }}
    >
       {items.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-white/40">
             {orientation === "landscape" ? <Monitor size={20} /> : <Smartphone size={18} />}
          </div>
       ) : (
          items.map((w) => {
             const meta = WIDGET_META[w.type] ?? { color: "rgba(255,255,255,0.2)", Icon: null };
             const { Icon } = meta;
             return (
                <div
                   key={w.i}
                   className="absolute rounded-[3px] border border-white/15 backdrop-blur-[1px] flex items-center justify-center"
                   style={{
                      left: `${(w.x / GRID_COLS) * 100}%`,
                      top: `${(w.y / rows) * 100}%`,
                      width: `${(w.w / GRID_COLS) * 100}%`,
                      height: `${(w.h / rows) * 100}%`,
                      backgroundColor: meta.color,
                   }}
                >
                   {Icon && w.w >= 3 && w.h >= 3 && (
                      <Icon size={Math.max(8, Math.min(w.w, w.h) * 1.2)} className="text-white/80" strokeWidth={2} />
                   )}
                </div>
             );
          })
       )}
       <span className="absolute top-1.5 right-1.5 text-[9px] font-medium uppercase tracking-wider bg-black/60 border border-white/10 rounded px-1.5 py-0.5 text-white/70">
          {orientation === "landscape" ? t("Quer") : t("Hoch")}
       </span>
    </div>
  );
}

export default function ViewsListPage() {
  const t = useT();
  const router = useRouter();
  const [dashboards, setDashboards] = useState<Dashboard[] | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newOrientation, setNewOrientation] = useState<Orientation>("portrait");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    fetch(`/api/dashboards?t=${Date.now()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setDashboards(Array.isArray(d) ? d : []))
      .catch(() => setDashboards([]));
  }

  useEffect(() => {
    load();
  }, []);

  async function createView(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/dashboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: newSlug, name: newName, orientation: newOrientation }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Konnte nicht angelegt werden.");
        return;
      }
      setShowNew(false);
      setNewName("");
      setNewSlug("");
      setNewOrientation("portrait");
      load();
      router.push(`/editor/views/${encodeURIComponent(data.id)}`);
    } catch {
      setError("Netzwerkfehler.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteView(id: string, name: string) {
    if (
      !confirm(
        `View "${name}" wirklich löschen? Alle Widgets dieses Views gehen verloren.`,
      )
    )
      return;
    await fetch(`/api/dashboards?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    load();
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[1100px] mx-auto px-8 py-10">
        <header className="flex items-end justify-between mb-8">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/40 mb-2">
              {t("Views")}
            </div>
            <h1 className="text-3xl font-semibold">
              {t("Alle Dashboards & Displays")}
            </h1>
            <p className="text-white/50 mt-2 max-w-xl text-sm">
              {t("Ein View = was auf einem Display gerendert wird. Du kannst beliebig viele anlegen und pro Display eine eigene Layout-URL ansteuern.")}
            </p>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-full text-sm font-medium shadow-sm shadow-blue-500/30"
          >
            <Plus size={14} /> {t("Neuer View")}
          </button>
        </header>

        {dashboards === null ? (
          <div className="text-white/40 text-sm">{t("Wird geladen…")}</div>
        ) : dashboards.length === 0 ? (
          <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-12 text-center">
            <p className="text-white/60 mb-4">{t("Noch keine Views angelegt.")}</p>
            <button
              onClick={() => setShowNew(true)}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-full text-sm font-medium"
            >
              <Plus size={14} /> {t("Ersten View anlegen")}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {dashboards.map((d) => {
              const isLandscape = d.orientation === "landscape";
              return (
              <div
                key={d.id}
                className="group bg-zinc-900/60 border border-white/10 hover:border-blue-500/40 rounded-2xl p-4 transition-colors flex flex-col"
              >
                <Link
                  href={`/editor/views/${encodeURIComponent(d.id)}`}
                  className="block mb-3"
                >
                  <div className="mx-auto" style={{ maxWidth: isLandscape ? "100%" : "180px" }}>
                     <LayoutPreview layout={d.layout} orientation={isLandscape ? "landscape" : "portrait"} />
                  </div>
                </Link>
                <div className="flex items-center justify-between gap-2">
                   <Link
                      href={`/editor/views/${encodeURIComponent(d.id)}`}
                      className="font-semibold truncate"
                   >
                      {d.name}
                   </Link>
                   <ArrowRight
                      size={14}
                      className="text-white/30 group-hover:text-white/80 transition-colors shrink-0"
                   />
                </div>
                <div className="text-xs text-white/40 mt-1 font-mono">
                  /view/{d.id}
                </div>
                <div className="flex items-center gap-3 mt-auto pt-4 border-t border-white/5">
                  <a
                    href={`/view/${encodeURIComponent(d.id)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-white/50 hover:text-white flex items-center gap-1"
                  >
                    <ExternalLink size={11} /> {t("Live öffnen")}
                  </a>
                  <button
                    onClick={() => deleteView(d.id, d.name)}
                    disabled={dashboards.length <= 1}
                    title={
                      dashboards.length <= 1
                        ? t("Mindestens ein View muss bestehen bleiben.")
                        : t("Löschen")
                    }
                    className="ml-auto text-[11px] text-red-400/70 hover:text-red-300 disabled:opacity-30 disabled:hover:text-red-400/70 flex items-center gap-1"
                  >
                    <Trash2 size={11} /> {t("Löschen")}
                  </button>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

      {showNew && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowNew(false)}
        >
          <form
            onSubmit={createView}
            onClick={(e) => e.stopPropagation()}
            className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
          >
            <h2 className="text-lg font-semibold mb-1">{t("Neuer View")}</h2>
            <p className="text-sm text-white/50 mb-6">
              {t("Nach dem Anlegen wirst du direkt in den Editor geschickt.")}
            </p>

            <label className="block mb-4">
              <span className="text-xs font-medium text-white/70 block mb-2">
                {t("Anzeigename")}
              </span>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t("z.B. Küche")}
                className="w-full bg-black border border-white/10 text-white rounded-lg p-3 outline-none focus:border-blue-500"
              />
            </label>
            <div className="mb-6">
               <span className="text-xs font-medium text-white/70 block mb-2">
                  {t("Ausrichtung")}
               </span>
               <div className="grid grid-cols-2 gap-2">
                  <button
                     type="button"
                     onClick={() => setNewOrientation("portrait")}
                     className={`flex items-center justify-center gap-2 border rounded-lg p-3 transition-colors ${
                        newOrientation === "portrait"
                           ? "bg-blue-500/10 border-blue-500/50 text-white"
                           : "bg-black/40 border-white/10 text-white/60 hover:border-white/30"
                     }`}
                  >
                     <div className={`w-6 h-8 rounded border flex items-center justify-center ${newOrientation === "portrait" ? "border-blue-300" : "border-white/20"}`}>
                        <Smartphone size={10} />
                     </div>
                     <span className="text-sm font-medium">{t("Hochformat")}</span>
                  </button>
                  <button
                     type="button"
                     onClick={() => setNewOrientation("landscape")}
                     className={`flex items-center justify-center gap-2 border rounded-lg p-3 transition-colors ${
                        newOrientation === "landscape"
                           ? "bg-blue-500/10 border-blue-500/50 text-white"
                           : "bg-black/40 border-white/10 text-white/60 hover:border-white/30"
                     }`}
                  >
                     <div className={`w-10 h-6 rounded border flex items-center justify-center ${newOrientation === "landscape" ? "border-blue-300" : "border-white/20"}`}>
                        <Monitor size={12} />
                     </div>
                     <span className="text-sm font-medium">{t("Querformat")}</span>
                  </button>
               </div>
               <p className="text-[11px] text-white/40 mt-2">
                  {t("Beeinflusst das Canvas-Seitenverhältnis im Editor. Kannst du später jederzeit umstellen.")}
               </p>
            </div>

            <label className="block mb-6">
              <span className="text-xs font-medium text-white/70 block mb-2">
                URL-Pfad
              </span>
              <div className="flex items-center gap-2">
                <span className="text-white/40 font-mono text-sm">/view/</span>
                <input
                  type="text"
                  required
                  value={newSlug}
                  onChange={(e) =>
                    setNewSlug(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9-]/g, "-"),
                    )
                  }
                  placeholder="kueche"
                  className="w-full bg-black border border-white/10 text-white font-mono rounded-lg p-3 outline-none focus:border-blue-500"
                />
              </div>
              <p className="text-[11px] text-white/40 mt-1">
                Keine Leerzeichen. Wird die URL auf dem Display.
              </p>
            </label>

            {error && (
              <div className="mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                {error}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowNew(false)}
                className="px-4 py-2 rounded-full text-sm text-white/70 hover:text-white hover:bg-white/5"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={busy}
                className="px-4 py-2 rounded-full text-sm bg-blue-600 hover:bg-blue-500 font-medium disabled:opacity-50"
              >
                {busy ? "Wird angelegt…" : "Anlegen & öffnen"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
