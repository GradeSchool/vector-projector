import { RateLimiter, MINUTE, HOUR } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";

/**
 * Rate limiter configuration.
 *
 * Strategy:
 * - Public/unauthenticated: Rate limit by IP (only identifier available)
 * - Authenticated: Rate limit by user ID (don't punish shared IPs)
 * - Email targets: Rate limit by email (prevent spam to one address)
 *
 * Algorithm:
 * - Fixed window for security endpoints (simpler, predictable)
 * - Token bucket where we want to allow legitimate bursts
 */
export const rateLimiter = new RateLimiter(components.rateLimiter, {
  // ===================
  // AUTH - CRITICAL
  // ===================

  // OTP verification: Very strict - 6 digits = 1M combinations
  // 5 attempts per minute per IP
  otpVerify: { kind: "fixed window", rate: 5, period: MINUTE },

  // OTP/email send: Costs money, can spam inbox
  // 3 per hour per email target
  otpSend: { kind: "fixed window", rate: 3, period: HOUR },

  // Password reset: Same as OTP send - email spam risk
  // 3 per hour per email target
  passwordReset: { kind: "fixed window", rate: 3, period: HOUR },

  // Sign up: Account creation spam
  // 10 per hour per IP
  signUp: { kind: "fixed window", rate: 10, period: HOUR },

  // Sign in: Credential stuffing
  // 20 per minute per IP (higher because typos happen)
  signIn: { kind: "fixed window", rate: 20, period: MINUTE },

  // Backer verification: Prevent brute-forcing access codes
  // 5 attempts per minute per username
  backerVerify: { kind: "fixed window", rate: 5, period: MINUTE },

  // ===================
  // APP MUTATIONS
  // ===================

  // Session creation (ensureAppUser): Called on every sign-in
  // Already gated by auth, but limit anyway
  // 10 per minute per user
  sessionCreate: { kind: "fixed window", rate: 10, period: MINUTE },

  // App state changes (admin only, but belt and suspenders)
  // 10 per minute
  appStateChange: { kind: "fixed window", rate: 10, period: MINUTE },

  // ===================
  // FUTURE - USER CONTENT
  // ===================

  // Project creation: Allow bursts but limit total
  // 20 per hour per user (token bucket for burst tolerance)
  projectCreate: { kind: "token bucket", rate: 20, period: HOUR, capacity: 5 },

  // File upload: Storage costs
  // 10 per hour per user (with burst capacity of 5)
  fileUpload: { kind: "token bucket", rate: 10, period: HOUR, capacity: 5 },
});

// Usage example in a mutation:
//
// import { rateLimiter } from "./rateLimiter";
//
// export const myMutation = mutation({
//   handler: async (ctx, args) => {
//     const { ok, retryAfter } = await rateLimiter.limit(ctx, "signUp", { key: ip });
//     if (!ok) {
//       throw new Error(`Rate limit exceeded. Try again in ${Math.ceil(retryAfter! / 1000)}s`);
//     }
//     // ... rest of mutation
//   },
// });
