/**
 * Month Calendar — standalone custom module.
 *
 * Build:  node scripts/build-module.mjs examples/modules/monthcalendar/monthcalendar-widget.js examples/modules/monthcalendar/dist
 * Upload: the resulting module.json + bundle.js via Settings → Modules → "Upload module".
 *
 * This calls this same server's own /api/calendar endpoint (via ctx.fetch),
 * so it automatically benefits from every server-side fix already made
 * there (recurring-event/edit dedup, correct cache keying, past-events
 * support, etc.) without duplicating any of that logic here.
 */

import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  isSameDay,
  addDays,
  parseISO,
  isValid,
  format,
  differenceInCalendarDays,
} from "date-fns";

export const manifest = {
  type: "month-calendar",
  label: "Month Calendar",
  description:
    "Week-by-week month view of one or more iCal feeds — calendar-month or rolling-weeks mode, with multi-day events, dimmed past days, and configurable feed colors.",
  iconEmoji: "🗓️",
  version: "1.0.0",
  author: "Keiran",
  fields: [
    {
      key: "feedsText",
      label: "Calendar feeds",
      type: "textarea",
      placeholder: "Label|Color|https://example.com/feed.ics\nHoliday|#22c55e|https://...",
      help:
        "One feed per line: Label|Color|URL (color as #rrggbb). Label and color are optional — a bare URL on its own line also works, using a default label/color.",
      required: true,
    },
    {
      key: "rollingMode",
      label: "Rolling weeks (instead of calendar month)",
      type: "boolean",
      default: false,
      help: "Off = classic calendar month, resets on the 1st. On = always shows a fixed number of weeks starting from the current week, moving forward continuously.",
    },
    {
      key: "rollingWeeks",
      label: "Number of weeks (rolling mode only)",
      type: "number",
      default: 5,
    },
    {
      key: "startOnSunday",
      label: "Week starts on Sunday (instead of Monday)",
      type: "boolean",
      default: false,
    },
    {
      key: "maxEventsPerDay",
      label: "Max events shown per day",
      type: "number",
      default: 3,
    },
    {
      key: "cardOpacity",
      label: "Day cell background opacity (0-100)",
      type: "number",
      default: 25,
    },
    {
      key: "accentColor",
      label: "Default accent color (used for feeds without their own color)",
      type: "color",
      default: "#8B5CF6",
    },
  ],
};

// Parses the feeds textarea into the same {label,color,type,url}[] shape
// the server's /api/calendar endpoint expects.
function parseFeedsText(text) {
  if (!text) return [];
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, i) => {
      const parts = line.split("|").map((p) => p.trim());
      if (parts.length === 1) {
        return { id: `feed-${i}`, type: "ical", url: parts[0], label: `Calendar ${i + 1}` };
      }
      const [label, color, url] = parts;
      return { id: `feed-${i}`, type: "ical", label: label || `Calendar ${i + 1}`, color: color || undefined, url };
    })
    .filter((f) => f.url);
}

