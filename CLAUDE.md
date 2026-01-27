# Vector Projector

A SaaS app for 3D printing tools. **First app** in a series built using the SaaS Blueprint system.

## Workflow Rules

**CRITICAL - Follow these rules strictly:**

1. **NEVER run the dev server.** User handles `npm run dev`. Starting/stopping dev servers can interfere with the user's environment.

> **Port 5173 Rule:** This app must run on port 5173 for Google OAuth to work. Before starting dev, ensure no other Vite apps are running. The blueprint frontend runs on 4001, so it won't conflict. If another SaaS app is running, stop it first.

2. **After code changes, run build/lint.** Always run `npm run build` and `npm run lint` to verify changes compile and pass linting.

3. **NEVER handle git actions** unless specifically asked. No commits, no pushes, no branch operations.

4. **Wait for user verification BEFORE updating the blueprint.** Do not POST to the blueprint API until the user has tested and confirmed the code works. Adding incorrect or non-functioning information to the blueprint creates extra cleanup work.

5. **Use import aliases, not relative paths.** Never use `../` patterns in imports. Use `@/` for src imports and `@convex/` for convex imports.

**Workflow sequence:**
1. Make code changes
2. Run build/lint
3. Tell user changes are ready to test
4. User runs dev and tests
5. User confirms it works
6. THEN update the blueprint

## SaaS Blueprint

This app is built alongside a local knowledge repository that AI agents use to share patterns across apps.

### API Reference

```
# Read
GET /api/index                    Start here - structure and purpose
GET /api/files                    List all files and directories
GET /api/files/{path}             Get file content or directory listing
GET /api/changes?since=YYYY-MM-DD List files updated since date
GET /api/apps                     List registered apps and sync status

# Write
POST /api/files/{path}            Create or update a file
Body: { "content": "...", "source": "vector-projector" }

POST /api/apps/{name}/checked     Mark app as synced
```

**Note:** The blueprint server must be restarted by the user after creating NEW entries. Updates to existing files do not require a restart.

### Temp File Pattern for API Posts

Inline JSON in curl commands requires painful escaping. Use the temp file trick:

```bash
# 1. Write JSON to temp-update.json (use Write tool)
# 2. POST using the file
curl -X POST http://localhost:3001/api/files/path/to/doc.md \
  -H "Content-Type: application/json" \
  -d @temp-update.json
# 3. Clean up
rm temp-update.json
```

### Frontmatter (required on all markdown files)

```yaml
---
last_updated: 2026-01-23
updated_by: vector-projector
change: "Brief description of what changed"
---
```

## Role of This App

As the **first app** built with the blueprint, vector-projector is responsible for:

1. Testing and validating patterns from the blueprint
2. **Writing back** implementation details, decisions, and learnings via POST
3. Establishing conventions that subsequent apps will follow

Future apps will do less initial buildout - they'll primarily read from the blueprint.

## Stack

Vite + React + TypeScript + Convex + shadcn/ui + Stripe

## Import Aliases

**Never use relative imports with `../` patterns.** Use path aliases instead.

| Alias | Path | Example |
|-------|------|---------|
| `@/*` | `./src/*` | `import { Modal } from '@/components/Modal'` |
| `@convex/*` | `./convex/*` | `import { api } from '@convex/_generated/api'` |

**Configuration files:**
- `tsconfig.json` - paths for TypeScript
- `tsconfig.app.json` - paths for app compilation
- `vite.config.ts` - resolve.alias for Vite bundler

## Architecture

HeroForge-style SPA. All primary interaction on one page.

### Layout Zones

```
┌─────────────┬────────────────────────────┬───────┐
│    LOGO     │   MENU (Pricing, FAQ...)   │ USER  │
├──┬──┬──┬──┬─┴────────────────────────────┴───────┤
│1 │2 │3 │4 │5 │6 │                                │
├──┴──┴──┴──┴─────┤                                │
│    UPDATES      │                                │
├─────────────────┤           SCENE                │
│                 │        (3D view)               │
│     PANEL       │                                │
│                 │                                │
└─────────────────┴────────────────────────────────┘
```

### Rules

- **Scene**: Always visible, **NEVER scrolls** (no vertical or horizontal scroll)
- **Panel**: Content changes based on selected step. May scroll if needed (minimize this).
- **Steps**: Numbered 1-6, clicking changes Panel content
- **Header**: Persists on all pages (Logo, Menu, User)
- **Navigation**: SPA except User link → separate page (admin vs regular user)

### Viewport Gate

Desktop-only. Minimum 1024x768. No mobile support.

