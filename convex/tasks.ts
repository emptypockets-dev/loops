import { v } from "convex/values";
import { internalQuery, mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { TASK_STATUSES } from "../lib/constants";
import { getCurrentUser, requireUser } from "./lib/auth";
import { logAudit, pruneUndefined } from "./lib/audit";
import { literals } from "./lib/validators";

async function getOwnedTask(
  ctx: MutationCtx,
  id: Id<"tasks">
): Promise<{ user: Doc<"users">; task: Doc<"tasks"> }> {
  const user = await requireUser(ctx);
  const task = await ctx.db.get(id);
  if (!task || task.userId !== user._id) throw new Error("Task not found.");
  return { user, task };
}

/** Open tasks (todo / doing / waiting), newest first. */
export const listOpen = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
    return tasks.filter((t) => t.status === "todo" || t.status === "doing" || t.status === "waiting");
  },
});

export const setStatus = mutation({
  args: { id: v.id("tasks"), status: literals(TASK_STATUSES) },
  handler: async (ctx, args) => {
    const { user } = await getOwnedTask(ctx, args.id);
    await ctx.db.patch(args.id, { status: args.status, updatedAt: Date.now() });
    if (args.status === "done" || args.status === "dropped") {
      await logAudit(ctx, user._id, `task.${args.status}`, "tasks", args.id);
    }
  },
});

export const update = mutation({
  args: {
    id: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    fiveMinuteStart: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...rest } = args;
    await getOwnedTask(ctx, id);
    await ctx.db.patch(id, { ...pruneUndefined(rest), updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    const { user } = await getOwnedTask(ctx, args.id);
    await ctx.db.delete(args.id);
    await logAudit(ctx, user._id, "task.deleted", "tasks", args.id);
  },
});

/** Internal: ownership-checked fetch for AI actions. */
export const getOwned = internalQuery({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const task = await ctx.db.get(args.id);
    if (!task || task.userId !== user._id) throw new Error("Task not found.");
    return task;
  },
});
