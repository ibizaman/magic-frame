"use client";
import * as React from "react";

/**
 * Browser-Runtime für Custom-Module.
 *
 * Module sind Plain-JS-Bundles, die als <script>-Tag in die Live-View
 * injiziert werden. Beim Laden rufen sie `window.MagicFrame.registerWidget({...})`
 * auf und werden in der globalen Registry abgelegt. Der CustomWidget-Wrapper
 * findet das Modul über die `type` und ruft seine `render`-Funktion.
 *
 * Modul-Author bekommt ein kleines API-Object (`ctx`) übergeben, das nur
 * bewusst exponierte React-Primitives enthält — kein direkter React-Import
 * im Modul nötig.
 */

export type ModuleCtx = {
  // React-Primitives für JSX-loses Schreiben (oder via h-Function vom esbuild-Helper)
  createElement: typeof React.createElement;
  Fragment: typeof React.Fragment;
  useState: typeof React.useState;
  useEffect: typeof React.useEffect;
  useRef: typeof React.useRef;
  useMemo: typeof React.useMemo;
  useCallback: typeof React.useCallback;
  // Convenience: gibt das geparste config-Objekt zurück (passthrough)
  config: Record<string, any>;
  dashboardId?: string;
  // Helper für API-Calls aus dem Modul
  fetch: typeof fetch;
};

export type RegisteredModule = {
  type: string;
  /** Liefert React-Element. Wird mit (ctx) gecalled. */
  render: (ctx: ModuleCtx) => React.ReactNode;
  /** Optional eigener Cleanup (rein informativ — React-Hooks sollten Cleanup machen). */
  dispose?: () => void;
};

declare global {
  interface Window {
    MagicFrame?: {
      registerWidget: (mod: RegisteredModule) => void;
      version: string;
      _modules?: Map<string, RegisteredModule>;
      _loadCallbacks?: Map<string, Array<() => void>>;
    };
  }
}

/**
 * Initialisiert die globale Registry. Idempotent — kann mehrfach gecalled werden.
 */
export function ensureRuntime(): NonNullable<Window["MagicFrame"]> {
  if (typeof window === "undefined") {
    throw new Error("ensureRuntime() only callable in browser");
  }
  if (!window.MagicFrame) {
    const modules = new Map<string, RegisteredModule>();
    const cbs = new Map<string, Array<() => void>>();
    window.MagicFrame = {
      version: "1.0",
      _modules: modules,
      _loadCallbacks: cbs,
      registerWidget(mod: RegisteredModule) {
        if (!mod || typeof mod.type !== "string" || typeof mod.render !== "function") {
          console.warn("[MagicFrame] registerWidget(): ungültiges Modul-Objekt", mod);
          return;
        }
        modules.set(mod.type, mod);
        const list = cbs.get(mod.type);
        if (list) {
          list.forEach((cb) => {
            try {
              cb();
            } catch {}
          });
          cbs.delete(mod.type);
        }
      },
    };
  }
  return window.MagicFrame;
}

/** Lädt das Bundle eines Custom-Moduls (idempotent: kein zweites Script-Tag). */
const loadedBundles = new Set<string>();
const loadingBundles = new Map<string, Promise<void>>();

export function loadModuleBundle(type: string): Promise<void> {
  ensureRuntime();
  if (loadedBundles.has(type)) return Promise.resolve();
  const inFlight = loadingBundles.get(type);
  if (inFlight) return inFlight;
  const p = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `/api/modules/${encodeURIComponent(type)}/bundle.js?v=${Date.now()}`;
    s.async = true;
    s.onload = () => {
      loadedBundles.add(type);
      resolve();
    };
    s.onerror = () => reject(new Error(`Konnte Custom-Modul ${type} nicht laden.`));
    document.head.appendChild(s);
  });
  loadingBundles.set(type, p);
  return p;
}

/** Wartet bis das Modul in der Registry ist (Bundle hat sich registriert). */
function waitForRegistration(type: string, timeoutMs = 5000): Promise<RegisteredModule> {
  const rt = ensureRuntime();
  const existing = rt._modules!.get(type);
  if (existing) return Promise.resolve(existing);
  return new Promise((resolve, reject) => {
    const list = rt._loadCallbacks!.get(type) ?? [];
    let done = false;
    const cb = () => {
      if (done) return;
      done = true;
      const m = rt._modules!.get(type);
      if (m) resolve(m);
      else reject(new Error(`Modul ${type} hat sich nicht registriert`));
    };
    list.push(cb);
    rt._loadCallbacks!.set(type, list);
    setTimeout(() => {
      if (done) return;
      done = true;
      reject(new Error(`Timeout: Modul ${type} hat sich in ${timeoutMs}ms nicht registriert`));
    }, timeoutMs);
  });
}

/**
 * React-Wrapper für Custom-Module. Liegt im Live-View-Render an Stelle eines
 * bekannten Widgets — lädt Bundle + ruft `render(ctx)` des Moduls.
 */
export function CustomWidget({
  type,
  config,
  dashboardId,
}: {
  type: string;
  config?: Record<string, any>;
  dashboardId?: string;
}) {
  const [mod, setMod] = React.useState<RegisteredModule | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    loadModuleBundle(type)
      .then(() => waitForRegistration(type))
      .then((m) => {
        if (!cancelled) setMod(m);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ?? String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [type]);

  const ctx: ModuleCtx = React.useMemo(
    () => ({
      createElement: React.createElement,
      Fragment: React.Fragment,
      useState: React.useState,
      useEffect: React.useEffect,
      useRef: React.useRef,
      useMemo: React.useMemo,
      useCallback: React.useCallback,
      config: config ?? {},
      dashboardId,
      fetch: (typeof window !== "undefined" ? window.fetch.bind(window) : fetch) as typeof fetch,
    }),
    [config, dashboardId],
  );

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center text-xs text-red-400 p-2 text-center">
        ⚠ {error}
      </div>
    );
  }
  if (!mod) {
    return (
      <div className="w-full h-full flex items-center justify-center text-xs opacity-40">
        Lade {type}…
      </div>
    );
  }
  try {
    return <>{mod.render(ctx)}</>;
  } catch (e: any) {
    return (
      <div className="w-full h-full flex items-center justify-center text-xs text-red-400 p-2 text-center">
        ⚠ Render-Fehler: {e?.message ?? String(e)}
      </div>
    );
  }
}
