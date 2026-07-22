"use client";

import React from "react";
import type { WidgetLayoutItem } from "../_types";
import StatusCardFields from "../_components/StatusCardFields";
import { useT } from "@/lib/i18n/LocaleProvider";

type Props = {
  widget: WidgetLayoutItem;
  updateConfig: (i: string, key: string, value: any) => void;
};

// Die Live-Vorschau kommt seit #42 global oben aus dem InspectorPanel —
// hier bleiben nur noch die Felder.
export default function StatusInspector({ widget, updateConfig }: Props) {
  const t = useT();
  const cfg = (widget.config as any) ?? {};
  return (
    <div className="space-y-4">
      <StatusCardFields value={cfg} set={(key, v) => updateConfig(widget.i, key, v)} />
      <p className="text-xs text-[var(--mf-fg)]/40 px-1 leading-relaxed">
        {t("Standardmäßig erscheint die Kachel nur bei aktivem Ereignis — perfekt zum Stapeln mit anderen Widgets. Mit „Auch ohne Ereignis anzeigen“ bleibt sie dauerhaft sichtbar.")}
      </p>
    </div>
  );
}
