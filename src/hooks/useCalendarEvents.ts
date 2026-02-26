import { useState, useEffect, useCallback } from "react";
import type { CalendarEvent } from "../types/calendar";
import { fetchTodayEvents } from "../lib/googleCalendar";

const REFRESH_INTERVAL = 30 * 60 * 1000;

interface UseCalendarEventsReturn {
  readonly events: readonly CalendarEvent[];
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly refresh: () => Promise<void>;
}

export function useCalendarEvents(
  getValidAccessToken: () => Promise<string | null>,
  isLoggedIn: boolean,
): UseCalendarEventsReturn {
  const [events, setEvents] = useState<readonly CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const token = await getValidAccessToken();
    if (!token) return;

    setIsLoading(true);
    setError(null);
    try {
      const fetched = await fetchTodayEvents(token);
      setEvents(fetched);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch events");
    } finally {
      setIsLoading(false);
    }
  }, [getValidAccessToken]);

  useEffect(() => {
    if (!isLoggedIn) {
      setEvents([]);
      return;
    }
    refresh();
    const id = setInterval(refresh, REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [isLoggedIn, refresh]);

  return { events, isLoading, error, refresh };
}
