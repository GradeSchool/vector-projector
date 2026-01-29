import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import { rateLimiter } from "./rateLimiter";

const CONFIG_KEY = "config";
const SESSION_ID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const pickLatestByCreation = <T extends { _creationTime: number }>(records: T[]) =>
  records.reduce((latest, record) =>
    record._creationTime > latest._creationTime ? record : latest
  );

/**
 * Ensures an app user record exists for the authenticated Better Auth user.
 * Called after every sign-in (email/password or Google OAuth).
 * Creates the app user if it doesn't exist, starts a new session.
 * Returns user info, admin status, and sessionId.
 *
 * During crowdfunding, new users must provide a valid crowdfundingBackerId.
 * Existing users signing in again don't need to re-verify.
 */
export const ensureAppUser = mutation({
  args: {
    crowdfundingBackerId: v.optional(v.id("crowdfunding_backers")),
    crowdfundingBackerToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
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

    // Check app state (crowdfunding mode)
    const configRecords = await ctx.db
      .query("app_state")
      .withIndex("by_key", (q) => q.eq("key", CONFIG_KEY))
      .collect();
    const config = configRecords.length > 0 ? pickLatestByCreation(configRecords) : null;
    const crowdfundingActive = config?.crowdfundingActive ?? false;

    // Check if app user already exists
    const existingUsers = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", authUser._id))
      .collect();

    if (existingUsers.length > 1) {
      throw new Error("Multiple user records found for this account");
    }

    const existingUser = existingUsers[0];

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
      const updatedUser = await ctx.db.get(existingUser._id);
      if (!updatedUser) {
        throw new Error("Failed to update user session");
      }
      appUser = updatedUser;
    } else {
      // Create new app user with session
      // If crowdfundingBackerId provided, validate and mark as used
      const requiresBacker = crowdfundingActive;
      if (requiresBacker && !args.crowdfundingBackerId) {
        throw new Error("Backer verification is required during crowdfunding");
      }

      if (args.crowdfundingBackerId) {
        if (!args.crowdfundingBackerToken) {
          throw new Error("Backer verification token is required");
        }
        const backer = await ctx.db.get(args.crowdfundingBackerId);
        if (!backer) {
          throw new Error("Invalid backer ID");
        }
        if (backer.usedByUserId) {
          throw new Error("This backer code has already been used");
        }
        if (!backer.pendingClaimToken || !backer.pendingClaimExpiresAt) {
          throw new Error("Backer verification expired. Please verify again.");
        }
        if (backer.pendingClaimToken !== args.crowdfundingBackerToken) {
          throw new Error("Backer verification does not match. Please verify again.");
        }
        if (backer.pendingClaimExpiresAt < now) {
          throw new Error("Backer verification expired. Please verify again.");
        }
      }

      // Enforce email uniqueness (defensive, in case of legacy duplicates)
      const emailMatches = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", authUser.email))
        .collect();
      if (emailMatches.length > 1) {
        throw new Error("Multiple user records found for this email");
      }
      if (emailMatches.length > 0) {
        const matched = emailMatches[0];
        if (matched.authUserId !== authUser._id) {
          throw new Error("An account with this email already exists");
        }
      }

      const userId = await ctx.db.insert("users", {
        authUserId: authUser._id,
        email: authUser.email,
        name: authUser.name ?? undefined,
        createdAt: now,
        activeSessionId: sessionId,
        sessionStartedAt: now,
        crowdfundingBackerId: args.crowdfundingBackerId,
      });

      // Mark backer as used
      if (args.crowdfundingBackerId) {
        await ctx.db.patch(args.crowdfundingBackerId, {
          usedByUserId: userId,
          usedAt: now,
          pendingClaimToken: undefined,
          pendingClaimExpiresAt: undefined,
        });
      }

      const newUser = await ctx.db.get(userId);
      if (!newUser) {
        throw new Error("Failed to create user record");
      }
      appUser = newUser;
    }

    // Check if user is an admin
    const adminRecord = await ctx.db
      .query("admins")
      .withIndex("by_email", (q) => q.eq("email", authUser.email))
      .unique();

    const isAdmin = adminRecord !== null;

    const resolvedSessionId = appUser.activeSessionId ?? sessionId;

    return {
      userId: appUser._id,
      email: appUser.email,
      name: appUser.name,
      isAdmin,
      sessionId: resolvedSessionId,
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

    const appUsers = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", authUser._id))
      .collect();

    if (appUsers.length === 0) {
      return null;
    }

    if (appUsers.length > 1) {
      console.error("Multiple user records found for authUserId", authUser._id);
    }

    const appUser = pickLatestByCreation(appUsers);

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
    if (!SESSION_ID_REGEX.test(sessionId)) {
      return { valid: false, reason: "invalid_session_id" as const };
    }

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
