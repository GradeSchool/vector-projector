import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const CONFIG_KEY = "config";

// Get app-wide state (singleton via key="config")
export const get = query({
  args: {},
  handler: async (ctx) => {
    const state = await ctx.db
      .query("app_state")
      .withIndex("by_key", (q) => q.eq("key", CONFIG_KEY))
      .first();
    return state ?? { crowdfundingActive: false };
  },
});

// Upsert app state - creates if not exists, updates if exists
// Call from Convex dashboard: npx convex run appState:set '{"crowdfundingActive": true}'
export const set = mutation({
  args: {
    crowdfundingActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("app_state")
      .withIndex("by_key", (q) => q.eq("key", CONFIG_KEY))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { crowdfundingActive: args.crowdfundingActive });
    } else {
      await ctx.db.insert("app_state", {
        key: CONFIG_KEY,
        crowdfundingActive: args.crowdfundingActive,
      });
    }
  },
});
