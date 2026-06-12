import { v } from "convex/values";
import { internalMutation, mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireUser } from "./lib/auth";
import { logAudit } from "./lib/audit";

/** Internal: record an unstuck suggestion (created by the AI action). */
export const create = internalMutation({
  args: {
    userId: v.id("users"),
    suggestion: v.string(),
    reason: v.string(),
    fiveMinuteVersion: v.string(),
    reassurance: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"nudges">> => {
    return await ctx.db.insert("nudges", {
      ...args,
      acted: false,
      createdAt: Date.now(),
    });
  },
});

/** The user did the one thing. It counted. */
export const markActed = mutation({
  args: { id: v.id("nudges") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const nudge = await ctx.db.get(args.id);
    if (!nudge || nudge.userId !== user._id) throw new Error("Not found.");
    if (nudge.acted) return;
    await ctx.db.patch(args.id, { acted: true });
    await logAudit(ctx, user._id, "nudge.acted", "nudges", args.id, {
      suggestion: nudge.suggestion.slice(0, 120),
    });
  },
});
