"use client";

import React, { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { Search, X } from "lucide-react";
import { useT } from "@/lib/i18n/LocaleProvider";

type IconPickerProps = {
  value: string;
  onChange: (iconId: string) => void;
  placeholder?: string;
  quickPicks?: string[];
  label?: string;
  /**
   * Default icon-set prefix to filter the Iconify search to.
   * - "mdi" — Material Design Icons (matches Home Assistant's conventions)
   * - "lucide" — Lucide line icons (matches the rest of Magic Frame's UI)
   * - undefined — search across all sets
   * The user can switch between MDI / Lucide / all via pills in the picker.
   */
  defaultPrefix?: "mdi" | "lucide";
};

type SetFilter = "mdi" | "lucide" | "all";

const DEFAULT_QUICK: string[] = [
  "lucide:power",
  "lucide:eye",
  "lucide:lightbulb",
  "lucide:home",
  "lucide:play",
  "lucide:pause",
  "lucide:zap",
  "lucide:calendar",
  "lucide:cloud",
  "lucide:bell",
  "lucide:lock",
  "lucide:unlock",
];

export default function IconPicker({ value, onChange, placeholder, quickPicks, label, defaultPrefix }: IconPickerProps) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  // Active set filter — starts at the caller's preferred prefix, but the user
  // can flip to "lucide" or "all" via the pills above the search box.
  const [setFilter, setSetFilter] = useState<SetFilter>(defaultPrefix ?? "all");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query || query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();
      setLoading(true);
      try {
        // ?prefix=mdi limits results to a single icon set; useful so HA users
        // see MDI hits first when looking up "lightbulb" instead of being drowned
        // in solar:* / hugeicons:* / ph:* variants.
        const prefixParam = setFilter !== "all" ? `&prefix=${setFilter}` : "";
        const res = await fetch(
          `https://api.iconify.design/search?query=${encodeURIComponent(query.trim())}&limit=30${prefixParam}`,
          { signal: abortRef.current.signal },
        );
        const data = await res.json();
        setResults(Array.isArray(data.icons) ? data.icons : []);
      } catch (e: any) {
        if (e?.name !== "AbortError") setResults([]);
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, setFilter]);

  const picks = quickPicks && quickPicks.length > 0 ? quickPicks : DEFAULT_QUICK;
  const showResults = query.trim().length >= 2;

  return (
    <div className="space-y-2">
      {label && (
        <div className="text-xs font-medium text-[var(--mf-fg)]/70">{label}</div>
      )}

      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-lg bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 flex items-center justify-center shrink-0">
          {value ? (
            <Icon icon={value} width={22} height={22} />
          ) : (
            <span className="text-[var(--mf-fg)]/30 text-xs">—</span>
          )}
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "mdi:lightbulb"}
          className="flex-1 bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-sm font-mono rounded-lg px-3 h-10 focus:outline-none focus:border-cyan-500"
        />
      </div>

      {/* Set-filter pills + search input row.
          MDI is the Home-Assistant convention; Lucide matches the rest of
          Magic Frame's UI; "All" opens up the full Iconify catalogue
          (~150k icons across ~100 sets).
          Pills are fixed-width (w-14) so MDI / Lucide / All read as a
          rhythmic, balanced segmented control regardless of label length.
          Container uses bg-[var(--mf-elev)]/5 + border for visibility on every parent
          background (deep-black inspector, lighter accordion card, etc.). */}
      <div className="flex items-center gap-1.5">
        <div className="flex shrink-0 bg-[var(--mf-elev)]/5 border border-[var(--mf-bdr)]/10 rounded-lg p-0.5 text-[10px] font-medium">
          {(["mdi", "lucide", "all"] as SetFilter[]).map((f) => {
            const isActive = setFilter === f;
            const labelText = f === "mdi" ? "MDI" : f === "lucide" ? "Lucide" : t("Alle");
            return (
              <button
                key={f}
                type="button"
                onClick={() => setSetFilter(f)}
                className={`w-14 h-7 rounded-md transition-colors text-center ${
                  isActive
                    ? "bg-cyan-500/20 text-cyan-200"
                    : "text-[var(--mf-fg)]/50 hover:text-[var(--mf-fg)]"
                }`}
              >
                {labelText}
              </button>
            );
          })}
        </div>
        <div className="relative flex-1">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--mf-fg)]/40 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("Icon suchen (Iconify)…")}
            className="w-full bg-[var(--mf-elev)]/5 border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-xs rounded-lg pl-8 pr-8 h-8 focus:outline-none focus:border-cyan-500"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-[var(--mf-fg)]/40 hover:text-[var(--mf-fg)]"
              title={t("Suche löschen")}
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {showResults ? (
        loading ? (
          <div className="text-xs text-[var(--mf-fg)]/40 py-2 px-1">{t("Sucht…")}</div>
        ) : results.length === 0 ? (
          <div className="text-xs text-[var(--mf-fg)]/40 py-2 px-1">{t("Keine Treffer für")} „{query}"</div>
        ) : (
          <div className="grid grid-cols-6 gap-1 max-h-48 overflow-y-auto bg-[var(--mf-ovl)]/30 light:bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 rounded-lg p-1.5">
            {results.map((id) => (
              <button
                key={id}
                onClick={() => onChange(id)}
                title={id}
                className={`aspect-square rounded-md flex items-center justify-center transition-colors ${
                  value === id
                    ? "bg-cyan-500/20 border border-cyan-500/50"
                    : "hover:bg-[var(--mf-elev)]/5 border border-transparent"
                }`}
              >
                <Icon icon={id} width={20} height={20} />
              </button>
            ))}
          </div>
        )
      ) : (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--mf-fg)]/40 px-1 mb-1">
            {t("Schnellauswahl")}
          </div>
          <div className="grid grid-cols-6 gap-1">
            {picks.map((id) => (
              <button
                key={id}
                onClick={() => onChange(id)}
                title={id}
                className={`aspect-square rounded-md flex items-center justify-center transition-colors ${
                  value === id
                    ? "bg-cyan-500/20 border border-cyan-500/50 text-cyan-200"
                    : "bg-[var(--mf-ovl)]/40 light:bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)]/70 hover:text-[var(--mf-fg)] hover:bg-[var(--mf-elev)]/5"
                }`}
              >
                <Icon icon={id} width={18} height={18} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
