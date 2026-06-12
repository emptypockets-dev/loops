import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { callOpenAIJson } from "../lib/ai/openai";
import {
  classificationSchema,
  dailyBriefSchema,
  draftSchema,
  unstuckSchema,
  weeklyReviewSchema,
} from "../lib/ai/schemas";
import {
  CLASSIFY_SYSTEM_PROMPT,
  DAILY_BRIEF_SYSTEM_PROMPT,
  DRAFT_SYSTEM_PROMPT,
  UNSTUCK_SYSTEM_PROMPT,
  WEEKLY_REVIEW_SYSTEM_PROMPT,
} from "../lib/ai/prompts";
import type { AiResult } from "../lib/ai/types";
import { DAILY_BRIEF_CLOSING_LINE, requiresApproval } from "../lib/constants";
import { addDaysStr, mondayOf } from "../lib/dates";
import { buildDailyBriefEmail, buildWeeklyReviewEmail } from "../lib/email/templates";
import { fetchEventsForWindow } from "./lib/googleCalendar";
import { getAppBaseUrl, sendTransactionalEmail } from "./lib/postmark";

/**
 * All OpenAI calls live in these Convex actions — server-side only, the key
 * never reaches the client. Every result is zod-validated before persisting;
 * failures come back as { ok: false, error } so screens toast instead of crash.
 */

// ── 1. Classify a single inbox item ─────────────────────────────────────────

async function runClassification(
  ctx: ActionCtx,
  user: Doc<"users">,
  item: Doc<"inboxItems">
): Promise<AiResult> {
  const result = await callOpenAIJson({
    system: CLASSIFY_SYSTEM_PROMPT,
    payload: { rawText: item.rawText },
    schema: classificationSchema,
  });
  if (!result.ok) return result;

  // Approval-first: auto-archive applies only to low-risk Trash items,
  // and only when the user has opted in via Settings.
  const autoArchive =
    user.autoArchiveEnabled === true &&
    result.data.category === "Trash" &&
    result.data.urgency === "low" &&
    result.data.emotionalWeight === "low";

  await ctx.runMutation(internal.inboxItems.applyClassification, {
    id: item._id,
    classification: result.data,
    autoArchive,
  });
  return { ok: true };
}

export const classifyInboxItem = action({
  args: { inboxItemId: v.id("inboxItems") },
  handler: async (ctx, args): Promise<AiResult> => {
    const user = await ctx.runQuery(internal.users.getCurrent, {});
    if (!user) return { ok: false, error: "You're not signed in." };

    // Ownership-checked fetch (throws if the item isn't the caller's).
    const item = await ctx.runQuery(internal.inboxItems.getOwned, { id: args.inboxItemId });
    return await runClassification(ctx, user, item);
  },
});

/**
 * Identity-less variant for scheduled jobs (email-in capture). Takes a
 * userId because the webhook has no Clerk identity; internal-only, so the
 * client can never call it. Failures just leave the item "unprocessed".
 */
export const classifyForUser = internalAction({
  args: { userId: v.id("users"), inboxItemId: v.id("inboxItems") },
  handler: async (ctx, args): Promise<void> => {
    const user = await ctx.runQuery(internal.users.getById, { id: args.userId });
    if (!user) return;
    const item = await ctx.runQuery(internal.inboxItems.getForUser, {
      id: args.inboxItemId,
      userId: args.userId,
    });
    const result = await runClassification(ctx, user, item);
    if (!result.ok) {
      console.error(`Auto-classify failed for item ${args.inboxItemId}: ${result.error}`);
    }
  },
});

// ── 2. Daily brief ───────────────────────────────────────────────────────────

/**
 * Best-effort calendar context for the brief. tzOffsetMinutes is the value of
 * Date.prototype.getTimezoneOffset() in the user's browser (0 for cron), so
 * the window matches the user's actual day. Not connected / errors → brief
 * proceeds without calendar data.
 */
async function gatherCalendarForBrief(
  user: Doc<"users">,
  date: string,
  tzOffsetMinutes: number
): Promise<
  | { connected: false }
  | {
      connected: true;
      events: Array<{ title: string; start: string; end: string; allDay: boolean }>;
    }
> {
  const dayStartMs = Date.parse(`${date}T00:00:00Z`) + tzOffsetMinutes * 60_000;
  if (!Number.isFinite(dayStartMs)) return { connected: false };
  const result = await fetchEventsForWindow(
    user.clerkUserId,
    new Date(dayStartMs).toISOString(),
    new Date(dayStartMs + 24 * 60 * 60 * 1000).toISOString()
  );
  if (!result.ok) return { connected: false };
  return {
    connected: true,
    events: result.data.slice(0, 20).map((event) => ({
      title: event.title,
      start: event.startIso,
      end: event.endIso,
      allDay: event.allDay,
    })),
  };
}

interface BriefData {
  summary: string;
  topOutcomes: string[];
  fiveMinuteStarts: string[];
  canWait: string[];
  avoidanceWarning?: string;
  closingLine: string;
}

