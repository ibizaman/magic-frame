"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useHaLiveStates } from "@/lib/ha/useHaLiveStates";

// Zentrale Hell/Dunkel-Steuerung pro View. Widgets setzen ihr cardTheme
// entweder fest ("dark"/"light") oder lassen es offen — dann greift diese
// Auflösung. Standard ist "dark", damit sich für bestehende Views
// NICHTS ändert, solange niemand den zentralen Schalter anfasst.

export type ViewThemeMode = "dark" | "light" | "sun" | "time" | "entity";

export type ViewThemeSettings = {
  themeMode?: ViewThemeMode;
  /** sun-Modus: sun.sun; entity-Modus: frei wählbar */
  themeEntity?: string;
  /** Zustand, der "hell" bedeutet (Standard: above_horizon) */
  themeLightState?: string;
  /** Zeitfenster für "time" — und Sicherheitsnetz, wenn die Entität fehlt */
  themeLightFrom?: string; // "07:00"
  themeLightTo?: string; // "20:00"
};

export const DEFAULT_SUN_ENTITY = "sun.sun";
export const DEFAULT_LIGHT_STATE = "above_horizon";
const DEFAULT_FROM = "07:00";
const DEFAULT_TO = "20:00";

const ViewThemeContext = createContext<"dark" | "light">("dark");

/** Aufgelöstes Theme des umgebenden Views ("dark", wenn kein Provider da ist). */
export function useViewTheme(): "dark" | "light" {
  return useContext(ViewThemeContext);
}

// "07:30" → 450 Minuten. Ungültiges → null.
function toMinutes(v: string | undefined, fallback: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec((v || fallback).trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

function isLightByClock(now: Date, s: ViewThemeSettings): boolean {
  const from = toMinutes(s.themeLightFrom, DEFAULT_FROM);
  const to = toMinutes(s.themeLightTo, DEFAULT_TO);
  if (from === null || to === null) return false;
  const cur = now.getHours() * 60 + now.getMinutes();
  // Normalfall from < to (hell tagsüber); bei Überschlag über Mitternacht
  // gilt das Fenster außen herum.
  return from <= to ? cur >= from && cur < to : cur >= from || cur < to;
}

/**
 * Löst die zentrale Einstellung zu "dark" | "light" auf.
 * - sun/entity: folgt einer HA-Entität über die bestehende SSE-Leitung.
 *   Fehlt die Entität (oder ist sie noch nicht da), greift das Zeitfenster
 *   als Sicherheitsnetz — so bleibt der Frame nie in der falschen Optik.
 */
export function useResolvedViewTheme(settings?: ViewThemeSettings | null): "dark" | "light" {
  const s = settings ?? {};
  const mode: ViewThemeMode = s.themeMode ?? "dark";
  const followsEntity = mode === "sun" || mode === "entity";
  const entityId = (mode === "sun" ? s.themeEntity || DEFAULT_SUN_ENTITY : s.themeEntity || "").trim();

  const live = useHaLiveStates(followsEntity && entityId ? [entityId] : [], followsEntity && Boolean(entityId));
  const entityState = followsEntity ? live.states[entityId]?.state ?? "" : "";

  // Uhr nur ticken lassen, wenn sie wirklich gebraucht wird (Zeitmodus oder
  // Entität noch ohne Wert) — sonst rendert der ganze View jede Minute neu.
  const needsClock = mode === "time" || (followsEntity && !entityState);
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    if (!needsClock) return;
    setNow(new Date());
    const iv = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(iv);
  }, [needsClock]);

  if (mode === "light") return "light";
  if (mode === "dark") return "dark";
  if (mode === "time") return isLightByClock(now, s) ? "light" : "dark";
  // sun / entity
  if (!entityState) return isLightByClock(now, s) ? "light" : "dark"; // Sicherheitsnetz
  const lightState = (s.themeLightState || DEFAULT_LIGHT_STATE).trim().toLowerCase();
  return entityState.trim().toLowerCase() === lightState ? "light" : "dark";
}

/** Stellt das aufgelöste Theme für alle Widgets darunter bereit. */
export function ViewThemeScope({ settings, children }: {
  settings?: ViewThemeSettings | null;
  children: React.ReactNode;
}) {
  const resolved = useResolvedViewTheme(settings);
  return <ViewThemeContext.Provider value={resolved}>{children}</ViewThemeContext.Provider>;
}

/** Für Editor-Vorschauen, die das Theme bereits kennen. */
export function ViewThemeValue({ value, children }: {
  value: "dark" | "light";
  children: React.ReactNode;
}) {
  return <ViewThemeContext.Provider value={value}>{children}</ViewThemeContext.Provider>;
}
