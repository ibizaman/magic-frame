"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useT } from "@/lib/i18n/LocaleProvider";

type Props = {
  value: string;
  onChange: (tz: string) => void;
  placeholder?: string;
  className?: string;
  /** Show an × on the right to clear the value. */
  clearable?: boolean;
};

// Module-level cache. `Intl.supportedValuesOf` is cheap but stable —
// compute once per page load and share across every TimezonePicker.
let cachedZones: string[] | null = null;

function loadZones(): string[] {
  if (cachedZones) return cachedZones;
  try {
    const fn = (Intl as any)?.supportedValuesOf;
    if (typeof fn === "function") {
      cachedZones = (fn("timeZone") as string[]).slice().sort();
      return cachedZones;
    }
  } catch {
    // Older runtimes — fall through to the curated list below.
  }
  // Conservative fallback for very old browsers / runtimes that lack
  // Intl.supportedValuesOf. Covers the common cases users actually pick.
  cachedZones = [
    "UTC",
    "Europe/Berlin", "Europe/London", "Europe/Paris", "Europe/Madrid",
    "Europe/Rome", "Europe/Amsterdam", "Europe/Brussels", "Europe/Vienna",
    "Europe/Zurich", "Europe/Stockholm", "Europe/Helsinki", "Europe/Warsaw",
    "Europe/Athens", "Europe/Moscow", "Europe/Istanbul",
    "America/New_York", "America/Chicago", "America/Denver",
    "America/Los_Angeles", "America/Toronto", "America/Vancouver",
    "America/Mexico_City", "America/Sao_Paulo", "America/Argentina/Buenos_Aires",
    "Asia/Tokyo", "Asia/Shanghai", "Asia/Singapore", "Asia/Hong_Kong",
    "Asia/Seoul", "Asia/Bangkok", "Asia/Jakarta", "Asia/Dubai",
    "Asia/Kolkata", "Asia/Tel_Aviv",
    "Africa/Cairo", "Africa/Johannesburg", "Africa/Lagos",
    "Australia/Sydney", "Australia/Melbourne", "Australia/Perth",
    "Pacific/Auckland", "Pacific/Honolulu",
  ].sort();
  return cachedZones;
}

// "Europe/Berlin" → "Berlin" (the part users actually look up).
function lastSegment(tz: string): string {
  const idx = tz.lastIndexOf("/");
  return (idx >= 0 ? tz.slice(idx + 1) : tz).replace(/_/g, " ");
}

// IANA zones only ever use `[A-Za-z0-9_/+-]`. Strip anything else — we had a
// real bug where a stray `)` got saved as `America/New_York)` because the
// input propagated raw keystrokes. Intl.DateTimeFormat then throws and every
// downstream consumer falls back silently.
function sanitizeZoneInput(s: string): string {
  return s.replace(/[^A-Za-z0-9_/+\-]/g, "");
}

// Validate against the runtime — cheaper and more correct than matching the
// hand-curated fallback list.
function isValidZone(tz: string): boolean {
  if (!tz) return false;
  try {
    // Will throw on an unknown zone. Empty options object is fine.
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export default function TimezonePicker({
  value,
  onChange,
  placeholder,
  className,
  clearable = false,
}: Props) {
  const t = useT();
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const zones = useMemo(() => loadZones(), []);

  // Sync external value changes into the input.
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Click-outside closes the dropdown.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const q = query.toLowerCase().trim();
  const matches = useMemo(() => {
    if (!q) return zones.slice(0, 60);
    // Two passes: prefer matches at the start of the city name ("ber" → Berlin)
    // over substring matches (so the typed-into-cursor experience is sane).
    const startsAt: string[] = [];
    const includes: string[] = [];
    for (const z of zones) {
      const lower = z.toLowerCase();
      const city = lastSegment(z).toLowerCase();
      if (city.startsWith(q) || lower.startsWith(q)) {
        startsAt.push(z);
      } else if (lower.includes(q) || city.includes(q)) {
        includes.push(z);
      }
    }
    return [...startsAt, ...includes].slice(0, 60);
  }, [q, zones]);

  const commit = (tz: string) => {
    onChange(tz);
    setQuery(tz);
    setOpen(false);
  };

  const baseClass =
    className ||
    "w-full bg-black border border-white/10 text-white font-mono text-sm rounded-lg p-3 focus:outline-none focus:border-cyan-500";

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          // Strip any character that can't appear in an IANA zone. Belt-and-
          // braces against pastes / typos like "America/New_York)".
          const cleaned = sanitizeZoneInput(e.target.value);
          setQuery(cleaned);
          onChange(cleaned);
          setOpen(true);
          setHighlightIdx(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setHighlightIdx((i) => Math.min(matches.length - 1, i + 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlightIdx((i) => Math.max(0, i - 1));
          } else if (e.key === "Enter" && open && matches[highlightIdx]) {
            e.preventDefault();
            commit(matches[highlightIdx]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder={placeholder || "Europe/Berlin"}
        className={baseClass}
        autoComplete="off"
        spellCheck={false}
      />
      {clearable && query && (
        <button
          type="button"
          onClick={() => {
            onChange("");
            setQuery("");
            inputRef.current?.focus();
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-base leading-none"
          aria-label={t("Eintrag löschen")}
          tabIndex={-1}
        >
          ×
        </button>
      )}
      {open && matches.length > 0 && (
        <div className="absolute z-30 left-0 right-0 mt-1 max-h-72 overflow-y-auto bg-zinc-900 border border-white/10 rounded-lg shadow-2xl">
          {matches.map((z, idx) => (
            <button
              key={z}
              type="button"
              onMouseEnter={() => setHighlightIdx(idx)}
              // onMouseDown + preventDefault keeps focus on the input so the
              // commit runs while the picker's state machine is still in
              // "typing" mode. With plain onClick the mousedown moves focus
              // to the button first, and somewhere in that focus-shift the
              // committed value gets lost (mouse click was setting the
              // timezone to empty; keyboard Enter never had this problem).
              onMouseDown={(e) => {
                e.preventDefault();
                commit(z);
              }}
              className={`w-full text-left px-3 py-1.5 border-b border-white/5 last:border-0 flex items-baseline justify-between gap-3 ${
                idx === highlightIdx ? "bg-white/10" : "hover:bg-white/5"
              }`}
            >
              <span className="text-white text-sm truncate">
                {lastSegment(z)}
              </span>
              <span className="text-white/40 text-[10px] font-mono truncate shrink-0">
                {z}
              </span>
            </button>
          ))}
        </div>
      )}
      {open && matches.length === 0 && (
        <div className="absolute z-30 left-0 right-0 mt-1 bg-zinc-900 border border-white/10 rounded-lg shadow-2xl px-3 py-2 text-[11px] text-white/40">
          {t("Keine passende Zeitzone")}
        </div>
      )}
    </div>
  );
}
