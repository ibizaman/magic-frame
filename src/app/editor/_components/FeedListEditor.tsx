"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

// Einzelne Eingabefelder für Feed-URLs (kein Bulk-Textfeld). Nach dem Muster
// von MediaPlayersEditor: lokale Entwurfszeilen, damit eine frisch
// hinzugefügte LEERE Zeile nicht sofort weggefiltert wird; gespeichert wird
// dedupliziert und ohne Leerzeilen. Reset per key={widget.i} vom Parent.
export default function FeedListEditor({
  value,
  onChange,
  t,
  accentClass = "text-amber-400 hover:text-amber-300",
  focusClass = "focus:border-amber-500",
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  t: (s: string) => string;
  accentClass?: string;
  focusClass?: string;
}) {
  const [rows, setRows] = useState<string[]>(value.length ? value : [""]);
  const commit = (next: string[]) => {
    setRows(next.length ? next : [""]);
    onChange(Array.from(new Set(next.map((x) => x.trim()).filter(Boolean))));
  };
  return (
    <div className="space-y-2">
      {rows.map((u, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <input
            type="url"
            inputMode="url"
            spellCheck={false}
            value={u}
            onChange={(e) => commit(rows.map((x, i) => (i === idx ? e.target.value : x)))}
            placeholder="https://…/rss.xml"
            className={`flex-1 min-w-0 bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-sm rounded-lg px-3 h-10 outline-none ${focusClass}`}
          />
          {rows.length > 1 && (
            <button
              onClick={() => commit(rows.filter((_, i) => i !== idx))}
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded text-[var(--mf-fg)]/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      ))}
      <button
        onClick={() => setRows((prev) => [...prev, ""])}
        className={`text-xs font-medium ${accentClass} transition-colors py-1`}
      >
        + {t("Feed hinzufügen")}
      </button>
    </div>
  );
}
