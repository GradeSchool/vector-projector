---
last_updated: 2026-01-23
updated_by: vector-projector
change: "Complete Better Auth setup with working code"
status: tested
---

# Better Auth

Authentication with Better Auth and Convex. Email/password only (no OAuth).

## Prerequisites

- Convex set up and running (see [../03-convex/setup.md](../03-convex/setup.md))
- `npx convex dev` running in terminal

## Reference

- [Convex Better Auth docs](https://labs.convex.dev/better-auth)
- [Better Auth docs](https://www.better-auth.com/)
- [GitHub](https://github.com/get-convex/better-auth)

## Installation

```bash
npm install better-auth @convex-dev/better-auth
```

## File Structure

You will create these files:

```
convex/
  convex.config.ts    # Register Better Auth component
  auth.config.ts      # Auth provider config
  auth.ts             # Main auth setup
  http.ts             # Auth HTTP routes
  schema.ts           # Your app schema (Better Auth manages its own)
src/lib/
  auth-client.ts      # Client-side auth
src/
  main.tsx            # Update with auth provider
```

## Step 1: convex.config.ts

```typescript
import { defineApp } from "convex/server";
import betterAuth from "@convex-dev/better-auth/convex.config";

const app = defineApp();
app.use(betterAuth);
export default app;
```

## Step 2: auth.config.ts

```typescript
import { getAuthConfigProvider } from "@convex-dev/better-auth/auth-config";
import type { AuthConfig } from "convex/server";

export default {
  providers: [getAuthConfigProvider()],
} satisfies AuthConfig;
```

## Step 3: auth.ts

```typescript
import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { betterAuth } from "better-auth";
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
      requireEmailVerification: false,
    },
    plugins: [
      convex({ authConfig }),
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
```

**Note:** Use `type` import for `DataModel` (TypeScript verbatimModuleSyntax).

## Step 4: http.ts

```typescript
import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./auth";

const http = httpRouter();
authComponent.registerRoutes(http, createAuth);
export default http;
```

## Step 5: auth-client.ts

Create `src/lib/auth-client.ts`:

```typescript
import { createAuthClient } from "better-auth/react";
import { convexClient } from "@convex-dev/better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [convexClient()],
});
```

## Step 6: Update main.tsx

**Important:** Use `ConvexBetterAuthProvider`, not plain `ConvexProvider`.

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConvexReactClient } from 'convex/react'
import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react'
import { authClient } from './lib/auth-client'
import './index.css'
import App from './App.tsx'

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConvexBetterAuthProvider client={convex} authClient={authClient}>
      <App />
    </ConvexBetterAuthProvider>
  </StrictMode>,
)
```

## Verify Setup

```bash
npm run build
```

Check Convex dashboard - you should see 11 tables in a `betterAuth` group.

## Client Usage

### Check Auth State

```tsx
import { useConvexAuth } from 'convex/react'

function App() {
  const { isLoading, isAuthenticated } = useConvexAuth()
  
  if (isLoading) return <div>Loading...</div>
  if (!isAuthenticated) return <SignInForm />
  return <AuthenticatedApp />
}
```

### Sign Up

```typescript
import { authClient } from '@/lib/auth-client'

await authClient.signUp.email({
  email: 'user@example.com',
  password: 'password123',
  name: 'User Name',
})
```

### Sign In

```typescript
await authClient.signIn.email({
  email: 'user@example.com',
  password: 'password123',
})
```

### Sign Out

```typescript
await authClient.signOut()
```

### Get Current User

```tsx
import { useQuery } from 'convex/react'
import { api } from '../convex/_generated/api'

const user = useQuery(api.auth.getCurrentUser)
// Returns user object or null
```

## Gotchas

| Problem | Solution |
|---------|----------|
| `Could not find ConvexProviderWithAuth` | Use `ConvexBetterAuthProvider`, not `ConvexProvider` |
| `DataModel is a type` error | Use `import type { DataModel }` |
| `process is not defined` | Hardcode siteUrl or use Convex env vars |
| User object has `_id` not `id` | Convex uses `_id` for document IDs |

## Next Steps

- [../02-frontend/modals.md](../02-frontend/modals.md) - Auth modal pattern
- Add email verification (optional)
- Add OAuth providers (optional)

## Related

- [../03-convex/setup.md](../03-convex/setup.md) - Convex setup (do first)
- [../02-frontend/modals.md](../02-frontend/modals.md) - Modal patterns