"use client";

import { useEffect, useRef, useState } from "react";
import { Clock, CloudSun, Calendar, Power, Bell, Timer, MessageSquare, ShoppingCart, ClipboardList, Code2, FileCode, CheckCircle2, ChevronDown, Upload, Trash2, Eye, EyeOff, Zap } from "lucide-react";
import { useT } from "@/lib/i18n/LocaleProvider";

type CustomModule = {
  id: string;
  type: string;
  label: string;
  description: string;
  iconEmoji: string;
  version: string;
  manifest: {
    type: string;
    label: string;
    description?: string;
    iconEmoji?: string;
    version?: string;
    fields?: Array<{ key: string; label: string; type: string; default?: any; help?: string }>;
    author?: string;
    homepage?: string;
  };
  bundleSize: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

const INSTALLED = [
  { key: "clock", label: "Uhr", desc: "Zeit, Datum, optional Mini-Wetter.", icon: <Clock size={16} />, accent: "text-blue-300 bg-blue-500/10 border-blue-500/30" },
  { key: "weather", label: "Wetter", desc: "Open-Meteo / DWD / OWM / HA, inkl. Vorhersage & Icons.", icon: <CloudSun size={16} />, accent: "text-cyan-300 bg-cyan-500/10 border-cyan-500/30" },
  { key: "calendar", label: "Kalender", desc: "iCal, Google & Microsoft-Feeds mit Farb-Coding.", icon: <Calendar size={16} />, accent: "text-violet-300 bg-violet-500/10 border-violet-500/30" },
  { key: "ha_entity", label: "HA Entity", desc: "Home-Assistant-Entities mit Regeln + Live-WS.", icon: <Zap size={16} />, accent: "text-green-300 bg-green-500/10 border-green-500/30" },
  { key: "buttons", label: "Buttons", desc: "Tap-Tiles mit HA-Services / Webhook-Actions.", icon: <Power size={16} />, accent: "text-amber-300 bg-amber-500/10 border-amber-500/30" },
  { key: "notifications", label: "HA Benachrichtigungen", desc: "Regelbasierte Push-Kacheln aus HA.", icon: <Bell size={16} />, accent: "text-orange-300 bg-orange-500/10 border-orange-500/30" },
  { key: "timer", label: "Timer", desc: "Live-Countdown, per Companion-App oder Siri startbar.", icon: <Timer size={16} />, accent: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30" },
  { key: "messages", label: "Nachrichten", desc: "Quick-Post aus der Companion-App mit TTL.", icon: <MessageSquare size={16} />, accent: "text-fuchsia-300 bg-fuchsia-500/10 border-fuchsia-500/30" },
  { key: "shopping", label: "Einkaufsliste", desc: "Gemeinsame Familienliste, sync mit Apple-Erinnerungen.", icon: <ShoppingCart size={16} />, accent: "text-yellow-300 bg-yellow-500/10 border-yellow-500/30" },
  { key: "todos", label: "Todos", desc: "Aufgaben mit Assignee + Due-Date, Apple-Reminders-Sync.", icon: <ClipboardList size={16} />, accent: "text-indigo-300 bg-indigo-500/10 border-indigo-500/30" },
];

export default function ModulesPage() {
  const t = useT();
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[1000px] mx-auto px-8 py-10">
        <div className="mb-8">
          <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/40 mb-2">
            {t("Module")}
          </div>
          <h1 className="text-3xl font-semibold">{t("Installierte Module")}</h1>
          <p className="text-white/50 mt-2 max-w-xl text-sm">
            {t("Diese Widget-Typen stehen dir zur Verfügung. Eigene Custom-Module kannst du unten direkt als JS-Bundle hochladen — Hot-Loading, kein Container-Restart nötig.")}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-10">
          {INSTALLED.map((m) => (
            <div
              key={m.key}
              className="bg-zinc-900/60 border border-white/10 rounded-2xl p-4"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${m.accent}`}>
                  {m.icon}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-green-400 bg-green-500/10 border border-green-500/30 px-2 py-0.5 rounded">
                  {t("Installiert")}
                </div>
              </div>
              <div className="font-semibold">{t(m.label)}</div>
              <p className="text-xs text-white/50 mt-1 leading-relaxed">
                {t(m.desc)}
              </p>
            </div>
          ))}
        </div>

        <CustomModulesSection />
        <ModuleDevGuide />
      </div>
    </div>
  );
}

/* ---------- Custom-Module Upload + Liste ---------- */

function CustomModulesSection() {
  const t = useT();
  const [modules, setModules] = useState<CustomModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const [showRaw, setShowRaw] = useState<string | null>(null);
  const manifestInputRef = useRef<HTMLInputElement>(null);
  const bundleInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/modules", { cache: "no-store" });
      const d = await r.json();
      setModules(d.modules ?? []);
    } catch {}
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  function flash(kind: "ok" | "err", m: string) {
    setMsg({ kind, msg: m });
    setTimeout(() => setMsg(null), 5000);
  }

  async function readFileText(f: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result ?? ""));
      r.onerror = () => reject(new Error("Konnte Datei nicht lesen."));
      r.readAsText(f);
    });
  }

  async function handleUpload() {
    const mFile = manifestInputRef.current?.files?.[0];
    const bFile = bundleInputRef.current?.files?.[0];
    if (!mFile || !bFile) {
      flash("err", t("Bitte module.json UND bundle.js auswählen."));
      return;
    }
    setBusy(true);
    try {
      const [manifestStr, bundleJs] = await Promise.all([readFileText(mFile), readFileText(bFile)]);
      let manifest: any;
      try {
        manifest = JSON.parse(manifestStr);
      } catch {
        throw new Error(t("module.json ist kein valides JSON."));
      }
      const r = await fetch("/api/admin/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manifest, bundleJs }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Upload fehlgeschlagen.");
      flash(
        "ok",
        t("Modul '{x}' hochgeladen ({y} Bytes). Im View-Editor verfügbar.").replace("{x}", d.module.label).replace("{y}", String(d.module.bundleSize)),
      );
      if (manifestInputRef.current) manifestInputRef.current.value = "";
      if (bundleInputRef.current) bundleInputRef.current.value = "";
      load();
    } catch (e: any) {
      flash("err", e.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleEnabled(m: CustomModule) {
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/modules/${m.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !m.enabled }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "failed");
      load();
    } catch (e: any) {
      flash("err", e.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(m: CustomModule) {
    if (!confirm(t("Modul '{x}' wirklich löschen? Views die es nutzen brechen.").replace("{x}", m.label))) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/modules/${m.id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("failed");
      flash("ok", t("Gelöscht."));
      load();
    } catch (e: any) {
      flash("err", e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-6 mb-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-300">
          <Upload size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">{t("Custom-Module")}</h2>
          <p className="text-xs text-white/50 mt-0.5">
            {t("Hochgeladen + sofort aktiv im View-Editor. Build aus deinem Modul-Source mit")} <code className="bg-white/5 px-1 rounded">node scripts/build-module.mjs &lt;file&gt;</code> {t("— Doku in")} <code className="bg-white/5 px-1 rounded">docs/custom-modules.md</code>.
          </p>
        </div>
      </div>

      {msg && (
        <div className={`mb-3 text-sm rounded-lg p-3 border ${msg.kind === "ok" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-red-500/10 border-red-500/30 text-red-300"}`}>
          {msg.msg}
        </div>
      )}

      {/* Upload-Form */}
      <div className="bg-black/30 border border-white/10 rounded-lg p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-[11px] text-white/50 mb-1">module.json (Manifest)</label>
            <input
              ref={manifestInputRef}
              type="file"
              accept="application/json,.json"
              className="block w-full text-xs text-white/70 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-white/10 file:text-white/80 file:text-xs hover:file:bg-white/15"
            />
          </div>
          <div>
            <label className="block text-[11px] text-white/50 mb-1">bundle.js</label>
            <input
              ref={bundleInputRef}
              type="file"
              accept="text/javascript,application/javascript,.js"
              className="block w-full text-xs text-white/70 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-white/10 file:text-white/80 file:text-xs hover:file:bg-white/15"
            />
          </div>
        </div>
        <button
          onClick={handleUpload}
          disabled={busy}
          className="bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg px-4 h-9 disabled:opacity-40"
        >
          {busy ? t("Lade hoch…") : t("Hochladen")}
        </button>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="text-sm text-white/40">{t("Lade…")}</div>
      ) : modules.length === 0 ? (
        <p className="text-sm text-white/50 bg-black/20 border border-dashed border-white/15 rounded-lg p-4 text-center">
          {t("Noch keine Custom-Module hochgeladen. Beispiel:")} <code className="bg-white/10 px-1 rounded">examples/modules/hello/</code>
        </p>
      ) : (
        <ul className="space-y-2">
          {modules.map((m) => (
            <li
              key={m.id}
              className={`border rounded-lg p-3 ${m.enabled ? "bg-emerald-500/5 border-emerald-500/20" : "bg-black/30 border-white/10"}`}
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl shrink-0 leading-none mt-0.5">{m.iconEmoji}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm truncate">{m.label}</span>
                    <code className="text-[10px] font-mono text-white/40">{m.type}</code>
                    <span className="text-[10px] uppercase tracking-wider text-white/40">v{m.version}</span>
                    {!m.enabled && (
                      <span className="text-[10px] uppercase tracking-wider bg-white/10 px-1.5 py-0.5 rounded text-white/60">{t("aus")}</span>
                    )}
                  </div>
                  {m.description && (
                    <p className="text-xs text-white/50 mt-0.5">{m.description}</p>
                  )}
                  <div className="text-[10px] text-white/40 mt-1">
                    {m.manifest.fields?.length ?? 0} {t("Felder")} · {m.bundleSize} {t("Bytes")} · {t("hochgeladen")} {new Date(m.createdAt).toLocaleDateString()}
                  </div>
                  {showRaw === m.id && (
                    <pre className="mt-2 text-[10px] bg-black/50 border border-white/10 rounded p-2 overflow-x-auto font-mono">
                      {JSON.stringify(m.manifest, null, 2)}
                    </pre>
                  )}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    onClick={() => toggleEnabled(m)}
                    disabled={busy}
                    title={m.enabled ? t("Deaktivieren") : t("Aktivieren")}
                    className={`p-1.5 rounded-md ${m.enabled ? "bg-white/5 hover:bg-white/10 text-white/70" : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300"}`}
                  >
                    {m.enabled ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button
                    onClick={() => setShowRaw((cur) => (cur === m.id ? null : m.id))}
                    title="Manifest"
                    className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-white/70"
                  >
                    <FileCode size={14} />
                  </button>
                  <button
                    onClick={() => remove(m)}
                    disabled={busy}
                    title={t("Löschen")}
                    className="p-1.5 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-300"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- Eigenes Modul bauen ---------- */

const STEPS: { file: string; what: string }[] = [
  {
    file: "src/components/widgets/<Name>Widget.tsx",
    what: "Die React-Komponente. \"use client\", Props { config, dashboardId? }, Größen in em.",
  },
  {
    file: "src/app/view/[id]/page.tsx",
    what: "Live-Registry: import + eine Zeile in renderWidgetContent (rendert auf dem Display).",
  },
  {
    file: "src/app/editor/(app)/views/[id]/page.tsx",
    what: "Editor-Katalog: WIDGET_CATALOG, WIDGET_ACCENT, widgetIconFor, addWidget.",
  },
  {
    file: "src/lib/widgets/schemas.ts",
    what: "Config + Union-Mitglied (z.literal). PFLICHT — ohne Schema schlägt das Speichern fehl!",
  },
  {
    file: "src/app/editor/_inspectors/<Name>Inspector.tsx",
    what: "Einstellungen rechts + Routing in InspectorPanel.tsx (ContentTab).",
  },
  {
    file: "src/app/editor/(app)/views/page.tsx",
    what: "WIDGET_META — Farbe + Icon im Views-Listen-Thumbnail (optional).",
  },
  {
    file: "src/app/editor/(app)/modules/page.tsx",
    what: "INSTALLED-Liste — damit das Modul hier als „Installiert\" auftaucht (optional).",
  },
];

const CODE_EXAMPLE = `// 1) src/components/widgets/HelloWidget.tsx
"use client";
export default function HelloWidget({ config }: { config?: any }) {
  const name = config?.name || "Welt";
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-[0.3em]">
      <div className="text-[1.4em] font-bold">Hallo, {name}!</div>
      <div className="text-[0.7em] opacity-60">Mein erstes Modul</div>
    </div>
  );
}

// 2) view/[id]/page.tsx — Live-Registry
import HelloWidget from "@/components/widgets/HelloWidget";
if (type === 'HelloWidget.tsx')
  return <HelloWidget config={config} dashboardId={dashboardId} />;

// 3) views/[id]/page.tsx — Katalog
{ type: "HelloWidget.tsx", label: "Hallo", icon: <Smile size={16} /> }

// 4) lib/widgets/schemas.ts — PFLICHT (sonst kein Speichern)
const helloConfig = baseConfig.extend({ name: z.string().optional() }).passthrough();
z.object({ type: z.literal("HelloWidget.tsx"), config: helloConfig })
  .merge(commonWidgetFields()),

// 5) InspectorPanel.tsx — Einstellungen
{activeWidget.type === "HelloWidget.tsx" &&
  <HelloInspector widget={activeWidget} updateConfig={updateConfig} />}`;

function ModuleDevGuide() {
  const t = useT();
  return (
    <details className="bg-zinc-900/60 border border-white/10 rounded-2xl mt-2 group overflow-hidden">
      <summary className="flex items-center gap-4 p-6 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
        <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-300 shrink-0">
          <Code2 size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-lg">{t("Eigenes Modul bauen")}</h2>
          <p className="text-sm text-white/50 mt-1 max-w-2xl">
            {t("Ein Modul ist ein Widget-Typ (Uhr, Wetter, …). Schreib eine")}
            <code className="text-white/70 bg-white/5 px-1 rounded mx-1">.tsx</code>{t("-Komponente und trag sie an 7 Stellen ein. Aufklappen für die Anleitung.")}
          </p>
        </div>
        <ChevronDown size={18} className="text-white/40 shrink-0 transition-transform group-open:rotate-180" />
      </summary>

      <div className="px-6 pb-6">
      <p className="text-sm text-white/50 mb-5 max-w-2xl">
        {t("Die")} <strong>{t("Typ-ID")}</strong> {t("ist immer der Dateiname, z.B.")}{" "}
        <code className="text-white/70 bg-white/5 px-1 rounded">HelloWidget.tsx</code>.
      </p>

      <ol className="space-y-2 mb-6">
        {STEPS.map((s, i) => (
          <li
            key={i}
            className="flex items-start gap-3 bg-black/30 border border-white/10 rounded-lg px-3 py-2.5"
          >
            <span className="w-6 h-6 rounded-md bg-purple-500/15 border border-purple-500/30 text-purple-200 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
              {i + 1}
            </span>
            <div className="min-w-0">
              <code className="text-[12px] font-mono text-cyan-300 break-all">{s.file}</code>
              <p className="text-[12px] text-white/55 mt-0.5 leading-snug">{t(s.what)}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-black/40 border border-white/10 rounded-xl p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-white/70">
            <CheckCircle2 size={14} className="text-emerald-300" /> {t("Konventionen")}
          </div>
          <ul className="text-[12px] text-white/55 space-y-1.5 leading-snug list-disc pl-4">
            <li><strong className="text-white/70">{t("Größen in")} <code className="bg-white/10 px-1 rounded">em</code></strong> {t("— erbt die Editor-Schriftgröße und skaliert mit „Responsive Auto-Scale“ (cqmin).")}</li>
            <li><code className="bg-white/10 px-1 rounded">fontFamily</code>, <code className="bg-white/10 px-1 rounded">color</code>, <code className="bg-white/10 px-1 rounded">textShadow</code> {t("kommen vom Wrapper — nicht selbst hart setzen.")}</li>
            <li>{t("Hintergrund/Glas regelt")} <code className="bg-white/10 px-1 rounded">bgOpacity</code> {t("automatisch.")}</li>
            <li>{t("Live-Updates via")} <code className="bg-white/10 px-1 rounded">socket.io-client</code> {t("+ Server-Event (siehe Timer-Widget).")}</li>
            <li>{t("Inspector mit Karten-Listen → Typ in")} <code className="bg-white/10 px-1 rounded">NO_MULTICOL_CONTENT</code> {t("aufnehmen.")}</li>
          </ul>
        </div>

        <details className="bg-black/40 border border-white/10 rounded-xl p-3 group">
          <summary className="flex items-center gap-2 text-xs font-semibold text-white/70 cursor-pointer select-none">
            <FileCode size={14} className="text-cyan-300" /> {t("Minimal-Beispiel „HelloWidget“ anzeigen")}
          </summary>
          <pre className="mt-3 text-[10.5px] leading-relaxed font-mono text-white/70 overflow-x-auto whitespace-pre [&::-webkit-scrollbar]:h-1.5">
{CODE_EXAMPLE}
          </pre>
        </details>
      </div>

      <p className="text-[11px] text-white/40 mt-4 leading-relaxed">
        {t("Vollständige Referenz inkl. Props-Contract, Live-Sync, Checkliste und dem geplanten Market-Manifest:")}{" "}
        <code className="text-white/60 bg-white/5 px-1 rounded">docs/module-development.md</code>{" "}
        {t("im Repo. Einfachstes Vorbild im Code:")}{" "}
        <code className="text-white/60 bg-white/5 px-1 rounded">src/components/widgets/ClockWidget.tsx</code>.
      </p>
      </div>
    </details>
  );
}
