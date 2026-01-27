## GPT-5.2 Audit (Early Scaffold)

Date: 2026-01-27

Scope: quick pass on client + Convex backend + auth/email flow + config.

### High risk / security
- Email template variable substitution is raw string replacement with no HTML escaping, so injected values could become HTML/JS in emails (`convex/emails.ts`).
- Public auth routes have no rate limiting; OTP and password reset can be spammed or brute-forced (`convex/http.ts`, `convex/auth.ts`, `convex/users.ts`).
- CORS is wide open (`cors: true`), so any origin can hit auth endpoints (`convex/http.ts`).
- Env vars are assumed with non-null assertions; missing values will crash or misconfigure auth at runtime (`convex/auth.ts`).

### Medium risk / data integrity
- `users` and `admins` tables rely on indexes but do not enforce uniqueness; duplicate email rows are possible (`convex/schema.ts`).
- `ensureAppUser` uses `db.get()` and then non-null asserts; a null result would crash the mutation (`convex/users.ts`).
- Session enforcement is "last write wins"; concurrent sign-ins can race and flip `activeSessionId` unexpectedly (`convex/users.ts`).

### Medium risk / auth + session behavior
- Client calls `ensureAppUser()` in a `useEffect` without error handling; failures are silent and can leave the UI in an inconsistent state (`src/App.tsx`).
- Session validation uses localStorage + BroadcastChannel without guardrails; storage access can throw (privacy modes), and duplicate tab detection is timing-based (`src/hooks/useSession.ts`).
- Session ID validation accepts any string without format checks, so malformed data is allowed (`convex/users.ts`).

### Low risk / UX + maintainability
- Auth error handling relies on string matching; future server error message changes may break UI error mapping (`src/components/modals/AuthModal.tsx`).
- Missing error boundary; a single React runtime error can take down the SPA (`src/App.tsx`).
- App-state singleton is implied by comments but not enforced; multiple rows are possible (`convex/schema.ts`).

### Suggested next steps (scaffold-friendly)
- Add HTML escaping for email template variables; only allow a fixed set of placeholders.
- Add basic rate limiting + captcha/bot protection for auth and OTP routes.
- Restrict CORS to your known site origins.
- Validate critical env vars at startup and fail fast with clear errors.
- Add uniqueness safeguards in schema (or enforce in mutations) for `users.email` and `admins.email`.
- Harden session logic: serialize `ensureAppUser` calls or use optimistic locking.
- Wrap localStorage access with try/catch and default safe values.
- Add a minimal React error boundary around the app shell.
