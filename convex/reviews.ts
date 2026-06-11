import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";
import { getCurrentUser } from "./lib/auth";

/** The review for a given week (Monday YYYY-MM-DD), or null. */
export const getForWeek = query({
  args: { weekStart: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    return await ctx.db
      .query("reviews")
      .withIndex("by_user_week", (q) => q.eq("userId", user._id).eq("weekStart", args.weekStart))
      .unique();
  },
});

/** Most recent review of any week (shown if this week's isn't generated yet). */
export const getLatest = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const all = await ctx.db
      .query("reviews")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    return all.sort((a, b) => b.weekStart.localeCompare(a.weekStart))[0] ?? null;
  },
});

/** Internal: data for the weekly-review prompt (last 7 days). */
export const gatherContext = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

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
        .take(60),
    ]);

    const loopNames = new Map(loops.map((l) => [l._id, l.name]));

    return {
      completedTasks: tasks
        .filter((t) => t.status === "done" && t.updatedAt >= weekAgo)
        .map((t) => ({ title: t.title, category: t.category })),
      openTasks: tasks
        .filter((t) => t.status === "todo" || t.status === "doing" || t.status === "waiting")
        .map((t) => ({
          title: t.title,
          category: t.category,
          status: t.status,
          hasFiveMinuteStart: Boolean(t.fiveMinuteStart),
          ageDays: Math.floor((Date.now() - t.createdAt) / (24 * 60 * 60 * 1000)),
        })),
      droppedOrArchived: [
        ...tasks
          .filter((t) => t.status === "dropped" && t.updatedAt >= weekAgo)
          .map((t) => ({ kind: "task", title: t.title })),
        ...inboxItems
          .filter((i) => i.status === "archived" && (i.archivedAt ?? 0) >= weekAgo)
          .map((i) => ({ kind: "inboxItem", title: i.cleanedTitle || i.rawText.slice(0, 120) })),
      ],
      unprocessedInboxCount: inboxItems.filter((i) => i.status === "unprocessed").length,
      loopRuns: runs
        .filter((r) => r.startedAt >= weekAgo)
        .map((r) => ({ loop: loopNames.get(r.loopId) ?? "(deleted loop)", outcome: r.outcome })),
      loops: loops
        .filter((l) => l.isActive)
        .map((l) => ({ name: l.name, cadence: l.cadence })),
    };
  },
});

/** Internal: persist a validated weekly review, replacing the week's existing one. */
export const upsertForWeek = internalMutation({
  args: {
    userId: v.id("users"),
    weekStart: v.string(),
    weekEnd: v.string(),
    completed: v.array(v.string()),
    stillOpen: v.array(v.string()),
    dropped: v.array(v.string()),
    needsNextAction: v.array(v.string()),
    patterns: v.array(v.string()),
    suggestedLoopChanges: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("reviews")
      .withIndex("by_user_week", (q) => q.eq("userId", args.userId).eq("weekStart", args.weekStart))
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
    const { userId, ...review } = args;
    await ctx.db.insert("reviews", {
      userId,
      ...review,
      createdAt: Date.now(),
    });
  },
});
