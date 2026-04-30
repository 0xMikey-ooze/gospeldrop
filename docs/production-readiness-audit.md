# GospelDrop — Production Readiness Audit

**Date:** 2026-04-30  
**Auditor:** Cursor Cloud Agent (production-readiness-audit team)  
**Branch audited:** `main` (commit `c651b5a`)

---

## Current State Summary

GospelDrop is a Next.js 14 / App Router application backed by PostgreSQL (via Prisma) and Stripe for payments. It allows authenticated donors to purchase Bible drops that are assigned to random US household addresses, tracked through an admin dashboard with queue management, shipment tracking, and email notifications. The core domain model and REST API surface are well-structured and include a documented API-contracts file. However, the application is **not yet production-ready**: TypeScript and ESLint errors are suppressed at build time, there is no CI/CD pipeline, no Dockerfile or deployment configuration, no `.env.example`, no Stripe webhook handler (meaning completed-payment donations are never recorded), no rate limiting or input validation library, no database migrations folder, and test coverage covers only trivial logic (status maps and date arithmetic) rather than real application behavior. Several security issues and data-integrity gaps also require resolution before going live.

---

## Categorized Findings

### 🔴 Critical Gaps

#### 1. No Stripe Webhook Handler — Donations Never Recorded
**Files:** `src/app/api/checkout/route.ts`, `prisma/schema.prisma`

The checkout route creates a Stripe Checkout Session but there is no `POST /api/stripe/webhook` handler. Stripe sends `checkout.session.completed` events to confirm a payment succeeded; without this handler the `Donation` table is never populated when a user pays, meaning all downstream logic (queue, tracking, admin stats) operates on empty data. This is a **complete functional gap** — the payment flow is broken end-to-end.

**Required:** Create `src/app/api/stripe/webhook/route.ts` that:
- Verifies the `stripe-signature` header using `stripe.webhooks.constructEvent`
- Handles `checkout.session.completed` to create a `Donation` record and associated `BibleDrop` + `Address` records
- Returns `200` quickly (fire-and-forget heavy work)

---

#### 2. TypeScript and ESLint Errors Suppressed at Build Time
**File:** `next.config.mjs`

```js
typescript: { ignoreBuildErrors: true }
eslint: { ignoreDuringBuilds: true }
```

These two flags mean broken TypeScript and lint errors are silently shipped to production. The build gives a false green signal. This was confirmed by the discrepancy between `src/lib/auth.ts` (which references `user.isAdmin`) and `prisma/schema.prisma` (which only has `role: String`): `isAdmin` does not exist on the Prisma `User` model. Similarly, `src/app/api/admin/queue/[id]/fulfill/route.ts` calls `sendFulfillmentEmail(email, name, address)` passing an `Address` object as the third argument, but `sendFulfillmentEmail`'s signature is `(email, name, bibleCount: number, trackingNumber?: string)` — this is a runtime type mismatch that TypeScript would catch if errors were not suppressed.

**Required:** Remove both `ignoreBuildErrors` and `ignoreDuringBuilds` flags, then fix the resulting type errors.

---

#### 3. Schema / Code Mismatch: `isAdmin` vs `role`
**Files:** `src/lib/auth.ts` (line 17), `prisma/schema.prisma`

`auth.ts` returns `isAdmin: user.isAdmin` in the JWT callback, but the Prisma `User` model has no `isAdmin` field — only `role: String @default("user")`. `adminAuth.ts` correctly checks `role === "admin"`, but `auth.ts` does not set the JWT `isAdmin` flag correctly (it will always be `undefined`). The admin layout (`src/app/admin/layout.tsx`) uses `session.user` but doesn't check `isAdmin`/`role` at the client side — it just redirects unauthenticated users, not non-admins.

**Required:** Remove `isAdmin` from the JWT payload; rely solely on the `role` field via a DB look-up in `requireAdmin()`. Alternatively add `isAdmin Boolean @default(false)` to the schema and run a migration.

---

#### 4. `sendFulfillmentEmail` Called with Wrong Argument in fulfill route
**File:** `src/app/api/admin/queue/[id]/fulfill/route.ts` (lines 41–45)

```ts
await sendFulfillmentEmail(
  updated.donation.user.email,
  updated.donation.user.name || "Friend",
  updated.address   // ← Address object, not a number
);
```

`sendFulfillmentEmail` expects `bibleCount: number` as the third argument, not an `Address` object. This causes a runtime crash whenever the fulfill endpoint is called. TypeScript would catch this if `ignoreBuildErrors` were not set to `true`.

