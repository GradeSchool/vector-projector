import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { requireActionCtx } from "@convex-dev/better-auth/utils";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { betterAuth } from "better-auth";
import { emailOTP } from "better-auth/plugins";
import authConfig from "./auth.config";

// =============================================================================
// ENV VAR VALIDATION
// Fail fast with clear errors if required env vars are missing.
// Set these in Convex Dashboard > Settings > Environment Variables
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

const siteUrl = requireEnv("SITE_URL");
const googleClientId = requireEnv("GOOGLE_CLIENT_ID");
const googleClientSecret = requireEnv("GOOGLE_CLIENT_SECRET");

export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    trustedOrigins: [siteUrl],
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
    },
    socialProviders: {
      google: {
        clientId: googleClientId,
        clientSecret: googleClientSecret,
      },
    },
    plugins: [
      crossDomain({ siteUrl }),
      convex({ authConfig }),
      emailOTP({
        otpLength: 6,
        expiresIn: 600, // 10 minutes
        async sendVerificationOTP({ email, otp, type }) {
          const actionCtx = requireActionCtx(ctx);
          // Use different template based on OTP type
          const template = type === "forget-password" ? "password-reset" : "verification";
          await actionCtx.runAction(internal.emails.sendTemplateEmail, {
            to: email,
            template,
            variables: { code: otp },
          });
        },
      }),
    ],
  });
};

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    try {
      return await authComponent.getAuthUser(ctx);
    } catch {
      return null;
    }
  },
});
