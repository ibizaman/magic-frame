import "server-only";
import { getFreshAccessToken } from "./store";

export type ProviderEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  isAllDay: boolean;
};

export type ProviderCalendar = {
  id: string;
  summary: string;
  primary?: boolean;
  backgroundColor?: string;
};

export async function fetchGoogleEvents(params: {
  userId: string;
  accountId: string;
  calendarId: string;
  windowStart: Date;
  windowEnd: Date;
  limit: number;
}): Promise<ProviderEvent[]> {
  const token = await getFreshAccessToken(params.accountId, params.userId);
  if (!token) throw new Error("no_token");

  const cal = encodeURIComponent(params.calendarId || "primary");
  const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${cal}/events`);
  url.searchParams.set("timeMin", params.windowStart.toISOString());
  url.searchParams.set("timeMax", params.windowEnd.toISOString());
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("maxResults", String(Math.max(params.limit, 25)));

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`google_http_${res.status}:${body.slice(0, 120)}`);
  }
  const data = await res.json();
  const items = Array.isArray(data.items) ? data.items : [];
  return items.map((ev: any) => {
    const isAllDay = !!ev.start?.date;
    const start = ev.start?.dateTime ?? (ev.start?.date ? `${ev.start.date}T00:00:00` : null);
    const end = ev.end?.dateTime ?? (ev.end?.date ? `${ev.end.date}T00:00:00` : null);
    return {
      id: ev.id,
      title: ev.summary ?? "(kein Titel)",
      start: start ? new Date(start).toISOString() : new Date().toISOString(),
      end: end ? new Date(end).toISOString() : new Date().toISOString(),
      isAllDay,
    };
  });
}

export async function fetchGoogleCalendars(params: {
  userId: string;
  accountId: string;
}): Promise<ProviderCalendar[]> {
  const token = await getFreshAccessToken(params.accountId, params.userId);
  if (!token) throw new Error("no_token");

  const res = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`google_http_${res.status}`);
  const data = await res.json();
  const items = Array.isArray(data.items) ? data.items : [];
  return items.map((c: any) => ({
    id: c.id,
    summary: c.summaryOverride || c.summary || c.id,
    primary: !!c.primary,
    backgroundColor: c.backgroundColor,
  }));
}

export async function fetchMicrosoftEvents(params: {
  userId: string;
  accountId: string;
  calendarId: string;
  windowStart: Date;
  windowEnd: Date;
  limit: number;
}): Promise<ProviderEvent[]> {
  const token = await getFreshAccessToken(params.accountId, params.userId);
  if (!token) throw new Error("no_token");

  const calPath = params.calendarId
    ? `me/calendars/${encodeURIComponent(params.calendarId)}/calendarView`
    : `me/calendarView`;
  const url = new URL(`https://graph.microsoft.com/v1.0/${calPath}`);
  url.searchParams.set("startDateTime", params.windowStart.toISOString());
  url.searchParams.set("endDateTime", params.windowEnd.toISOString());
  url.searchParams.set("$top", String(Math.max(params.limit, 25)));
  url.searchParams.set("$orderby", "start/dateTime");
  url.searchParams.set(
    "$select",
    "id,subject,start,end,isAllDay,showAs",
  );

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Prefer: 'outlook.timezone="UTC"',
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ms_http_${res.status}:${body.slice(0, 120)}`);
  }
  const data = await res.json();
  const items = Array.isArray(data.value) ? data.value : [];
  return items.map((ev: any) => {
    const start = ev.start?.dateTime ? `${ev.start.dateTime}Z` : null;
    const end = ev.end?.dateTime ? `${ev.end.dateTime}Z` : null;
    return {
      id: ev.id,
      title: ev.subject ?? "(kein Titel)",
      start: start ? new Date(start).toISOString() : new Date().toISOString(),
      end: end ? new Date(end).toISOString() : new Date().toISOString(),
      isAllDay: !!ev.isAllDay,
    };
  });
}

export async function fetchMicrosoftCalendars(params: {
  userId: string;
  accountId: string;
}): Promise<ProviderCalendar[]> {
  const token = await getFreshAccessToken(params.accountId, params.userId);
  if (!token) throw new Error("no_token");

  const res = await fetch("https://graph.microsoft.com/v1.0/me/calendars", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`ms_http_${res.status}`);
  const data = await res.json();
  const items = Array.isArray(data.value) ? data.value : [];
  return items.map((c: any) => ({
    id: c.id,
    summary: c.name ?? c.id,
    primary: !!c.isDefaultCalendar,
    backgroundColor: c.hexColor,
  }));
}
