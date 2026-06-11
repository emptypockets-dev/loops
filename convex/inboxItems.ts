import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { CATEGORIES, EMOTIONAL_WEIGHTS, URGENCY_LEVELS } from "../lib/constants";
import { getCurrentUser, requireUser } from "./lib/auth";
import { logAudit, pruneUndefined } from "./lib/audit";
import { classificationFields, literals } from "./lib/validators";

async function getOwnedItem(
  ctx: MutationCtx,
  id: Id<"inboxItems">
): Promise<{ user: Doc<"users">; item: Doc<"inboxItems"> }> {
  const user = await requireUser(ctx);
  const item = await ctx.db.get(id);
  if (!item || item.userId !== user._id) {
    throw new Error("Inbox item not found.");
  }
  return { user, item };
}

/** All inbox items for the signed-in user, newest first. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return []; // before users.ensure has run — render an empty inbox
    return await ctx.db
      .query("inboxItems")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

export const capture = mutation({
  args: { rawText: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const rawText = args.rawText.trim();
    if (!rawText) throw new Error("Nothing to capture.");
    const now = Date.now();
    const id = await ctx.db.insert("inboxItems", {
      userId: user._id,
      rawText,
      cleanedTitle: rawText.length > 90 ? `${rawText.slice(0, 87)}…` : rawText,
      summary: "",
      category: "Someday", // placeholder until classified; UI hides it while unprocessed
      urgency: "low",
      emotionalWeight: "low",
      suggestedNextAction: "",
      suggestedFiveMinuteStart: "",
      source: "manual",
      status: "unprocessed",
      createdAt: now,
      updatedAt: now,
    });
    return { id };
  },
});

/**
 * Manual edit / classification override. Touching any classification field
 * marks the item as confirmed by the user ("Confirmed" badge, not "AI suggested").
 */
export const update = mutation({
  args: {
    id: v.id("inboxItems"),
    cleanedTitle: v.optional(v.string()),
    summary: v.optional(v.string()),
    category: v.optional(literals(CATEGORIES)),
    urgency: v.optional(literals(URGENCY_LEVELS)),
    emotionalWeight: v.optional(literals(EMOTIONAL_WEIGHTS)),
    suggestedNextAction: v.optional(v.string()),
    suggestedFiveMinuteStart: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...rest } = args;
    const { user, item } = await getOwnedItem(ctx, id);
    const touchedClassification = [
      rest.category,
      rest.urgency,
      rest.emotionalWeight,
      rest.cleanedTitle,
      rest.summary,
      rest.suggestedNextAction,
      rest.suggestedFiveMinuteStart,
    ].some((value) => value !== undefined);

    await ctx.db.patch(id, {
      ...pruneUndefined(rest),
      ...(touchedClassification
        ? {
            classifiedBy: "user" as const,
            status: item.status === "unprocessed" ? ("classified" as const) : item.status,
          }
        : {}),
      updatedAt: Date.now(),
    });
    await logAudit(ctx, user._id, "inboxItem.updated", "inboxItems", id);
  },
});

export const archive = mutation({
  args: { id: v.id("inboxItems") },
  handler: async (ctx, args) => {
    const { user } = await getOwnedItem(ctx, args.id);
    const now = Date.now();
    await ctx.db.patch(args.id, { status: "archived", archivedAt: now, updatedAt: now });
    await logAudit(ctx, user._id, "inboxItem.archived", "inboxItems", args.id);
  },
});

export const unarchive = mutation({
  args: { id: v.id("inboxItems") },
  handler: async (ctx, args) => {
    const { user, item } = await getOwnedItem(ctx, args.id);
    await ctx.db.patch(args.id, {
      status: item.classifiedBy ? "classified" : "unprocessed",
      archivedAt: undefined,
      updatedAt: Date.now(),
    });
    await logAudit(ctx, user._id, "inboxItem.unarchived", "inboxItems", args.id);
  },
});

export const remove = mutation({
  args: { id: v.id("inboxItems") },
  handler: async (ctx, args) => {
    const { user, item } = await getOwnedItem(ctx, args.id);
    await ctx.db.delete(args.id);
    await logAudit(ctx, user._id, "inboxItem.deleted", "inboxItems", args.id, {
      rawText: item.rawText.slice(0, 200),
    });
  },
});

/** Convert an inbox item into a real task; the item is marked "converted". */
export const convertToTask = mutation({
  args: { id: v.id("inboxItems") },
  handler: async (ctx, args) => {
    const { user, item } = await getOwnedItem(ctx, args.id);
    const now = Date.now();
    const taskId = await ctx.db.insert("tasks", {
      userId: user._id,
      title: item.cleanedTitle || item.rawText,
      description: item.summary || item.rawText,
      category: item.category,
      status: "todo",
      sourceInboxItemId: item._id,
      fiveMinuteStart: item.suggestedFiveMinuteStart || undefined,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(item._id, { status: "converted", updatedAt: now });
    await logAudit(ctx, user._id, "inboxItem.convertedToTask", "tasks", taskId, {
      inboxItemId: item._id,
    });
    return { taskId };
  },
});

/** Internal: ownership-checked fetch for AI actions. */
export const getOwned = internalQuery({
  args: { id: v.id("inboxItems") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const item = await ctx.db.get(args.id);
    if (!item || item.userId !== user._id) throw new Error("Inbox item not found.");
    return item;
  },
});

/** Internal: persist a validated AI classification (optionally auto-archiving). */
export const applyClassification = internalMutation({
  args: {
    id: v.id("inboxItems"),
    classification: v.object(classificationFields),
    autoArchive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Inbox item not found.");
    const now = Date.now();
    await ctx.db.patch(args.id, {
      ...args.classification,
      classifiedBy: "ai" as const,
      status: args.autoArchive ? ("archived" as const) : ("classified" as const),
      ...(args.autoArchive ? { archivedAt: now } : {}),
      updatedAt: now,
    });
    await logAudit(
      ctx,
      item.userId,
      args.autoArchive ? "inboxItem.aiClassifiedAndArchived" : "inboxItem.aiClassified",
      "inboxItems",
      args.id,
      { category: args.classification.category }
    );
  },
});
