export interface CalendarEvent {
  readonly id: string;
  readonly summary: string;
  readonly start: string;
  readonly end: string;
  readonly isAllDay: boolean;
  readonly htmlLink?: string;
}

export interface GoogleTokens {
  readonly accessToken: string;
  readonly refreshToken: string | null;
  readonly expiresAt: number;
}