## Auth Setup (Better Auth + Convex)

**Read blueprint first:** `core/04-auth/better-auth.md`

### Cross-Domain Setup (Required for React/Vite)

Frontend and backend are different domains:
- Frontend: `localhost:5173` (dev) or `vectorprojector.weheart.art` (prod)
- Backend: `*.convex.site`

**Required plugins:**
- Server: `crossDomain({ siteUrl })` in convex/auth.ts
- Client: `crossDomainClient()` in src/lib/auth-client.ts
- HTTP: `{ cors: true }` in convex/http.ts

### ⚠️ Critical: Two Verification Systems

Better Auth has TWO separate email verification systems - they are NOT connected:

1. **Link-based** (`emailVerification.sendVerificationEmail`) - triggered by `requireEmailVerification: true`
2. **OTP-based** (`emailOTP.sendVerificationOTP`) - must be triggered MANUALLY

We use OTP-based. After `signUp.email()`, you MUST manually call:
1. `emailOtp.sendVerificationOtp()` - to send the code
2. After verify: `signIn.email()` - to log the user in

See `src/components/modals/AuthModal.tsx` for working implementation.

### Environment Variables (Convex Dashboard)

- `BETTER_AUTH_SECRET` - session encryption
- `SITE_URL` - frontend URL (http://localhost:5173 for dev)
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- `RESEND_API_KEY` - for verification emails

### Google OAuth

Redirect URI must be convex.site:
```
https://[deployment].convex.site/api/auth/callback/google
```

### Current Status

**Auth Flows:**
- [x] Google OAuth working (auto-creates account, auto-signs in)
- [x] Email/password sign-up with OTP verification
- [x] Auto-sign-in after verification
- [x] Email/password sign-in working
- [x] Password reset flow working
- [x] Sign out working (no flicker)
- [x] Resend email sending working

**App Users & Admins:**
- [x] App `users` table created on sign-in (via `ensureAppUser`)
- [x] `admins` table for email whitelist
- [x] Admin detection on sign-in (`isAdmin` flag)
- [x] AdminPage shown for admins, UserPage for regular users

**Session Enforcement:**
- [x] Single session per user (cross-device kick)
- [x] Duplicate tab detection (same browser)

## Session Enforcement

Single-session enforcement: only one active session per user, one tab per browser.

### Architecture

**Database fields** (on `users` table):
- `activeSessionId: string` - UUID of the current valid session
- `sessionStartedAt: number` - timestamp when session started

**Server-side** (`convex/users.ts`):
- `ensureAppUser` mutation: Creates/updates app user, generates new `activeSessionId`, invalidates any previous session
- `validateSession` query: Checks if provided `sessionId` matches `activeSessionId` in database

**Client-side** (`src/hooks/useSession.ts`):
- Stores `sessionId` in localStorage (`vp_session_id`)
- Uses Convex reactive query to validate session against server
- BroadcastChannel API for same-browser duplicate tab detection
- Returns `wasKicked: true` when session is invalidated by another sign-in

### Flow

1. **Sign-in**: `ensureAppUser` generates new `sessionId`, stores in DB and returns to client
2. **Client stores**: `sessionId` saved to localStorage, `useSession` hook tracks it
3. **Validation**: `validateSession` query runs reactively, comparing localStorage `sessionId` to DB `activeSessionId`
4. **Cross-device kick**: When user signs in elsewhere, DB `activeSessionId` changes, original session's query returns `session_invalidated`
5. **Duplicate tab**: BroadcastChannel messages detect other tabs with same session, newer tab shows warning

### UI States

- **Duplicate Tab**: Yellow warning screen, "Please use that tab instead"
- **Session Ended (kicked)**: Red warning screen with "Sign In Again" button
- Both states prevent access to app content

### Key Files

- `convex/users.ts` - `ensureAppUser`, `validateSession`
- `convex/schema.ts` - `activeSessionId`, `sessionStartedAt` fields
- `src/hooks/useSession.ts` - Client-side session management hook
- `src/App.tsx` - Session state integration, UI for kicked/duplicate states

## Critical Notes (Pre-Production)

**See blueprint: `core/00-overview/critical-notes.md`**

Before production launch:

1. **Custom Domain for OAuth** - Set up custom domain for Convex HTTP routes so Google consent screen shows your domain instead of `*.convex.site`
2. **Bot Protection** - Vercel bot detection, CAPTCHA for signup
3. **Rate Limiting** - Convex rate limiting for all public endpoints
4. **Resend Domain** - Already verified (`weheart.art`)

These are HIGH PRIORITY - without them, bots can spam signups and trigger email costs.
