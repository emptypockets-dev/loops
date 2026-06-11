import { v } from "convex/values";
import { internalQuery, mutation, query } from "./_generated/server";
import { DEFAULT_LOOPS } from "../lib/constants";
import { getCurrentUser, requireUser } from "./lib/auth";
import { logAudit } from "./lib/audit";

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
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated.");

    const now = Date.now();
    const email = identity.email ?? "";
    const name = identity.name ?? identity.nickname ?? email.split("@")[0] ?? "";

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
        createdAt: now,
        updatedAt: now,
      });
      user = (await ctx.db.get(userId))!;
      await logAudit(ctx, userId, "user.created", "users", userId);
    } else if (user.email !== email || user.name !== name) {
      await ctx.db.patch(user._id, { email, name, updatedAt: now });
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
  args: { autoArchiveEnabled: v.boolean() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await ctx.db.patch(user._id, {
      autoArchiveEnabled: args.autoArchiveEnabled,
      updatedAt: Date.now(),
    });
    await logAudit(ctx, user._id, "user.preferencesUpdated", "users", user._id, {
      autoArchiveEnabled: args.autoArchiveEnabled,
    });
  },
});

/** Everything the user owns, as one JSON-able object (Settings → Data export). */
export const exportData = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const [inboxItems, loops, loopRuns, tasks, dailyBriefs, reviews, drafts, integrations, auditLog] =
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
