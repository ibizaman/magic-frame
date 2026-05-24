"use client";

import React from 'react';
import { useT } from "@/lib/i18n/LocaleProvider";

type AddWidgetModalProps = {
  onClose: () => void;
  addWidget: (type: string) => void;
};

export default function AddWidgetModal({ onClose, addWidget }: AddWidgetModalProps) {
  const t = useT();
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={onClose}>
       <div className="bg-zinc-900 border border-white/10 p-6 rounded-2xl shadow-2xl w-full max-w-md nodrag" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-6">
             <h3 className="font-bold text-xl text-white">{t("Neues Modul wählen")}</h3>
             <button onClick={onClose} className="text-white/50 hover:text-white">{t("Schließen")}</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <button onClick={() => addWidget("ClockWidget.tsx")} className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 text-center transition-colors">
                <div className="text-3xl mb-2">🕐</div>
                <div className="font-bold text-white">{t("Uhr & Datum")}</div>
             </button>
             <button onClick={() => addWidget("WeatherWidget.tsx")} className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 text-center transition-colors">
                <div className="text-3xl mb-2">⛅</div>
                <div className="font-bold text-white">{t("Live Wetter")}</div>
             </button>
             <button onClick={() => addWidget("CalendarWidget.tsx")} className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 text-center transition-colors">
                <div className="text-3xl mb-2">📅</div>
                <div className="font-bold text-white">{t("Kalender")}</div>
             </button>
             <button onClick={() => addWidget("HomeAssistantWidget.tsx")} className="bg-white/5 hover:bg-cyan-500/10 border border-white/10 hover:border-cyan-500/30 rounded-xl p-4 text-center transition-colors">
                <div className="text-3xl mb-2 text-cyan-400">🏡</div>
                <div className="font-bold text-white">{t("HA Entity")}</div>
             </button>
             <button onClick={() => addWidget("HANotificationWidget.tsx")} className="bg-white/5 hover:bg-fuchsia-500/10 border border-white/10 hover:border-fuchsia-500/30 rounded-xl p-4 text-center transition-colors">
                <div className="text-3xl mb-2 text-fuchsia-400">🔔</div>
                <div className="font-bold text-white">{t("HA Alerts")}</div>
             </button>
             <button onClick={() => addWidget("ButtonWidget.tsx")} className="bg-white/5 hover:bg-indigo-500/10 border border-white/10 hover:border-indigo-500/30 rounded-xl p-4 text-center transition-colors">
                <div className="text-3xl mb-2 text-indigo-400">🔘</div>
                <div className="font-bold text-white">{t("Aktions-Button")}</div>
             </button>
          </div>
       </div>
    </div>
  );
}
