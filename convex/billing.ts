import { v } from "convex/values";
import { query, action } from "./_generated/server";
import { api, components } from "./_generated/api";
import { authComponent } from "./auth";
import { StripeSubscriptions } from "@convex-dev/stripe";

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

function getSiteUrl(): string {
  return requireEnv("SITE_URL");
}

// =============================================================================
// Stripe Client
// =============================================================================

const stripeClient = new StripeSubscriptions(components.stripe, {});

// =============================================================================
// Subscription Status Query
// =============================================================================

/**
 * Get the current user's subscription status.
 * Returns null if not authenticated, otherwise returns subscription info.
 */
export const getSubscriptionStatus = query({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) {
      return null;
    }

    // Get subscriptions for this user
    const subscriptions = await ctx.runQuery(
      components.stripe.public.listSubscriptionsByUserId,
      { userId: authUser._id }
    );

    if (subscriptions.length === 0) {
      return {
        hasSubscription: false,
        status: null,
        tier: null,
        audience: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      };
    }

    // Get the most recent active subscription
    // Priority: active > past_due > others
    const priorityOrder = ["active", "trialing", "past_due"];
    const sorted = [...subscriptions].sort((a, b) => {
      const aPriority = priorityOrder.indexOf(a.status);
      const bPriority = priorityOrder.indexOf(b.status);
      // Lower index = higher priority, -1 means not in priority list
      if (aPriority === -1 && bPriority === -1) return 0;
      if (aPriority === -1) return 1;
      if (bPriority === -1) return -1;
      return aPriority - bPriority;
    });

    const subscription = sorted[0];

    // Get tier and audience from subscription metadata
    const metadata = subscription.metadata as Record<string, string> | undefined;
    const tier = metadata?.tier as "personal" | "commercial" | undefined;
    const audience = metadata?.audience as "public" | "backer" | undefined;

    return {
      hasSubscription: true,
      status: subscription.status,
      tier: tier ?? null,
      audience: audience ?? null,
      priceId: subscription.priceId,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    };
  },
});

// =============================================================================
// Checkout Session Action
// =============================================================================

/**
 * Create a Stripe Checkout session for subscribing.
 * Looks up price from pricing_catalog instead of env vars.
 * Returns the checkout URL to redirect the user to.
 */
export const createCheckoutSession = action({
  args: {
    tier: v.union(v.literal("personal"), v.literal("commercial")),
    interval: v.union(v.literal("month"), v.literal("year")),
    audience: v.union(v.literal("public"), v.literal("backer")),
  },
  handler: async (ctx, { tier, interval, audience }) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) {
      throw new Error("Not authenticated");
    }

    // If backer pricing requested, verify user is a verified backer
    if (audience === "backer") {
      const appUser = await ctx.runQuery(api.users.getByAuthUserId, {
        authUserId: authUser._id,
      });
      if (!appUser?.backerAccessGrantedAt) {
        throw new Error("Backer pricing is only available to verified backers");
      }
    }

    // Get pricing catalog
    const catalog = await ctx.runQuery(api.pricingCatalog.get, {});
    if (!catalog || catalog.prices.length === 0) {
      throw new Error("Pricing catalog not available. Please contact support.");
    }

    // Find matching price
    const matchingPrices = catalog.prices.filter(
      (p) =>
        p.metadata.tier === tier &&
        p.metadata.audience === audience &&
        p.interval === interval &&
        p.active
    );

    if (matchingPrices.length === 0) {
      throw new Error(`No price found for ${tier} ${interval} ${audience}`);
    }

    if (matchingPrices.length > 1) {
      throw new Error(`Multiple prices found for ${tier} ${interval} ${audience}. Please contact support.`);
    }

    const price = matchingPrices[0];
    const siteUrl = getSiteUrl();

    // Get or create Stripe customer for this user
    const customer = await stripeClient.getOrCreateCustomer(ctx, {
      userId: authUser._id,
      email: authUser.email,
      name: authUser.name ?? undefined,
    });

    // Create checkout session
    const session = await stripeClient.createCheckoutSession(ctx, {
      priceId: price.priceId,
      customerId: customer.customerId,
      mode: "subscription",
      successUrl: `${siteUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${siteUrl}`,
      // Link subscription to user and store tier/audience for easy lookup
      subscriptionMetadata: {
        userId: authUser._id,
        tier,
        audience,
      },
    });

    return { url: session.url };
  },
});

// =============================================================================
// Customer Portal Action
// =============================================================================

/**
 * Create a Stripe Customer Portal session for managing subscription.
 * Returns the portal URL to redirect the user to.
 */
export const createCustomerPortalSession = action({
  args: {},
  handler: async (ctx) => {
    const authUser = await authComponent.getAuthUser(ctx);
    if (!authUser) {
      throw new Error("Not authenticated");
    }

    const siteUrl = getSiteUrl();

    // Get subscriptions to find customer ID
    const subscriptions = await ctx.runQuery(
      components.stripe.public.listSubscriptionsByUserId,
      { userId: authUser._id }
    );

    if (subscriptions.length === 0) {
      throw new Error("No subscription found");
    }

    const customerId = subscriptions[0].stripeCustomerId;

    const session = await stripeClient.createCustomerPortalSession(ctx, {
      customerId,
      returnUrl: siteUrl,
    });

    return { url: session.url };
  },
});