export default function render(ctx) {
  const h = ctx.createElement;
  const { useState, useEffect, useMemo } = ctx;

  const feeds = useMemo(() => parseFeedsText(ctx.config.feedsText), [ctx.config.feedsText]);
  const feedsKey = JSON.stringify(feeds);
  const accentColor = ctx.config.accentColor || "#8B5CF6";
  const weekStartsOn = ctx.config.startOnSunday ? 0 : 1;
  const maxEventsPerDay = ctx.config.maxEventsPerDay ? Number(ctx.config.maxEventsPerDay) : 3;
  const cardOpacity = ctx.config.cardOpacity !== undefined ? Number(ctx.config.cardOpacity) : 25;
  const viewMode = ctx.config.rollingMode ? "rolling" : "month";
  const rollingWeeks = ctx.config.rollingWeeks ? Math.max(2, Number(ctx.config.rollingWeeks)) : 5;

  const feedOrderIndex = useMemo(() => {
    const map = new Map();
    feeds.forEach((f, i) => map.set(f.id ?? `feed-${i}`, i));
    return map;
  }, [feedsKey]);

  const [referenceDate, setReferenceDate] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => {
      const now = new Date();
      if (!isSameDay(now, referenceDate)) setReferenceDate(now);
    }, 60 * 1000);
    return () => clearInterval(id);
  }, [referenceDate]);

  const gridStart = useMemo(() => {
    if (viewMode === "rolling") return startOfWeek(referenceDate, { weekStartsOn });
    return startOfWeek(startOfMonth(referenceDate), { weekStartsOn });
  }, [referenceDate, weekStartsOn, viewMode]);
  const gridEnd = useMemo(() => {
    if (viewMode === "rolling") {
      const start = startOfWeek(referenceDate, { weekStartsOn });
      const raw = new Date(start);
      raw.setDate(raw.getDate() + rollingWeeks * 7 - 1);
      return raw;
    }
    return endOfWeek(endOfMonth(referenceDate), { weekStartsOn });
  }, [referenceDate, weekStartsOn, viewMode, rollingWeeks]);
  const days = useMemo(() => eachDayOfInterval({ start: gridStart, end: gridEnd }), [gridStart, gridEnd]);
  const numRows = days.length / 7;

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (feeds.length === 0) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    let cancelled = false;

    const fetchEvents = async () => {
      try {
        const fetchStart = addDays(gridStart, -7);
        const url = new URL("/api/calendar", window.location.origin);
        url.searchParams.set("feeds", JSON.stringify(feeds));
        url.searchParams.set("limit", "300");
        url.searchParams.set("start", format(fetchStart, "yyyy-MM-dd"));
        url.searchParams.set("days", String(differenceInCalendarDays(gridEnd, fetchStart) + 1));
        const res = await ctx.fetch(url.toString(), { signal: controller.signal });
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        if (cancelled) return;
        setEvents(data.events || []);
        setError(null);
      } catch (err) {
        if (err && err.name === "AbortError") return;
        if (!cancelled) setError("Calendar could not be loaded");
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
  }, [feedsKey, gridStart.getTime(), gridEnd.getTime()]);

  const eventsByDay = useMemo(() => {
    const map = new Map();
    const gridDayKeys = days.map((d) => format(d, "yyyy-MM-dd"));
    for (const ev of events) {
      const start = parseISO(ev.start);
      const end = parseISO(ev.end);
      if (!isValid(start)) continue;
      let lastDay = isValid(end) ? end : start;
      if (ev.isAllDay && isValid(end)) lastDay = addDays(end, -1);
      const startKey = format(start, "yyyy-MM-dd");
      const lastKey = format(lastDay, "yyyy-MM-dd");
      if (startKey === lastKey) {
        if (gridDayKeys.includes(startKey)) {
          const list = map.get(startKey) ?? [];
          list.push(ev);
          map.set(startKey, list);
        }
        continue;
      }
      for (const key of gridDayKeys) {
        if (key >= startKey && key <= lastKey) {
          const list = map.get(key) ?? [];
          list.push(ev);
          map.set(key, list);
        }
      }
    }
    return map;
  }, [events, days]);

  const weekdayLabels = useMemo(() => days.slice(0, 7).map((d) => format(d, "eee")), [days]);

  if (feeds.length === 0) {
    return h(
      "div",
      { className: "flex flex-col items-center justify-center w-full h-full text-white/50 text-[0.8em] text-center p-4" },
      "Add one or more calendar feed URLs in this widget's settings.",
    );
  }

  if (loading) {
    return h(
      "div",
      { className: "flex flex-col items-center justify-center w-full h-full text-white/50 text-[0.8em] animate-pulse" },
      "Collecting calendar…",
    );
  }

  return h(
    "div",
    { className: "flex flex-col w-full h-full overflow-hidden" },
    error && h("div", { className: "text-red-400/80 text-[0.7em] mb-1 shrink-0" }, error),
    h(
      "div",
      { className: "grid grid-cols-7 gap-[0.3em] shrink-0 mb-[0.3em]" },
      weekdayLabels.map((label, i) =>
        h(
          "div",
          { key: i, className: "text-center text-[0.65em] uppercase tracking-wider opacity-50 font-medium" },
          label,
        ),
      ),
    ),
    h(
      "div",
      {
        className: "grid grid-cols-7 gap-[0.3em] flex-1 min-h-0",
        style: { gridTemplateRows: `repeat(${numRows}, minmax(0, 1fr))` },
      },
      days.map((day) => {
        const key = format(day, "yyyy-MM-dd");
        const inMonth = viewMode === "rolling" ? true : isSameMonth(day, referenceDate);
        const isFirstOfMonth = day.getDate() === 1;
        const today = isToday(day);
        const isPastDay = !today && day.getTime() < new Date().setHours(0, 0, 0, 0);

        const dayEvents = (eventsByDay.get(key) ?? []).slice().sort((a, b) => {
          const orderA = feedOrderIndex.get(a.feedId ?? "") ?? 999;
          const orderB = feedOrderIndex.get(b.feedId ?? "") ?? 999;
          if (orderA !== orderB) return orderA - orderB;
          return new Date(a.start).getTime() - new Date(b.start).getTime();
        });
        const shown = dayEvents.slice(0, maxEventsPerDay);
        const overflow = dayEvents.length - shown.length;

        return h(
          "div",
          {
            key,
            className: `rounded-lg p-[0.25em] flex flex-col min-h-0 min-w-0 overflow-hidden ${today ? "border border-white/25" : ""}`,
            style: {
              backgroundColor: `rgba(0,0,0,${(today ? cardOpacity + 15 : cardOpacity) / 100})`,
              opacity: !inMonth ? 0.35 : isPastDay ? 0.6 : 1,
            },
          },
          h(
            "div",
            {
              className: "text-[0.75em] font-bold leading-none mb-[0.2em] shrink-0",
              style: today ? { color: accentColor } : undefined,
            },
            isFirstOfMonth ? `${format(day, "MMM")} ${format(day, "d")}` : format(day, "d"),
          ),
          h(
            "div",
            { className: "flex flex-col gap-[0.15em] min-h-0 overflow-hidden" },
            shown.map((ev) => {
              const isStartDay = isSameDay(parseISO(ev.start), day);
              return h(
                "div",
                {
                  key: ev.id,
                  className: "text-[0.6em] leading-tight truncate rounded px-[0.3em] py-[0.05em] flex items-center gap-[0.25em]",
                  style: {
                    backgroundColor: `${ev.feedColor || accentColor}30`,
                    color: "rgba(255,255,255,0.9)",
                    borderLeft: !isPastDay ? `2px solid ${ev.feedColor || accentColor}` : "none",
                    opacity: isPastDay ? 0.55 : 1,
                  },
                  title: ev.title,
                },
                !isStartDay &&
                  h("span", {
                    className: "shrink-0",
                    style: {
                      width: 0,
                      height: 0,
                      borderTop: "0.3em solid transparent",
                      borderBottom: "0.3em solid transparent",
                      borderLeft: "0.35em solid rgba(255,255,255,0.6)",
                    },
                  }),
                h("span", { className: "truncate" }, ev.title),
              );
            }),
            overflow > 0 &&
              h("div", { className: "text-[0.55em] opacity-60 leading-none px-[0.3em]" }, `+${overflow} more`),
          ),
        );
      }),
    ),
  );
}