async function generateBriefForUser(
  ctx: ActionCtx,
  user: Doc<"users">,
  date: string,
  tzOffsetMinutes: number
): Promise<{ ok: true; brief: BriefData } | { ok: false; error: string }> {
  const userId = user._id;
  const context = await ctx.runQuery(internal.dailyBriefs.gatherContext, { userId, date });
  const calendarToday = await gatherCalendarForBrief(user, date, tzOffsetMinutes);
  const result = await callOpenAIJson({
    system: DAILY_BRIEF_SYSTEM_PROMPT,
    payload: { date, ...context, calendarToday },
    schema: dailyBriefSchema,
  });
  if (!result.ok) return result;

  const brief: BriefData = {
    summary: result.data.summary,
    topOutcomes: result.data.topOutcomes,
    fiveMinuteStarts: result.data.fiveMinuteStarts,
    canWait: result.data.canWait,
    avoidanceWarning: result.data.avoidanceWarning,
    // The closing reassurance is a product guarantee, not a model choice.
    closingLine: DAILY_BRIEF_CLOSING_LINE,
  };
  await ctx.runMutation(internal.dailyBriefs.upsertForDate, { userId, date, ...brief });
  return { ok: true, brief };
}

/** On-demand generation; the client passes its local date (YYYY-MM-DD). */
export const generateDailyBrief = action({
  args: { date: v.string(), tzOffsetMinutes: v.optional(v.number()) },
  handler: async (ctx, args): Promise<AiResult> => {
    const user = await ctx.runQuery(internal.users.getCurrent, {});
    if (!user) return { ok: false, error: "You're not signed in." };
    const tzOffsetMinutes = Math.max(-840, Math.min(840, args.tzOffsetMinutes ?? 0));
    const result = await generateBriefForUser(ctx, user, args.date, tzOffsetMinutes);
    return result.ok ? { ok: true } : result;
  },
});

/**
 * Hourly scheduler, timezone-aware: each user gets their brief at **their**
 * 5am and their review Sunday at **their** 4pm, based on the browser offset
 * captured at sign-in (users without one fall back to UTC). When outbound
 * email is configured, both are delivered to the user's own address so they
 * land in the attention stream instead of waiting in the app.
 */
export const runScheduledDeliveries = internalAction({
  args: {},
  handler: async (ctx): Promise<void> => {
    const users = await ctx.runQuery(internal.users.listAll, {});
    const appUrl = getAppBaseUrl();
    const nowMs = Date.now();

    for (const user of users) {
      // getTimezoneOffset() is (UTC − local) minutes, so local = UTC − offset.
      const offset = user.timezoneOffsetMinutes ?? 0;
      const local = new Date(nowMs - offset * 60_000);
      const localHour = local.getUTCHours();
      const localDate = local.toISOString().slice(0, 10);

      if (localHour === 5) {
        // Skip if a brief already exists for the user's local day (e.g. they
        // generated one manually) — also makes retried cron runs idempotent.
        const existing = await ctx.runQuery(internal.dailyBriefs.getForUserDate, {
          userId: user._id,
          date: localDate,
        });
        if (!existing) {
          const result = await generateBriefForUser(ctx, user, localDate, offset);
          if (!result.ok) {
            console.error(`Daily brief failed for user ${user._id}: ${result.error}`);
          } else if (user.briefEmailEnabled !== false && user.email) {
            const email = buildDailyBriefEmail({ date: localDate, ...result.brief, appUrl });
            const sent = await sendTransactionalEmail({ to: user.email, ...email });
            if (!sent.ok && !sent.skipped) {
              console.error(`Brief email failed for user ${user._id}: ${sent.error}`);
            }
          }
        }
      }

      // Sunday 4pm local: generate (refresh) the week's review and deliver it.
      if (local.getUTCDay() === 0 && localHour === 16) {
        const weekStart = mondayOf(localDate);
        const result = await generateReviewForUser(ctx, user._id, weekStart);
        if (!result.ok) {
          console.error(`Weekly review failed for user ${user._id}: ${result.error}`);
        } else if (user.reviewEmailEnabled !== false && user.email) {
          const email = buildWeeklyReviewEmail({
            weekStart,
            weekEnd: addDaysStr(weekStart, 6),
            completed: result.review.completed,
            patterns: result.review.patterns,
            needsNextAction: result.review.needsNextAction,
            appUrl,
          });
          const sent = await sendTransactionalEmail({ to: user.email, ...email });
          if (!sent.ok && !sent.skipped) {
            console.error(`Review email failed for user ${user._id}: ${sent.error}`);
          }
        }
      }
    }
  },
});

// ── 3. Weekly review ─────────────────────────────────────────────────────────

interface ReviewData {
  completed: string[];
  stillOpen: string[];
  dropped: string[];
  needsNextAction: string[];
  patterns: string[];
  suggestedLoopChanges: string[];
}

