import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";

// =============================================================================
// CONSTANTS
// =============================================================================

const ALERT_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// =============================================================================
// QUERIES
// =============================================================================

// Get all active (non-expired) alerts, newest first
export const getActive = query({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - ALERT_EXPIRY_MS;
    const alerts = await ctx.db
      .query("alerts")
      .withIndex("by_createdAt", (q) => q.gt("createdAt", cutoff))
      .order("desc")
      .collect();
    return alerts;
  },
});

// Check if user has unread alerts (any active alert newer than lastSeenAlertAt)
export const hasUnread = query({
  args: {},
  handler: async (ctx) => {
    // Get authenticated user (may throw during sign-out race)
    let authUser;
    try {
      authUser = await authComponent.getAuthUser(ctx);
    } catch {
      return false;
    }
    if (!authUser) {
      return false;
    }

    // Get app user
    const appUser = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", authUser._id))
      .first();
    if (!appUser) {
      return false;
    }

    // Check for any active alert newer than user's lastSeenAlertAt
    const cutoff = Date.now() - ALERT_EXPIRY_MS;
    const lastSeen = appUser.lastSeenAlertAt ?? 0;
    const since = Math.max(cutoff, lastSeen);

    const latestUnread = await ctx.db
      .query("alerts")
      .withIndex("by_createdAt", (q) => q.gt("createdAt", since))
      .order("desc")
      .first();

    return !!latestUnread;
  },
});

// =============================================================================
// MUTATIONS
// =============================================================================

// Create a new alert (admin only)
export const create = mutation({
  args: {
    message: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify authenticated
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) {
      throw new Error("Not authenticated");
    }

    // Get app user
    const appUser = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", authUser._id))
      .first();
    if (!appUser) {
      throw new Error("User not found");
    }

    // Verify admin
    const admin = await ctx.db
      .query("admins")
      .withIndex("by_email", (q) => q.eq("email", appUser.email))
      .first();
    if (!admin) {
      throw new Error("Not authorized - admin only");
    }

    // Create alert
    const alertId = await ctx.db.insert("alerts", {
      message: args.message.trim(),
      createdAt: Date.now(),
      createdBy: appUser._id,
    });

    return alertId;
  },
});

// Mark alerts as read (updates user's lastSeenAlertAt)
export const markAsRead = mutation({
  args: {},
  handler: async (ctx) => {
    // Get authenticated user (may throw during sign-out race)
    let authUser;
    try {
      authUser = await authComponent.getAuthUser(ctx);
    } catch {
      return { success: false };
    }
    if (!authUser) {
      return { success: false };
    }

    // Get app user
    const appUser = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", authUser._id))
      .first();
    if (!appUser) {
      return { success: false };
    }

    // Update lastSeenAlertAt
    await ctx.db.patch(appUser._id, {
      lastSeenAlertAt: Date.now(),
    });

    return { success: true };
  },
});
