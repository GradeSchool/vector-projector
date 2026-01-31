import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { rateLimiter } from "./rateLimiter";

// 1 hour expiry for pending uploads (generous buffer)
const PENDING_UPLOAD_TTL_MS = 60 * 60 * 1000;

/**
 * Check if a user has any pending (uncommitted) uploads.
 * Used to enforce one-upload-at-a-time policy.
 * Returns true if user has a pending upload, false otherwise.
 */
export const hasPendingUpload = internalQuery({
  args: {
    authUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const pending = await ctx.db
      .query("pending_uploads")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", args.authUserId))
      .first();

    return pending !== null;
  },
});

/**
 * Check rate limit for file uploads.
 * Called by HTTP upload endpoint BEFORE writing blob to storage.
 * Uses the same 'fileUpload' rule as commitFile (10/hour with burst of 5).
 *
 * Note: We need the app user ID for rate limiting, so we look up by authUserId.
 */
export const checkUploadRateLimit = internalMutation({
  args: {
    authUserId: v.string(),
  },
  handler: async (ctx, args) => {
    // Look up app user to get their ID for rate limiting
    const appUser = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", args.authUserId))
      .unique();

    if (!appUser) {
      // User hasn't been created yet (first sign-in edge case)
      // Allow the upload - they'll hit rate limit on commit anyway
      return { ok: true };
    }

    const { ok, retryAfter } = await rateLimiter.limit(ctx, "fileUpload", {
      key: appUser._id,
    });

    if (!ok) {
      return {
        ok: false,
        retryAfter: Math.ceil(retryAfter! / 1000),
      };
    }

    return { ok: true };
  },
});

/**
 * Register a pending upload to track blob ownership.
 * Called by HTTP upload action after successful upload to storage.
 * Internal only - not callable from client.
 *
 * Opportunistic cleanup: Before inserting, deletes expired records
 * from ALL users (not just current user). This means every upload
 * acts as a mini-cleanup, preventing accumulation without needing a cron job.
 */
export const registerPendingUpload = internalMutation({
  args: {
    blobId: v.string(),
    authUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Opportunistic cleanup: delete ALL expired pending uploads (any user)
    // This prevents accumulation from inactive users without needing a cron job
    const expired = await ctx.db
      .query("pending_uploads")
      .withIndex("by_expiresAt")
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .collect();

    for (const record of expired) {
      await ctx.db.delete(record._id);
    }

    // Insert new pending upload
    await ctx.db.insert("pending_uploads", {
      blobId: args.blobId,
      authUserId: args.authUserId,
      createdAt: now,
      expiresAt: now + PENDING_UPLOAD_TTL_MS,
    });
  },
});

/**
 * Validate and consume a pending upload.
 * Returns true if the blobId belongs to the given user, false otherwise.
 * Deletes the pending upload record on success (one-time use).
 */
export const consumePendingUpload = internalMutation({
  args: {
    blobId: v.string(),
    authUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const pending = await ctx.db
      .query("pending_uploads")
      .withIndex("by_blobId", (q) => q.eq("blobId", args.blobId))
      .unique();

    if (!pending) {
      return { valid: false, reason: "Upload not found or expired" };
    }

    if (pending.authUserId !== args.authUserId) {
      return { valid: false, reason: "Upload belongs to another user" };
    }

    if (pending.expiresAt < Date.now()) {
      // Clean up expired record
      await ctx.db.delete(pending._id);
      return { valid: false, reason: "Upload expired" };
    }

    // Valid - consume the pending upload
    await ctx.db.delete(pending._id);
    return { valid: true };
  },
});

/**
 * Clean up ALL expired pending uploads across all users.
 * Backup option - opportunistic cleanup in registerPendingUpload now handles
 * all users on every upload. This is only needed if no uploads have happened
 * for a long time and you want to manually clear out stale records.
 * Can be called manually via `npx convex run uploads:cleanupExpiredUploads`
 */
export const cleanupExpiredUploads = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expired = await ctx.db
      .query("pending_uploads")
      .withIndex("by_expiresAt")
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .collect();

    for (const record of expired) {
      await ctx.db.delete(record._id);
    }

    return { deleted: expired.length };
  },
});
