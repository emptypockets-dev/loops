import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { CATEGORIES, EMOTIONAL_WEIGHTS, URGENCY_LEVELS } from "../lib/constants";
import { cleanSubjectForTitle } from "../lib/email/parse-inbound";
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

/** All inbox items for the signed-in user, newest first (capped — use search beyond that). */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return []; // before users.ensure has run — render an empty inbox
    return await ctx.db
      .query("inboxItems")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(200);
  },
});

/** Full-text search over captures (typed notes and forwarded emails alike). */
export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const needle = args.query.trim();
    if (!user || !needle) return [];
    return await ctx.db
      .query("inboxItems")
      .withSearchIndex("search_text", (q) => q.search("rawText", needle).eq("userId", user._id))
      .take(20);
  },
});

/** Park an item until a future time. Snoozing is allowed — that's the point. */
export const snooze = mutation({
  args: { id: v.id("inboxItems"), until: v.number() },
  handler: async (ctx, args) => {
    const { user } = await getOwnedItem(ctx, args.id);
    if (args.until <= Date.now()) throw new Error("Pick a time in the future.");
    await ctx.db.patch(args.id, { snoozedUntil: args.until, updatedAt: Date.now() });
    await logAudit(ctx, user._id, "inboxItem.snoozed", "inboxItems", args.id, {
      until: args.until,
    });
  },
});

export const unsnooze = mutation({
  args: { id: v.id("inboxItems") },
  handler: async (ctx, args) => {
    const { user } = await getOwnedItem(ctx, args.id);
    // Patching to undefined removes the field — intentional here.
    await ctx.db.patch(args.id, { snoozedUntil: undefined, updatedAt: Date.now() });
    await logAudit(ctx, user._id, "inboxItem.unsnoozed", "inboxItems", args.id);
  },
});

/** Whether the user has captured anything yet (drives the first-run brain dump). */
export const hasAny = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return false;
    const first = await ctx.db
      .query("inboxItems")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    return first !== null;
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

/**
 * Internal: capture a forwarded email as an inbox item (called by the
 * /inbound-email HTTP webhook — no user identity, so the per-user
 * captureToken is the credential). Schedules auto-classification so the
 * item lands organized; classification failures degrade to "unprocessed".
 */
export const captureFromEmail = internalMutation({
  args: {
    captureToken: v.string(),
    fromAddress: v.string(),
    subject: v.string(),
    body: v.string(),
    messageId: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args
  ): Promise<
    | { ok: true; itemId: Id<"inboxItems">; deduplicated: boolean }
    | { ok: false; reason: "unknown_token" | "rate_limited" }
  > => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_capture_token", (q) => q.eq("captureToken", args.captureToken))
      .unique();
    if (!user) {
      // Unknown/rotated token. The webhook returns 200 so the provider
      // doesn't retry; nothing is stored.
      return { ok: false, reason: "unknown_token" };
    }

    const recent = await ctx.db
      .query("inboxItems")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(50);

    // Idempotency: providers retry on timeouts. Same Message-ID within the
    // recent window → treat as already captured.
    if (args.messageId) {
      const existing = recent.find((item) => item.emailMessageId === args.messageId);
      if (existing) {
        return { ok: true, itemId: existing._id, deduplicated: true };
      }
    }

    // Flood guard: if a capture address leaks to a mailing list, cap the
    // damage. Rotating the address from Settings is the real fix.
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const capturedLastHour = recent.filter(
      (item) => item.source === "integration" && item.createdAt >= oneHourAgo
    ).length;
    if (capturedLastHour >= 30) {
      console.warn(`Email capture rate limit hit for user ${user._id}`);
      return { ok: false, reason: "rate_limited" };
    }

    const now = Date.now();
    const headerLines = [`From: ${args.fromAddress}`, args.subject ? `Subject: ${args.subject}` : null]
      .filter(Boolean)
      .join("\n");
    const rawText = `Forwarded email\n${headerLines}\n\n${args.body}`.trim();

    const displayTitle =
      cleanSubjectForTitle(args.subject) ||
      args.body.split("\n").find((line) => line.trim()) ||
      "Forwarded email";

    const itemId = await ctx.db.insert("inboxItems", {
      userId: user._id,
      rawText,
      cleanedTitle:
        displayTitle.length > 90 ? `${displayTitle.slice(0, 87)}…` : displayTitle,
      summary: "",
      category: "Someday", // placeholder until classified; UI hides it while unprocessed
      urgency: "low",
      emotionalWeight: "low",
      suggestedNextAction: "",
      suggestedFiveMinuteStart: "",
      source: "integration",
      status: "unprocessed",
      emailFrom: args.fromAddress,
      emailSubject: args.subject || undefined,
      emailMessageId: args.messageId,
      createdAt: now,
      updatedAt: now,
    });
    await logAudit(ctx, user._id, "inboxItem.capturedFromEmail", "inboxItems", itemId, {
      from: args.fromAddress,
    });

    // Auto-classify on arrival (allowed by the approval-first rules: classify/
    // summarize is automatic; consequential actions still require approval).
    await ctx.scheduler.runAfter(0, internal.ai.classifyForUser, {
      userId: user._id,
      inboxItemId: itemId,
    });

    return { ok: true, itemId, deduplicated: false };
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

/** Internal: identity-less fetch for scheduled jobs, checked against an explicit owner. */
export const getForUser = internalQuery({
  args: { id: v.id("inboxItems"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item || item.userId !== args.userId) throw new Error("Inbox item not found.");
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
