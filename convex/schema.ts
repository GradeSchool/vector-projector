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
    // Backer access period (authoritative for access checks)
    backerAccessGrantedAt: v.optional(v.number()),
    backerAccessUntil: v.optional(v.number()),
    // Alert tracking - timestamp of last seen alert
    lastSeenAlertAt: v.optional(v.number()),
  })
    .index("by_authUserId", ["authUserId"])
    .index("by_email", ["email"]),

  // Admin alerts - broadcast messages to all users
  alerts: defineTable({
    message: v.string(), // Alert text (can include emojis)
    createdAt: v.number(),
    createdBy: v.id("users"), // Admin who sent it
  }).index("by_createdAt", ["createdAt"]),

  // Crowdfunding backers - verified MakerWorld supporters
  // Populated manually or via import before crowdfunding period
  crowdfunding_backers: defineTable({
    username: v.string(), // MakerWorld username
    usernameLower: v.optional(v.string()), // normalized for lookup
    accessCode: v.string(), // Verification code
    tier: v.string(), // Backer tier (affects future billing discounts)
    usedByUserId: v.optional(v.id("users")), // Tracks which user claimed this
    usedAt: v.optional(v.number()), // When it was claimed
    pendingClaimToken: v.optional(v.string()), // short-lived verification token
    pendingClaimExpiresAt: v.optional(v.number()),
    // Access period granted (audit trail)
    accessGrantedAt: v.optional(v.number()),
    accessUntil: v.optional(v.number()),
  })
    .index("by_username_code", ["username", "accessCode"])
    .index("by_usernameLower_code", ["usernameLower", "accessCode"])
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

  // Pricing catalog - snapshot of Stripe products/prices
  // Singleton pattern: key="catalog"
  // Updated via admin-triggered sync, NOT webhooks
  pricing_catalog: defineTable({
    key: v.string(), // always "catalog"
    products: v.array(
      v.object({
        productId: v.string(),
        name: v.string(),
        active: v.boolean(),
        metadata: v.record(v.string(), v.string()),
      })
    ),
    prices: v.array(
      v.object({
        priceId: v.string(),
        productId: v.string(),
        unitAmount: v.number(), // cents
        currency: v.string(),
        interval: v.string(), // "month" or "year"
        active: v.boolean(),
        nickname: v.optional(v.string()),
        metadata: v.record(v.string(), v.string()),
      })
    ),
    lastSyncedAt: v.number(),
    lastSyncError: v.optional(v.string()),
    lastSyncFailedAt: v.optional(v.number()),
  }).index("by_key", ["key"]),

  // ============================================
  // Vector Projector Tables
  // ============================================

  // Pending uploads - tracks blob ownership before commit
  // Prevents blobId theft between upload and commit
  // Cleaned up after successful commit or via scheduled job
  pending_uploads: defineTable({
    blobId: v.string(), // From convex-fs upload
    authUserId: v.string(), // Better Auth user ID who uploaded
    createdAt: v.number(),
    expiresAt: v.number(), // Auto-cleanup after this time
  })
    .index("by_blobId", ["blobId"])
    .index("by_authUserId", ["authUserId"])
    .index("by_expiresAt", ["expiresAt"]),

  // STL files - user library + admin base samples
  stl_files: defineTable({
    userId: v.id("users"), // Owner (user or admin who uploaded)
    path: v.string(), // Convex-fs path (e.g., /users/{subject}/stl/abc.stl)
    fileName: v.string(), // Original filename
    name: v.string(), // User-defined display name
    fileSize: v.number(), // Bytes, for quota tracking
    isBase: v.boolean(), // True for admin samples (discovery mode)
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_isBase", ["isBase"]),

  // SVG files - user library + admin base samples
  svg_files: defineTable({
    userId: v.id("users"), // Owner (user or admin who uploaded)
    path: v.string(), // Convex-fs path
    fileName: v.string(), // Original filename
    name: v.string(), // User-defined display name
    fileSize: v.number(), // Bytes, for quota tracking
    isBase: v.boolean(), // True for admin samples
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_isBase", ["isBase"]),

  // Projects - user's saved work
  projects: defineTable({
    userId: v.id("users"),
    name: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    // STL reference (can be user file or base file)
    stlFileId: v.optional(v.id("stl_files")),
    // STL orientation in viewer
    stlOrientation: v.optional(
      v.object({
        rotation: v.object({
          x: v.number(),
          y: v.number(),
          z: v.number(),
          w: v.number(),
        }),
        zOffset: v.number(),
      })
    ),
    // Extrusion planes (max 10, enforced in mutation)
    extrusionPlanes: v.array(
      v.object({
        name: v.string(),
        planeData: v.object({
          outer: v.array(v.object({ x: v.number(), y: v.number() })),
          holes: v.array(
            v.array(v.object({ x: v.number(), y: v.number() }))
          ),
          planeZ: v.number(),
        }),
        svgFileId: v.optional(v.id("svg_files")),
        svgSettings: v.optional(
          v.object({
            scale: v.number(),
            rotation: v.number(),
            position: v.object({ x: v.number(), y: v.number() }),
          })
        ),
        svgShapes: v.optional(
          v.array(
            v.object({
              shapeIndex: v.number(),
              name: v.string(),
              extrusionSettings: v.object({
                height: v.number(),
              }),
            })
          )
        ),
      })
    ),
  }).index("by_userId", ["userId"]),
});
