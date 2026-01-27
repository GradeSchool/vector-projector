import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import { rateLimiter } from "./rateLimiter";


/**
 * Ensures an app user record exists for the authenticated Better Auth user.
 * Called after every sign-in (email/password or Google OAuth).
 * Creates the app user if it doesn't exist, starts a new session.
 * Returns user info, admin status, and sessionId.
 */
export const ensureAppUser = mutation({
  args: {},
  handler: async (ctx) => {
    // Get the authenticated Better Auth user
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) {
      throw new Error("Not authenticated");
    }

    // Rate limit by auth user ID (10 per minute)
    const { ok, retryAfter } = await rateLimiter.limit(ctx, "sessionCreate", {
      key: authUser._id,
    });
    if (!ok) {
      throw new Error(`Too many sign-in attempts. Try again in ${Math.ceil(retryAfter! / 1000)} seconds.`);
    }

    // Check if app user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", authUser._id))
      .unique();

    // Generate new session ID
    const sessionId = crypto.randomUUID();
    const now = Date.now();

    let appUser;

    if (existingUser) {
      // Update existing user with new session
      await ctx.db.patch(existingUser._id, {
        activeSessionId: sessionId,
        sessionStartedAt: now,
      });
      appUser = { ...existingUser, activeSessionId: sessionId, sessionStartedAt: now };
    } else {
      // Create new app user with session
      const userId = await ctx.db.insert("users", {
        authUserId: authUser._id,
        email: authUser.email,
        name: authUser.name ?? undefined,
        createdAt: now,
        activeSessionId: sessionId,
        sessionStartedAt: now,
      });
      appUser = await ctx.db.get(userId);
    }

    // Check if user is an admin
    const adminRecord = await ctx.db
      .query("admins")
      .withIndex("by_email", (q) => q.eq("email", authUser.email))
      .unique();

    const isAdmin = adminRecord !== null;

    return {
      userId: appUser!._id,
      email: appUser!.email,
      name: appUser!.name,
      isAdmin,
      sessionId,
    };
  },
});

/**
 * Get the current app user (if authenticated).
 * Returns null if not authenticated or no app user exists.
 */
export const getCurrentAppUser = query({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) {
      return null;
    }

    const appUser = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", authUser._id))
      .unique();

    if (!appUser) {
      return null;
    }

    // Check admin status
    const adminRecord = await ctx.db
      .query("admins")
      .withIndex("by_email", (q) => q.eq("email", appUser.email))
      .unique();

    return {
      userId: appUser._id,
      email: appUser.email,
      name: appUser.name,
      isAdmin: adminRecord !== null,
      activeSessionId: appUser.activeSessionId,
    };
  },
});

/**
 * Validates that the provided sessionId matches the user's active session.
 * Returns { valid: true } if session is valid, { valid: false, reason } if not.
 * Includes grace period for page refreshes.
 */
export const validateSession = query({
  args: { sessionId: v.string() },
  handler: async (ctx, { sessionId }) => {
    // Wrap in try-catch because getAuthUser can throw when session is cleared
    let authUser;
    try {
      authUser = await authComponent.getAuthUser(ctx);
    } catch {
      return { valid: false, reason: "not_authenticated" as const };
    }

    if (!authUser) {
      return { valid: false, reason: "not_authenticated" as const };
    }

    const appUser = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", authUser._id))
      .unique();

    if (!appUser) {
      return { valid: false, reason: "no_app_user" as const };
    }

    // Check if session matches
    if (appUser.activeSessionId === sessionId) {
      return { valid: true };
    }

    // Session doesn't match - user signed in elsewhere
    return { valid: false, reason: "session_invalidated" as const };
  },
});
