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
  headerRight,
  children,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  accent?: string;
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
          className="flex-1 min-w-0 group text-left"
        >
          <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--mf-fg)]/55 group-hover:text-[var(--mf-fg)]/85 transition-colors">
            {t(title)}
          </div>
          {subtitle && (
            <div className="text-[11px] text-[var(--mf-fg)]/35 mt-0.5 leading-snug">{t(subtitle)}</div>
          )}
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
