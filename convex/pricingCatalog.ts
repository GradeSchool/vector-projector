import { v } from "convex/values";
import { query, action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import Stripe from "stripe";

// =============================================================================
// Environment Variable Helpers
// =============================================================================

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Set it in Convex Dashboard > Settings > Environment Variables.`
    );
  }
  return value;
}

function getMetadataLookup(): string {
  return requireEnv("STRIPE_METADATA_LOOKUP");
}

function getStripeSecretKey(): string {
  return requireEnv("STRIPE_SECRET_KEY");
}

// =============================================================================
// Get Pricing Catalog
// =============================================================================

/**
 * Get the current pricing catalog.
 * Returns null if no catalog exists (admin needs to sync).
 */
export const get = query({
  args: {},
  handler: async (ctx) => {
    const catalog = await ctx.db
      .query("pricing_catalog")
      .withIndex("by_key", (q) => q.eq("key", "catalog"))
      .first();

    if (!catalog) {
      return null;
    }

    return {
      products: catalog.products,
      prices: catalog.prices,
      lastSyncedAt: catalog.lastSyncedAt,
      lastSyncError: catalog.lastSyncError,
      lastSyncFailedAt: catalog.lastSyncFailedAt,
    };
  },
});

// =============================================================================
// Sync Pricing Catalog (Admin Only)
// =============================================================================

/**
 * Sync pricing catalog from Stripe.
 * Admin-only action - fetches all products/prices with matching metadata.
 */
export const sync = action({
  args: {},
  handler: async (ctx) => {
    const metadataLookup = getMetadataLookup();
    const stripeSecretKey = getStripeSecretKey();

    const stripe = new Stripe(stripeSecretKey);

    try {
      // Fetch all products with pagination
      const allProducts: Stripe.Product[] = [];
      let hasMoreProducts = true;
      let productStartingAfter: string | undefined;

      while (hasMoreProducts) {
        const productList = await stripe.products.list({
          limit: 100,
          active: true,
          starting_after: productStartingAfter,
        });

        allProducts.push(...productList.data);
        hasMoreProducts = productList.has_more;
        if (productList.data.length > 0) {
          productStartingAfter = productList.data[productList.data.length - 1].id;
        }
      }

      // Filter products by metadata
      const matchingProducts = allProducts.filter(
        (p) => p.metadata?.app === metadataLookup
      );
      const matchingProductIds = new Set(matchingProducts.map((p) => p.id));

      // Fetch all prices with pagination
      const allPrices: Stripe.Price[] = [];
      let hasMorePrices = true;
      let priceStartingAfter: string | undefined;

      while (hasMorePrices) {
        const priceList = await stripe.prices.list({
          limit: 100,
          active: true,
          type: "recurring",
          starting_after: priceStartingAfter,
        });

        allPrices.push(...priceList.data);
        hasMorePrices = priceList.has_more;
        if (priceList.data.length > 0) {
          priceStartingAfter = priceList.data[priceList.data.length - 1].id;
        }
      }

      // Filter prices: metadata.app matches OR productId belongs to matching product
      const matchingPrices = allPrices.filter((p) => {
        const productId = typeof p.product === "string" ? p.product : p.product.id;
        return (
          p.metadata?.app === metadataLookup ||
          matchingProductIds.has(productId)
        );
      });

      // Transform to our schema format
      const products = matchingProducts.map((p) => ({
        productId: p.id,
        name: p.name,
        description: p.description ?? undefined,
        images: p.images && p.images.length > 0 ? p.images : undefined,
        active: p.active,
        metadata: p.metadata as Record<string, string>,
      }));

      const prices = matchingPrices.map((p) => {
        const productId = typeof p.product === "string" ? p.product : p.product.id;
        return {
          priceId: p.id,
          productId,
          unitAmount: p.unit_amount ?? 0,
          currency: p.currency,
          interval: p.recurring?.interval ?? "month",
          active: p.active,
          nickname: p.nickname ?? undefined,
          metadata: p.metadata as Record<string, string>,
        };
      });

      // Write to Convex
      await ctx.runMutation(internal.pricingCatalog.writeCatalog, {
        products,
        prices,
      });

      return {
        success: true,
        productCount: products.length,
        priceCount: prices.length,
      };
    } catch (error) {
      // Record error
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      await ctx.runMutation(internal.pricingCatalog.recordSyncError, {
        error: errorMessage,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  },
});

// =============================================================================
// Internal Mutations
// =============================================================================

/**
 * Write the catalog snapshot to the database.
 * Internal mutation - only called by sync action.
 */
export const writeCatalog = internalMutation({
  args: {
    products: v.array(
      v.object({
        productId: v.string(),
        name: v.string(),
        description: v.optional(v.string()),
        images: v.optional(v.array(v.string())),
        active: v.boolean(),
        metadata: v.record(v.string(), v.string()),
      })
    ),
    prices: v.array(
      v.object({
        priceId: v.string(),
        productId: v.string(),
        unitAmount: v.number(),
        currency: v.string(),
        interval: v.string(),
        active: v.boolean(),
        nickname: v.optional(v.string()),
        metadata: v.record(v.string(), v.string()),
      })
    ),
  },
  handler: async (ctx, { products, prices }) => {
    const existing = await ctx.db
      .query("pricing_catalog")
      .withIndex("by_key", (q) => q.eq("key", "catalog"))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        products,
        prices,
        lastSyncedAt: now,
        lastSyncError: undefined,
        lastSyncFailedAt: undefined,
      });
    } else {
      await ctx.db.insert("pricing_catalog", {
        key: "catalog",
        products,
        prices,
        lastSyncedAt: now,
      });
    }
  },
});

/**
 * Record a sync error without overwriting the catalog.
 * Internal mutation - only called by sync action on failure.
 */
export const recordSyncError = internalMutation({
  args: {
    error: v.string(),
  },
  handler: async (ctx, { error }) => {
    const existing = await ctx.db
      .query("pricing_catalog")
      .withIndex("by_key", (q) => q.eq("key", "catalog"))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        lastSyncError: error,
        lastSyncFailedAt: now,
      });
    } else {
      // No catalog exists yet, create one with just the error
      await ctx.db.insert("pricing_catalog", {
        key: "catalog",
        products: [],
        prices: [],
        lastSyncedAt: 0,
        lastSyncError: error,
        lastSyncFailedAt: now,
      });
    }
  },
});
