import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const CONFIG_KEY = "config";

const pickLatestByCreation = <T extends { _creationTime: number }>(records: T[]) =>
  records.reduce((latest, record) =>
    record._creationTime > latest._creationTime ? record : latest
  );

// Get app-wide state (singleton via key="config")
export const get = query({
  args: {},
  handler: async (ctx) => {
    const states = await ctx.db
      .query("app_state")
      .withIndex("by_key", (q) => q.eq("key", CONFIG_KEY))
      .collect();

    if (states.length === 0) {
      return { crowdfundingActive: false };
    }

    if (states.length > 1) {
      console.warn("Multiple app_state rows found for key", CONFIG_KEY);
    }

    return pickLatestByCreation(states);
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
      .collect();

    if (existing.length === 0) {
      await ctx.db.insert("app_state", {
        key: CONFIG_KEY,
        crowdfundingActive: args.crowdfundingActive,
      });
      return;
    }

    const primary = pickLatestByCreation(existing);
    await ctx.db.patch(primary._id, { crowdfundingActive: args.crowdfundingActive });

    for (const record of existing) {
      if (record._id !== primary._id) {
        await ctx.db.delete(record._id);
      }
    }
  },
});
