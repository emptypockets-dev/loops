/** Client-safe calendar types shared by Convex actions and the UI. */

export interface CalendarEventDto {
  id: string;
  title: string;
  startIso: string;
  endIso: string;
  allDay: boolean;
  location?: string;
  link?: string;
}

export type CalendarFailureCode = "not_connected" | "error";

export type CalendarListResult =
  | { ok: true; events: CalendarEventDto[] }
  | { ok: false; code: CalendarFailureCode; error: string };

export type CalendarWriteResult =
  | { ok: true; eventId: string; link?: string }
  | { ok: false; code: CalendarFailureCode; error: string };
