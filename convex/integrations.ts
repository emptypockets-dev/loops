import { query } from "./_generated/server";
import { getCurrentUser } from "./lib/auth";

/**
 * Scaffolding only. No provider can be connected in the MVP — Settings shows
 * each one as "Coming soon". The table and this query exist so future sync
 * drops in without a data-model change.
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("integrations")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});
