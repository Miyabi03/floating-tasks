import type { CalendarEvent } from "../types/calendar";

const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

export async function fetchTodayEvents(
  accessToken: string,
): Promise<readonly CalendarEvent[]> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const params = new URLSearchParams({
    timeMin: startOfDay.toISOString(),
    timeMax: endOfDay.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "50",
  });

  const res = await fetch(
    `${CALENDAR_API}/calendars/primary/events?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Calendar API error: ${text}`);
  }

  const data = await res.json();

  return (data.items ?? []).map(
    (item: Record<string, unknown>): CalendarEvent => {
      const start = item.start as
        | { dateTime?: string; date?: string }
        | undefined;
      const end = item.end as
        | { dateTime?: string; date?: string }
        | undefined;
      const isAllDay = !start?.dateTime;

      return {
        id: item.id as string,
        summary: (item.summary as string) ?? "(No title)",
        start: start?.dateTime ?? start?.date ?? "",
        end: end?.dateTime ?? end?.date ?? "",
        isAllDay,
        htmlLink: item.htmlLink as string | undefined,
      };
    },
  );
}
