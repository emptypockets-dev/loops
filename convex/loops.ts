import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { CADENCES, CATEGORIES, LOOP_OUTCOMES, LOOP_TIMES_OF_DAY } from "../lib/constants";
import { computeNextRunAt } from "../lib/loop-logic";
import { getCurrentUser, requireUser } from "./lib/auth";
import { logAudit } from "./lib/audit";
import { literals } from "./lib/validators";

async function getOwnedLoop(
  ctx: MutationCtx,
  id: Id<"loops">
): Promise<{ user: Doc<"users">; loop: Doc<"loops"> }> {
  const user = await requireUser(ctx);
  const loop = await ctx.db.get(id);
  if (!loop || loop.userId !== user._id) throw new Error("Loop not found.");
  return { user, loop };
}

/** All loops for the user — active first, then by name. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const loops = await ctx.db
      .query("loops")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    return loops.sort((a, b) =>
      a.isActive === b.isActive ? a.name.localeCompare(b.name) : a.isActive ? -1 : 1
    );
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    category: literals(CATEGORIES),
    cadence: literals(CADENCES),
    timeOfDay: v.optional(literals(LOOP_TIMES_OF_DAY)),
    steps: v.array(v.string()),
    minimumVersion: v.string(),
    idealVersion: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!args.name.trim()) throw new Error("A loop needs a name.");
    if (args.steps.length === 0) throw new Error("A loop needs at least one step.");
    const now = Date.now();
    const id = await ctx.db.insert("loops", {
      userId: user._id,
      name: args.name.trim(),
      description: args.description.trim(),
      category: args.category,
      cadence: args.cadence,
      timeOfDay: args.timeOfDay ?? "anytime",
      steps: args.steps,
      minimumVersion: args.minimumVersion.trim(),
      idealVersion: args.idealVersion.trim(),
      isDefault: false,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    await logAudit(ctx, user._id, "loop.created", "loops", id, { name: args.name });
    return { id };
  },
});

export const update = mutation({
  args: {
    id: v.id("loops"),
    name: v.string(),
    description: v.string(),
    category: literals(CATEGORIES),
    cadence: literals(CADENCES),
    timeOfDay: v.optional(literals(LOOP_TIMES_OF_DAY)),
    steps: v.array(v.string()),
    minimumVersion: v.string(),
    idealVersion: v.string(),
  },
  handler: async (ctx, args) => {
    const { id, ...rest } = args;
    const { user } = await getOwnedLoop(ctx, id);
    if (!rest.name.trim()) throw new Error("A loop needs a name.");
    if (rest.steps.length === 0) throw new Error("A loop needs at least one step.");
    await ctx.db.patch(id, {
      ...rest,
      timeOfDay: rest.timeOfDay ?? "anytime",
      updatedAt: Date.now(),
    });
    await logAudit(ctx, user._id, "loop.updated", "loops", id, { name: rest.name });
  },
});

export const setActive = mutation({
  args: { id: v.id("loops"), isActive: v.boolean() },
  handler: async (ctx, args) => {
    const { user } = await getOwnedLoop(ctx, args.id);
    await ctx.db.patch(args.id, { isActive: args.isActive, updatedAt: Date.now() });
    await logAudit(
      ctx,
      user._id,
      args.isActive ? "loop.activated" : "loop.deactivated",
      "loops",
      args.id
    );
  },
});

export const remove = mutation({
  args: { id: v.id("loops") },
  handler: async (ctx, args) => {
    const { user, loop } = await getOwnedLoop(ctx, args.id);
    const runs = await ctx.db
      .query("loopRuns")
      .withIndex("by_loop", (q) => q.eq("loopId", args.id))
      .collect();
    for (const run of runs) {
      await ctx.db.delete(run._id);
    }
    await ctx.db.delete(args.id);
    await logAudit(ctx, user._id, "loop.deleted", "loops", args.id, {
      name: loop.name,
      deletedRuns: runs.length,
    });
  },
});

/**
 * Record a completed run. Every run counts (counted: true) — the product
 * never grades the user. Also advances nextRunAt from the loop's cadence.
 */
export const completeRun = mutation({
  args: {
    loopId: v.id("loops"),
    startedAt: v.number(),
    completedSteps: v.array(v.string()),
    notes: v.string(),
    outcome: literals(LOOP_OUTCOMES),
    // Date.prototype.getTimezoneOffset() — lands nextRunAt on local midnight.
    tzOffsetMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { user, loop } = await getOwnedLoop(ctx, args.loopId);
    const tzOffsetMinutes = Math.max(-840, Math.min(840, args.tzOffsetMinutes ?? 0));
    const now = Date.now();
    const runId = await ctx.db.insert("loopRuns", {
      userId: user._id,
      loopId: loop._id,
      startedAt: args.startedAt,
      completedAt: now,
      notes: args.notes.trim(),
      completedSteps: args.completedSteps,
      outcome: args.outcome,
      counted: true,
    });
    await ctx.db.patch(loop._id, {
      lastRunAt: now,
      nextRunAt: computeNextRunAt(loop.cadence, now, tzOffsetMinutes),
      updatedAt: now,
    });
    await logAudit(ctx, user._id, "loopRun.completed", "loopRuns", runId, {
      loopName: loop.name,
      outcome: args.outcome,
      steps: args.completedSteps.length,
    });
    return { runId };
  },
});

/** Run history for one loop — proof that it counted, accumulated. */
export const runsForLoop = query({
  args: { loopId: v.id("loops") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const loop = await ctx.db.get(args.loopId);
    if (!loop || loop.userId !== user._id) return [];
    return await ctx.db
      .query("loopRuns")
      .withIndex("by_loop", (q) => q.eq("loopId", args.loopId))
      .order("desc")
      .take(25);
  },
});

/** Recent runs across all loops (Today context + Review). */
export const recentRuns = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("loopRuns")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(Math.min(args.limit ?? 20, 100));
  },
});
