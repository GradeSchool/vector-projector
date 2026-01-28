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
    // Crowdfunding backer link (for tier-based billing discounts)
    crowdfundingBackerId: v.optional(v.id("crowdfunding_backers")),
  })
    .index("by_authUserId", ["authUserId"])
    .index("by_email", ["email"]),

  // Crowdfunding backers - verified MakerWorld supporters
  // Populated manually or via import before crowdfunding period
  crowdfunding_backers: defineTable({
    username: v.string(), // MakerWorld username
    accessCode: v.string(), // Verification code
    tier: v.string(), // Backer tier (affects future billing discounts)
    usedByUserId: v.optional(v.id("users")), // Tracks which user claimed this
    usedAt: v.optional(v.number()), // When it was claimed
  })
    .index("by_username_code", ["username", "accessCode"])
    .index("by_usedByUserId", ["usedByUserId"]),

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
