"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useT } from "@/lib/i18n/LocaleProvider";

/**
 * Aufklappbare Inspector-Sektion. Kopfzeile (Titel + optionale Ein-Zeilen-
 * Beschreibung für Neulinge) + Klapp-Chevron; Inhalt zeigt sich nur wenn offen.
 * `defaultOpen` steuert den Startzustand — vertraute Sektionen offen lassen,
 * neue/erweiterte einklappen, damit Bestandsuser nichts vermissen.
 * Wiederverwendbar für alle Widget-Inspektoren.
 */
export default function CollapsibleSection({
  title,
  subtitle,
  defaultOpen = true,
  accent = "var(--mf-fg)",
  icon,
  headerRight,
  children,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  accent?: string;
  /** Kleines Icon links vom Titel — macht lange Inspektoren scanbar. */
  icon?: React.ReactNode;
  headerRight?: React.ReactNode; // z. B. ein Ein/Aus-Schalter — togglet die Sektion NICHT
  children: React.ReactNode;
}) {
  const t = useT();
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-[var(--mf-bdr)]/10 mt-4 pt-3 first:border-t-0 first:mt-0 first:pt-0">
      <div className="w-full flex items-center gap-2.5 py-1">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex-1 min-w-0 group text-left flex items-center gap-2.5"
        >
          {icon && (
            <span
              className="shrink-0 w-7 h-7 rounded-lg border flex items-center justify-center transition-colors"
              // Hex-Akzent → getönte Fläche; CSS-Variable → neutrale Fläche
              // (var(--x)1a wäre ungültiges CSS).
              style={accent.startsWith("#")
                ? { color: accent, backgroundColor: `${accent}1a`, borderColor: `${accent}33` }
                : { color: "var(--mf-fg)", backgroundColor: "rgba(127,127,127,0.10)", borderColor: "rgba(127,127,127,0.20)" }}
            >
              {icon}
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--mf-fg)]/55 group-hover:text-[var(--mf-fg)]/85 transition-colors">
              {t(title)}
            </span>
            {subtitle && (
              <span className="block text-[11px] text-[var(--mf-fg)]/35 mt-0.5 leading-snug">{t(subtitle)}</span>
            )}
          </span>
        </button>
        {headerRight && <div className="shrink-0">{headerRight}</div>}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="shrink-0 group"
          aria-label={t("Ein-/ausklappen")}
        >
          <ChevronDown
            size={15}
            className={`text-[var(--mf-fg)]/40 group-hover:text-[var(--mf-fg)]/70 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </button>
      </div>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}
