## GPT-5.2 Audit (Early Scaffold)

Date: 2026-01-27

Scope: quick pass on client + Convex backend + auth/email flow + crowdfunding + config.

### High risk / security
- Auth HTTP routes still lack rate limiting for OTP send/verify and sign-in/sign-up; the limiter exists but isn’t applied at the auth boundary (`convex/http.ts`, `convex/auth.ts`, `convex/rateLimiter.ts`). **PLANNED:** Vercel BotID (Pro tier) will protect auth HTTP routes at the edge.

### Medium risk / crowdfunding + access control
- Crowdfunding access is enforced only in the client; the backend does not require a backer ID when `crowdfundingActive` is true, so a direct call can bypass it (`src/components/modals/AuthModal.tsx`, `convex/users.ts`, `convex/appState.ts`).
- Backer verification is rate-limited, but the verification result can be reused if the user abandons the flow; there’s no backend check tying a verified backer to a pending signup session (`src/components/modals/AuthModal.tsx`, `convex/crowdfundingBackers.ts`).

### Medium risk / data integrity
- `users`, `admins`, and `crowdfunding_backers` rely on indexes but do not enforce uniqueness; duplicates are possible (`convex/schema.ts`).
- Session enforcement is still “last write wins”; concurrent sign-ins can race and flip `activeSessionId` unexpectedly (`convex/users.ts`).
- `app_state` is a singleton by convention only; multiple rows with key `"config"` are possible (`convex/appState.ts`, `convex/schema.ts`).

### Medium risk / auth + session behavior
- `ensureAppUser` failures are logged but not surfaced to the user; this can leave the UI in a partial auth state (`src/App.tsx`).
- Session validation accepts any string for `sessionId` with no UUID format check (`convex/users.ts`).
- Duplicate-tab detection is timing-based; two tabs opened at the same time can both mark as duplicates (`src/hooks/useSession.ts`).
- OAuth flow uses `authPending` with a fixed timeout; users may see silent failure if auth is slow or blocked (`src/App.tsx`).

### Low risk / UX + maintainability
- Auth error mapping relies on string matching; server message changes can break UI feedback (`src/components/modals/AuthModal.tsx`).
- Missing error boundary; a single React error still takes down the SPA (`src/App.tsx`).
- Email sender address is hardcoded and still uses the unverified domain noted in critical notes (`convex/emails.ts`).

### Improvements since last audit
- CORS is now restricted to known origins (`convex/http.ts`).
- Storage access is wrapped in safe helpers to avoid privacy-mode crashes (`src/lib/storage.ts`, `src/App.tsx`, `src/hooks/useSession.ts`, `src/components/modals/AuthModal.tsx`).
- `crowdfundingBackers.addBacker` is now internal-only and not callable from clients (`convex/crowdfundingBackers.ts`).
- Backer verification is now rate-limited (`convex/crowdfundingBackers.ts`, `convex/rateLimiter.ts`).
- `ensureAppUser` now validates the created user record before returning (`convex/users.ts`).
- Environment variables validated at startup with clear error messages (`convex/auth.ts`).
- Email template variables are HTML-escaped to prevent XSS-in-email attacks (`convex/emails.ts`).

### Suggested next steps (scaffold-friendly)
- Apply rate limiting to auth HTTP routes (OTP send/verify, sign-in/sign-up). **PLANNED:** Vercel BotID
- Enforce crowdfunding rules server-side when `crowdfundingActive` is true.
- Add uniqueness guarantees (or enforcement in mutations) for `users.email`, `admins.email`, `crowdfunding_backers.username+accessCode`, and `app_state.key`.
- Add a user-visible error state for failed session creation.
- Add a minimal React error boundary around the app shell.
