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
  weeklyReviewSchema,
} from "../lib/ai/schemas";
import {
  CLASSIFY_SYSTEM_PROMPT,
  DAILY_BRIEF_SYSTEM_PROMPT,
  DRAFT_SYSTEM_PROMPT,
  WEEKLY_REVIEW_SYSTEM_PROMPT,
} from "../lib/ai/prompts";
import type { AiResult } from "../lib/ai/types";
import { DAILY_BRIEF_CLOSING_LINE, requiresApproval } from "../lib/constants";
import { addDaysStr, mondayOf, utcToday } from "../lib/dates";

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

async function generateBriefForUser(
  ctx: ActionCtx,
  userId: Id<"users">,
  date: string
): Promise<AiResult> {
  const context = await ctx.runQuery(internal.dailyBriefs.gatherContext, { userId });
  const result = await callOpenAIJson({
    system: DAILY_BRIEF_SYSTEM_PROMPT,
    payload: { date, ...context },
    schema: dailyBriefSchema,
  });
  if (!result.ok) return result;

  await ctx.runMutation(internal.dailyBriefs.upsertForDate, {
    userId,
    date,
    summary: result.data.summary,
    topOutcomes: result.data.topOutcomes,
    fiveMinuteStarts: result.data.fiveMinuteStarts,
    canWait: result.data.canWait,
    avoidanceWarning: result.data.avoidanceWarning,
    // The closing reassurance is a product guarantee, not a model choice.
    closingLine: DAILY_BRIEF_CLOSING_LINE,
  });
  return { ok: true };
}

/** On-demand generation; the client passes its local date (YYYY-MM-DD). */
export const generateDailyBrief = action({
  args: { date: v.string() },
  handler: async (ctx, args): Promise<AiResult> => {
    const user = await ctx.runQuery(internal.users.getCurrent, {});
    if (!user) return { ok: false, error: "You're not signed in." };
    return await generateBriefForUser(ctx, user._id, args.date);
  },
});

/** Daily cron fan-out (UTC day — see README assumption). */
export const generateDailyBriefsForAllUsers = internalAction({
  args: {},
  handler: async (ctx): Promise<void> => {
    const users = await ctx.runQuery(internal.users.listAll, {});
    const date = utcToday();
    for (const user of users) {
      const result = await generateBriefForUser(ctx, user._id, date);
      if (!result.ok) {
        console.error(`Daily brief failed for user ${user._id}: ${result.error}`);
      }
    }
  },
});

// ── 3. Weekly review ─────────────────────────────────────────────────────────

async function generateReviewForUser(
  ctx: ActionCtx,
  userId: Id<"users">,
  weekStart: string
): Promise<AiResult> {
  const context = await ctx.runQuery(internal.reviews.gatherContext, { userId });
  const result = await callOpenAIJson({
    system: WEEKLY_REVIEW_SYSTEM_PROMPT,
    payload: { weekStart, ...context },
    schema: weeklyReviewSchema,
  });
  if (!result.ok) return result;

  await ctx.runMutation(internal.reviews.upsertForWeek, {
    userId,
    weekStart,
    weekEnd: addDaysStr(weekStart, 6),
    completed: result.data.completed,
    stillOpen: result.data.stillOpen,
    dropped: result.data.dropped,
    needsNextAction: result.data.needsNextAction,
    patterns: result.data.patterns,
    suggestedLoopChanges: result.data.suggestedLoopChanges,
  });
  return { ok: true };
}

/** On-demand generation for the week containing the given local date. */
export const generateWeeklyReview = action({
  args: { date: v.string() },
  handler: async (ctx, args): Promise<AiResult> => {
    const user = await ctx.runQuery(internal.users.getCurrent, {});
    if (!user) return { ok: false, error: "You're not signed in." };
    return await generateReviewForUser(ctx, user._id, mondayOf(args.date));
  },
});

/** Weekly cron: the Sunday "review reminder" generates the week's review. */
export const generateWeeklyReviewsForAllUsers = internalAction({
  args: {},
  handler: async (ctx): Promise<void> => {
    const users = await ctx.runQuery(internal.users.listAll, {});
    const weekStart = mondayOf(utcToday());
    for (const user of users) {
      const result = await generateReviewForUser(ctx, user._id, weekStart);
      if (!result.ok) {
        console.error(`Weekly review failed for user ${user._id}: ${result.error}`);
      }
    }
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
