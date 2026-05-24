"use client";

import React from "react";
import { Trash2, ChevronDown } from "lucide-react";
import { useT } from "@/lib/i18n/LocaleProvider";

/**
 * Einklappbare Karte für Inspektor-Listen (Regeln, Entities, …).
 * Standard: zugeklappt — der Aufrufer hält `open`-State (i.d.R. null = alle zu).
 */
export default function AccordionCard({
  open,
  onToggle,
  title,
  dotColor,
  onDelete,
  headerExtra,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  title: string;
  dotColor?: string;
  onDelete?: () => void;
  /** Zusätzliche Header-Buttons (z.B. nach oben/unten verschieben) */
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
}) {
  const t = useT();
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 p-3">
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
        >
          {dotColor && (
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: dotColor }}
            />
          )}
          <span className="text-sm font-medium text-white truncate">{title}</span>
          <ChevronDown
            size={15}
            className={`shrink-0 text-white/40 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
        {headerExtra}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="shrink-0 text-white/40 hover:text-red-500 p-1"
            title={t("Löschen")}
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>
      {open && (
        <div className="px-4 pb-4 border-t border-white/5 pt-3">{children}</div>
      )}
    </div>
  );
}
