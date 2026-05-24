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
};

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

export default function IconPicker({ value, onChange, placeholder, quickPicks, label }: IconPickerProps) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
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
        const res = await fetch(
          `https://api.iconify.design/search?query=${encodeURIComponent(query.trim())}&limit=30`,
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
  }, [query]);

  const picks = quickPicks && quickPicks.length > 0 ? quickPicks : DEFAULT_QUICK;
  const showResults = query.trim().length >= 2;

  return (
    <div className="space-y-2">
      {label && (
        <div className="text-xs font-medium text-white/70">{label}</div>
      )}

      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-lg bg-black border border-white/10 flex items-center justify-center shrink-0">
          {value ? (
            <Icon icon={value} width={22} height={22} />
          ) : (
            <span className="text-white/30 text-xs">—</span>
          )}
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "mdi:lightbulb"}
          className="flex-1 bg-black border border-white/10 text-white text-sm font-mono rounded-lg px-3 h-10 focus:outline-none focus:border-cyan-500"
        />
      </div>

      <div className="relative">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("Icon suchen (Iconify)…")}
          className="w-full bg-black/40 border border-white/10 text-white text-xs rounded-lg pl-8 pr-8 h-8 focus:outline-none focus:border-cyan-500"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-white/40 hover:text-white"
            title={t("Suche löschen")}
          >
            <X size={12} />
          </button>
        )}
      </div>

      {showResults ? (
        loading ? (
          <div className="text-xs text-white/40 py-2 px-1">{t("Sucht…")}</div>
        ) : results.length === 0 ? (
          <div className="text-xs text-white/40 py-2 px-1">Keine Treffer für „{query}"</div>
        ) : (
          <div className="grid grid-cols-6 gap-1 max-h-48 overflow-y-auto bg-black/30 border border-white/10 rounded-lg p-1.5">
            {results.map((id) => (
              <button
                key={id}
                onClick={() => onChange(id)}
                title={id}
                className={`aspect-square rounded-md flex items-center justify-center transition-colors ${
                  value === id
                    ? "bg-cyan-500/20 border border-cyan-500/50"
                    : "hover:bg-white/5 border border-transparent"
                }`}
              >
                <Icon icon={id} width={20} height={20} />
              </button>
            ))}
          </div>
        )
      ) : (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-white/40 px-1 mb-1">
            Schnellauswahl
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
                    : "bg-black/40 border border-white/10 text-white/70 hover:text-white hover:bg-white/5"
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
