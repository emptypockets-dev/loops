import { z } from "zod";
import type { CalendarEventDto, CalendarFailureCode } from "../../lib/calendar/types";

/**
 * Google Calendar via Clerk-managed OAuth. Runs only inside Convex actions.
 *
 * No tokens are ever stored in Convex: each call fetches a fresh access token
 * from Clerk's Backend API (Clerk refreshes it as needed), uses it once, and
 * drops it. Requires CLERK_SECRET_KEY on the Convex deployment and the
 * `https://www.googleapis.com/auth/calendar.events` scope on Clerk's Google
 * connection (see README).
 */

const CLERK_API_BASE = "https://api.clerk.com/v1";
const GOOGLE_CALENDAR_BASE = "https://www.googleapis.com/calendar/v3";

export const CONNECT_CALENDAR_HINT =
  "Connect Google (with calendar access) from your avatar menu → Manage account → Connected accounts.";

export type GoogleResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: CalendarFailureCode; error: string };

// ── Clerk token lookup ───────────────────────────────────────────────────────

const oauthTokenSchema = z.object({
  token: z.string().min(1),
  scopes: z.array(z.string()).nullish(),
});

/** Clerk has returned both a bare array and a { data: [...] } envelope across API versions. */
export function parseClerkTokenResponse(
  json: unknown
): { token: string; scopes: string[] | null } | null {
  let list: unknown[] | null = null;
  if (Array.isArray(json)) {
    list = json;
  } else if (typeof json === "object" && json !== null) {
    const data = (json as Record<string, unknown>).data;
    if (Array.isArray(data)) list = data;
  }
  if (!list || list.length === 0) return null;
  const parsed = oauthTokenSchema.safeParse(list[0]);
  if (!parsed.success) return null;
  return { token: parsed.data.token, scopes: parsed.data.scopes ?? null };
}

export async function getGoogleAccessToken(clerkUserId: string): Promise<GoogleResult<string>> {
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) {
    return {
      ok: false,
      code: "not_connected",
      error:
        "Calendar isn't configured yet — set CLERK_SECRET_KEY on the Convex deployment (see README).",
    };
  }

  try {
    const response = await fetch(
      `${CLERK_API_BASE}/users/${clerkUserId}/oauth_access_tokens/oauth_google`,
      { headers: { Authorization: `Bearer ${secret}` } }
    );
    if (response.status === 404) {
      return {
        ok: false,
        code: "not_connected",
        error: `No Google account is connected. ${CONNECT_CALENDAR_HINT}`,
      };
    }
    if (!response.ok) {
      console.error("Clerk token fetch failed", response.status, await response.text());
      return { ok: false, code: "error", error: "Couldn't reach your account provider. Try again." };
    }

    const parsed = parseClerkTokenResponse(await response.json());
    if (!parsed) {
      return {
        ok: false,
        code: "not_connected",
        error: `No Google account is connected. ${CONNECT_CALENDAR_HINT}`,
      };
    }
    // When Clerk reports granted scopes, require calendar access among them.
    if (parsed.scopes && !parsed.scopes.some((s) => s.includes("auth/calendar"))) {
      return {
        ok: false,
        code: "not_connected",
        error: `Google is connected but without calendar access. Reconnect after enabling the calendar scope — ${CONNECT_CALENDAR_HINT}`,
      };
    }
    return { ok: true, data: parsed.token };
  } catch (err) {
    console.error("Clerk token fetch threw", err);
    return { ok: false, code: "error", error: "Couldn't reach your account provider. Try again." };
  }
}

// ── Google Calendar API ──────────────────────────────────────────────────────

const googleEventSchema = z.object({
  id: z.string().optional(),
  status: z.string().optional(),
  summary: z.string().optional(),
  location: z.string().optional(),
  htmlLink: z.string().optional(),
  start: z.object({ dateTime: z.string().optional(), date: z.string().optional() }).optional(),
  end: z.object({ dateTime: z.string().optional(), date: z.string().optional() }).optional(),
});

