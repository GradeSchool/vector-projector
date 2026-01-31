import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { fs } from "./fs";

/**
 * Commit an uploaded STL file to the user's library.
 * Called after successful upload via /upload HTTP endpoint.
 *
 * Security features:
 * - Rate limiting enforced at /upload endpoint (10/hour per user)
 * - BlobId ownership validation (prevents theft)
 * - Server-side path generation (prevents path injection)
 * - Admin validation for base files
 *
 * Flow:
 * 1. Client POSTs file to /upload → rate limited, gets { blobId }
 * 2. Client calls this mutation with blobId
 * 3. Server validates blobId ownership
 * 4. Server generates path and commits blob
 * 5. Server creates stl_files record
 */
export const commitFile = mutation({
  args: {
    blobId: v.string(), // From /upload response
    fileName: v.string(), // Original filename
    name: v.string(), // User-defined display name
    fileSize: v.number(), // Bytes
    isBase: v.boolean(), // True for admin base samples
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get app user
    const appUser = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", identity.subject))
      .unique();

    if (!appUser) {
      throw new Error("App user not found");
    }

    // Note: Rate limiting is enforced at /upload endpoint, not here.
    // This prevents double-counting (upload + commit = 2 tokens).
    // Since you can't commit without first uploading, upload rate limit is sufficient.

    // Validate blobId ownership - prevents another user from stealing uploads
    const uploadValidation = await ctx.runMutation(
      internal.uploads.consumePendingUpload,
      {
        blobId: args.blobId,
        authUserId: identity.subject,
      }
    );
    if (!uploadValidation.valid) {
      throw new Error(uploadValidation.reason ?? "Invalid upload");
    }

    // Server-side admin validation for base files
    let path: string;
    if (args.isBase) {
      const adminRecord = await ctx.db
        .query("admins")
        .withIndex("by_email", (q) => q.eq("email", appUser.email))
        .unique();

      if (!adminRecord) {
        throw new Error("Only admins can upload base samples");
      }

      // Generate path server-side (prevents path injection)
      const fileId = crypto.randomUUID();
      path = `/base/stl/${fileId}.stl`;
    } else {
      // User files go in their directory
      const fileId = crypto.randomUUID();
      path = `/users/${identity.subject}/stl/${fileId}.stl`;
    }

    // Commit the blob to the path in convex-fs
    await fs.commitFiles(ctx, [{ path, blobId: args.blobId }]);

    // Create the file record in our table
    const fileId = await ctx.db.insert("stl_files", {
      userId: appUser._id,
      path,
      fileName: args.fileName,
      name: args.name,
      fileSize: args.fileSize,
      isBase: args.isBase,
      createdAt: Date.now(),
    });

    return fileId;
  },
});

/**
 * List all base STL samples (for discovery mode).
 * Public - no auth required.
 */
export const listBaseSamples = query({
  args: {},
  handler: async (ctx) => {
    const samples = await ctx.db
      .query("stl_files")
      .withIndex("by_isBase", (q) => q.eq("isBase", true))
      .collect();

    return samples.map((s) => ({
      _id: s._id,
      name: s.name,
      fileName: s.fileName,
      fileSize: s.fileSize,
      path: s.path, // Client constructs URL: ${CONVEX_SITE_URL}/fs${path}
      createdAt: s.createdAt,
    }));
  },
});

/**
 * List user's own STL files.
 */
export const listUserFiles = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const appUser = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", identity.subject))
      .unique();

    if (!appUser) {
      return [];
    }

    const files = await ctx.db
      .query("stl_files")
      .withIndex("by_userId", (q) => q.eq("userId", appUser._id))
      .collect();

    // Filter out base files (admin might have user files too)
    return files
      .filter((f) => !f.isBase)
      .map((f) => ({
        _id: f._id,
        name: f.name,
        fileName: f.fileName,
        fileSize: f.fileSize,
        path: f.path, // Client constructs URL: ${CONVEX_SITE_URL}/fs${path}
        createdAt: f.createdAt,
      }));
  },
});

/**
 * Delete an STL file.
 */
export const deleteFile = mutation({
  args: {
    fileId: v.id("stl_files"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const file = await ctx.db.get(args.fileId);
    if (!file) {
      throw new Error("File not found");
    }

    // Get app user
    const appUser = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", identity.subject))
      .unique();

    if (!appUser) {
      throw new Error("App user not found");
    }

    // For base files, require admin
    if (file.isBase) {
      const adminRecord = await ctx.db
        .query("admins")
        .withIndex("by_email", (q) => q.eq("email", appUser.email))
        .unique();

      if (!adminRecord) {
        throw new Error("Only admins can delete base samples");
      }
    } else {
      // For user files, require ownership
      if (file.userId !== appUser._id) {
        throw new Error("Access denied");
      }
    }

    // Delete from convex-fs
    await fs.delete(ctx, file.path);

    // Delete the record
    await ctx.db.delete(args.fileId);
  },
});
