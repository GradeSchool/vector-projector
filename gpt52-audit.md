## GPT-5.2 Audit (Early Scaffold)

Date: 2026-01-27

Scope: quick pass on client + Convex backend + auth/email flow + crowdfunding + config.

### High risk / security
- Email template variables are inserted with raw string replacement, so injected values can become HTML/JS in emails (`convex/emails.ts`).
- Auth HTTP routes are still wide open and lack rate limiting (OTP send/verify, signup/signin); the limiter exists but isn’t applied here (`convex/http.ts`, `convex/auth.ts`, `convex/rateLimiter.ts`).
- CORS is unrestricted (`cors: true`), so any origin can call auth endpoints (`convex/http.ts`).
- Env vars are used with non-null assertions; missing values can crash or misconfigure auth at runtime (`convex/auth.ts`).
- `crowdfundingBackers.addBacker` is a public mutation with no auth guard; anyone could insert backers if called from the client (`convex/crowdfundingBackers.ts`).

### Medium risk / data integrity
- `users`, `admins`, and `crowdfunding_backers` rely on indexes but do not enforce uniqueness; duplicates are possible (`convex/schema.ts`).
- Session enforcement is still “last write wins”; concurrent sign-ins can race and flip `activeSessionId` unexpectedly (`convex/users.ts`).
- `ensureAppUser` non-null asserts `appUser` after `db.get()`; a null result would crash (`convex/users.ts`).
- `app_state` is a singleton by convention only; multiple rows with key `"config"` are possible (`convex/appState.ts`, `convex/schema.ts`).

### Medium risk / auth + session behavior
- Client now logs `ensureAppUser` failures but provides no user‑visible error; this can leave the app in a partial auth state (`src/App.tsx`).
- Session validation accepts any string for `sessionId` with no UUID format check (`convex/users.ts`).
- localStorage/sessionStorage access is unguarded in multiple places; it can throw in privacy modes or restricted contexts (`src/App.tsx`, `src/hooks/useSession.ts`, `src/components/modals/AuthModal.tsx`).
- BroadcastChannel setup has no try/catch; failures can break duplicate‑tab logic (`src/hooks/useSession.ts`).

### Medium risk / crowdfunding flow
- Crowdfunding access is enforced only in the client; the server does not require a backer ID when `crowdfundingActive` is true (`src/components/modals/AuthModal.tsx`, `convex/users.ts`, `convex/appState.ts`).
- `verifyBacker` is a public mutation without rate limiting, so backer credentials can be brute‑forced (`convex/crowdfundingBackers.ts`).
- Backer ID stored in `sessionStorage` is cleared on success/failure, but can linger if a user abandons OAuth mid‑flow (timeout exists but not guaranteed) (`src/App.tsx`, `src/components/modals/AuthModal.tsx`).

### Low risk / UX + maintainability
- Auth error mapping still relies on string matching; server message changes can break UI feedback (`src/components/modals/AuthModal.tsx`).
- Missing error boundary; a single React error still takes down the SPA (`src/App.tsx`).

### Suggested next steps (scaffold-friendly)
- Escape email template variables; allow only whitelisted placeholders.
- Apply rate limiting to auth HTTP routes and public mutations (OTP, verifyBacker, addBacker).
- Restrict CORS to known origins.
- Validate critical env vars at startup and fail fast with clear errors.
- Add uniqueness guarantees (or enforcement in mutations) for `users.email`, `admins.email`, `crowdfunding_backers.username+accessCode`, and `app_state.key`.
- Enforce crowdfunding rules server‑side when `crowdfundingActive` is true.
- Wrap localStorage/sessionStorage/BroadcastChannel calls with try/catch.
- Add a minimal React error boundary around the app shell.
