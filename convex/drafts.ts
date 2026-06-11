import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { DRAFT_TYPES, RISK_LEVELS } from "../lib/constants";
import { getCurrentUser, requireUser } from "./lib/auth";
import { logAudit } from "./lib/audit";
import { literals } from "./lib/validators";

async function getOwnedDraft(
  ctx: MutationCtx,
  id: Id<"drafts">
): Promise<{ user: Doc<"users">; draft: Doc<"drafts"> }> {
  const user = await requireUser(ctx);
  const draft = await ctx.db.get(id);
  if (!draft || draft.userId !== user._id) throw new Error("Draft not found.");
  return { user, draft };
}

/** Drafts awaiting a decision — surfaced on Today. */
export const listPending = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("drafts")
      .withIndex("by_user_status", (q) => q.eq("userId", user._id).eq("status", "draft"))
      .order("desc")
      .collect();
  },
});

/** Drafts are editable before they take effect. */
export const updateContent = mutation({
  args: { id: v.id("drafts"), title: v.string(), body: v.string() },
  handler: async (ctx, args) => {
    const { draft } = await getOwnedDraft(ctx, args.id);
    if (draft.status !== "draft") throw new Error("This draft has already been resolved.");
    await ctx.db.patch(args.id, {
      title: args.title.trim(),
      body: args.body,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Approve a draft. Nothing is ever sent externally in the MVP: approving an
 * email/calendar/note marks it ready for you to use; approving a task creates
 * the task inside Loops.
 */
export const approve = mutation({
  args: { id: v.id("drafts") },
  handler: async (ctx, args) => {
    const { user, draft } = await getOwnedDraft(ctx, args.id);
    if (draft.status !== "draft") throw new Error("This draft has already been resolved.");
    const now = Date.now();
    await ctx.db.patch(args.id, { status: "approved", updatedAt: now });

    let createdTaskId: Id<"tasks"> | null = null;
    if (draft.type === "task") {
      const sourceItem = draft.relatedInboxItemId
        ? await ctx.db.get(draft.relatedInboxItemId)
        : null;
      createdTaskId = await ctx.db.insert("tasks", {
        userId: user._id,
        title: draft.title,
        description: draft.body,
        category: sourceItem?.category ?? "Someday",
        status: "todo",
        sourceInboxItemId: draft.relatedInboxItemId,
        createdAt: now,
        updatedAt: now,
      });
    }

    await logAudit(ctx, user._id, "draft.approved", "drafts", args.id, {
      type: draft.type,
      riskLevel: draft.riskLevel,
      createdTaskId,
    });
    return { createdTaskId };
  },
});

export const reject = mutation({
  args: { id: v.id("drafts") },
  handler: async (ctx, args) => {
    const { user, draft } = await getOwnedDraft(ctx, args.id);
    if (draft.status !== "draft") throw new Error("This draft has already been resolved.");
    await ctx.db.patch(args.id, { status: "rejected", updatedAt: Date.now() });
    await logAudit(ctx, user._id, "draft.rejected", "drafts", args.id, { type: draft.type });
  },
});

/** Internal: persist an AI-generated draft (always status "draft", never sent). */
export const create = internalMutation({
  args: {
    userId: v.id("users"),
    type: literals(DRAFT_TYPES),
    title: v.string(),
    body: v.string(),
    riskLevel: literals(RISK_LEVELS),
    relatedInboxItemId: v.optional(v.id("inboxItems")),
    relatedTaskId: v.optional(v.id("tasks")),
    requiresApproval: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert("drafts", {
      userId: args.userId,
      type: args.type,
      title: args.title,
      body: args.body,
      status: "draft",
      riskLevel: args.riskLevel,
      relatedInboxItemId: args.relatedInboxItemId,
      relatedTaskId: args.relatedTaskId,
      createdAt: now,
      updatedAt: now,
    });
    await logAudit(ctx, args.userId, "draft.created", "drafts", id, {
      type: args.type,
      riskLevel: args.riskLevel,
      requiresApproval: args.requiresApproval,
    });
    return { id };
  },
});
