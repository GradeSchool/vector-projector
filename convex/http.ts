import { httpRouter, httpActionGeneric } from "convex/server";
import { corsRouter } from "convex-helpers/server/cors";
import { registerRoutes } from "convex-fs";
import { authComponent, createAuth } from "./auth";
import { components, internal } from "./_generated/api";
import { fs } from "./fs";

const http = httpRouter();

// CORS: Only allow requests from our actual frontend domains
const allowedOrigins = [
  "http://localhost:5173", // Local dev
  "https://vectorprojector.weheart.art", // Production
];

// Better Auth routes
authComponent.registerRoutes(http, createAuth, {
  cors: {
    allowedOrigins,
  },
});

// =============================================================================
// Custom authenticated upload endpoint
// =============================================================================
// We create our own upload route instead of using convex-fs's registerRoutes
// for uploads because convex-fs hardcodes CORS without credentials support.
// This allows us to use credentials: 'include' for authenticated uploads.

const uploadCors = corsRouter(http, {
  allowedOrigins,
  allowCredentials: true,
  allowedHeaders: ["Content-Type", "Content-Length", "X-Better-Auth-Cookie"],
});

uploadCors.route({
  path: "/upload",
  method: "POST",
  handler: httpActionGeneric(async (ctx, req) => {
    // Get auth cookie from custom header (browsers can't set Cookie header directly)
    const authCookie = req.headers.get("X-Better-Auth-Cookie");
    if (!authCookie) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Create headers with the cookie for Better Auth session verification
    const headersWithCookie = new Headers(req.headers);
    headersWithCookie.set("Cookie", authCookie);

    // Validate authentication using Better Auth session
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const auth = createAuth(ctx as any);
    const session = await auth.api.getSession({
      headers: headersWithCookie,
    });

    if (!session) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // One-upload-at-a-time: check if user has an uncommitted upload
    const hasPending = await ctx.runQuery(internal.uploads.hasPendingUpload, {
      authUserId: session.user.id,
    });
    if (hasPending) {
      return new Response(
        JSON.stringify({
          error: "You have a pending upload. Please wait for it to complete.",
        }),
        {
          status: 429,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Rate limit check - 10 uploads/hour per user
    // This runs BEFORE writing blob to prevent storage abuse
    const rateLimit = await ctx.runMutation(
      internal.uploads.checkUploadRateLimit,
      { authUserId: session.user.id }
    );
    if (!rateLimit.ok) {
      return new Response(
        JSON.stringify({
          error: `Rate limit exceeded. Try again in ${rateLimit.retryAfter}s`,
        }),
        {
          status: 429,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Get file data
    const contentType = req.headers.get("Content-Type") ?? "application/octet-stream";
    const data = await req.arrayBuffer();

    if (data.byteLength === 0) {
      return new Response(JSON.stringify({ error: "Empty file" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // File size limit: 50MB
    const MAX_SIZE = 50 * 1024 * 1024;
    if (data.byteLength > MAX_SIZE) {
      return new Response(JSON.stringify({ error: "File too large (max 50MB)" }), {
        status: 413,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      // Write blob to storage and get blobId
      const blobId = await fs.writeBlob(ctx, data, contentType);

      // Register pending upload to track ownership
      // This prevents another user from stealing the blobId before commit
      await ctx.runMutation(internal.uploads.registerPendingUpload, {
        blobId,
        authUserId: session.user.id,
      });

      return new Response(JSON.stringify({ blobId }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Upload error:", error);
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : "Upload failed",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }),
});

// =============================================================================
// ConvexFS download routes only
// =============================================================================
// We still use registerRoutes for downloads since they work fine without
// credentials (the signed URL redirect handles auth at CDN level).

registerRoutes(http, components.fs, fs, {
  pathPrefix: "/fs",
  uploadAuth: async () => {
    // Disable the convex-fs upload endpoint - we use our own /upload route
    return false;
  },
  downloadAuth: async (ctx, _blobId, path) => {
    // Base content is public (discovery mode)
    if (path?.startsWith("/base/")) return true;

    // User content requires auth + ownership
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;
    if (path?.startsWith(`/users/${identity.subject}/`)) return true;

    return false;
  },
});

export default http;
