"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { EN } from "./en";

export type Locale = "de" | "en";

type LocaleCtx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  /** Übersetzt — Key ist der deutsche Text. Fehlt eine Übersetzung → Deutsch. */
  t: (de: string) => string;
};

const Ctx = createContext<LocaleCtx>({
  locale: "de",
  setLocale: () => {},
  t: (de) => de,
});

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("de");

  useEffect(() => {
    const saved = localStorage.getItem("mf-lang");
    if (saved === "en" || saved === "de") setLocaleState(saved);
  }, []);

  // Auch <html lang> aktualisieren (a11y / Browser-Hints)
  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem("mf-lang", l);
    } catch {}
  };

  const t = (de: string) => (locale === "en" ? EN[de] ?? de : de);

  return <Ctx.Provider value={{ locale, setLocale, t }}>{children}</Ctx.Provider>;
}

export const useLocale = () => useContext(Ctx);
/** Nur die Übersetzungsfunktion. Außerhalb des Providers → Identität (Deutsch). */
export const useT = () => useContext(Ctx).t;
