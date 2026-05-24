"use client";

import { useEffect, useState } from "react";
import { parseISO, isToday, isTomorrow, isValid, format } from "date-fns";
import { de, enUS } from "date-fns/locale";
import { useLocale } from "@/lib/i18n/LocaleProvider";

type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  isAllDay: boolean;
  feedId?: string;
  feedColor?: string;
};

type FeedConfig = {
  id?: string;
  label?: string;
  color?: string;
  type?: "ical" | "google" | "microsoft";
  url?: string;
  accountId?: string;
  calendarId?: string;
};

const isValidFeed = (f: any): boolean => {
  if (!f || typeof f !== "object") return false;
  const type = f.type ?? "ical";
  if (type === "ical") return typeof f.url === "string" && f.url.trim() !== "";
  return typeof f.accountId === "string" && f.accountId.trim() !== "";
};

export default function CalendarWidget({ config, onVisibilityChange }: { config?: any, onVisibilityChange?: (isVisible: boolean) => void }) {
  const { locale, t } = useLocale();
  const dfLocale = locale === "en" ? enUS : de;
  // Feeds-Array bevorzugen, Legacy icalUrl als Single-Feed fallback.
  const rawFeeds: FeedConfig[] = Array.isArray(config?.feeds)
    ? config.feeds.filter(isValidFeed)
    : [];
  const feeds: FeedConfig[] =
    rawFeeds.length > 0
      ? rawFeeds
      : config?.icalUrl
        ? [{ type: "ical", url: config.icalUrl, label: "Kalender", color: config?.color || config?.accentColor }]
        : [];

  const limit = config?.limit ? Number(config.limit) : 5;
  const days = config?.days ? Number(config.days) : 30;
  const feedsKey = JSON.stringify(feeds);
  const accentColor = config?.color || config?.accentColor || "#ffffff";
  const hideOnEmpty = config?.hideOnEmpty || false;

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (feeds.length === 0) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    const fetchEvents = async () => {
      try {
        const url = new URL("/api/calendar", window.location.origin);
        url.searchParams.set("feeds", JSON.stringify(feeds));
        url.searchParams.set("limit", String(limit));
        url.searchParams.set("days", String(days));
        const res = await fetch(url.toString(), { signal: controller.signal });
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        if (cancelled) return;
        const evts: CalendarEvent[] = data.events || [];
        setEvents(evts);
        setError(null);

        if (hideOnEmpty && evts.length === 0) {
          onVisibilityChange?.(false);
        } else {
          onVisibilityChange?.(true);
        }
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        if (!cancelled) {
          setError(t("Kalender konnte nicht geladen werden"));
          onVisibilityChange?.(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchEvents();
    const interval = setInterval(fetchEvents, 15 * 60 * 1000);
    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedsKey, limit, days, hideOnEmpty]);

  if (feeds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full text-white/50 text-[0.8em] text-center p-4">
        {t("Bitte Kalender-URL(s) im Editor hinterlegen")}
      </div>
    );
  }

  if (loading) {
     return (
        <div className="flex flex-col items-center justify-center w-full h-full text-white/50 text-[0.8em] animate-pulse">
           {t("Kalender wird gesammelt...")}
        </div>
     );
  }

  return (
    <div className="flex flex-col drop-shadow-md mt-[1em] w-full h-full justify-center overflow-hidden relative">
      <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col justify-start" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
        {events.length === 0 && !error && !hideOnEmpty && (
            <div className="opacity-50 text-[0.8em] mt-2">{t("Keine anstehenden Termine")}</div>
        )}
        {error && (
            <div className="text-red-400/80 text-[0.8em] mt-2">{error}</div>
        )}

        {events.map((ev) => {
          const startDate = parseISO(ev.start);
          if (!isValid(startDate)) return null;

          let dayLabel: string;
          if (isToday(startDate)) dayLabel = t("Heute");
          else if (isTomorrow(startDate)) dayLabel = t("Morgen");
          else dayLabel = format(startDate, "eee", { locale: dfLocale });

          const dateLabel = format(startDate, "d");
          const timeStr = ev.isAllDay ? t("Ganztägig") : format(startDate, "HH:mm");
          const cardOpacity = config?.cardOpacity !== undefined ? config.cardOpacity : 40;
          const hasBg = cardOpacity > 0;
          const isMinimal = config?.design === 'minimal';
          const eventColor = ev.feedColor || accentColor;
          const accentColorForEvent = eventColor;

          if (isMinimal) {
             return (
               <div key={ev.id} className="flex gap-[0.8em] items-baseline mb-[0.6em]">
                 <span className="shrink-0 w-[4px] bg-white rounded-full self-stretch my-1" style={{ backgroundColor: accentColorForEvent }}></span>
                 <div className="flex flex-col min-w-0" style={{ width: '4.5em' }}>
                   <span className="opacity-80 leading-tight uppercase font-medium tracking-wider" style={{ fontSize: '0.8em' }}>{dayLabel}</span>
                   <span className="font-bold leading-none tracking-tighter" style={{ fontSize: '1.8em' }}>{dateLabel}</span>
                 </div>
                 <div className="flex flex-col flex-1 min-w-0 justify-center">
                   <span className="font-bold leading-tight truncate" style={{ fontSize: '1em' }}>{ev.title}</span>
                   <span className="text-white/50 text-[0.8em]">{timeStr}</span>
                 </div>
               </div>
             );
          }

          // Ensure color uses proper parsing if needed, but styling allows raw hex
          return (
            <div key={ev.id} 
                 className={`flex items-center justify-start gap-[0.8em] w-full rounded-3xl p-[0.6em] transform transition-all hover:scale-[1.02] shrink-0 mb-[0.8em] ${hasBg ? 'backdrop-blur-md border border-white/10 shadow-xl' : ''}`}
                 style={{ backgroundColor: `rgba(0,0,0,${cardOpacity / 100})`, boxShadow: hasBg ? `0 8px 32px ${accentColorForEvent}15` : 'none', borderLeft: hasBg ? `0.3em solid ${accentColorForEvent}` : 'none' }}
            >
                <div 
                   className={`shrink-0 w-[3.2em] h-[3.2em] rounded-[0.8em] flex flex-col items-center justify-center relative overflow-hidden ${hasBg ? 'border border-white/5' : ''}`} 
                   style={{ backgroundColor: `rgba(0,0,0,${cardOpacity / 100})` }}
                >
                    <div className="absolute inset-0 opacity-20 blur-md" style={{ backgroundColor: accentColorForEvent }}></div>
                    <span className="relative z-10 text-[1.2em] font-bold tracking-tight leading-none">{dateLabel}</span>
                    <span className="relative z-10 text-[0.6em] uppercase tracking-wider opacity-80 mt-[0.2em]" style={{ color: accentColorForEvent }}>{dayLabel}</span>
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-bold tracking-tight text-[0.9em] leading-tight text-ellipsis whitespace-nowrap overflow-hidden">
                        {ev.title}
                    </span>
                    <span className="text-white/50 text-[0.7em] font-mono tracking-wider uppercase mt-[0.2em]">
                        {timeStr}
                    </span>
                </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