/** Map Google's events payload to slim DTOs, skipping cancelled/malformed items. */
export function parseGoogleEventsResponse(json: unknown): CalendarEventDto[] {
  if (typeof json !== "object" || json === null) return [];
  const items = (json as Record<string, unknown>).items;
  if (!Array.isArray(items)) return [];

  const events: CalendarEventDto[] = [];
  for (const item of items) {
    const parsed = googleEventSchema.safeParse(item);
    if (!parsed.success) continue;
    const event = parsed.data;
    if (event.status === "cancelled") continue;
    const startIso = event.start?.dateTime ?? event.start?.date;
    const endIso = event.end?.dateTime ?? event.end?.date ?? startIso;
    if (!startIso || !endIso) continue;
    events.push({
      id: event.id ?? `${startIso}-${event.summary ?? ""}`,
      title: event.summary?.trim() || "(untitled)",
      startIso,
      endIso,
      allDay: !event.start?.dateTime,
      location: event.location?.trim() || undefined,
      link: event.htmlLink,
    });
  }
  return events;
}

function googleAuthFailure(status: number): GoogleResult<never> {
  if (status === 401 || status === 403) {
    return {
      ok: false,
      code: "not_connected",
      error: `Google declined calendar access — reconnect with calendar permission. ${CONNECT_CALENDAR_HINT}`,
    };
  }
  return { ok: false, code: "error", error: `Google Calendar returned an error (${status}). Try again.` };
}

export async function listEvents(
  accessToken: string,
  timeMinIso: string,
  timeMaxIso: string
): Promise<GoogleResult<CalendarEventDto[]>> {
  try {
    const params = new URLSearchParams({
      timeMin: timeMinIso,
      timeMax: timeMaxIso,
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "25",
    });
    const response = await fetch(
      `${GOOGLE_CALENDAR_BASE}/calendars/primary/events?${params.toString()}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!response.ok) {
      console.error("Google Calendar list failed", response.status, await response.text());
      return googleAuthFailure(response.status);
    }
    return { ok: true, data: parseGoogleEventsResponse(await response.json()) };
  } catch (err) {
    console.error("Google Calendar list threw", err);
    return { ok: false, code: "error", error: "Couldn't reach Google Calendar. Try again." };
  }
}

export async function insertEvent(
  accessToken: string,
  input: { title: string; description?: string; startIso: string; endIso: string }
): Promise<GoogleResult<{ eventId: string; link?: string }>> {
  try {
    const response = await fetch(`${GOOGLE_CALENDAR_BASE}/calendars/primary/events`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: input.title,
        description: input.description,
        start: { dateTime: input.startIso },
        end: { dateTime: input.endIso },
      }),
    });
    if (!response.ok) {
      console.error("Google Calendar insert failed", response.status, await response.text());
      return googleAuthFailure(response.status);
    }
    const json = (await response.json()) as { id?: unknown; htmlLink?: unknown };
    const eventId = typeof json.id === "string" ? json.id : null;
    if (!eventId) {
      return { ok: false, code: "error", error: "Google Calendar returned an unexpected response." };
    }
    return {
      ok: true,
      data: { eventId, link: typeof json.htmlLink === "string" ? json.htmlLink : undefined },
    };
  } catch (err) {
    console.error("Google Calendar insert threw", err);
    return { ok: false, code: "error", error: "Couldn't reach Google Calendar. Nothing was created." };
  }
}

/** Token + list in one call — the shape the daily brief needs (best-effort). */
export async function fetchEventsForWindow(
  clerkUserId: string,
  timeMinIso: string,
  timeMaxIso: string
): Promise<GoogleResult<CalendarEventDto[]>> {
  const token = await getGoogleAccessToken(clerkUserId);
  if (!token.ok) return token;
  return await listEvents(token.data, timeMinIso, timeMaxIso);
}
