import { v } from "convex/values";
import { internalQuery, mutation, query } from "./_generated/server";
import { DEFAULT_LOOPS } from "../lib/constants";
import { getCurrentUser, requireUser } from "./lib/auth";
import { logAudit, pruneUndefined } from "./lib/audit";

/** Unguessable secret for the email-in capture address (~122 bits of entropy). */
function generateCaptureToken(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

/** The signed-in user's record, or null before `ensure` has run. */
export const current = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});

/**
 * Idempotent upsert + default-loop seeding, called on every sign-in.
 * Repeat calls never create duplicate users or duplicate default loops
 * (seeding is guarded by users.defaultLoopsSeededAt, so even deleting the
 * defaults later won't resurrect them).
 */
export const ensure = mutation({
  args: {
    // From the browser: keeps scheduled deliveries aligned to the user's day
    // (re-sent every sign-in, so DST drift self-corrects).
    timezoneOffsetMinutes: v.optional(v.number()),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated.");

    const now = Date.now();
    const email = identity.email ?? "";
    const name = identity.name ?? identity.nickname ?? email.split("@")[0] ?? "";
    const timezoneOffsetMinutes =
      args.timezoneOffsetMinutes !== undefined
        ? Math.max(-840, Math.min(840, args.timezoneOffsetMinutes))
        : undefined;

    let user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .unique();

    if (user === null) {
      const userId = await ctx.db.insert("users", {
        clerkUserId: identity.subject,
        email,
        name,
        captureToken: generateCaptureToken(),
        timezoneOffsetMinutes,
        timezone: args.timezone,
        createdAt: now,
        updatedAt: now,
      });
      user = (await ctx.db.get(userId))!;
      await logAudit(ctx, userId, "user.created", "users", userId);
    } else if (
      user.email !== email ||
      user.name !== name ||
      (timezoneOffsetMinutes !== undefined && user.timezoneOffsetMinutes !== timezoneOffsetMinutes) ||
      (args.timezone !== undefined && user.timezone !== args.timezone)
    ) {
      await ctx.db.patch(user._id, {
        email,
        name,
        ...(timezoneOffsetMinutes !== undefined ? { timezoneOffsetMinutes } : {}),
        ...(args.timezone !== undefined ? { timezone: args.timezone } : {}),
        updatedAt: now,
      });
    }

    // Backfill for accounts created before email-in capture existed.
    if (user.captureToken === undefined) {
      await ctx.db.patch(user._id, { captureToken: generateCaptureToken(), updatedAt: now });
    }

    if (user.defaultLoopsSeededAt === undefined) {
      for (const seed of DEFAULT_LOOPS) {
        await ctx.db.insert("loops", {
          userId: user._id,
          name: seed.name,
          description: seed.description,
          category: seed.category,
          cadence: seed.cadence,
          steps: [...seed.steps],
          minimumVersion: seed.minimumVersion,
          idealVersion: seed.idealVersion,
          isDefault: true,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
      }
      await ctx.db.patch(user._id, { defaultLoopsSeededAt: now, updatedAt: now });
      await logAudit(ctx, user._id, "loops.defaultsSeeded", "loops", "batch", {
        count: DEFAULT_LOOPS.length,
      });
    }

    return { userId: user._id };
  },
});

/**
 * Rotate (or create) the email capture token. The old address stops working
 * immediately — the recovery path if a capture address ever leaks.
 */
export const regenerateCaptureToken = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const captureToken = generateCaptureToken();
    await ctx.db.patch(user._id, { captureToken, updatedAt: Date.now() });
    await logAudit(ctx, user._id, "user.captureTokenRegenerated", "users", user._id);
    return { captureToken };
  },
});

export const updatePreferences = mutation({
  args: {
    autoArchiveEnabled: v.optional(v.boolean()),
    briefEmailEnabled: v.optional(v.boolean()),
    reviewEmailEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const patch = pruneUndefined(args);
    if (Object.keys(patch).length === 0) return;
    await ctx.db.patch(user._id, { ...patch, updatedAt: Date.now() });
    await logAudit(ctx, user._id, "user.preferencesUpdated", "users", user._id, patch);
  },
});

