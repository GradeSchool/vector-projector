import { v } from "convex/values";
import { internalMutation, mutation } from "./_generated/server";
import { rateLimiter } from "./rateLimiter";

/**
 * Add a backer to the crowdfunding_backers table.
 * INTERNAL ONLY - cannot be called from client.
 * For admin/CLI use to populate the backer list.
 *
 * Usage: npx convex run crowdfundingBackers:addBacker '{"username": "user123", "accessCode": "ABC123", "tier": "Gold"}'
 */
export const addBacker = internalMutation({
  args: {
    username: v.string(),
    accessCode: v.string(),
    tier: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if this username/code combo already exists
    const existing = await ctx.db
      .query("crowdfunding_backers")
      .withIndex("by_username_code", (q) =>
        q.eq("username", args.username).eq("accessCode", args.accessCode)
      )
      .unique();

    if (existing) {
      return { success: false, reason: "already_exists", id: existing._id };
    }

    const id = await ctx.db.insert("crowdfunding_backers", {
      username: args.username,
      accessCode: args.accessCode,
      tier: args.tier,
    });

    return { success: true, id };
  },
});

/**
 * Verify a backer's credentials against the crowdfunding_backers table.
 * Returns the backer record if valid, error info if not.
 *
 * Rate limited to prevent brute-forcing access codes.
 *
 * Note: This is a mutation (not query) so it can be called imperatively
 * from form submission handlers on the client.
 */
export const verifyBacker = mutation({
  args: {
    username: v.string(),
    accessCode: v.string(),
  },
  handler: async (ctx, args) => {
    // Rate limit by username to prevent brute-forcing codes for a specific user
    const { ok, retryAfter } = await rateLimiter.limit(ctx, "backerVerify", {
      key: args.username.toLowerCase(),
    });
    if (!ok) {
      return {
        valid: false as const,
        reason: "rate_limited" as const,
        retryAfter: Math.ceil(retryAfter! / 1000),
      };
    }

    const backer = await ctx.db
      .query("crowdfunding_backers")
      .withIndex("by_username_code", (q) =>
        q.eq("username", args.username).eq("accessCode", args.accessCode)
      )
      .unique();

    if (!backer) {
      return { valid: false as const, reason: "invalid_credentials" as const };
    }

    if (backer.usedByUserId) {
      return { valid: false as const, reason: "already_used" as const };
    }

    return {
      valid: true as const,
      backerId: backer._id,
      tier: backer.tier,
    };
  },
});