async function generateReviewForUser(
  ctx: ActionCtx,
  userId: Id<"users">,
  weekStart: string
): Promise<{ ok: true; review: ReviewData } | { ok: false; error: string }> {
  const context = await ctx.runQuery(internal.reviews.gatherContext, { userId });
  const result = await callOpenAIJson({
    system: WEEKLY_REVIEW_SYSTEM_PROMPT,
    payload: { weekStart, ...context },
    schema: weeklyReviewSchema,
  });
  if (!result.ok) return result;

  const review: ReviewData = {
    completed: result.data.completed,
    stillOpen: result.data.stillOpen,
    dropped: result.data.dropped,
    needsNextAction: result.data.needsNextAction,
    patterns: result.data.patterns,
    suggestedLoopChanges: result.data.suggestedLoopChanges,
  };
  await ctx.runMutation(internal.reviews.upsertForWeek, {
    userId,
    weekStart,
    weekEnd: addDaysStr(weekStart, 6),
    ...review,
  });
  return { ok: true, review };
}

/** On-demand generation for the week containing the given local date. */
export const generateWeeklyReview = action({
  args: { date: v.string() },
  handler: async (ctx, args): Promise<AiResult> => {
    const user = await ctx.runQuery(internal.users.getCurrent, {});
    if (!user) return { ok: false, error: "You're not signed in." };
    const result = await generateReviewForUser(ctx, user._id, mondayOf(args.date));
    return result.ok ? { ok: true } : result;
  },
});

// ── The Unstuck Button ───────────────────────────────────────────────────────

type UnstuckResult =
  | {
      ok: true;
      nudgeId: Id<"nudges">;
      suggestion: string;
      reason: string;
      fiveMinuteVersion: string;
      reassurance: string;
    }
  | { ok: false; error: string };

/**
 * One press → exactly one suggested action chosen from the user's real data.
 * Deliberately fast (no calendar fetch) — the stuck moment needs an answer,
 * not a spinner. Each suggestion is recorded so the weekly review can notice
 * hard moments kindly.
 */
export const getUnstuck = action({
  args: {
    localHour: v.optional(v.number()),
    previousSuggestions: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args): Promise<UnstuckResult> => {
    const user = await ctx.runQuery(internal.users.getCurrent, {});
    if (!user) return { ok: false, error: "You're not signed in." };

    const context = await ctx.runQuery(internal.dailyBriefs.gatherContext, {
      userId: user._id,
    });
    const result = await callOpenAIJson({
      system: UNSTUCK_SYSTEM_PROMPT,
      payload: {
        localHour:
          args.localHour !== undefined
            ? Math.max(0, Math.min(23, Math.floor(args.localHour)))
            : null,
        previousSuggestions: (args.previousSuggestions ?? []).slice(0, 5),
        ...context,
      },
      schema: unstuckSchema,
    });
    if (!result.ok) return result;

    const nudgeId = await ctx.runMutation(internal.nudges.create, {
      userId: user._id,
      suggestion: result.data.suggestion,
      reason: result.data.reason,
      fiveMinuteVersion: result.data.fiveMinuteVersion,
      reassurance: result.data.reassurance,
    });

    return { ok: true, nudgeId, ...result.data };
  },
});

// ── 4. Draft a response or action ────────────────────────────────────────────

/**
 * Always persists as a `draft` for human approval. Never sends anything.
 */
export const draftResponseOrAction = action({
  args: {
    inboxItemId: v.optional(v.id("inboxItems")),
    taskId: v.optional(v.id("tasks")),
  },
  handler: async (ctx, args): Promise<AiResult> => {
    const user = await ctx.runQuery(internal.users.getCurrent, {});
    if (!user) return { ok: false, error: "You're not signed in." };
    if (!args.inboxItemId && !args.taskId) {
      return { ok: false, error: "Nothing to draft from." };
    }

    let payload: Record<string, unknown>;
    if (args.inboxItemId) {
      const item = await ctx.runQuery(internal.inboxItems.getOwned, { id: args.inboxItemId });
      payload = {
        kind: "inboxItem",
        rawText: item.rawText,
        title: item.cleanedTitle,
        summary: item.summary,
        category: item.status === "classified" || item.status === "converted" ? item.category : null,
        suggestedNextAction: item.suggestedNextAction || null,
      };
    } else {
      const task = await ctx.runQuery(internal.tasks.getOwned, { id: args.taskId! });
      payload = {
        kind: "task",
        title: task.title,
        description: task.description ?? null,
        category: task.category,
        status: task.status,
      };
    }

    const result = await callOpenAIJson({
      system: DRAFT_SYSTEM_PROMPT,
      payload,
      schema: draftSchema,
    });
    if (!result.ok) return result;

    await ctx.runMutation(internal.drafts.create, {
      userId: user._id,
      type: result.data.type,
      title: result.data.title,
      body: result.data.body,
      riskLevel: result.data.riskLevel,
      relatedInboxItemId: args.inboxItemId,
      relatedTaskId: args.taskId,
      // The approval matrix always wins over the model's own judgement.
      requiresApproval:
        result.data.requiresApproval || requiresApproval(result.data.type, result.data.riskLevel),
    });
    return { ok: true };
  },
});
