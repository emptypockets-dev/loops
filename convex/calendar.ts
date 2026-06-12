import { v } from "convex/values";
import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import type { CalendarListResult, CalendarWriteResult } from "../lib/calendar/types";
import { getGoogleAccessToken, insertEvent, listEvents } from "./lib/googleCalendar";
import { logAudit } from "./lib/audit";

/**
 * Google Calendar surface, Clerk-managed OAuth (see convex/lib/googleCalendar).
 *
 * Write rules follow the approval matrix: the user blocking time themselves
 * is a direct action (the click IS the approval); AI-proposed calendar drafts
 * only reach Google through `scheduleDraft`, i.e. after explicit approval
 * with a user-chosen time. Loops never writes to the calendar on its own.
 */

const MAX_LIST_WINDOW_MS = 48 * 60 * 60 * 1000;
const MAX_EVENT_DURATION_MS = 24 * 60 * 60 * 1000;

function parseRange(
  startIso: string,
  endIso: string,
  maxSpanMs: number
): { startMs: number; endMs: number } | null {
  const startMs = Date.parse(startIso);
  const endMs = Date.parse(endIso);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null;
  if (endMs <= startMs || endMs - startMs > maxSpanMs) return null;
  return { startMs, endMs };
}

/** Events on the user's primary calendar for a client-supplied window (≤48h). */
export const listToday = action({
  args: { timeMinIso: v.string(), timeMaxIso: v.string() },
  handler: async (ctx, args): Promise<CalendarListResult> => {
    const user = await ctx.runQuery(internal.users.getCurrent, {});
    if (!user) return { ok: false, code: "error", error: "You're not signed in." };
    if (!parseRange(args.timeMinIso, args.timeMaxIso, MAX_LIST_WINDOW_MS)) {
      return { ok: false, code: "error", error: "Invalid time window." };
    }

    const token = await getGoogleAccessToken(user.clerkUserId);
    if (!token.ok) return token;

    const events = await listEvents(token.data, args.timeMinIso, args.timeMaxIso);
    if (!events.ok) return events;
    return { ok: true, events: events.data };
  },
});

/** User-initiated time block — written directly because the user is the approver. */
export const createEvent = action({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    startIso: v.string(),
    endIso: v.string(),
  },
  handler: async (ctx, args): Promise<CalendarWriteResult> => {
    const user = await ctx.runQuery(internal.users.getCurrent, {});
    if (!user) return { ok: false, code: "error", error: "You're not signed in." };
    const title = args.title.trim();
    if (!title) return { ok: false, code: "error", error: "Give the block a title." };
    if (!parseRange(args.startIso, args.endIso, MAX_EVENT_DURATION_MS)) {
      return { ok: false, code: "error", error: "That time range doesn't work — check start and end." };
    }

    const token = await getGoogleAccessToken(user.clerkUserId);
    if (!token.ok) return token;

    const created = await insertEvent(token.data, {
      title,
      description: args.description?.trim() || undefined,
      startIso: args.startIso,
      endIso: args.endIso,
    });
    if (!created.ok) return created;

    await ctx.runMutation(internal.calendar.recordEventCreated, {
      userId: user._id,
      eventId: created.data.eventId,
      title,
      source: "manual",
    });
    return { ok: true, eventId: created.data.eventId, link: created.data.link };
  },
});

/**
 * Approve an AI calendar draft into a real event. The user picks the time —
 * the draft only carries title/body. On success the draft becomes "sent"
 * (left the building) and drops out of the approval queue.
 */
export const scheduleDraft = action({
  args: { draftId: v.id("drafts"), startIso: v.string(), endIso: v.string() },
  handler: async (ctx, args): Promise<CalendarWriteResult> => {
    const user = await ctx.runQuery(internal.users.getCurrent, {});
    if (!user) return { ok: false, code: "error", error: "You're not signed in." };

    const draft = await ctx.runQuery(internal.drafts.getOwned, { id: args.draftId });
    if (draft.type !== "calendar") {
      return { ok: false, code: "error", error: "Only calendar drafts can be scheduled." };
    }
    if (draft.status !== "draft") {
      return { ok: false, code: "error", error: "This draft has already been resolved." };
    }
    if (!parseRange(args.startIso, args.endIso, MAX_EVENT_DURATION_MS)) {
      return { ok: false, code: "error", error: "That time range doesn't work — check start and end." };
    }

    const token = await getGoogleAccessToken(user.clerkUserId);
    if (!token.ok) return token;

    const created = await insertEvent(token.data, {
      title: draft.title,
      description: draft.body,
      startIso: args.startIso,
      endIso: args.endIso,
    });
    if (!created.ok) return created;

    await ctx.runMutation(internal.drafts.markScheduled, {
      id: args.draftId,
      eventId: created.data.eventId,
      link: created.data.link,
    });
    return { ok: true, eventId: created.data.eventId, link: created.data.link };
  },
});

/** Internal: audit trail for outward calendar writes. */
export const recordEventCreated = internalMutation({
  args: {
    userId: v.id("users"),
    eventId: v.string(),
    title: v.string(),
    source: v.union(v.literal("manual"), v.literal("draft")),
  },
  handler: async (ctx, args): Promise<void> => {
    await logAudit(ctx, args.userId, "calendar.eventCreated", "calendar", args.eventId, {
      title: args.title,
      source: args.source,
    });
  },
});
