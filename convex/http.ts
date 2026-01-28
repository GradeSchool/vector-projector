import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./auth";

const http = httpRouter();

// CORS: Only allow requests from our actual frontend domains
// This prevents malicious sites from making authenticated requests to our API
const allowedOrigins = [
  "http://localhost:5173", // Local dev
  "https://vectorprojector.weheart.art", // Production
];

authComponent.registerRoutes(http, createAuth, {
  cors: {
    allowedOrigins,
  },
});

export default http;
