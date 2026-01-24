import { createClient, type GenericCtx, requireActionCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { betterAuth } from "better-auth";
import { emailOTP } from "better-auth/plugins";
import authConfig from "./auth.config";

// For production, set SITE_URL in Convex dashboard environment variables
const siteUrl = "http://localhost:5173";

export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    baseURL: siteUrl,
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
    },
    plugins: [
      convex({ authConfig }),
      emailOTP({
        otpLength: 6,
        expiresIn: 600, // 10 minutes
        async sendVerificationOTP({ email, otp }) {
          const actionCtx = requireActionCtx(ctx);
          await actionCtx.runAction(internal.emails.sendTemplateEmail, {
            to: email,
            template: "verification",
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
