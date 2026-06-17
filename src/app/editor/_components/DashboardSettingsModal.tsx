"use client";

import React from 'react';
import { X } from 'lucide-react';
import { useT } from "@/lib/i18n/LocaleProvider";

type DashboardSettingsModalProps = {
  onClose: () => void;
  editDashboardName: string;
  setEditDashboardName: (v: string) => void;
  editDashboardSlug: string;
  setEditDashboardSlug: (v: string) => void;
  currentDashboardId: string;
  dashboards: { id: string; name: string }[];
  handleSaveDashboardMeta: () => void;
  handleDeleteDashboard: () => void;
};

export default function DashboardSettingsModal({
  onClose,
  editDashboardName,
  setEditDashboardName,
  editDashboardSlug,
  setEditDashboardSlug,
  currentDashboardId,
  dashboards,
  handleSaveDashboardMeta,
  handleDeleteDashboard,
}: DashboardSettingsModalProps) {
  const t = useT();
  return (
    <div className="fixed inset-0 bg-[var(--mf-backdrop)]/60 backdrop-blur-sm z-50 flex items-center justify-center">
       <div className="bg-[var(--mf-surface-2)] border border-[var(--mf-bdr)]/10 rounded-2xl w-[400px] overflow-hidden shadow-2xl flex flex-col">
          <div className="p-6 border-b border-[var(--mf-bdr)]/10 flex justify-between items-center bg-[var(--mf-ovl)]/20 light:bg-[var(--mf-surface)]">
             <h2 className="text-xl font-bold flex items-center gap-2">{t("Dashboard Verwalten")}</h2>
             <button onClick={onClose} className="text-[var(--mf-fg)]/50 hover:text-[var(--mf-fg)] transition-colors">
                <X size={20} />
             </button>
          </div>

          <div className="p-6 flex flex-col gap-4">
             <div>
                <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">{t("Anzeigename")}</label>
                <input
                   type="text" value={editDashboardName}
                   onChange={(e) => setEditDashboardName(e.target.value)}
                   className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] rounded-lg p-3 outline-none focus:border-blue-500 transition-colors"
                />
                <p className="text-xs text-[var(--mf-fg)]/40 mt-1">{t("Sichtbar hier im Editor als Tab.")}</p>
             </div>

             <div>
                <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">{t("URL Pfad (Kürzel)")}</label>
                <div className="flex items-center gap-2">
                  <span className="text-[var(--mf-fg)]/40 font-mono text-sm">/view/</span>
                  <input
                     type="text" value={editDashboardSlug}
                     onChange={(e) => setEditDashboardSlug(e.target.value)}
                     className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] font-mono rounded-lg p-3 outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <p className="text-xs text-[var(--mf-fg)]/40 mt-1">{t("Keine Leerzeichen. Ändert auch die Abruf-URL auf dem Tablet!")}</p>
             </div>

             <div className="flex justify-between items-center mt-4">
                {currentDashboardId !== "" && dashboards.length > 1 ? (
                   <button onClick={handleDeleteDashboard} className="text-red-400 text-sm hover:text-red-300">{t("Löschen")}</button>
                ) : <div />}

                <button onClick={handleSaveDashboardMeta} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-full font-medium shadow-lg hover:scale-[1.02] transition-transform">
                   {t("Übernehmen")}
                </button>
             </div>
          </div>
       </div>
    </div>
  );
}
