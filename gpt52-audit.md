## GPT-5.2 Audit (Early Scaffold)

Date: 2026-01-27 (updated 2026-01-28)

Scope: client + Convex backend + auth/email flow + crowdfunding + config hardening.

### High risk / security (KNOWN - NOT FIXED)
- Auth HTTP routes still lack rate limiting for OTP send/verify and sign-in/sign-up; the limiter exists but isn’t applied at the auth boundary (`convex/http.ts`, `convex/auth.ts`, `convex/rateLimiter.ts`). **PLANNED:** Vercel BotID (Pro tier) will protect auth HTTP routes at the edge.

---

## Fixes completed (plain English + manual tests)

### Crowdfunding access is now enforced server-side
What was fixed:
- When crowdfunding is active, the backend now *requires* a backer verification token during account creation. This prevents client bypass or direct calls without a backer proof.

How to manually test:
1) In Convex, set `app_state.crowdfundingActive = true`.
2) Try to sign up via the normal email form without verifying a backer first.
3) Expect a clear error and no account creation.
4) Verify a backer, then sign up; it should succeed.

### Backer verification can’t be reused after abandoning signup
What was fixed:
- Backer verification now issues a short‑lived claim token (10 minutes) and the backend requires it during signup. Old verification results can’t be reused later.

How to manually test:
1) Verify a backer (username + access code) and stop before completing signup.
2) Wait 10+ minutes.
3) Try to complete signup with the old verified state.
4) Expect a “verification expired” error and be forced to re‑verify.

### Backer username normalization is consistent
What was fixed:
- Usernames are normalized and stored in lowercase for lookups, and legacy records are normalized on use. This prevents casing from bypassing rate limits or failing verification.
- Original casing is still preserved in `crowdfunding_backers.username` for display or future outreach, while `usernameLower` is used for lookups.

How to manually test:
1) Insert a backer with username `ExampleUser`.
2) Verify using `exampleuser` and correct access code.
3) Expect success regardless of casing.

### `app_state` is now a real singleton
What was fixed:
- If multiple `app_state` rows exist, the newest is used and older duplicates are removed.

How to manually test:
1) Insert two `app_state` rows with key `config` (different `crowdfundingActive` values).
2) Call `appState.get` and confirm it returns the newest one.
3) Call `appState.set` and confirm duplicates are deleted.

### Session validation now rejects invalid session IDs
What was fixed:
- `validateSession` now rejects non‑UUID session IDs, and the client clears invalid session storage.

How to manually test:
1) In devtools, set `localStorage.vp_session_id = "not-a-uuid"`.
2) Refresh while signed out.
3) Confirm the app clears the invalid session and shows Sign In.

### Duplicate-tab detection is deterministic
What was fixed:
- The tab opened first is treated as primary; only later tabs are flagged. This prevents “both tabs think they’re duplicates.”

How to manually test:
1) Sign in and open a second tab quickly (or in another browser).
2) Confirm only the newer tab shows the duplicate warning.
3) Close the newer tab; the original remains usable.

### Auth failures are now user-visible
What was fixed:
- If `ensureAppUser` fails (session creation), the user sees a clear error and a retry option instead of silent failure.

How to manually test:
1) Force `ensureAppUser` to fail (e.g., temporarily throw in `convex/users.ts` or block network).
2) Confirm the UI shows the “Sign-in Error” screen with a retry button.

### OAuth pending flow no longer fails silently
What was fixed:
- The pending state now shows a modal if Google sign-in times out, with a clear “try again” message.

How to manually test:
1) Start Google OAuth, then cancel or block the redirect.
2) Wait ~45 seconds.
3) Confirm a modal appears with the timeout explanation (no extra button).

### Admin sign-out no longer double-requests
What was fixed:
- Admin sign‑out now only calls the shared sign‑out handler once.

How to manually test:
1) Sign in as admin.
2) Click “Sign Out.”
3) Confirm there’s only one sign‑out request in network logs.

### Auth error mapping is more stable
What was fixed:
- Error mapping now checks error codes when present, instead of relying only on error strings.

How to manually test:
1) Attempt sign‑in with wrong password.
2) Confirm the UI shows “Invalid email or password.”
3) Attempt sign‑up with a duplicate email.
4) Confirm the UI highlights the email field with the correct message.

### Added a minimal React error boundary
What was fixed:
- A runtime error no longer crashes the entire SPA; users see a safe fallback.

How to manually test:
1) Temporarily throw an error inside `App` render.
2) Confirm the fallback UI appears and “Refresh” reloads the page.

### Email configuration is validated at startup
What was fixed:
- `RESEND_API_KEY` is now validated at startup and a `RESEND_FROM_EMAIL` override is supported.

How to manually test:
1) Remove `RESEND_API_KEY` in Convex env.
2) Start Convex; expect a clear error about the missing key.
3) Set `RESEND_FROM_EMAIL` and send a test email; confirm the sender matches.

### Alerts query performance improved
What was fixed:
- Active alerts are now filtered in the indexed query instead of in memory.

How to manually test:
1) Create multiple alerts and wait for some to expire (over 24h).
2) Call `alerts.getActive` and confirm only recent alerts are returned.
3) Call `alerts.hasUnread` and confirm it returns quickly even with many rows.

---

## Remaining issues / still need to be addressed
- Auth HTTP routes still lack rate limiting (BotID planned) — keep at top.
- Database uniqueness still not fully enforced:
  - `users.email`, `admins.email`, and `crowdfunding_backers.username+accessCode` can still be duplicated by direct writes.
  - There is now runtime protection in `users.ensureAppUser` and normalization in `crowdfundingBackers`, but uniqueness is not enforced at the schema/index level.
- Session enforcement is still “last write wins”; concurrent sign-ins can race and flip `activeSessionId`.
- Email sender domain is still the unverified domain by default (requires domain verification and env override).
