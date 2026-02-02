---
last_updated: 2026-02-02
updated_by: vector-projector
change: "Added gap analysis: current state vs required, implementation order"
---

# Stripe Pricing: Single Source of Truth (Clean Recipe)

## Non‑Negotiable Goals
- Stripe is the only system where products/prices are created/edited.
- The app never hardcodes price IDs or amounts.
- The UI reads pricing only from Convex.
- Catalog updates happen only via an admin‑triggered sync button.

---

## Responsibilities (Who Does What)

### Admin (Stripe)
- Create/edit products and prices in Stripe.
- Apply required metadata exactly as specified.
- Click **Sync Prices** in admin UI after any Stripe change.
- On deploy: verify catalog is synced in both dev and prod environments.

### Convex (Backend)
- Store pricing snapshot in `pricing_catalog`.
- Provide admin‑only sync action to pull Stripe and write snapshot.
- Create checkout sessions using **price IDs from the catalog**.

### Frontend (UI)
- Render pricing from Convex only.
- Show admin‑only **Sync Prices** button with disabled + "Syncing…" state.
- Show pricing based on user state (public vs backer vs subscriber).
- If catalog is empty (first deploy): show "Pricing not available" message. Admin must sync.

---

## Stripe Metadata (Exact Requirements)

### Products
- `app=vector-projector`
- **Separate products** for backer pricing (e.g., “Personal (Backer)”).

### Prices
- `app=vector-projector`
- `tier=personal|commercial`
- `audience=public|backer`

Stripe native fields used (no metadata): `unit_amount`, `currency`, `recurring.interval`.

---

## Convex Data Model (Exact Tables & Fields)

### `pricing_catalog` (new, singleton)
**Location:** `convex/schema.ts`  
**Singleton key:** `key="catalog"` + index on `key`.

**Fields:**
- `key: string`
- `products: Product[]`
- `prices: Price[]`
- `lastSyncedAt: number`
- `lastSyncError?: string`
- `lastSyncFailedAt?: number`

**Product:**
- `productId: string`
- `name: string`
- `active: boolean`
- `metadata: Record<string, string>`

**Price:**
- `priceId: string`
- `productId: string`
- `unitAmount: number` (cents)
- `currency: string`
- `interval: string` (`month` or `year`)
- `active: boolean`
- `nickname?: string`
- `metadata: Record<string, string>`

### `users` (existing, authoritative)
- `backerAccessGrantedAt?: number`
- `backerAccessUntil?: number`

### `crowdfunding_backers` (optional audit)
- `accessGrantedAt?: number`
- `accessUntil?: number`

---

## Admin‑Triggered Sync (Only Update Mechanism)

**Env var:**
- `STRIPE_METADATA_LOOKUP=vector-projector`

**Sync rules (behavior):**
1. Admin clicks **Sync Prices**.
2. Client calls admin‑only Convex action.
3. Action lists all Stripe products/prices (handle pagination).
4. Filter products: `metadata.app == STRIPE_METADATA_LOOKUP`.
5. Filter prices: `active=true`, `type=recurring`, and
   `metadata.app` matches OR `productId` belongs to a matching product.
6. Write full snapshot to `pricing_catalog`.
7. On failure: keep old snapshot, record `lastSyncError` + `lastSyncFailedAt`.

**Admin UI:**
- Disable button during sync.
- Show “Syncing…” status.
- Show `lastSyncedAt` + last error if any.

---

## Checkout (No Hardcoded Price IDs)

**Request:** `createCheckoutSession({ tier, interval, audience })`

**Validation:**
- If `audience === "backer"`: verify user has `backerAccessGrantedAt` set. Reject if not a verified backer.

**Select price where:**
- `metadata.tier === tier`
- `metadata.audience === audience`
- `interval === interval`
- `active === true`

**Reject if:**
- No match, or multiple matches.

---

## Backers (Access + Renewal Rules)

**Access if:**
- Active Stripe subscription, OR
- Verified backer with `users.backerAccessUntil` in the future.

**Renewal:**
- Show backer pricing only if access is expiring/expired.
- Block backer checkout if user is not verified.

---

## Failure Handling
- If Stripe sync fails: keep old catalog, record error, admin retries.

---

## Non‑Goals
- No price IDs in env vars.
- No hardcoded prices in UI.
- No Stripe calls on pricing page render.

---

## Current State vs Required (Gap Analysis)

### `pricing_catalog` table
**Status:** DOES NOT EXIST
**Action:** Create new table in `convex/schema.ts`

### `users` table
**Status:** EXISTS but missing fields
**Current fields:** `authUserId`, `email`, `name`, `createdAt`, `activeSessionId`, `sessionStartedAt`, `crowdfundingBackerId`, `lastSeenAlertAt`
**Missing fields:**
- `backerAccessGrantedAt?: number`
- `backerAccessUntil?: number`

**Action:** Add two optional fields to schema

### `crowdfunding_backers` table
**Status:** EXISTS but missing fields
**Current fields:** `username`, `usernameLower`, `accessCode`, `tier`, `usedByUserId`, `usedAt`, `pendingClaimToken`, `pendingClaimExpiresAt`
**Missing fields:**
- `accessGrantedAt?: number`
- `accessUntil?: number`

**Action:** Add two optional fields to schema (audit purposes)

### `convex/billing.ts`
**Status:** EXISTS but uses broken pattern
**Problems:**
- `getPriceId()` function reads from env vars (`VP_STRIPE_PRICE_*`) — REMOVE
- `createCheckoutSession` uses `getPriceId()` — REWRITE to read from `pricing_catalog`
- `getSubscriptionStatus` gets tier from subscription metadata — OK but could also cross-reference catalog

**Action:** Rewrite to use catalog-based lookup

### Environment Variables
**Current (broken):**
```
VP_STRIPE_PRICE_PERSONAL_MONTHLY=price_xxx
VP_STRIPE_PRICE_PERSONAL_YEARLY=price_xxx
VP_STRIPE_PRICE_COMMERCIAL_MONTHLY=price_xxx
VP_STRIPE_PRICE_COMMERCIAL_YEARLY=price_xxx
```

**Required (new):**
```
STRIPE_METADATA_LOOKUP=vector-projector
```

**Action:** Remove 4 old env vars, add 1 new env var

### New Convex Functions Needed
- `pricingCatalog.ts` (new file):
  - `get` query — returns catalog (or null if empty)
  - `sync` action — admin-only, fetches from Stripe, writes to table

### Frontend Files to Update
- `PricingPage.tsx` — read from Convex, not hardcoded
- `SubscribeModal.tsx` — read from Convex, not hardcoded
- `UserPage.tsx` — subscription display may need updates
- `AdminPage.tsx` — add Sync Prices button
- `useSubscriptionStatus.ts` — may need to cross-reference catalog for tier display

---

## Implementation Order

1. **Schema changes** — add `pricing_catalog` table, add missing fields to `users` and `crowdfunding_backers`
2. **New `pricingCatalog.ts`** — create sync action and get query
3. **Update `billing.ts`** — rewrite `createCheckoutSession` to use catalog
4. **Add env var** — `STRIPE_METADATA_LOOKUP` in Convex Dashboard
5. **Remove old env vars** — delete `VP_STRIPE_PRICE_*` from Convex Dashboard
6. **Admin UI** — add Sync Prices button to AdminPage
7. **Pricing UI** — update PricingPage and SubscribeModal to read from Convex
8. **Test** — sync in dev, verify pricing displays, test checkout flow