**Required:** Pass `1` (or the actual quantity) as the third argument, with `drop.trackingNumber ?? undefined` as the fourth.

---

#### 5. No Database Migrations — Only Schema Push
**Files:** `prisma/schema.prisma`, `package.json`

There is no `prisma/migrations/` directory. The project appears to use `prisma db push` (schema sync) rather than `prisma migrate dev` / `prisma migrate deploy`. In production, `db push` can silently drop columns or cause data loss on schema changes with existing data. Migration history is also required for any team workflow and rollback capability.

**Required:** Run `prisma migrate dev --name init` to generate the initial migration, commit the `prisma/migrations/` folder, and update deploy scripts to use `prisma migrate deploy`.

---

#### 6. No CI/CD Pipeline
**Repository:** No `.github/` directory

There are no GitHub Actions workflows. Every push is unvalidated — no type check, lint, test, or build gate. A broken commit can go directly to main and be deployed.

**Required:** Add `.github/workflows/ci.yml` with: `npm ci`, `prisma generate`, `tsc --noEmit`, `next lint`, `vitest run`, and optionally a build step.

---

#### 7. No Deployment Configuration
**Repository root:** No `Dockerfile`, no `fly.toml`, no `vercel.json`, no `railway.json`, no `.env.example`

There is no documented or automated path to deploy this application. Nothing tells an operator what environment variables are required, how to build the image, or how to provision the database.

