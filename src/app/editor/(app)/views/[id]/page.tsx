"use client";

import React, { useState, useEffect, use } from "react";
import { Responsive, WidthProvider } from "react-grid-layout/legacy";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import io from "socket.io-client";
import {
  Monitor,
  Smartphone,
  Settings,
  Plus,
  Image as ImageIcon,
  X,
  ClipboardPaste,
  Save,
  ExternalLink,
  Cast,
  Clock as ClockIcon,
  CloudSun,
  Calendar as CalendarIcon,
  Power,
  Bell,
  ChevronLeft,
  RefreshCw,
  Timer as TimerIcon,
  MessageSquare,
  ShoppingCart,
  ClipboardList,
  Plug,
  Zap,
} from "lucide-react";
import Link from "next/link";

import {
  WidgetLayoutItem,
  WallpaperConfig,
  defaultLayout,
  widgetTitle,
} from "@/app/editor/_types";
import InspectorPanel from "@/app/editor/_components/InspectorPanel";
import WallpaperSettingsModal, {
  type ImmichAlbum,
} from "@/app/editor/_components/WallpaperSettingsModal";
import { DEFAULT_WALLPAPER } from "@/lib/wallpaper-engine/bundled";
import { useT } from "@/lib/i18n/LocaleProvider";

const WIDGET_CATALOG: {
  type: string;
  label: string;
  icon: React.ReactNode;
}[] = [
  { type: "ClockWidget.tsx", label: "Uhr", icon: <ClockIcon size={16} /> },
  { type: "WeatherWidget.tsx", label: "Wetter", icon: <CloudSun size={16} /> },
  { type: "CalendarWidget.tsx", label: "Kalender", icon: <CalendarIcon size={16} /> },
  { type: "HomeAssistantWidget.tsx", label: "HA Entity", icon: <Zap size={16} /> },
  { type: "ButtonWidget.tsx", label: "Buttons", icon: <Power size={16} /> },
  { type: "HANotificationWidget.tsx", label: "Benachrichtigungen", icon: <Bell size={16} /> },
  { type: "TimerWidget.tsx", label: "Timer", icon: <TimerIcon size={16} /> },
  { type: "MessagesWidget.tsx", label: "Nachrichten", icon: <MessageSquare size={16} /> },
  { type: "ShoppingListWidget.tsx", label: "Einkaufsliste", icon: <ShoppingCart size={16} /> },
  { type: "TodosWidget.tsx", label: "Todos", icon: <ClipboardList size={16} /> },
];

const WIDGET_ACCENT: Record<string, { hex: string; glow: string; tint: string }> = {
  "ClockWidget.tsx":           { hex: "#3b82f6", glow: "rgba(59,130,246,0.25)",  tint: "rgba(59,130,246,0.12)"  }, // blue
  "WeatherWidget.tsx":         { hex: "#06b6d4", glow: "rgba(6,182,212,0.25)",   tint: "rgba(6,182,212,0.12)"   }, // cyan
  "CalendarWidget.tsx":        { hex: "#8b5cf6", glow: "rgba(139,92,246,0.25)",  tint: "rgba(139,92,246,0.12)"  }, // violet
  "HomeAssistantWidget.tsx":   { hex: "#22c55e", glow: "rgba(34,197,94,0.25)",   tint: "rgba(34,197,94,0.12)"   }, // green
  "HANotificationWidget.tsx":  { hex: "#f97316", glow: "rgba(249,115,22,0.25)",  tint: "rgba(249,115,22,0.12)"  }, // orange
  "ButtonWidget.tsx":          { hex: "#f59e0b", glow: "rgba(245,158,11,0.25)",  tint: "rgba(245,158,11,0.12)"  }, // amber
  "TimerWidget.tsx":           { hex: "#10b981", glow: "rgba(16,185,129,0.25)",  tint: "rgba(16,185,129,0.12)"  }, // emerald
  "MessagesWidget.tsx":        { hex: "#d946ef", glow: "rgba(217,70,239,0.25)",  tint: "rgba(217,70,239,0.12)"  }, // fuchsia
  "ShoppingListWidget.tsx":    { hex: "#eab308", glow: "rgba(234,179,8,0.25)",   tint: "rgba(234,179,8,0.12)"   }, // yellow
  "TodosWidget.tsx":           { hex: "#6366f1", glow: "rgba(99,102,241,0.25)",  tint: "rgba(99,102,241,0.12)"  }, // indigo
};
const DEFAULT_ACCENT = { hex: "#64748b", glow: "rgba(100,116,139,0.2)", tint: "rgba(100,116,139,0.1)" };

/**
 * Editor placeholder body — a low-fidelity skeleton that hints at the
 * widget's actual layout (rows, tiles, icons, etc.) in the accent colour.
 * All sizes are percentages so it scales to any widget size on the grid.
 *
 * Returns `null` for unknown / custom-module types; the caller falls back
 * to a single centred type-icon for those.
 */
