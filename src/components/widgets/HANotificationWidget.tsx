"use client";

import React, { useState, useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import { useGlassStyle } from "@/lib/ui/glass";
import {
    formatNotifAge,
    type NotifTimeFormat,
} from "./_shared/notifTimeFormat";
import {
    useDockedTimers,
    timerClock,
    type DockedTimer,
} from "./_shared/useDockedTimers";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export interface NotificationRule {
    entityId?: string;
    triggerState?: string;
    message?: string;
    durationMinutes?: number;
    icon?: string;
    color?: string;
    clearEntityId?: string;
    clearStateVal?: string;
    clearMatchMode?: "fixed" | "change";
    quitMode?: "time" | "entity" | "both";
    dropOnTriggerLoss?: boolean;
    tapAction?: string;
    tapActionEntity?: string;
}

interface PersistedAlert {
    rule: NotificationRule;
    key: string;
    triggerTime: number;
    configIndex: number;
    initialClearLastChanged?: string;
    ack?: boolean;
}

type HaPersistent = {
    id: string;
    entityId: string;
    title: string;
    message: string;
    createdAt?: string;
    status: string;
};

export default function HANotificationWidget({
    config,
    onVisibilityChange,
    dashboardId,
}: {
    config?: any;
    onVisibilityChange?: (isVisible: boolean) => void;
    dashboardId?: string;
}) {
    const { locale, t: tr } = useLocale();
    const source: "rules" | "persistent" = config?.source === "persistent" ? "persistent" : "rules";
    const [statesDict, setStatesDict] = useState<Record<string, any>>({});
    const [error, setError] = useState("");
    const [haPersistent, setHaPersistent] = useState<HaPersistent[]>([]);
    const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
    // 1Hz Tick — damit Alters-Anzeigen ohne neuen Fetch atmen
    const [nowMs, setNowMs] = useState(() => Date.now());

    // Memory mapping of active alerts by their unique config index
    const [persistedAlerts, setPersistedAlerts] = useState<Map<number, PersistedAlert>>(new Map());

    const rules: NotificationRule[] = config?.rules || [];
    const maxNotifications = config?.maxNotifications || 5;
    const timeFormat: NotifTimeFormat = (config?.timeFormat as NotifTimeFormat) ?? "auto";
    const showTimers: boolean = config?.showTimers !== false;

    // Aktive Timer über shared Hook ziehen
    const { timers: activeTimers, dismissTimer } = useDockedTimers(dashboardId, showTimers);

    // Adaptiver Tick: 1Hz wenn Timer aktiv (Countdown!), sonst 30/60s für Alters-Strings
    useEffect(() => {
        const fast = activeTimers.length > 0;
        const interval = fast ? 1000 : (timeFormat === "auto" ? 30_000 : 60_000);
        const t = setInterval(() => setNowMs(Date.now()), interval);
        return () => clearInterval(t);
    }, [timeFormat, activeTimers.length]);

    // Build fetch parameters (trigger entities + clear entities)
    const ruleIds = rules.map((r) => r.entityId).filter((id) => id && id.trim() !== "");
    const clearIds = rules.map((r) => r.clearEntityId).filter((id) => id && id.trim() !== "");
    const idsParam = Array.from(new Set([...ruleIds, ...clearIds])).join(",");

    const fetchState = async () => {
        if (!idsParam) return;
        try {
            const res = await fetch(`/api/ha/state?ids=${idsParam}`);
            if (!res.ok) throw new Error(await res.text());
            const data = await res.json();
            setStatesDict(data);
            setError("");
        } catch (err: any) {
            setError(err.message);
        }
    };

    useEffect(() => {
        if (source !== "rules") return;
        fetchState();
        const interval = setInterval(fetchState, 5000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idsParam, source]);

    // HA Persistent-Notifications Poll
    useEffect(() => {
        if (source !== "persistent") return;
        const pollMs = Math.max(5000, (config?.persistentPollSec ?? 15) * 1000);
        const controller = new AbortController();
        let cancelled = false;

        const fetchNotifications = async () => {
            try {
                const res = await fetch("/api/ha/notifications", { signal: controller.signal });
                if (!res.ok) throw new Error(await res.text());
                const data = await res.json();
                if (!cancelled) {
                    setHaPersistent(Array.isArray(data.notifications) ? data.notifications : []);
                    setError("");
                }
            } catch (err: any) {
                if (err?.name === "AbortError") return;
                if (!cancelled) setError(err.message);
            }
        };

        fetchNotifications();
        const interval = setInterval(fetchNotifications, pollMs);
        return () => {
            cancelled = true;
            controller.abort();
            clearInterval(interval);
        };
    }, [source, config?.persistentPollSec]);

    async function dismissHaPersistent(entityId: string) {
        setDismissedIds((prev) => new Set(prev).add(entityId));
        try {
            const id = entityId.replace(/^persistent_notification\./, "");
            await fetch("/api/ha/action", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    entityId,
                    domain: "persistent_notification",
                    service: "dismiss",
                    data: { notification_id: id },
                }),
            });
        } catch (e) {
            console.error("Failed to dismiss notification", e);
        }
    }

    // Update persistence map whenever statesDict changes
    useEffect(() => {
        if (Object.keys(statesDict).length === 0) return;

        setPersistedAlerts((prevMap) => {
            const newMap = new Map(prevMap);

            rules.forEach((rule, index) => {
                if (!rule.entityId || rule.entityId.trim() === "") return;
                const stateObj = statesDict[rule.entityId];
                if (!stateObj) return;

                const currentState = stateObj.state;
                const expectedState = rule.triggerState || "";
                const isTriggered = currentState.toLowerCase() === expectedState.toLowerCase();

                let existing = newMap.get(index);

                // If it's already acked and trigger is gone, delete it fully
                if (existing && existing.ack && !isTriggered) {
                     newMap.delete(index);
                     return;
                }

                // If it's already acked and trigger is still present, just let it exist silently
                if (existing && existing.ack) {
                     newMap.set(index, existing); 
                     return;
                }

                // 1. Evaluate clear condition if we are not restricted to time-only
                let takeAck = false;
                if (existing && rule.quitMode !== 'time' && rule.clearEntityId && rule.clearEntityId.trim() !== "") {
                     const clearStateObj = statesDict[rule.clearEntityId];
                     
                     if (clearStateObj) {
                         const matchMode = rule.clearMatchMode || 'fixed';
                         if (matchMode === 'change') {
                             if (existing.initialClearLastChanged && clearStateObj.last_changed && clearStateObj.last_changed !== existing.initialClearLastChanged) {
                                 takeAck = true;
                             }
                         } else {
                             const expectedClearState = rule.clearStateVal || "on";
                             if (clearStateObj.state.toLowerCase() === expectedClearState.toLowerCase()) {
                                 takeAck = true;
                             }
                         }
                     }
                }

                if (takeAck && existing) {
                     existing.ack = true;
                     newMap.set(index, existing);
                     return; // Alert is acknowledged/cleared visually, wait for trigger drop.
                }

                if (isTriggered) {
                    if (!existing) {
                        // Fresh trigger! Record the time it entered the map.
                        const initialClearObj = rule.clearEntityId ? statesDict[rule.clearEntityId] : null;
                        
                        let tTime = Date.now();
                        if (stateObj && stateObj.last_changed) {
                            const parsed = new Date(stateObj.last_changed).getTime();
                            if (!isNaN(parsed)) tTime = parsed;
                        }

                        existing = {
                            rule,
                            key: `alert-${index}-${Date.now()}`,
                            triggerTime: tTime,
                            configIndex: index,
                            initialClearLastChanged: initialClearObj?.last_changed
                        };
                    }
                    // Check standard duration expiration if triggered, ONLY if not explicitly 'entity'-only mode
                    if (rule.durationMinutes && rule.durationMinutes > 0 && rule.quitMode !== 'entity') {
                        const ageMinutes = (Date.now() - existing.triggerTime) / 60000;
                        if (ageMinutes > rule.durationMinutes) {
                            newMap.delete(index);
                            return; // Expired naturally
                        }
                    }
                    newMap.set(index, existing);
                } else {
                    // Trigger NOT met right now.
                    if (!existing) return;

                    if (rule.dropOnTriggerLoss) {
                        newMap.delete(index);
                        return;
                    }

                    if (rule.quitMode === 'time') {
                        // Only drop if time expired
                        if (rule.durationMinutes && rule.durationMinutes > 0) {
                            const ageMinutes = (Date.now() - existing.triggerTime) / 60000;
                            if (ageMinutes > rule.durationMinutes) {
                                newMap.delete(index);
                            }
                        }
                    } else if (rule.quitMode === 'entity') {
                        // Not cleared yet (takeAck=false). Wait for clear condition.
                        // Fallback: delete immediately if no clear entity is defined to prevent zombies
                        if (!rule.clearEntityId || rule.clearEntityId.trim() === "") {
                             newMap.delete(index); 
                        }
                    } else {
                        // Default "both" behavior
                        if (!rule.clearEntityId || rule.clearEntityId.trim() === "") {
                            newMap.delete(index);
                        } else {
                            if (rule.durationMinutes && rule.durationMinutes > 0) {
                                const ageMinutes = (Date.now() - existing.triggerTime) / 60000;
                                if (ageMinutes > rule.durationMinutes) {
                                    newMap.delete(index);
                                }
                            }
                        }
                    }
                }
            });

            return newMap;
        });
    }, [statesDict, rules]); // Re-evaluate whenever state or rules change

    // Convert map to sorted array, filtering out explicitly acked items
    let activeAlertArray = Array.from(persistedAlerts.values()).filter(a => !a.ack);
    
    // Sort by newest alerts first
    activeAlertArray.sort((a, b) => b.triggerTime - a.triggerTime);
    activeAlertArray = activeAlertArray.slice(0, maxNotifications);

    // Visibility: das Widget bleibt sichtbar, sobald entweder Alerts oder
    // (showTimers + Timer aktiv) etwas anzuzeigen haben. Da der DockedTimer-
    // Strip selbst die Timer-Liste hält, signalisieren wir hier nur Alerts —
    // der Strip rendert sich notfalls in ein sonst leeres Widget rein.
    // Auto-Hide schalten wir aber ab wenn der Nutzer Timer-Dock aktiv hat,
    // sonst klappt das ganze Widget weg sobald keine Alerts mehr da sind.
    useEffect(() => {
        if (!onVisibilityChange) return;
        if (Object.keys(statesDict).length === 0 && source === "rules") return;
        const hasAlerts = source === "rules"
          ? activeAlertArray.length > 0
          : haPersistent.filter((n) => !dismissedIds.has(n.entityId)).length > 0;
        // showTimers → Widget bleibt immer sichtbar (Timer-Karten erscheinen
        // dynamisch unter den Notifications, ohne dass das Host-Widget weggefadet wird).
        onVisibilityChange(hasAlerts || showTimers);
    }, [activeAlertArray.length, onVisibilityChange, statesDict, haPersistent, dismissedIds, source, showTimers]);

    const handleTap = async (rule: NotificationRule) => {
        const action = rule.tapAction || 'none';
        if (action === 'none') return;

        const targetEntity = action === 'toggle_custom' ? rule.tapActionEntity : rule.entityId;
        if (!targetEntity) return;

        try {
           await fetch('/api/ha/action', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ entityId: targetEntity, service: 'toggle' })
           });
           setTimeout(fetchState, 500);
        } catch (e) {
           console.error("Tap action failed", e);
        }
    };

    const dismissAlert = (alertKey: number) => {
        setPersistedAlerts(prev => {
            const next = new Map(prev);
            const existing = next.get(alertKey);
            if (existing) {
                existing.ack = true;
                next.set(alertKey, existing);
            }
            return next;
        });
    };

    const { cardOpacity, cardBlur, isLight, hasBg } = useGlassStyle(config);
    const isMinimal = config?.design === 'minimal';

    if (error) return <div className="text-red-400 text-xs text-center">{error}</div>;

    // Wenn Quelle = rules und Regeln noch nicht konfiguriert: Hinweis (auch dann
    // soll der Timer-Dock noch sichtbar sein, sonst hilft der Toggle nicht).
    const visiblePersistent = haPersistent.filter((n) => !dismissedIds.has(n.entityId));
    const hasAlerts =
        source === "rules"
            ? activeAlertArray.length > 0
            : visiblePersistent.length > 0;

    const hasTimers = showTimers && activeTimers.length > 0;

    if (source === "rules" && rules.length === 0 && !hasTimers) {
        return (
            <div className="text-white/50 text-[10px] uppercase text-center">
                Bitte Notification-Regeln im Editor konfigurieren
            </div>
        );
    }

    // Wirklich nichts da? → komplett verstecken (wie bisher).
    if (!hasAlerts && !hasTimers) return null;

    // ── Timer-Karte: visuell wie eine Notification, einfach unter den Alerts ──
    const renderTimerCard = (timer: DockedTimer) => {
        const { progress, isDone, clock } = timerClock(timer, nowMs);
        const accent = isDone ? "#f97316" : "#10b981";

        if (isMinimal) {
            return (
                <div key={`timer-${timer.id}`} className="flex gap-[0.8em] items-center mb-[0.6em] group">
                    <span
                        className="shrink-0 w-[4px] rounded-full self-stretch my-1"
                        style={{ backgroundColor: accent }}
                    />
                    <div className="flex items-center justify-center h-full opacity-90" style={{ color: accent }}>
                        <Icon icon="mdi:timer-outline" className="text-[1.8em]" />
                    </div>
                    <div className="flex flex-col flex-1 min-w-0 justify-center gap-[0.2em]">
                        <span
                            className={`font-bold leading-tight truncate ${isLight ? "text-black" : "text-white"}`}
                            style={{ fontSize: "1em" }}
                        >
                            {timer.label}
                        </span>
                        <div className="flex items-center gap-[0.5em]">
                            <div
                                className={`flex-1 h-[2px] rounded-full overflow-hidden ${
                                    isLight ? "bg-black/10" : "bg-white/15"
                                }`}
                            >
                                <div
                                    style={{
                                        width: `${progress * 100}%`,
                                        backgroundColor: accent,
                                        height: "100%",
                                        transition: "width 1s linear",
                                    }}
                                />
                            </div>
                            <span
                                className="font-mono tabular-nums tracking-tight"
                                style={{
                                    fontSize: "0.85em",
                                    color: isDone ? accent : isLight ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.85)",
                                }}
                            >
                                {isDone ? tr("FERTIG") : clock}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            dismissTimer(timer.id);
                        }}
                        className={`shrink-0 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center rounded-full ${
                            isLight ? "hover:bg-black/10 text-black/50" : "hover:bg-white/10 text-white/50"
                        }`}
                        title={tr("Timer beenden")}
                    >
                        <Icon icon="lucide:x" width={14} height={14} />
                    </button>
                </div>
            );
        }

        return (
            <div
                key={`timer-${timer.id}`}
                className={`group relative flex items-center justify-start gap-[0.8em] w-full rounded-3xl p-[0.6em] shrink-0 ${hasBg ? (isLight ? "border border-black/5" : "border border-white/10") : ""} ${hasBg ? "shadow-xl" : ""}`}
                style={{
                    backgroundColor: isLight ? `rgba(255,255,255,${cardOpacity / 100})` : `rgba(0,0,0,${cardOpacity / 100})`,
                    backdropFilter: cardBlur > 0 ? `blur(${cardBlur}px)` : "none",
                    boxShadow: hasBg ? `0 8px 32px ${accent}15` : "none",
                    borderLeft: hasBg ? `0.3em solid ${accent}` : "none",
                    animation: isDone ? "ha-timer-card-pulse 1.2s ease-in-out infinite" : undefined,
                }}
            >
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        dismissTimer(timer.id);
                    }}
                    className={`absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 flex items-center justify-center rounded-full ${
                        isLight ? "hover:bg-black/10 text-black/50" : "hover:bg-white/20 text-white/70"
                    } z-10`}
                    title={tr("Timer beenden")}
                >
                    <Icon icon="lucide:x" width={14} height={14} />
                </button>
                <div
                    className={`shrink-0 w-[3.2em] h-[3.2em] rounded-[0.8em] flex items-center justify-center relative overflow-hidden ${hasBg ? (isLight ? "border border-black/5" : "border border-white/5") : ""}`}
                    style={{ backgroundColor: `${accent}20` }}
                >
                    <div className="absolute inset-0 opacity-20 blur-md" style={{ backgroundColor: accent }} />
                    <Icon
                        icon="mdi:timer-outline"
                        className="relative z-10"
                        style={{ color: accent, fontSize: "1.4em" }}
                    />
                </div>
                <div className="flex flex-col min-w-0 flex-1 gap-[0.25em]">
                    <span
                        style={{ fontSize: "0.9em", color: isLight ? "rgba(0,0,0,0.9)" : "#fff" }}
                        className="font-bold tracking-tight leading-tight text-ellipsis whitespace-nowrap overflow-hidden"
                    >
                        {timer.label}
                    </span>
                    <div className="flex items-center gap-[0.5em]">
                        <div
                            className={`flex-1 h-[3px] rounded-full overflow-hidden ${
                                isLight ? "bg-black/10" : "bg-white/15"
                            }`}
                        >
                            <div
                                style={{
                                    width: `${progress * 100}%`,
                                    backgroundColor: accent,
                                    height: "100%",
                                    transition: "width 1s linear",
                                }}
                            />
                        </div>
                        <span
                            className="font-mono font-bold tracking-tight tabular-nums"
                            style={{
                                fontSize: "0.85em",
                                color: isDone ? accent : isLight ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.95)",
                            }}
                        >
                            {isDone ? "FERTIG" : clock}
                        </span>
                    </div>
                </div>
            </div>
        );
    };

    if (source === "persistent") {
        const visible = haPersistent.filter((n) => !dismissedIds.has(n.entityId)).slice(0, maxNotifications);
        return (
            <div className="flex flex-col gap-3 w-full h-full justify-start overflow-y-auto no-scrollbar pb-2" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                {visible.map((n) => {
                    const color = "#60A5FA";
                    const icon = "mdi:bell-ring";
                    const ageStr = n.createdAt ? formatNotifAge(new Date(n.createdAt), timeFormat, nowMs, locale) : "";
                    return (
                        <div
                            key={n.id}
                            className={`group relative flex items-start gap-[0.8em] w-full rounded-3xl p-[0.6em] shrink-0 ${hasBg ? (isLight ? 'border border-black/5' : 'border border-white/10') : ''} ${hasBg ? 'shadow-xl' : ''}`}
                            style={{
                                backgroundColor: isLight ? `rgba(255,255,255,${cardOpacity / 100})` : `rgba(0,0,0,${cardOpacity / 100})`,
                                backdropFilter: cardBlur > 0 ? `blur(${cardBlur}px)` : 'none',
                                boxShadow: hasBg ? `0 8px 32px ${color}15` : 'none',
                                borderLeft: hasBg ? `0.3em solid ${color}` : 'none',
                            }}
                        >
                            <button
                              onClick={(e) => { e.stopPropagation(); dismissHaPersistent(n.entityId); }}
                              className={`absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 flex items-center justify-center rounded-full ${isLight ? 'hover:bg-black/10 text-black/50' : 'hover:bg-white/20 text-white/70'} z-10`}
                              title={tr("Wegwischen (auch in HA)")}
                            >
                              <Icon icon="lucide:x" width={14} height={14} />
                            </button>
                            <div
                              className={`shrink-0 w-[3.2em] h-[3.2em] rounded-[0.8em] flex items-center justify-center relative overflow-hidden ${hasBg ? (isLight ? 'border border-black/5' : 'border border-white/5') : ''}`}
                              style={{ backgroundColor: `${color}20` }}
                            >
                              <div className="absolute inset-0 opacity-20 blur-md" style={{ backgroundColor: color }}></div>
                              <Icon icon={icon} className="relative z-10" style={{ color, fontSize: '1.4em' }} />
                            </div>
                            <div className="flex flex-col min-w-0 flex-1">
                              <span style={{ fontSize: '0.9em', color: isLight ? "rgba(0,0,0,0.9)" : "#fff" }} className="font-bold tracking-tight leading-tight text-ellipsis whitespace-nowrap overflow-hidden">
                                {n.title}
                              </span>
                              {n.message && (
                                <span style={{ fontSize: '0.75em', color: isLight ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.7)" }} className="leading-snug line-clamp-2 mt-0.5">
                                  {n.message}
                                </span>
                              )}
                              {ageStr && (
                                <span className="mt-1 font-mono uppercase tracking-wider text-ellipsis whitespace-nowrap overflow-hidden" style={{ fontSize: '0.65em', color: isLight ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.5)" }}>
                                  {ageStr}
                                </span>
                              )}
                            </div>
                        </div>
                    );
                })}
                {hasTimers && activeTimers.map(renderTimerCard)}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3 w-full h-full justify-start overflow-y-auto no-scrollbar pb-2" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
            {activeAlertArray.map((alert) => {
                const rule = alert.rule;
                const color = rule.color || "#F43F5E";
                const icon = rule.icon || "mdi:bell-ring";
                const timeString = formatNotifAge(new Date(alert.triggerTime), timeFormat, nowMs, locale);
                const isTappable = rule.tapAction && rule.tapAction !== 'none';

                if (isMinimal) {
                     return (
                       <div key={alert.key} className={`flex gap-[0.8em] items-center mb-[0.6em] transition-transform group ${isTappable ? 'cursor-pointer active:scale-95' : ''}`} onClick={() => handleTap(rule)}>
                         <span className={`shrink-0 w-[4px] rounded-full self-stretch my-1 ${isLight ? 'bg-black' : 'bg-white'}`} style={{ backgroundColor: color }}></span>
                         <div className="flex items-center justify-center h-full opacity-80" style={{ color: color }}>
                            <Icon icon={icon} className="text-[1.8em]" />
                         </div>
                         <div className="flex flex-col flex-1 min-w-0 justify-center">
                           <span className={`font-bold leading-tight truncate ${isLight ? 'text-black' : 'text-white'}`} style={{ fontSize: '1em' }}>
                               {rule.message || `${rule.entityId} Alert!`}
                           </span>
                           <span className={`text-[0.8em] ${isLight ? 'text-black/50' : 'text-white/50'}`}>{timeString}</span>
                         </div>
                         <button
                           onClick={(e) => { e.stopPropagation(); dismissAlert(alert.configIndex); }}
                           className={`shrink-0 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center rounded-full ${isLight ? 'hover:bg-black/10 text-black/50' : 'hover:bg-white/10 text-white/50'}`}
                           title={tr("Wegwischen")}
                         >
                           <Icon icon="lucide:x" width={14} height={14} />
                         </button>
                       </div>
                     );
                }

                return (
                    <div
                        key={alert.key}
                        onClick={() => handleTap(rule)}
                        className={`group relative flex items-center justify-start gap-[0.8em] w-full rounded-3xl p-[0.6em] transform transition-transform shrink-0 ${hasBg ? (isLight ? 'border border-black/5' : 'border border-white/10') : ''} ${hasBg ? 'shadow-xl' : ''} ${isTappable ? 'cursor-pointer active:scale-95' : ''}`}
                        style={{
                            backgroundColor: isLight ? `rgba(255,255,255,${cardOpacity / 100})` : `rgba(0,0,0,${cardOpacity / 100})`,
                            backdropFilter: cardBlur > 0 ? `blur(${cardBlur}px)` : 'none',
                            boxShadow: hasBg ? `0 8px 32px ${color}15` : 'none',
                            borderLeft: hasBg ? `0.3em solid ${color}` : 'none'
                        }}
                    >
                        <button
                          onClick={(e) => { e.stopPropagation(); dismissAlert(alert.configIndex); }}
                          className={`absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 flex items-center justify-center rounded-full ${isLight ? 'hover:bg-black/10 text-black/50' : 'hover:bg-white/20 text-white/70'} z-10`}
                          title={tr("Wegwischen")}
                        >
                          <Icon icon="lucide:x" width={14} height={14} />
                        </button>
                        <div 
                           className={`shrink-0 w-[3.2em] h-[3.2em] rounded-[0.8em] flex items-center justify-center relative overflow-hidden transition-colors duration-500 ${hasBg ? (isLight ? 'border border-black/5' : 'border border-white/5') : ''}`} 
                           style={{ backgroundColor: `${color}20` }}
                        >
                            <div className="absolute inset-0 opacity-20 blur-md" style={{ backgroundColor: color }}></div>
                            <Icon icon={icon} className="relative z-10" style={{ color, fontSize: '1.4em' }} />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                            <span style={{ fontSize: '0.9em', color: isLight ? "rgba(0,0,0,0.9)" : "#fff" }} className="font-bold tracking-tight leading-tight text-ellipsis whitespace-nowrap overflow-hidden">
                                {rule.message || `${rule.entityId} Alert!`}
                            </span>
                            <span className="flex items-baseline gap-[0.3em] font-mono uppercase tracking-wider mt-[0.2em] text-ellipsis whitespace-nowrap overflow-hidden" style={{ fontSize: '0.7em', color: isLight ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.5)" }}>
                                {timeString}
                            </span>
                        </div>
                    </div>
                );
            })}
            {hasTimers && activeTimers.map(renderTimerCard)}
        </div>
    );
}
