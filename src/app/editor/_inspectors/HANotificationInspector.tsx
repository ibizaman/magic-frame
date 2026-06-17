"use client";

import React, { useState } from 'react';
import { Trash2, ChevronDown } from 'lucide-react';
import type { WidgetLayoutItem } from '../_types';
import HAEntityInput from '../_components/HAEntityInput';
import IconPicker from '../_components/IconPicker';
import { useT } from "@/lib/i18n/LocaleProvider";

type HANotificationInspectorProps = {
  widget: WidgetLayoutItem;
  updateConfig: (i: string, key: string, value: any) => void;
};

export default function HANotificationInspector({
  widget: activeWidget,
  updateConfig,
}: HANotificationInspectorProps) {
  const t = useT();
  const source: "rules" | "persistent" = (activeWidget.config as any)?.source === "persistent" ? "persistent" : "rules";
  // Accordion: welche Regel ist aufgeklappt (standardmäßig alle zu)
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <div className="space-y-6">
       <div className="bg-[var(--mf-elev)]/5 rounded-xl p-3 border border-[var(--mf-bdr)]/10">
          <label className="text-xs font-medium text-[var(--mf-fg)]/70 block mb-2 uppercase tracking-wider">{t("Quelle")}</label>
          <div className="grid grid-cols-2 gap-2">
             <button
                onClick={() => updateConfig(activeWidget.i, "source", "rules")}
                className={`h-9 rounded-lg text-xs font-medium transition-colors ${source === "rules" ? "bg-fuchsia-500/20 text-fuchsia-200 border border-fuchsia-500/40" : "bg-[var(--mf-ovl)]/30 light:bg-[var(--mf-surface)] text-[var(--mf-fg)]/60 border border-[var(--mf-bdr)]/10 hover:text-[var(--mf-fg)]"}`}
             >
                {t("Eigene Regeln")}
             </button>
             <button
                onClick={() => updateConfig(activeWidget.i, "source", "persistent")}
                className={`h-9 rounded-lg text-xs font-medium transition-colors ${source === "persistent" ? "bg-fuchsia-500/20 text-fuchsia-200 border border-fuchsia-500/40" : "bg-[var(--mf-ovl)]/30 light:bg-[var(--mf-surface)] text-[var(--mf-fg)]/60 border border-[var(--mf-bdr)]/10 hover:text-[var(--mf-fg)]"}`}
             >
                {t("HA Persistent")}
             </button>
          </div>
          <p className="text-[11px] text-[var(--mf-fg)]/40 mt-2 leading-relaxed">
             {source === "rules"
                ? t("Du definierst unten Trigger-Regeln pro Entity und bekommst bei Statuswechseln einen Alert.")
                : t("Zeigt automatisch alle Home-Assistant-persistent_notification-Einträge — kein Regel-Schreiben nötig.")}
          </p>
          {source === "persistent" && (
             <div className="mt-3">
                <label className="text-[10px] font-medium text-[var(--mf-fg)]/50 uppercase tracking-wider flex justify-between mb-1">
                   <span>{t("Abfrage-Intervall")}</span>
                   <span className="text-blue-400">{(activeWidget.config as any)?.persistentPollSec ?? 15}s</span>
                </label>
                <input
                   type="range" min="5" max="120" step="1"
                   value={(activeWidget.config as any)?.persistentPollSec ?? 15}
                   onChange={(e) => updateConfig(activeWidget.i, "persistentPollSec", parseInt(e.target.value))}
                   className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-blue-500 bg-[var(--mf-elev)]/10"
                />
             </div>
          )}
       </div>
       <div className="border-b border-[var(--mf-bdr)]/10 pb-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
             <div>
                <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">{t("Kacheln: Theme")}</label>
                <select
                   value={activeWidget.config?.cardTheme || 'dark'}
                   onChange={(e) => updateConfig(activeWidget.i, 'cardTheme', e.target.value)}
                   className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] font-sans text-sm rounded-lg p-3 focus:outline-none focus:border-cyan-500"
                >
                   <option value="dark">{t("Dunkel (Standard Black)")}</option>
                   <option value="light">{t("Hell (Weißes Glas)")}</option>
                </select>
             </div>
             <div>
                <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">{t("Max. gleichzeitige Alerts")}</label>
                <input type="number" min="1" max="15" value={activeWidget.config?.maxNotifications || 5} onChange={(e) => updateConfig(activeWidget.i, 'maxNotifications', parseInt(e.target.value))} className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] font-sans text-sm rounded-lg p-3" />
             </div>
             <div>
                <label className="text-sm font-medium text-[var(--mf-fg)]/80 mb-2 flex justify-between">
                   <span>{t("Kacheln Deckkraft")}</span>
                   <span className="text-blue-400">{activeWidget.config?.cardOpacity !== undefined ? activeWidget.config.cardOpacity : 40}%</span>
                </label>
                <input
                   type="range" min="0" max="100" value={activeWidget.config?.cardOpacity !== undefined ? activeWidget.config.cardOpacity : 40}
                   onChange={(e) => updateConfig(activeWidget.i, 'cardOpacity', parseInt(e.target.value))}
                   className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-500 bg-[var(--mf-elev)]/10"
                />
             </div>
             <div>
                <label className="text-sm font-medium text-[var(--mf-fg)]/80 mb-2 flex justify-between">
                   <span>{t("Kacheln Blur")}</span>
                   <span className="text-blue-400">{activeWidget.config?.cardBlur !== undefined ? activeWidget.config.cardBlur : 12}px</span>
                </label>
                <input
                   type="range" min="0" max="40" value={activeWidget.config?.cardBlur !== undefined ? activeWidget.config.cardBlur : 12}
                   onChange={(e) => updateConfig(activeWidget.i, 'cardBlur', parseInt(e.target.value))}
                   className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-500 bg-[var(--mf-elev)]/10"
                />
             </div>

             {/* Icon-Darstellung (#20) — Defaults = bisheriges Verhalten */}
             <label className="flex items-center gap-3 cursor-pointer group py-1">
                <div className="relative">
                   <input
                      type="checkbox"
                      checked={(activeWidget.config as any)?.iconFrame !== false}
                      onChange={(e) => updateConfig(activeWidget.i, 'iconFrame', e.target.checked)}
                      className="sr-only peer"
                   />
                   <div className="w-11 h-6 bg-[var(--mf-elev)]/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                </div>
                <span className="text-sm font-medium text-[var(--mf-fg)]/80 group-hover:text-[var(--mf-fg)] transition-colors">{t("Icon im Kasten")}</span>
             </label>
             <div>
                <label className="text-sm font-medium text-[var(--mf-fg)]/80 mb-2 flex justify-between">
                   <span>{t("Icon-Größe")}</span>
                   <span className="text-blue-400">{Math.round(((activeWidget.config as any)?.iconScale ?? 1) * 100)}%</span>
                </label>
                <input
                   type="range" min="0.6" max="2.4" step="0.1" value={(activeWidget.config as any)?.iconScale ?? 1}
                   onChange={(e) => updateConfig(activeWidget.i, 'iconScale', parseFloat(e.target.value))}
                   className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-500 bg-[var(--mf-elev)]/10"
                />
             </div>
             {(activeWidget.config as any)?.iconFrame !== false && (
                <div>
                   <label className="text-sm font-medium text-[var(--mf-fg)]/80 mb-2 flex justify-between">
                      <span>{t("Kasten-Größe")}</span>
                      <span className="text-blue-400">{Math.round(((activeWidget.config as any)?.frameScale ?? 1) * 100)}%</span>
                   </label>
                   <input
                      type="range" min="0.6" max="2" step="0.1" value={(activeWidget.config as any)?.frameScale ?? 1}
                      onChange={(e) => updateConfig(activeWidget.i, 'frameScale', parseFloat(e.target.value))}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-500 bg-[var(--mf-elev)]/10"
                   />
                </div>
             )}
             <div>
                <label className="text-sm font-medium text-[var(--mf-fg)]/80 block mb-2">{t("Zeitformat")}</label>
                <select
                   value={(activeWidget.config as any)?.timeFormat || 'auto'}
                   onChange={(e) => updateConfig(activeWidget.i, 'timeFormat', e.target.value)}
                   className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] font-sans text-sm rounded-lg p-3 focus:outline-none focus:border-fuchsia-500"
                >
                   <option value="auto">{t("Automatisch (vor 5 Min.)")}</option>
                   <option value="minutes">{t("Nur Minuten (vor 120 min)")}</option>
                   <option value="hours">{t("Nur Stunden (vor 5 h)")}</option>
                   <option value="days">{t("Nur Tage (vor 3 Tagen)")}</option>
                   <option value="combined">{t("Kombiniert (vor 1d 2h 5m)")}</option>
                </select>
             </div>
             <div className="flex flex-col justify-center">
                <label className="flex items-center gap-3 cursor-pointer group">
                   <input
                      type="checkbox"
                      checked={(activeWidget.config as any)?.showTimers !== false}
                      onChange={(e) => updateConfig(activeWidget.i, 'showTimers', e.target.checked)}
                      className="appearance-none w-5 h-5 shrink-0 border border-[var(--mf-bdr)]/20 rounded bg-[var(--mf-surface)] checked:bg-emerald-500 checked:border-emerald-500"
                   />
                   <span className="text-sm text-[var(--mf-fg)]/80 group-hover:text-[var(--mf-fg)]">
                      {t("Aktive Timer unten andocken")}
                   </span>
                </label>
                <p className="text-[11px] text-[var(--mf-fg)]/40 mt-1.5 leading-relaxed">
                   {t("Laufende Timer erscheinen als Notification-Karte mit Countdown, einsortiert unter den Alerts. Start via")}{" "}
                   <code className="bg-[var(--mf-elev)]/10 px-1 rounded">POST /api/timers?key=…&minutes=10</code>.
                </p>
             </div>
          </div>
       </div>
       {source === "rules" && (
       <>
       <div className="space-y-4">
          {(activeWidget.config?.rules || []).map((rule: any, rIdx: number) => (
             <div key={rIdx} className="bg-[var(--mf-elev)]/5 border border-[var(--mf-bdr)]/10 rounded-xl mt-4 overflow-hidden">
                 <div className="flex items-center gap-2 p-3">
                    <button
                       type="button"
                       onClick={() => setOpenIdx(openIdx === rIdx ? null : rIdx)}
                       className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
                    >
                       <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: rule.color || '#F43F5E' }} />
                       <span className="text-sm font-medium text-[var(--mf-fg)] truncate">
                          {rule.message || rule.entityId || `${t("Regel")} ${rIdx + 1}`}
                       </span>
                       <ChevronDown size={15} className={`shrink-0 text-[var(--mf-fg)]/40 transition-transform ${openIdx === rIdx ? 'rotate-180' : ''}`} />
                    </button>
                    <button onClick={() => {
                        const newRules = [...(activeWidget.config?.rules || [])];
                        newRules.splice(rIdx, 1);
                        updateConfig(activeWidget.i, 'rules', newRules);
                        if (openIdx === rIdx) setOpenIdx(null);
                    }} className="shrink-0 text-[var(--mf-fg)]/40 hover:text-red-500 p-1" title={t("Regel löschen")}><Trash2 size={15}/></button>
                 </div>
                 {openIdx === rIdx && (
                 <div className="px-4 pb-4 border-t border-[var(--mf-bdr)]/5 pt-3">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 mt-2">
                    <div>
                       <label className="text-[10px] uppercase text-fuchsia-400 font-bold">{t("Trigger Entity")}</label>
                       <div className="mt-1">
                       <HAEntityInput
                          value={rule.entityId || ''}
                          onChange={(v) => {
                             const newRules = [...(activeWidget.config?.rules || [])];
                             newRules[rIdx] = { ...rule, entityId: v };
                             updateConfig(activeWidget.i, 'rules', newRules);
                          }}
                          placeholder="sensor.washer"
                          className="w-full bg-[var(--mf-ovl)]/50 light:bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-xs p-2 rounded focus:border-fuchsia-500 outline-none"
                       />
                       </div>
                    </div>
                    <div>
                       <label className="text-[10px] uppercase text-fuchsia-400 font-bold">{t("Trigger Status")}</label>
                       <input type="text" value={rule.triggerState || ''} onChange={(e) => {
                           const newRules = [...(activeWidget.config?.rules || [])];
                           newRules[rIdx] = { ...rule, triggerState: e.target.value };
                           updateConfig(activeWidget.i, 'rules', newRules);
                       }} className="w-full bg-[var(--mf-ovl)]/50 light:bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-xs p-2 rounded focus:border-fuchsia-500 outline-none mt-1" placeholder={t("z.b. on oder fertig")} />
                    </div>
                 </div>

                 <div className="mb-4">
                     <label className="text-[10px] uppercase text-[var(--mf-fg)]/50">{t("Alert Message (Anzeigetext)")}</label>
                     <input type="text" value={rule.message || ''} onChange={(e) => {
                         const newRules = [...(activeWidget.config?.rules || [])];
                         newRules[rIdx] = { ...rule, message: e.target.value };
                         updateConfig(activeWidget.i, 'rules', newRules);
                     }} className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-sm p-2 rounded outline-none mt-1" placeholder={t("Waschmaschine ist durch!")} />
                 </div>

                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-3">
                       <IconPicker
                          label={t("Icon")}
                          value={rule.icon || ''}
                          onChange={(iconId) => {
                             const newRules = [...(activeWidget.config?.rules || [])];
                             newRules[rIdx] = { ...rule, icon: iconId };
                             updateConfig(activeWidget.i, 'rules', newRules);
                          }}
                          placeholder="mdi:bell"
                          defaultPrefix="mdi"
                          quickPicks={[
                             "mdi:bell",
                             "mdi:bell-ring",
                             "mdi:washing-machine",
                             "mdi:tumble-dryer",
                             "mdi:dishwasher",
                             "mdi:fridge",
                             "mdi:water-alert",
                             "mdi:fire",
                             "mdi:door-open",
                             "mdi:window-open",
                             "mdi:cat",
                             "mdi:dog",
                          ]}
                       />
                    </div>
                    <div>
                       <label className="text-[10px] uppercase text-[var(--mf-fg)]/50">{t("Dauer (Min)")}</label>
                       <input type="number" value={rule.durationMinutes !== undefined ? rule.durationMinutes : 0} onChange={(e) => {
                           const newRules = [...(activeWidget.config?.rules || [])];
                           newRules[rIdx] = { ...rule, durationMinutes: parseInt(e.target.value) };
                           updateConfig(activeWidget.i, 'rules', newRules);
                       }} className="w-full bg-[var(--mf-ovl)]/50 light:bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] text-xs p-2 rounded outline-none mt-1" title={t("0 = unendlich (bis Statuswechsel)")} />
                    </div>
                    <div>
                       <label className="text-[10px] uppercase text-[var(--mf-fg)]/50">{t("Farbe")}</label>
                       <div className="h-[30px] rounded overflow-hidden mt-1 bg-[var(--mf-ovl)]/50 light:bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 relative">
                          <input type="color" value={rule.color || '#F43F5E'} onChange={(e) => {
                              const newRules = [...(activeWidget.config?.rules || [])];
                              newRules[rIdx] = { ...rule, color: e.target.value };
                              updateConfig(activeWidget.i, 'rules', newRules);
                          }} className="absolute -top-2 -left-2 w-20 h-20 cursor-pointer" />
                       </div>
                    </div>
                 </div>

                  {/* Advanced Options Group */}
                  <div className="mt-4 p-3 bg-[var(--mf-ovl)]/20 light:bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 rounded-lg space-y-4">

                      {/* Row 1: Click Action & Target */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                         <div>
                            <label className="text-[10px] font-medium text-blue-400 block mb-1 uppercase tracking-wider">{t("Klick-Aktion (Wenn angetippt)")}</label>
                            <select
                               value={rule.tapAction || 'none'}
                               onChange={(e) => {
                                   const newRules = [...(activeWidget.config?.rules || [])];
                                   newRules[rIdx] = { ...rule, tapAction: e.target.value };
                                   updateConfig(activeWidget.i, 'rules', newRules);
                               }}
                               className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)]/80 font-sans text-xs rounded-md p-2 focus:outline-none focus:border-blue-500"
                            >
                               <option value="none">{t("Keine Aktion")}</option>
                               <option value="toggle_self">{t("Trigger-Entität umschalten (Toggle)")}</option>
                               <option value="toggle_custom">{t("Andere Entität umschalten...")}</option>
                            </select>
                         </div>
                         <div>
                            {rule.tapAction === 'toggle_custom' && (
                               <>
                                  <label className="text-[10px] font-medium text-blue-400 block mb-1 uppercase tracking-wider">{t("Ziel-Entität (z.B. light.kitchen)")}</label>
                                  <input
                                     type="text" value={rule.tapActionEntity || ''} placeholder={t("Entität eingeben...")}
                                     onChange={(e) => {
                                         const newRules = [...(activeWidget.config?.rules || [])];
                                         newRules[rIdx] = { ...rule, tapActionEntity: e.target.value };
                                         updateConfig(activeWidget.i, 'rules', newRules);
                                     }}
                                     className="w-full bg-[var(--mf-surface)] border border-blue-500/50 text-[var(--mf-fg)] font-sans text-xs rounded-md p-2 focus:outline-none focus:border-blue-500"
                                  />
                               </>
                            )}
                         </div>
                      </div>

                      {/* Row 2: Disappear Logic */}
                      <div>
                          <label className="text-[10px] font-medium text-amber-500/80 block mb-1 uppercase tracking-wider">{t("Wann soll die Notification wieder verschwinden?")}</label>
                          <select
                             value={rule.quitMode || 'both'}
                             onChange={(e) => {
                                 const newRules = [...(activeWidget.config?.rules || [])];
                                 newRules[rIdx] = { ...rule, quitMode: e.target.value };
                                 updateConfig(activeWidget.i, 'rules', newRules);
                             }}
                             className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)]/80 font-sans text-xs rounded-md p-2 focus:outline-none focus:border-amber-500"
                          >
                             <option value="both">{t("Dauer abgelaufen ODER manuell quittiert")}</option>
                             <option value="time">{t("NUR wenn Zeit-Dauer abgelaufen ist (Timer)")}</option>
                             <option value="entity">{t("NUR durch Quittierungs-Entität (Zeit ignorieren)")}</option>
                          </select>
                      </div>

                      {/* Row 3: Acknowledgment Entity */}
                      {rule.quitMode !== 'time' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[var(--mf-bdr)]/5">
                         <div>
                            <label className="text-[10px] font-medium text-[var(--mf-fg)]/50 block mb-1 uppercase tracking-wider">{t("Quittierung durch Entität (ID)")}</label>
                            <input type="text" value={rule.clearEntityId || ''} onChange={(e) => {
                                const newRules = [...(activeWidget.config?.rules || [])];
                                newRules[rIdx] = { ...rule, clearEntityId: e.target.value };
                                updateConfig(activeWidget.i, 'rules', newRules);
                            }} placeholder={t("z.B. binary_sensor.door")} className="w-full bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] font-sans text-xs rounded-md p-2 focus:outline-none focus:border-amber-500" />
                         </div>
                         <div>
                            <label className="text-[10px] font-medium text-[var(--mf-fg)]/50 block mb-1 uppercase tracking-wider">{t("Erwarteter Zustand")}</label>
                            <div className="flex gap-2 w-full">
                                <select
                                   value={rule.clearMatchMode === 'change' ? 'CHANGE' : (['on', 'off'].includes(rule.clearStateVal || 'on') ? (rule.clearStateVal || 'on') : 'CUSTOM')}
                                   onChange={(e) => {
                                       const val = e.target.value;
                                       const newRules = [...(activeWidget.config?.rules || [])];
                                       if (val === 'CHANGE') {
                                           newRules[rIdx] = { ...rule, clearMatchMode: 'change' };
                                       } else if (val === 'CUSTOM') {
                                           newRules[rIdx] = { ...rule, clearMatchMode: 'fixed', clearStateVal: '' };
                                       } else {
                                           newRules[rIdx] = { ...rule, clearMatchMode: 'fixed', clearStateVal: val };
                                       }
                                       updateConfig(activeWidget.i, 'rules', newRules);
                                   }}
                                   className="bg-[var(--mf-surface)] border border-[var(--mf-bdr)]/10 text-[var(--mf-fg)] font-sans text-xs rounded-md p-2 focus:outline-none focus:border-amber-500 w-full"
                                >
                                   <option value="on">{t("Status wird: \"on\"")}</option>
                                   <option value="off">{t("Status wird: \"off\"")}</option>
                                   <option value="CHANGE">{t("Beliebiger Status-Wechsel")}</option>
                                   <option value="CUSTOM">{t("Eigener Wert...")}</option>
                                </select>
                                {rule.clearMatchMode !== 'change' && !['on', 'off'].includes(rule.clearStateVal || 'on') && (
                                    <input
                                       type="text" value={rule.clearStateVal || ''} placeholder={t("z.B. open")}
                                       onChange={(e) => {
                                           const newRules = [...(activeWidget.config?.rules || [])];
                                           newRules[rIdx] = { ...rule, clearStateVal: e.target.value };
                                           updateConfig(activeWidget.i, 'rules', newRules);
                                       }}
                                       className="bg-[var(--mf-surface)] border border-amber-500/50 text-[var(--mf-fg)] font-sans text-xs rounded-md p-2 focus:outline-none focus:border-amber-500 w-full"
                                    />
                                )}
                            </div>
                            <label className="flex items-center gap-3 cursor-pointer group pt-2">
                                <input
                                    type="checkbox"
                                    checked={rule.dropOnTriggerLoss ?? false}
                                    onChange={(e) => {
                                        const newRules = [...(activeWidget.config?.rules || [])];
                                        newRules[rIdx] = { ...rule, dropOnTriggerLoss: e.target.checked };
                                        updateConfig(activeWidget.i, 'rules', newRules);
                                    }}
                                    className="w-4 h-4 rounded accent-fuchsia-500"
                                />
                                <span className="text-xs text-[var(--mf-fg)]/80">{t("Alert droppen sobald Trigger weg ist (ohne explizites Clear)")}</span>
                            </label>
                         </div>
                      </div>
                      )}
                  </div>
                 </div>
                 )}
             </div>
          ))}
       </div>
       <button onClick={() => {
           const newRules = [...(activeWidget.config?.rules || []), { entityId: "", triggerState: "", message: "", durationMinutes: 15, icon: "mdi:bell-ring", color: "#F43F5E" }];
           updateConfig(activeWidget.i, 'rules', newRules);
           setOpenIdx(newRules.length - 1);
       }} className="w-full mt-4 py-3 bg-fuchsia-500/20 hover:bg-fuchsia-500/30 text-fuchsia-400 font-bold rounded-xl border border-fuchsia-500/30 transition-colors">
          {t("+ Neue Benachrichtigungs-Regel")}
       </button>
       </>
       )}

       {source === "persistent" && (
         <div className="bg-[var(--mf-elev)]/5 border border-[var(--mf-bdr)]/10 rounded-xl p-4 text-sm text-[var(--mf-fg)]/70 space-y-2">
           <p className="font-medium text-[var(--mf-fg)]">{t("Quelle: Home Assistant Persistent-Notifications")}</p>
           <p className="text-xs text-[var(--mf-fg)]/50 leading-relaxed">
             {t("Alle persistent_notification.*-Einträge deiner HA-Instanz erscheinen hier automatisch. Das Wegwischen-X im Widget ruft auch HA's persistent_notification.dismiss auf.")}
           </p>
         </div>
       )}
    </div>
  );
}