function widgetSkeletonFor(type: string, accentHex: string): React.ReactNode {
  // 8-char hex with alpha — works in every modern browser.
  // 33 ≈ 20% / 1f ≈ 12% / 14 ≈ 8% (subtle layered effect).
  const dim = `${accentHex}33`;
  const dimmer = `${accentHex}1f`;
  const faint = `${accentHex}14`;

  switch (type) {
    case "ClockWidget.tsx":
      // Date strip on top, then a "HH : MM" time row — two big blocks with
      // a two-dot colon between them. Reads as a clock even at small sizes.
      // items-center keeps the strip and time row horizontally centred.
      return (
        <div className="w-full h-full flex flex-col p-[10%] gap-[8%] justify-center items-center overflow-hidden">
          <div
            className="rounded-full"
            style={{ width: "30%", height: "6%", backgroundColor: dimmer }}
          />
          <div className="flex items-center justify-center gap-[4%] w-full" style={{ height: "45%" }}>
            <div className="rounded-md h-full" style={{ width: "38%", backgroundColor: dim }} />
            <div
              className="flex flex-col justify-center gap-[40%] h-full"
              style={{ width: "6%" }}
            >
              <div className="rounded-full aspect-square w-full" style={{ backgroundColor: dim }} />
              <div className="rounded-full aspect-square w-full" style={{ backgroundColor: dim }} />
            </div>
            <div className="rounded-md h-full" style={{ width: "38%", backgroundColor: dim }} />
          </div>
        </div>
      );

    case "WeatherWidget.tsx":
      // Location strip / temp + icon row / "feels like" / forecast tiles.
      return (
        <div className="w-full h-full flex flex-col p-[8%] gap-[5%] overflow-hidden">
          <div className="rounded-full" style={{ width: "25%", height: "5%", backgroundColor: dimmer }} />
          <div className="flex items-center gap-[5%]" style={{ height: "32%" }}>
            <div className="rounded-md h-full" style={{ width: "42%", backgroundColor: dim }} />
            <div className="rounded-full h-full aspect-square" style={{ backgroundColor: dimmer }} />
          </div>
          <div className="rounded-full" style={{ width: "55%", height: "4%", backgroundColor: dimmer }} />
          <div className="flex gap-[3%] mt-auto" style={{ height: "26%" }}>
            <div className="flex-1 rounded-md" style={{ backgroundColor: faint }} />
            <div className="flex-1 rounded-md" style={{ backgroundColor: faint }} />
            <div className="flex-1 rounded-md" style={{ backgroundColor: faint }} />
            <div className="flex-1 rounded-md" style={{ backgroundColor: faint }} />
          </div>
        </div>
      );

    case "CalendarWidget.tsx":
      // Three event rows: date block + two text lines.
      return (
        <div className="w-full h-full flex flex-col p-[8%] gap-[8%] overflow-hidden justify-center">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-[5%]" style={{ height: "22%" }}>
              <div className="rounded-md h-full aspect-square" style={{ backgroundColor: dim }} />
              <div className="flex-1 flex flex-col gap-[18%] justify-center h-full">
                <div className="rounded-full" style={{ height: "32%", width: i === 2 ? "65%" : "85%", backgroundColor: dim }} />
                <div className="rounded-full" style={{ height: "22%", width: "50%", backgroundColor: dimmer }} />
              </div>
            </div>
          ))}
        </div>
      );

    case "HomeAssistantWidget.tsx":
      // Stacked horizontal pills — matches the real widget's flex-col layout
      // of long, flat entity cards (round icon + label + state on one line).
      return (
        <div className="w-full h-full flex flex-col p-[6%] gap-[5%] overflow-hidden justify-center">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center gap-[4%] rounded-full"
              style={{
                height: "18%",
                padding: "0 4%",
                backgroundColor: i % 2 === 0 ? dimmer : faint,
              }}
            >
              <div
                className="rounded-full aspect-square"
                style={{ height: "60%", backgroundColor: dim }}
              />
              <div
                className="rounded-full"
                style={{
                  height: "30%",
                  width: `${68 - i * 6}%`,
                  backgroundColor: dim,
                }}
              />
            </div>
          ))}
        </div>
      );

    case "ButtonWidget.tsx":
      // 2×2 grid of square button tiles, each with a small power-icon dot in
      // the middle so they read as actual buttons (not just empty cells).
      return (
        <div
          className="w-full h-full grid grid-cols-2 grid-rows-2 p-[12%]"
          style={{ gap: "8%" }}
        >
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-md flex items-center justify-center"
              style={{ backgroundColor: i === 0 ? dim : dimmer }}
            >
              <div
                className="rounded-full aspect-square"
                style={{
                  width: "32%",
                  backgroundColor: i === 0 ? dimmer : faint,
                }}
              />
            </div>
          ))}
        </div>
      );

    case "HANotificationWidget.tsx":
      // Stacked horizontal notification cards — matches the real widget's
      // flex-col layout. Each card: round bell + 2 short text lines, compact
      // rounded-3xl-style pill.
      return (
        <div className="w-full h-full flex flex-col p-[6%] gap-[5%] overflow-hidden justify-center">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center gap-[4%] rounded-2xl"
              style={{
                height: "22%",
                padding: "0 4%",
                backgroundColor: i === 0 ? dimmer : faint,
              }}
            >
              <div
                className="rounded-full aspect-square shrink-0"
                style={{ height: "55%", backgroundColor: dim }}
              />
              <div className="flex-1 flex flex-col gap-[20%] justify-center">
                <div
                  className="rounded-full"
                  style={{
                    height: "22%",
                    width: `${80 - i * 8}%`,
                    backgroundColor: dim,
                  }}
                />
                <div
                  className="rounded-full"
                  style={{ height: "16%", width: "45%", backgroundColor: dimmer }}
                />
              </div>
            </div>
          ))}
        </div>
      );

    case "TimerWidget.tsx":
      // Big centred countdown block + small caption underneath.
      return (
        <div className="w-full h-full flex flex-col p-[10%] gap-[8%] justify-center items-center overflow-hidden">
          <div className="rounded-lg" style={{ height: "48%", width: "80%", backgroundColor: dim }} />
          <div className="rounded-full" style={{ height: "8%", width: "40%", backgroundColor: dimmer }} />
        </div>
      );

    case "MessagesWidget.tsx":
      // Four staggered text lines.
      return (
        <div className="w-full h-full flex flex-col p-[10%] gap-[8%] justify-center overflow-hidden">
          <div className="rounded-full" style={{ height: "10%", width: "85%", backgroundColor: dim }} />
          <div className="rounded-full" style={{ height: "10%", width: "70%", backgroundColor: dim }} />
          <div className="rounded-full" style={{ height: "10%", width: "82%", backgroundColor: dimmer }} />
          <div className="rounded-full" style={{ height: "10%", width: "60%", backgroundColor: dimmer }} />
        </div>
      );

    case "ShoppingListWidget.tsx":
    case "TodosWidget.tsx":
      // List rows: checkbox square + text line.
      return (
        <div className="w-full h-full flex flex-col p-[8%] gap-[8%] overflow-hidden justify-center">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-[5%]" style={{ height: "14%" }}>
              <div className="rounded h-full aspect-square" style={{ backgroundColor: dim }} />
              <div
                className="flex-1 rounded-full"
                style={{
                  height: "50%",
                  width: `${80 - i * 8}%`,
                  backgroundColor: i < 2 ? dim : dimmer,
                }}
              />
            </div>
          ))}
        </div>
      );

    default:
      // Custom modules etc — caller falls back to a single big icon.
      return null;
  }
}

