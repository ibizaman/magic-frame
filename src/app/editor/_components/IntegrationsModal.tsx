"use client";

import React from 'react';
import { Settings } from 'lucide-react';
import { useT } from "@/lib/i18n/LocaleProvider";

type IntegrationsModalProps = {
  onClose: () => void;
  settings: any;
  setSettings: (v: any) => void;
};

export default function IntegrationsModal({ onClose, settings, setSettings }: IntegrationsModalProps) {
  const t = useT();
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4" onClick={onClose}>
       <div className="bg-zinc-950 border border-cyan-500/20 p-8 rounded-[32px] shadow-2xl shadow-cyan-500/10 w-full max-w-lg nodrag" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-8">
             <div>
                <h3 className="font-bold text-2xl text-white">Home Assistant</h3>
                <p className="text-white/50 text-sm mt-1">{t("Globale REST API Verbindung")}</p>
             </div>
             <button onClick={onClose} className="bg-white/10 hover:bg-white/20 text-white rounded-full p-2"><Settings size={18} /></button>
          </div>
          <div className="space-y-6">
             <div>
                <label className="text-sm font-medium text-white/80 block mb-2">{t("Home Assistant Base-URL")}</label>
                <input type="text" value={settings?.haUrl || ''} onChange={(e) => setSettings({ ...settings, haUrl: e.target.value })} placeholder="http://192.168.178.50:8123" className="w-full bg-black border border-white/10 text-white rounded-xl p-4 outline-none focus:border-cyan-500 transition-colors" />
             </div>
             <div>
                <label className="text-sm font-medium text-white/80 block mb-2">Long-Lived Access Token</label>
                <input type="password" value={settings?.haToken || ''} onChange={(e) => setSettings({ ...settings, haToken: e.target.value })} placeholder="eyJhb..." className="w-full bg-black border border-white/10 text-white rounded-xl p-4 outline-none focus:border-cyan-500 transition-colors" />
             </div>
             <p className="text-xs text-white/40 mt-6 bg-white/5 p-4 rounded-xl border border-white/5">
                {t("Tipp: Generieren Sie einen Token im Home Assistant Profil unter „Langlebige Zugangsdaten“.")}
             </p>
          </div>
       </div>
    </div>
  );
}