**Required (minimum):**
- Add `.env.example` listing all required variables (see §Important Improvements #1)
- Add a `Dockerfile` or choose a deployment target and document it in the README

---

#### 8. No README
**Repository root**

There is no `README.md`. A new developer has no on-boarding path, no description of the project, no instructions for local setup, and no mention of required environment variables.

**Required:** Add `README.md` covering: project purpose, local setup steps, environment variable reference, test commands, and deployment instructions.

---

### 🟡 Important Improvements

#### 1. No `.env.example` / Environment Variable Documentation
**Files:** `src/lib/stripe.ts`, `src/lib/email.ts`, `src/lib/auth.ts`, `src/app/api/checkout/route.ts`

Required variables are scattered across source files with no central reference:
- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET` (needed once webhook handler is added)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`
- `EMAIL_FROM`
- `ADMIN_EMAIL` (still referenced in the legacy fulfill route; should be removed in favor of `role`-based auth)

`.env` is correctly gitignored but there is no `.env.example` to guide setup.

---

#### 2. No Input Validation Library
**Files:** `src/app/api/auth/register/route.ts`, `src/app/api/checkout/route.ts`, `src/app/api/admin/queue/[id]/route.ts`

Request bodies are parsed with `req.json()` and accessed directly without schema validation (no Zod, Yup, or similar). This means:
- No email format validation on registration
- No min/max length on password
- `parseInt(quantity)` silently returns `NaN` on non-numeric input (mitigated by `Math.max(1, ...)` but still fragile)
- No sanitization on `trackingNumber` before it is stored and later emailed

**Required:** Add Zod (or equivalent) and validate all incoming request bodies.

---

#### 3. No Rate Limiting on Auth and Checkout Endpoints
**Files:** `src/app/api/auth/register/route.ts`, `src/app/api/checkout/route.ts`

Neither registration nor checkout have rate limiting. The registration endpoint is vulnerable to account enumeration (returns "User already exists") and bulk-creation attacks. The checkout endpoint can be hit repeatedly to generate many Stripe sessions.

**Required:** Add rate limiting middleware (e.g., `@upstash/ratelimit` or an edge middleware approach).

---

#### 4. Passwords Stored with Cost Factor 10 — Consider Increasing
**File:** `src/app/api/auth/register/route.ts` (line 12)

`bcrypt.hash(password, 10)` uses cost factor 10, which is the minimum generally recommended. Consider 12 for new applications — bcrypt at factor 12 takes ~250ms which is still acceptable for sign-in but meaningfully harder to brute-force.

---

#### 5. Admin Protection is Client-Side Only (Layout)
**File:** `src/app/admin/layout.tsx`

The admin layout redirects unauthenticated users client-side via `useEffect`. This is a UX redirect, not a security gate — the page HTML renders before the redirect fires. Server Components middleware should protect `/admin/*` routes so the page is never served to unauthorized users.

**Required:** Add `middleware.ts` at the root to protect `/admin` routes server-side, checking the session token before serving any admin page.

---

#### 6. No Error Monitoring / Structured Logging
**Files:** All API routes use `console.error` only

There is no integration with an error monitoring service (Sentry, Bugsnag, etc.) and no structured logging (Pino, Winston). `console.error` output is lost in most production hosting environments.

**Required:** Add a structured logger and integrate at minimum one error-monitoring provider.

---

#### 7. Test Coverage Is Cosmetic — No Real Behavior Tested
**Files:** `src/__tests__/admin-api.test.ts`, `src/__tests__/email.test.ts`

`admin-api.test.ts` tests only a hardcoded `Record<string, string>` (the status map) and a date calculation — it does not import or invoke any application code. `email.test.ts` mocks `nodemailer.createTransport` using `jest.mock` but the test file is in the Vitest config (`vitest.config.ts`), while Jest config exists separately in `jest.config.js` — the two test runners are not unified and `jest.mock()` syntax will not work with Vitest's `vi.mock()` requirement. Neither test file exercises actual API route logic, database interactions, or Stripe integrations.

**Required:**
- Unify on one test runner (Vitest is already the declared runner; remove Jest)
- Replace `jest.mock` with `vi.mock` in `email.test.ts`
- Write integration tests for critical paths: registration, checkout session creation, webhook handling, admin auth enforcement

---

#### 8. Dual Admin Auth Implementations
**Files:** `src/lib/admin.ts`, `src/lib/adminAuth.ts`, `src/app/api/admin/queue/[id]/fulfill/route.ts`

Two overlapping admin auth helpers exist:
- `src/lib/admin.ts`: checks `user.role === "admin"` via a DB lookup (correct)
- `src/lib/adminAuth.ts`: does the same thing identically
- `src/app/api/admin/queue/[id]/fulfill/route.ts`: uses a third inline implementation that compares email against `process.env.ADMIN_EMAIL` (insecure and inconsistent)

**Required:** Delete `adminAuth.ts`, delete the inline `isAdmin()` function in the fulfill route, and have all admin routes use `requireAdmin()` from `src/lib/admin.ts`.

---

#### 9. Prisma Client Singleton Pattern Is Non-Standard
**File:** `src/lib/prisma.ts`

The file uses a `Proxy` to lazily initialize `PrismaClient` via a global variable. The standard Next.js / Prisma pattern is:
```ts
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```
The Proxy approach adds unnecessary indirection and may cause subtle issues with Prisma's internal method resolution.

---

#### 10. `stripe` Module Uses `"2023-10-16" as any` API Version
**File:** `src/lib/stripe.ts`

```ts
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16" as any,
});
```

The `as any` cast suppresses the type system's API version check. This means the code compiles against whatever type definitions are installed but may break at runtime if the Stripe SDK version enforces a different API version. Use the correct string literal type from the installed Stripe SDK version.

---

#### 11. `STRIPE_SECRET_KEY` Non-Null Assert Without Runtime Check
**File:** `src/lib/stripe.ts`

`process.env.STRIPE_SECRET_KEY!` — the non-null assertion means if this variable is missing, Stripe will initialize with `undefined` and throw an opaque runtime error on first use rather than failing fast at startup with a clear message.

**Required:** Add a startup validation check (throw with a descriptive message if required env vars are absent).

---

### 🟢 Nice-to-Have Items

#### 1. Address Data Source Not Implemented
**File:** `prisma/schema.prisma`, `src/app/api/checkout/route.ts`

The `Address` model exists but there is no mechanism to populate it with real random US household addresses. When a donation is made, `BibleDrop` records with associated `Address` entries need to be created. The current code has no address dataset, no API integration (USPS, a CSV, etc.), and no assignment logic. This is not a code bug but a core feature gap that must be designed and implemented before the service can fulfill its stated purpose.

---

#### 2. No Webhook Signature Verification Documented
Once a Stripe webhook handler is added, the `STRIPE_WEBHOOK_SECRET` must be rotated per environment (Stripe provides different secrets for test and live modes). This should be documented in `.env.example` and the README.

---

#### 3. Mobile Responsiveness of Admin Dashboard
**Files:** `src/app/admin/*.tsx`

The admin dashboard uses a fixed 256px sidebar (`w-64`) with no responsive breakpoints. On mobile/tablet screens the layout will overflow.

---

#### 4. No Loading / Error Boundary Patterns
Several pages fetch data with bare `fetch()` calls and render no loading skeletons or error UI — errors silently break the page render.

---

#### 5. `success_url` Relies on `NEXTAUTH_URL` for Stripe Redirect
**File:** `src/app/api/checkout/route.ts`

If `NEXTAUTH_URL` is not set (or misconfigured), the Stripe success redirect will be a broken URL. Consider using `headers().get('host')` as a fallback.

---

#### 6. No CSP / Security Headers
**File:** `next.config.mjs`

There are no `Content-Security-Policy`, `X-Frame-Options`, or `Strict-Transport-Security` headers configured. Next.js makes it straightforward to add these via `headers()` in `next.config.mjs`.

---

#### 7. Stories Page Has No Real Data
**File:** `src/app/stories/page.tsx`

The Stories page contains hardcoded placeholder content. Before launch, either connect it to real testimonials from the database or remove it.

---

#### 8. Track Page Does Not Link to Specific Shipment
**File:** `src/app/track/page.tsx`

The tracking page loads all donations for the current user but provides no direct link to a carrier's tracking URL based on the `trackingNumber` field.

---

## Prioritized Action List

The following items are ordered by impact × urgency. Items 1–7 are blocking for any production launch.

| Priority | Action | Severity | Files |
|----------|--------|----------|-------|
| 1 | Implement `POST /api/stripe/webhook` to record completed payments | 🔴 Critical | new file: `src/app/api/stripe/webhook/route.ts` |
| 2 | Remove `ignoreBuildErrors` and `ignoreBuildErrors` from `next.config.mjs`; fix TypeScript errors | 🔴 Critical | `next.config.mjs`, `src/lib/auth.ts`, `src/app/api/admin/queue/[id]/fulfill/route.ts` |
| 3 | Fix `sendFulfillmentEmail` call in fulfill route (pass `number`, not `Address`) | 🔴 Critical | `src/app/api/admin/queue/[id]/fulfill/route.ts` |
| 4 | Align `User` model: add `isAdmin Boolean` or remove `isAdmin` from JWT and rely on `role` | 🔴 Critical | `prisma/schema.prisma`, `src/lib/auth.ts` |
| 5 | Generate Prisma migrations (`prisma migrate dev`) and commit `prisma/migrations/` | 🔴 Critical | `prisma/` |
| 6 | Add `.github/workflows/ci.yml` for type-check + lint + test on every PR | 🔴 Critical | new file |
| 7 | Add `.env.example` and `README.md` | 🔴 Critical | new files |
| 8 | Delete duplicate admin auth helpers; standardize on `requireAdmin()` in `src/lib/admin.ts` | 🟡 Important | `src/lib/adminAuth.ts`, `src/app/api/admin/queue/[id]/fulfill/route.ts` |
| 9 | Add Middleware to enforce admin auth server-side on `/admin/*` routes | 🟡 Important | new file: `src/middleware.ts` |
| 10 | Add Zod input validation to all POST/PATCH routes | 🟡 Important | all API routes |
| 11 | Add rate limiting on `/api/auth/register` and `/api/checkout` | 🟡 Important | those route files |
| 12 | Unify test runner on Vitest; replace `jest.mock` with `vi.mock`; add real integration tests | 🟡 Important | `src/__tests__/`, `package.json`, `jest.config.js` |
| 13 | Fix Stripe `apiVersion` type cast; add env-var startup validation | 🟡 Important | `src/lib/stripe.ts` |
| 14 | Replace Proxy-based Prisma singleton with standard pattern | 🟡 Important | `src/lib/prisma.ts` |
| 15 | Add error monitoring (Sentry) and structured logging | 🟡 Important | all API routes |
| 16 | Design and implement address dataset / assignment logic | 🟢 Nice-to-have | `src/app/api/stripe/webhook/route.ts` (new) |
| 17 | Add security headers (CSP, X-Frame-Options, HSTS) in `next.config.mjs` | 🟢 Nice-to-have | `next.config.mjs` |
| 18 | Make admin dashboard responsive (mobile breakpoints) | 🟢 Nice-to-have | `src/app/admin/*.tsx` |

---

## Appendix: Environment Variables Required

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Yes | Random 32+ char string |
| `NEXTAUTH_URL` | Yes | Full base URL (e.g. `https://gospeldrop.org`) |
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key (`sk_live_...` or `sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Yes (after webhook added) | From Stripe Dashboard → Webhooks |
| `SMTP_HOST` | Yes (for email) | Falls back to JSON transport if missing |
| `SMTP_PORT` | No | Default `587` |
| `SMTP_SECURE` | No | `"true"` for TLS/SSL |
| `SMTP_USER` | Yes (with SMTP_HOST) | SMTP username |
| `SMTP_PASS` | Yes (with SMTP_HOST) | SMTP password |
| `EMAIL_FROM` | No | Default `noreply@gospeldrop.org` |
| `ADMIN_EMAIL` | Deprecated | Remove; use `role = "admin"` in DB |
