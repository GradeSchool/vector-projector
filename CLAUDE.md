# Vector Projector

A SaaS app for 3D printing tools. **First app** in a series built using the SaaS Blueprint system.

## Workflow Rules

**CRITICAL - Follow these rules strictly:**

1. **NEVER run the dev server.** User handles `npm run dev`. Starting/stopping dev servers can interfere with the user's environment.

> **Port 5173 Rule:** This app must run on port 5173 for Google OAuth to work. Before starting dev, ensure no other Vite apps are running. The blueprint frontend runs on 4001, so it won't conflict. If another SaaS app is running, stop it first.

2. **After code changes, run build/lint.** Always run `npm run build` and `npm run lint` to verify changes compile and pass linting.

3. **NEVER handle git actions** unless specifically asked. No commits, no pushes, no branch operations.

4. **Wait for user verification BEFORE updating the blueprint.** Do not POST to the blueprint API until the user has tested and confirmed the code works. Adding incorrect or non-functioning information to the blueprint creates extra cleanup work.

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

- [x] Google OAuth working (auto-creates account, auto-signs in)
- [x] Email/password sign-up with OTP verification
- [x] Auto-sign-in after verification
- [x] Resend email sending working
- [ ] Email/password sign-in (not yet tested)
- [ ] Sign out (not yet tested)
- [ ] Session enforcement (not yet implemented)

## Critical Notes (Pre-Production)

**See blueprint: `core/00-overview/critical-notes.md`**

Before production launch:

1. **Custom Domain for OAuth** - Set up custom domain for Convex HTTP routes so Google consent screen shows your domain instead of `*.convex.site`
2. **Bot Protection** - Vercel bot detection, CAPTCHA for signup
3. **Rate Limiting** - Convex rate limiting for all public endpoints
4. **Resend Domain** - Already verified (`weheart.art`)

These are HIGH PRIORITY - without them, bots can spam signups and trigger email costs.
