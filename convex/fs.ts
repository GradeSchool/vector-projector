import { ConvexFS } from "convex-fs";
import { components } from "./_generated/api";

// Environment variable validation
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

export const fs = new ConvexFS(components.fs, {
  storage: {
    type: "bunny",
    apiKey: requireEnv("BUNNY_API_KEY"),
    storageZoneName: requireEnv("BUNNY_STORAGE_ZONE"),
    region: process.env.BUNNY_REGION, // Optional, defaults to Frankfurt
    cdnHostname: requireEnv("BUNNY_CDN_HOSTNAME"),
    tokenKey: requireEnv("BUNNY_TOKEN_KEY"),
  },
  downloadUrlTtl: 300, // 5 minutes - tighter security
  blobGracePeriod: 86400, // 24 hours - default
});