function widgetIconFor(type: string, size = 12): React.ReactNode {
  switch (type) {
    case "ClockWidget.tsx":
      return <ClockIcon size={size} />;
    case "WeatherWidget.tsx":
      return <CloudSun size={size} />;
    case "CalendarWidget.tsx":
      return <CalendarIcon size={size} />;
    case "HomeAssistantWidget.tsx":
      return <Zap size={size} />;
    case "ButtonWidget.tsx":
      return <Power size={size} />;
    case "HANotificationWidget.tsx":
      return <Bell size={size} />;
    case "TimerWidget.tsx":
      return <TimerIcon size={size} />;
    case "MessagesWidget.tsx":
      return <MessageSquare size={size} />;
    case "ShoppingListWidget.tsx":
      return <ShoppingCart size={size} />;
    case "TodosWidget.tsx":
      return <ClipboardList size={size} />;
    default:
      return null;
  }
}

const ResponsiveGridLayout = WidthProvider(Responsive);

export default function ViewEditor({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = useT();
  const { id: viewId } = use(params);

  const [viewName, setViewName] = useState<string>("");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [layout, setLayout] = useState<WidgetLayoutItem[]>(defaultLayout);
  const [activeSettingsId, setActiveSettingsId] = useState<string | null>(null);
  const [wallpaper, setWallpaper] = useState<WallpaperConfig>({ ...DEFAULT_WALLPAPER });
  const [settings, setSettings] = useState<any>({ haUrl: "", haToken: "" });

  const [webdavFolders, setWebdavFolders] = useState<any[]>([]);
  const [isFetchingFolders, setIsFetchingFolders] = useState(false);
  const [webdavError, setWebdavError] = useState("");

  const [showWallpaperModal, setShowWallpaperModal] = useState(false);
  const [immichAlbums, setImmichAlbums] = useState<ImmichAlbum[]>([]);
  const [isFetchingAlbums, setIsFetchingAlbums] = useState(false);
  const [immichError, setImmichError] = useState("");

  const [citySearchQuery, setCitySearchQuery] = useState("");
  const [citySearchResults, setCitySearchResults] = useState<any[]>([]);
  const [isSearchingCity, setIsSearchingCity] = useState(false);
  const [hasClipboardData, setHasClipboardData] = useState(false);
  const [buttonTab, setButtonTab] = useState("1");
  const [showMobileWidgets, setShowMobileWidgets] = useState(false);
  // Custom-Module: dynamisch geladene Plug-Ins für den Widget-Katalog.
  const [customModules, setCustomModules] = useState<
    Array<{
      type: string;
      label: string;
      iconEmoji: string;
      fields: Array<{ key: string; label: string; type: string; default?: any; placeholder?: string; help?: string; required?: boolean }>;
    }>
  >([]);
  useEffect(() => {
    fetch("/api/modules", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setCustomModules(Array.isArray(d.modules) ? d.modules : []))
      .catch(() => {});
  }, []);

  const [socket, setSocket] = useState<any>(null);
  const [saveStatus, setSaveStatus] = useState<null | "saving" | "saved" | "error">(null);

  useEffect(() => {
    const s = io();
    setSocket(s);
    return () => {
      s.disconnect();
    };
  }, []);

  useEffect(() => {
    fetch(`/api/layout/get?dashboardId=${encodeURIComponent(viewId)}&t=${Date.now()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.layout && data.layout.length > 0) {
          const populated = data.layout.map((item: any) => ({
            ...item,
            config: item.config?.fontSize ? item.config : { fontSize: 20, fontFamily: "Inter" },
          }));
          setLayout(populated);
        } else {
          setLayout(defaultLayout);
        }
        if (data.wallpaper) setWallpaper(data.wallpaper);
        if (data.settings) {
          setSettings(data.settings);
          if (data.settings.orientation === "landscape" || data.settings.orientation === "portrait") {
            setOrientation(data.settings.orientation);
          }
        }
      })
      .catch((err) => console.error("Error loading layout:", err));

    fetch(`/api/dashboards?t=${Date.now()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((list) => {
        if (Array.isArray(list)) {
          const found = list.find((d: any) => d.id === viewId);
          setViewName(found?.name || viewId);
        }
      })
      .catch(() => {});

    setHasClipboardData(!!localStorage.getItem("magic_widget_clipboard"));
  }, [viewId]);

  const onLayoutChange = (newLayout: any) => {
    const updated = layout.map((item) => {
      const gl = newLayout.find((l: any) => l.i === item.i);
      return gl ? { ...item, x: gl.x, y: gl.y, w: gl.w, h: gl.h } : item;
    });
    setLayout(updated);
  };

  const updateLayoutGrid = (i: string, key: string, value: number) => {
    setLayout((prev) => prev.map((item) => (item.i === i ? { ...item, [key]: value } : item)));
  };

  const updateOpacity = (i: string, opacity: number) => {
    setLayout((prev) => prev.map((item) => (item.i === i ? { ...item, bgOpacity: opacity } : item)));
  };

  const updateConfig = (i: string, key: string, value: any) => {
    setLayout((prev) =>
      prev.map((item) => (item.i === i ? { ...item, config: { ...item.config, [key]: value } } : item)),
    );
  };

  const updateLabel = (i: string, label: string) => {
    setLayout((prev) => prev.map((item) => (item.i === i ? { ...item, label } : item)));
  };

  const addWidget = (type: string) => {
    const newId = Math.random().toString(36).substring(7);
    // Core widgets store an EMPTY label — the display title is derived from
    // the type via widgetTitle() and localised at render. No German string is
    // baked into the DB, so a new view's widgets read correctly in whatever
    // locale the display is set to (issue #7). Only custom modules carry a
    // stored label (their manifest name).
    let label = "";
    // Custom-Modul: label aus dem Manifest, Felder mit Defaults vorbelegen.
    const initialConfig: any = { fontSize: 20, fontFamily: "var(--font-geist-sans)" };
    if (type.startsWith("custom:")) {
      const mod = customModules.find((m) => m.type === type);
      if (mod) {
        label = mod.label;
        for (const f of mod.fields ?? []) {
          if (f.default !== undefined) initialConfig[f.key] = f.default;
        }
      }
    }

    const newWidget: WidgetLayoutItem = {
      i: newId,
      x: 0,
      y: 5,
      w: 8,
      h: 4,
      type,
      label,
      bgOpacity: 20,
      config: initialConfig,
    };
    setLayout((prev) => [...prev, newWidget]);
    setActiveSettingsId(newId);
  };

  const removeWidget = (id: string) => {
    setLayout((prev) => prev.filter((w) => w.i !== id));
    setActiveSettingsId(null);
  };

  const handleSave = async () => {
    setSaveStatus("saving");
    try {
      const settingsWithOrientation = { ...settings, orientation };
      const res = await fetch("/api/layout/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layout, wallpaper, settings: settingsWithOrientation, dashboardId: viewId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("[save] failed:", res.status, data);
        const details = data?.details
          ? `\n\n${t("Details:")}\n${JSON.stringify(data.details, null, 2)}`
          : "";
        alert(`${t("Speichern fehlgeschlagen")} (HTTP ${res.status}): ${data?.error ? t(data.error) : t("unbekannt")}${details}`);
        setSaveStatus("error");
        setTimeout(() => setSaveStatus(null), 2500);
        return;
      }
      if (socket) socket.emit("LAYOUT_UPDATED", viewId);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (err) {
      console.error("[save] network error:", err);
      alert(t("Netzwerkfehler beim Speichern. Details in der Konsole."));
      setSaveStatus("error");
      setTimeout(() => setSaveStatus(null), 2500);
    }
  };

  const handleCastToTV = () => {
    if (socket) {
      socket.emit("FORCE_NAVIGATE", viewId);
      alert(`${t("Befehl gesendet: Alle verbundenen Displays wechseln auf")} "${viewName || viewId}".`);
    } else {
      alert(t("Keine Verbindung zum WebSocket-Server."));
    }
  };

  const handleStopCast = () => {
    if (socket) {
      socket.emit("CLEAR_NAVIGATE");
      alert(t("Befehl gesendet: Alle Displays kehren zurück."));
    }
  };

  const handleRefreshDevices = (onlyThisView: boolean) => {
    if (!socket) {
      alert(t("Keine Verbindung zum WebSocket-Server."));
      return;
    }
    socket.emit("REFRESH_DEVICE", onlyThisView ? viewId : null);
  };

  const copyWidgetToClipboard = (widget: any) => {
    localStorage.setItem("magic_widget_clipboard", JSON.stringify(widget));
    setHasClipboardData(true);
    alert(t("Modul kopiert — öffne einen anderen View und klick oben auf 'Einfügen'."));
  };

  const pasteFromClipboard = () => {
    const data = localStorage.getItem("magic_widget_clipboard");
    if (!data) return;
    try {
      const widget = JSON.parse(data);
      widget.i = Math.random().toString(36).substring(7);
      widget.y = 5;
      widget.x = 0;
      setLayout((prev) => [...prev, widget]);
    } catch {
      alert(t("Wiederherstellen fehlgeschlagen!"));
    }
  };

  const searchCity = async (query: string) => {
    setCitySearchQuery(query);
    if (query.trim().length < 2) {
      setCitySearchResults([]);
      return;
    }
    setIsSearchingCity(true);
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=de&format=json`,
      );
      const data = await res.json();
      setCitySearchResults(data.results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingCity(false);
    }
  };

  const fetchWebdavFolders = async (path: string = "/") => {
    if (!wallpaper.webdavUrl || !wallpaper.webdavUser || !wallpaper.webdavPass) {
      setWebdavError(t("Bitte URL, Benutzer und Passwort ausfüllen."));
      return;
    }
    setIsFetchingFolders(true);
    setWebdavError("");
    setWebdavFolders([]);
    try {
      const res = await fetch("/api/webdav/browse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: wallpaper.webdavUrl,
          username: wallpaper.webdavUser,
          password: wallpaper.webdavPass,
          path,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("Unbekannter Fehler"));
      setWebdavFolders(data.folders);
      setWallpaper((prev) => ({ ...prev, webdavPath: path }));
    } catch (err: any) {
      setWebdavError(err.message);
    } finally {
      setIsFetchingFolders(false);
    }
  };

  const fetchImmichAlbums = async () => {
    if (!wallpaper.immichUrl || !wallpaper.immichApiKey) {
      setImmichError(t("Bitte Immich-URL und API-Key ausfüllen."));
      return;
    }
    setIsFetchingAlbums(true);
    setImmichError("");
    try {
      const res = await fetch("/api/wallpaper/immich/albums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: wallpaper.immichUrl,
          apiKey: wallpaper.immichApiKey,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("Unbekannter Fehler"));
      setImmichAlbums(data.albums || []);
      if ((data.albums || []).length === 0) {
        setImmichError(t("Keine Alben gefunden — hat der API-Key Album-Rechte?"));
      }
    } catch (err: any) {
      setImmichError(err.message);
      setImmichAlbums([]);
    } finally {
      setIsFetchingAlbums(false);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSave();
      }
      if (e.key === "Escape" && activeSettingsId) {
        setActiveSettingsId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, wallpaper, settings, viewId, activeSettingsId, socket]);

  return (
    <>
      <header className="h-14 shrink-0 border-b border-white/10 bg-black/40 flex items-center px-3 gap-2">
        <Link
          href="/editor/views"
          className="flex items-center gap-1 text-xs text-white/50 hover:text-white px-2 h-8 rounded-md hover:bg-white/5"
        >
          <ChevronLeft size={14} /> {t("Views")}
        </Link>
        <div className="w-px h-6 bg-white/10" />
        <div className="min-w-0 flex-1 flex items-baseline gap-2">
          <h1 className="text-sm font-semibold truncate">{viewName || viewId}</h1>
          <code className="text-[11px] text-white/40 font-mono truncate hidden sm:inline">
            /view/{viewId}
          </code>
        </div>

        <div className="hidden md:inline-flex rounded-lg bg-white/5 border border-white/10 p-0.5 shrink-0">
          <button
            onClick={() => setOrientation("landscape")}
            className={`flex items-center gap-1.5 px-2.5 h-7 rounded-md text-xs font-medium transition-colors ${orientation === "landscape" ? "bg-white/15 text-white" : "text-white/50 hover:text-white"}`}
          >
            <Monitor size={13} /> {t("Quer")}
          </button>
          <button
            onClick={() => setOrientation("portrait")}
            className={`flex items-center gap-1.5 px-2.5 h-7 rounded-md text-xs font-medium transition-colors ${orientation === "portrait" ? "bg-white/15 text-white" : "text-white/50 hover:text-white"}`}
          >
            <Smartphone size={13} /> {t("Hoch")}
          </button>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <a
            href={`/view/${encodeURIComponent(viewId)}`}
            target="_blank"
            rel="noreferrer"
            title={t("View in neuem Tab öffnen")}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors"
          >
            <ExternalLink size={15} />
          </a>
          <button
            onClick={handleStopCast}
            title={t("TV Sync beenden")}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <X size={15} />
          </button>
          <button
            onClick={handleCastToTV}
            title={t("Alle TVs auf dieses Dashboard")}
            className="flex items-center gap-1.5 px-2.5 h-9 rounded-lg text-sm font-medium text-indigo-300 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition-colors"
          >
            <Cast size={14} />
            <span className="hidden lg:inline">{t("TV Sync")}</span>
          </button>
          <button
            onClick={() => handleRefreshDevices(false)}
            title={t("Alle verbundenen Displays neu laden (Shift+Klick: nur diesen View)")}
            onMouseDown={(e) => {
              if (e.shiftKey) {
                e.preventDefault();
                handleRefreshDevices(true);
              }
            }}
            className="flex items-center gap-1.5 px-2.5 h-9 rounded-lg text-sm font-medium text-amber-300 hover:text-white bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 transition-colors"
          >
            <RefreshCw size={14} />
            <span className="hidden lg:inline">{t("Refresh")}</span>
          </button>
          <button
            onClick={handleSave}
            title={t("Layout speichern (⌘S)")}
            className={`flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm font-semibold transition-all shadow-sm ${
              saveStatus === "saved"
                ? "bg-green-600 text-white shadow-green-500/30"
                : saveStatus === "error"
                  ? "bg-red-600 text-white shadow-red-500/30"
                  : "bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white shadow-blue-500/30"
            }`}
          >
            <Save size={14} />
            <span>
              {saveStatus === "saving" && t("Speichere…")}
              {saveStatus === "saved" && t("Gespeichert")}
              {saveStatus === "error" && t("Fehler")}
              {!saveStatus && t("Speichern")}
            </span>
          </button>
        </div>
      </header>

      <div className="border-b border-white/5 bg-black/20 px-4 flex items-center gap-2 overflow-x-auto">
        {hasClipboardData && (
          <button
            onClick={pasteFromClipboard}
            className="flex items-center gap-1.5 h-10 px-3 text-sm font-medium text-blue-300 hover:text-blue-200 hover:bg-blue-500/10 border-b-2 border-transparent hover:border-blue-500/40 transition-colors"
          >
            <ClipboardPaste size={14} /> {t("Einfügen")}
          </button>
        )}
        <button
          onClick={() => setShowWallpaperModal(true)}
          className="flex items-center gap-1.5 h-10 px-3 text-sm font-medium text-white/80 hover:text-white hover:bg-white/5 border-b-2 border-transparent hover:border-white/20 transition-colors"
          title={t("Hintergrund / Wallpaper für diesen View")}
        >
          <ImageIcon size={14} /> {t("Wallpaper")}
        </button>
        <Link
          href="/editor/integrations"
          className="flex items-center gap-1.5 h-10 px-3 text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 border-b-2 border-transparent hover:border-white/20 transition-colors"
        >
          <Plug size={14} /> {t("Integrationen")}
        </Link>
        <div className="flex-1" />
        <div className="md:hidden inline-flex rounded-lg bg-white/5 border border-white/10 p-0.5 my-2 shrink-0">
          <button
            onClick={() => setOrientation("landscape")}
            className={`flex items-center gap-1 px-2 h-6 rounded-md text-xs font-medium transition-colors ${orientation === "landscape" ? "bg-white/15 text-white" : "text-white/50"}`}
          >
            <Monitor size={12} />
          </button>
          <button
            onClick={() => setOrientation("portrait")}
            className={`flex items-center gap-1 px-2 h-6 rounded-md text-xs font-medium transition-colors ${orientation === "portrait" ? "bg-white/15 text-white" : "text-white/50"}`}
          >
            <Smartphone size={12} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <aside className="hidden md:flex flex-col w-48 lg:w-56 shrink-0 border-r border-white/10 bg-black/20 overflow-y-auto">
          <div className="px-3 pt-4 pb-2 text-[10px] font-medium uppercase tracking-[0.15em] text-white/40">
            {t("Widget hinzufügen")}
          </div>
          <div className="px-2 pb-3 space-y-0.5">
            {WIDGET_CATALOG.map((w) => (
              <button
                key={w.type}
                onClick={() => addWidget(w.type)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors group"
                title={t("{x} hinzufügen").replace("{x}", t(w.label))}
              >
                <span className="w-5 flex justify-center text-white/60 group-hover:text-white">
                  {w.icon}
                </span>
                <span className="flex-1 text-left truncate">{t(w.label)}</span>
                <Plus size={13} className="text-white/30 group-hover:text-white/70 shrink-0" />
              </button>
            ))}
            {customModules.length > 0 && (
              <>
                <div className="px-3 pt-3 pb-1 text-[10px] font-medium uppercase tracking-[0.15em] text-white/30">
                  {t("Custom")}
                </div>
                {customModules.map((m) => (
                  <button
                    key={m.type}
                    onClick={() => addWidget(m.type)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors group"
                    title={t("{x} hinzufügen").replace("{x}", m.label)}
                  >
                    <span className="w-5 flex justify-center text-base leading-none">{m.iconEmoji}</span>
                    <span className="flex-1 text-left truncate">{m.label}</span>
                    <Plus size={13} className="text-white/30 group-hover:text-white/70 shrink-0" />
                  </button>
                ))}
              </>
            )}
          </div>
        </aside>

        <div className="flex-1 overflow-auto p-2 md:p-6 relative">
          <button
            onClick={() => setShowMobileWidgets(true)}
            className="md:hidden fixed bottom-6 right-6 z-40 bg-blue-600 hover:bg-blue-500 text-white w-14 h-14 rounded-full shadow-2xl shadow-blue-500/40 flex items-center justify-center active:scale-95 transition-transform"
            title={t("Widget hinzufügen")}
          >
            <Plus size={22} />
          </button>

          <div className="mx-auto md:max-w-[1200px]">
            <div
              className={`
                ${orientation === "portrait" ? "max-w-[500px] h-[900px]" : "w-full h-[700px]"}
                mx-auto bg-zinc-900/60 border border-white/10 rounded-2xl shadow-2xl relative overflow-hidden transition-all duration-300
              `}
            >
              <div
                className="absolute inset-x-0 top-0 z-0"
                style={{
                  bottom: "65px",
                  backgroundImage:
                    "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
                  backgroundSize: "calc(100% / 12) 50px",
                }}
              ></div>

              <div
                className="absolute inset-x-0 top-0 p-4 z-10 slider-container editor-grid"
                style={{ bottom: "65px" }}
              >
                <ResponsiveGridLayout
                  className="layout"
                  layouts={{ lg: layout }}
                  breakpoints={{ lg: 0 }}
                  cols={{ lg: 24 }}
                  rowHeight={
                    orientation === "portrait"
                      ? Math.floor((835 - 16 - 368) / 24)
                      : Math.floor((635 - 16 - 368) / 24)
                  }
                  onLayoutChange={onLayoutChange}
                  isDraggable={true}
                  isResizable={true}
                  margin={[16, 16]}
                  compactType={null}
                  preventCollision={true}
                  draggableCancel=".nodrag"
                >
                  {layout.map((w) => {
                    const isActive = activeSettingsId === w.i;
                    const accent = WIDGET_ACCENT[w.type] ?? DEFAULT_ACCENT;
                    return (
                      <div
                        key={w.i}
                        className={`group relative flex flex-col rounded-2xl border shadow-md transition-all overflow-hidden cursor-grab active:cursor-grabbing ${isActive ? "ring-2 ring-blue-500/60" : "hover:ring-1 hover:ring-white/20"}`}
                        style={{
                          backgroundColor: `${accent.hex}12`,
                          backdropFilter: w.bgOpacity > 0 ? "blur(12px)" : "none",
                          borderColor: isActive ? accent.hex : `${accent.hex}40`,
                        }}
                      >
                        <div
                          className="flex items-center gap-2 px-3 py-2.5 md:px-2.5 md:py-2 rounded-t-2xl border-b text-white transition-colors min-h-[40px]"
                          style={{
                             backgroundColor: `${accent.hex}20`,
                             borderColor: `${accent.hex}30`,
                          }}
                        >
                          <span
                             className="w-4 h-4 flex items-center justify-center shrink-0"
                             style={{ color: accent.hex }}
                          >
                            {widgetIconFor(w.type, 14)}
                          </span>
                          <span className="text-xs font-semibold tracking-wide font-sans text-white/95 truncate flex-1">
                            {widgetTitle(w.type, w.label, t)}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveSettingsId(w.i);
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            title={t("Widget-Einstellungen")}
                            className="nodrag shrink-0 w-7 h-7 flex items-center justify-center rounded-md text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                          >
                            <Settings className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Editor placeholder body: low-fidelity skeleton in the
                            accent colour that hints at the actual widget layout
                            (event rows, entity tiles, button grid, etc.). All
                            sizes are percentage-based so it scales to any widget
                            size on the grid. Custom modules without a matching
                            skeleton fall through to a single centred icon. */}
                        <div className="flex-1 pointer-events-none overflow-hidden">
                          {widgetSkeletonFor(w.type, accent.hex) ?? (
                            <div
                              className="w-full h-full flex items-center justify-center"
                              style={{ color: accent.hex, opacity: 0.15 }}
                            >
                              {widgetIconFor(w.type, 56)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </ResponsiveGridLayout>
              </div>

              {wallpaper.showMetadata !== false && (
                <div
                  className={`absolute bottom-0 inset-x-0 h-[65px] z-20 pointer-events-none flex flex-row items-center justify-between px-6 transition-all ${(wallpaper.metaBgOpacity ?? 40) > 0 ? "backdrop-blur-md border-t border-white/10" : ""}`}
                  style={{ backgroundColor: `rgba(0,0,0,${(wallpaper.metaBgOpacity ?? 40) / 100})` }}
                >
                  <div className="flex items-center gap-2">
                    {wallpaper.showTimer !== false && (
                      <div className="w-4 h-4 rounded-full border-4 border-white/20"></div>
                    )}
                    <span className="text-white/30 text-xs font-semibold pl-2 drop-shadow-md">
                      {t("Metadaten Platzhalter")}
                    </span>
                  </div>
                  <div
                    className="text-right text-[10px] uppercase tracking-[0.15em] leading-relaxed font-medium drop-shadow-md"
                    style={{
                      color: wallpaper.metaColor || "rgba(255,255,255,0.5)",
                      textShadow: wallpaper.metaTextShadowBlur
                        ? `0 0 ${wallpaper.metaTextShadowBlur}px rgba(0,0,0,0.8)`
                        : "none",
                      fontFamily: `${wallpaper.metaFontFamily || "Inter"}, sans-serif`,
                    }}
                  >
                    {wallpaper.metaShowDate !== false && (
                      <>
                        {t("07. Juli 2025")}
                        <br />
                      </>
                    )}
                    {wallpaper.metaShowLocation !== false && (
                      <>
                        {t("München")}
                        <br />
                      </>
                    )}
                    {wallpaper.metaShowCamera !== false && <>{t("Shot on iPhone")}</>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {activeSettingsId && (() => {
        const activeWidget = layout.find((w) => w.i === activeSettingsId);
        if (!activeWidget) return null;
        return (
          <div
            className="fixed inset-0 z-[60] flex items-stretch md:items-center md:justify-center bg-black/60 backdrop-blur-sm md:bg-black/40 md:backdrop-blur-none md:p-6"
            onClick={() => setActiveSettingsId(null)}
          >
            <div
              className="w-full h-full md:w-[760px] md:h-auto md:max-h-[88vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <InspectorPanel
                activeWidget={activeWidget}
                layout={layout}
                onClose={() => setActiveSettingsId(null)}
                updateLayoutGrid={updateLayoutGrid}
                updateOpacity={updateOpacity}
                updateConfig={updateConfig}
                updateLabel={updateLabel}
                copyWidgetToClipboard={copyWidgetToClipboard}
                removeWidget={removeWidget}
                citySearchQuery={citySearchQuery}
                citySearchResults={citySearchResults}
                isSearchingCity={isSearchingCity}
                searchCity={searchCity}
                setCitySearchResults={setCitySearchResults}
                setCitySearchQuery={setCitySearchQuery}
                buttonTab={buttonTab}
                setButtonTab={setButtonTab}
              />
            </div>
          </div>
        );
      })()}

      {showWallpaperModal && (
        <WallpaperSettingsModal
          variant="modal"
          onClose={() => setShowWallpaperModal(false)}
          wallpaper={wallpaper}
          setWallpaper={setWallpaper}
          webdavFolders={webdavFolders}
          fetchWebdavFolders={fetchWebdavFolders}
          isFetchingFolders={isFetchingFolders}
          webdavError={webdavError}
          immichAlbums={immichAlbums}
          fetchImmichAlbums={fetchImmichAlbums}
          isFetchingAlbums={isFetchingAlbums}
          immichError={immichError}
        />
      )}

      {showMobileWidgets && (
        <div
          className="md:hidden fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm"
          onClick={() => setShowMobileWidgets(false)}
        >
          <div
            className="w-full bg-zinc-900 border-t border-white/10 rounded-t-3xl p-4 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1 rounded-full bg-white/20 mx-auto mb-4" />
            <div className="text-[10px] uppercase tracking-[0.15em] text-white/40 px-2 mb-3">
              {t("Widget hinzufügen")}
            </div>
            <div className="space-y-1">
              {WIDGET_CATALOG.map((w) => (
                <button
                  key={w.type}
                  onClick={() => {
                    addWidget(w.type);
                    setShowMobileWidgets(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-white/80 hover:text-white active:bg-white/10 transition-colors min-h-[48px]"
                >
                  <span className="w-7 flex justify-center text-white/60">{w.icon}</span>
                  <span className="flex-1 text-left truncate">{t(w.label)}</span>
                  <Plus size={15} className="text-white/30" />
                </button>
              ))}
              {customModules.map((m) => (
                <button
                  key={m.type}
                  onClick={() => {
                    addWidget(m.type);
                    setShowMobileWidgets(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-white/80 hover:text-white active:bg-white/10 transition-colors min-h-[48px]"
                >
                  <span className="w-7 flex justify-center text-lg leading-none">{m.iconEmoji}</span>
                  <span className="flex-1 text-left truncate">{m.label}</span>
                  <Plus size={15} className="text-white/30" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </>
  );
}
