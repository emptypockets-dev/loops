import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";
import { getCurrentUser } from "./lib/auth";

/** The brief for a given local date (YYYY-MM-DD), or null if not generated yet. */
export const getForDate = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    return await ctx.db
      .query("dailyBriefs")
      .withIndex("by_user_date", (q) => q.eq("userId", user._id).eq("date", args.date))
      .unique();
  },
});

/**
 * Internal: everything the daily-brief prompt needs, gathered server-side.
 * Takes userId because the cron has no user identity; never exposed publicly.
 */
export const gatherContext = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const [tasks, inboxItems, loops, runs] = await Promise.all([
      ctx.db
        .query("tasks")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect(),
      ctx.db
        .query("inboxItems")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect(),
      ctx.db
        .query("loops")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect(),
      ctx.db
        .query("loopRuns")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .order("desc")
        .take(20),
    ]);

    const loopNames = new Map(loops.map((l) => [l._id, l.name]));

    return {
      openTasks: tasks
        .filter((t) => t.status === "todo" || t.status === "doing" || t.status === "waiting")
        .slice(0, 40)
        .map((t) => ({
          title: t.title,
          category: t.category,
          status: t.status,
          fiveMinuteStart: t.fiveMinuteStart ?? null,
          ageDays: Math.floor((Date.now() - t.createdAt) / (24 * 60 * 60 * 1000)),
        })),
      unprocessedInbox: inboxItems
        .filter((i) => i.status === "unprocessed" || i.status === "classified")
        .slice(0, 40)
        .map((i) => ({
          title: i.cleanedTitle || i.rawText.slice(0, 120),
          category: i.status === "classified" ? i.category : null,
          urgency: i.status === "classified" ? i.urgency : null,
          emotionalWeight: i.status === "classified" ? i.emotionalWeight : null,
          ageDays: Math.floor((Date.now() - i.createdAt) / (24 * 60 * 60 * 1000)),
        })),
      activeLoops: loops
        .filter((l) => l.isActive)
        .map((l) => ({
          name: l.name,
          cadence: l.cadence,
          dueNow: l.cadence !== "ad_hoc" && (l.nextRunAt === undefined || l.nextRunAt <= Date.now()),
        })),
      recentLoopRuns: runs
        .filter((r) => r.startedAt >= sevenDaysAgo)
        .map((r) => ({
          loop: loopNames.get(r.loopId) ?? "(deleted loop)",
          outcome: r.outcome,
        })),
    };
  },
});

/** Internal: persist a validated brief, replacing any existing brief for that date. */
export const upsertForDate = internalMutation({
  args: {
    userId: v.id("users"),
    date: v.string(),
    summary: v.string(),
    topOutcomes: v.array(v.string()),
    fiveMinuteStarts: v.array(v.string()),
    canWait: v.array(v.string()),
    avoidanceWarning: v.optional(v.string()),
    closingLine: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("dailyBriefs")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId).eq("date", args.date))
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
    const { userId, date, ...brief } = args;
    await ctx.db.insert("dailyBriefs", {
      userId,
      date,
      ...brief,
      createdAt: Date.now(),
    });
  },
});
