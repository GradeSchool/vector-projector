import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

// 1 hour expiry for pending uploads (generous buffer)
const PENDING_UPLOAD_TTL_MS = 60 * 60 * 1000;

/**
 * Register a pending upload to track blob ownership.
 * Called by HTTP upload action after successful upload to storage.
 * Internal only - not callable from client.
 */
export const registerPendingUpload = internalMutation({
  args: {
    blobId: v.string(),
    authUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
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
 * Clean up expired pending uploads.
 * Can be called by a scheduled job.
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