/** Everything the user owns, as one JSON-able object (Settings → Data export). */
export const exportData = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const [inboxItems, loops, loopRuns, tasks, dailyBriefs, reviews, drafts, integrations, auditLog, nudges] =
      await Promise.all([
        ctx.db.query("inboxItems").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
        ctx.db.query("loops").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
        ctx.db.query("loopRuns").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
        ctx.db.query("tasks").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
        ctx.db.query("dailyBriefs").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
        ctx.db.query("reviews").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
        ctx.db.query("drafts").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
        ctx.db.query("integrations").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
        ctx.db.query("auditLog").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
        ctx.db.query("nudges").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
      ]);

    return {
      exportedAt: new Date().toISOString(),
      user: { email: user.email, name: user.name, createdAt: user.createdAt },
      inboxItems,
      loops,
      loopRuns,
      tasks,
      dailyBriefs,
      reviews,
      drafts,
      integrations,
      auditLog,
      nudges,
    };
  },
});

/** Internal: used by the AI actions to resolve the caller. */
export const getCurrent = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});

/**
 * Getting-started progress, derived from real usage — no step counters to
 * maintain, the data itself is the checklist.
 */
export const onboardingStatus = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const [firstItem, classifiedItem, firstTask, firstBrief, firstRun, recentItems] =
      await Promise.all([
        ctx.db
          .query("inboxItems")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .first(),
        ctx.db
          .query("inboxItems")
          .withIndex("by_user_status", (q) => q.eq("userId", user._id).eq("status", "classified"))
          .first(),
        ctx.db
          .query("tasks")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .first(),
        ctx.db
          .query("dailyBriefs")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .first(),
        ctx.db
          .query("loopRuns")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .first(),
        ctx.db
          .query("inboxItems")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .order("desc")
          .take(50),
      ]);

    return {
      dismissed: user.onboardingDismissedAt !== undefined,
      captured: firstItem !== null,
      // An item may have moved past "classified" (converted/archived) — any
      // classifiedBy marker in the recent window counts.
      classified:
        classifiedItem !== null || recentItems.some((item) => item.classifiedBy !== undefined),
      taskCreated: firstTask !== null,
      briefGenerated: firstBrief !== null,
      loopRun: firstRun !== null,
    };
  },
});

/** Hide the getting-started checklist for good. */
export const dismissOnboarding = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    if (user.onboardingDismissedAt !== undefined) return;
    await ctx.db.patch(user._id, { onboardingDismissedAt: Date.now(), updatedAt: Date.now() });
    await logAudit(ctx, user._id, "user.onboardingDismissed", "users", user._id);
  },
});

/** Evening Shutdown: choose tomorrow's first action (overwrites any previous). */
export const setFirstAction = mutation({
  args: {
    text: v.string(),
    forDate: v.string(),
    taskId: v.optional(v.id("tasks")),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const text = args.text.trim();
    if (!text) throw new Error("Name the first action — even roughly.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(args.forDate)) throw new Error("Invalid date.");
    if (args.taskId) {
      const task = await ctx.db.get(args.taskId);
      if (!task || task.userId !== user._id) throw new Error("Task not found.");
    }
    await ctx.db.patch(user._id, {
      nextFirstAction: { text, forDate: args.forDate, taskId: args.taskId },
      updatedAt: Date.now(),
    });
    await logAudit(ctx, user._id, "firstAction.chosen", "users", user._id, {
      forDate: args.forDate,
    });
  },
});

/** Morning: the first action happened. Optionally completes the linked task. */
export const completeFirstAction = mutation({
  args: { markTaskDone: v.boolean() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const firstAction = user.nextFirstAction;
    if (!firstAction) return;
    if (args.markTaskDone && firstAction.taskId) {
      const task = await ctx.db.get(firstAction.taskId);
      if (task && task.userId === user._id && task.status !== "done") {
        await ctx.db.patch(task._id, { status: "done", updatedAt: Date.now() });
      }
    }
    await ctx.db.patch(user._id, { nextFirstAction: undefined, updatedAt: Date.now() });
    await logAudit(ctx, user._id, "firstAction.completed", "users", user._id, {
      text: firstAction.text.slice(0, 120),
    });
  },
});

/** "Not today" — clear without judgement. */
export const clearFirstAction = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    if (!user.nextFirstAction) return;
    await ctx.db.patch(user._id, { nextFirstAction: undefined, updatedAt: Date.now() });
    await logAudit(ctx, user._id, "firstAction.cleared", "users", user._id);
  },
});

/** Recent audit-log entries (Settings → Data): what the system did and when. */
export const recentAudit = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("auditLog")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(50);
  },
});

/** Internal: load a user by id (webhook/scheduled paths that have no identity). */
export const getById = internalQuery({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/** Internal: cron fan-out over all users. */
export const listAll = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});
