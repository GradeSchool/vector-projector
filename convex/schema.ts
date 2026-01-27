import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // App-specific user data (extends Better Auth user)
  // Better Auth manages its own tables (betterAuth:user, betterAuth:session, etc.)
  // This table links to Better Auth via authUserId
  users: defineTable({
    authUserId: v.string(), // Better Auth user ID
    email: v.string(),
    name: v.optional(v.string()),
    createdAt: v.number(),
    // Session enforcement - only one active session per user
    activeSessionId: v.optional(v.string()),
    sessionStartedAt: v.optional(v.number()),
  })
    .index("by_authUserId", ["authUserId"])
    .index("by_email", ["email"]),

  // Admin whitelist - manually managed
  // Users with emails in this table have admin privileges
  admins: defineTable({
    email: v.string(),
    addedAt: v.number(),
    note: v.optional(v.string()), // optional note about why they're admin
  }).index("by_email", ["email"]),

  // App-wide state (singleton pattern)
  // Uses key="config" to enforce single row via upsert
  app_state: defineTable({
    key: v.string(), // always "config"
    crowdfundingActive: v.boolean(),
  }).index("by_key", ["key"]),
});
