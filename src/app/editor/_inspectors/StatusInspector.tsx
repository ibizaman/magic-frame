"use client";

import React from "react";
import type { WidgetLayoutItem } from "../_types";
import StatusCardFields from "../_components/StatusCardFields";
import { StatusCardPreview } from "../_components/StatusCardEditorModal";
import { useT } from "@/lib/i18n/LocaleProvider";

type Props = {
  widget: WidgetLayoutItem;
  updateConfig: (i: string, key: string, value: any) => void;
};

export default function StatusInspector({ widget, updateConfig }: Props) {
  const t = useT();
  const cfg = (widget.config as any) ?? {};
  return (
    <div className="space-y-4">
      {/* Live-Vorschau der Kachel — Änderungen unten wirken sofort hier */}
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--mf-fg)]/55 mb-2">{t("Live-Vorschau")}</div>
        <StatusCardPreview card={cfg} host={null} defaultHeightEm={5}
          font={{ size: Number(cfg.fontSize) || 20, responsive: cfg.responsiveText === true }}
          gridW={widget.w} gridH={widget.h} />
      </div>
      <StatusCardFields value={cfg} set={(key, v) => updateConfig(widget.i, key, v)} />
      <p className="text-xs text-[var(--mf-fg)]/40 px-1 leading-relaxed">
        {t("Die Kachel erscheint nur, wenn das Ereignis aktiv ist — perfekt zum Stapeln mit anderen Widgets.")}
      </p>
    </div>
  );
}
