# Test Manifest — Admin Dashboard (TDD RED Phase)

All tests currently **FAIL** (RED). Implementation files do not exist yet.

---

## Test Files

### `src/__tests__/api/admin/stats.test.ts`
Tests for `GET /api/admin/stats` — Admin dashboard stats endpoint.

| Test | Purpose |
|------|---------|
| returns 401 when unauthenticated | Unauthenticated requests must be rejected |
| returns 403 when authenticated but not admin | Non-admin authenticated users must be forbidden |
| returns stats object for admin user | Aggregate: totalBiblesSent, pendingOrders, fulfilledThisMonth |
| returns 500 on database error | Graceful error handling on DB failure |

---

### `src/__tests__/api/admin/shipments.test.ts`
Tests for `GET /api/admin/shipments` and `PATCH /api/admin/shipments/[id]`.

| Test | Purpose |
|------|---------|
| returns 401 for unauthenticated requests | Auth guard on GET |
| returns 403 for non-admin users | Role guard on GET |
| returns shipments list with pagination metadata | Full list with total/page/shipments |
| supports sorting by createdAt asc | Sort parameter wired to Prisma orderBy |
| supports sorting by status | Sort by status field |
| filters by status query param | Where clause filtering by status |
| PATCH returns 401 for unauthenticated | Auth guard on PATCH |
| PATCH updates shipment status and tracking number | Successful status update flow |
| PATCH rejects invalid status values | Validation of status enum |

---

### `src/__tests__/api/admin/donors.test.ts`
Tests for `GET /api/admin/donors` — donor list with aggregated donation history.

| Test | Purpose |
|------|---------|
| returns 401 for unauthenticated requests | Auth guard |
| returns 403 for non-admin users | Role guard |
| returns donors with aggregated totals | totalDonated (cents), bibleCount, donationCount per donor |
| includes donation history in each donor | donations array with id/amount/quantity |
| supports pagination | skip/take with page/limit params |
| supports search by email | WHERE OR clause on email/name |
| returns 500 on database error | Graceful error handling |

---

### `src/__tests__/api/admin/queue.test.ts`
Tests for `GET /api/admin/queue` and `POST /api/admin/queue/fulfill`.

| Test | Purpose |
|------|---------|
| GET returns 401 for unauthenticated | Auth guard |
| GET returns 403 for non-admin | Role guard |
| GET returns pending BibleDrops with full details | Queue with address/donation/donor info |
| GET fetches only pending status by default | Default WHERE status = "pending" |
| GET supports pagination | skip/take with page/limit |
| FULFILL returns 401 for unauthenticated | Auth guard on fulfill endpoint |
| FULFILL marks BibleDrops as fulfilled and sends email | Core fulfillment + notification flow |
| FULFILL returns 400 when ids array is empty | Input validation |
| FULFILL returns 400 when ids missing | Input validation |
| FULFILL returns 207 on partial success | Partial update with failed/fulfilled counts |

---

### `src/__tests__/lib/email.test.ts`
Tests for `src/lib/email.ts` — `sendFulfillmentEmail` function.

| Test | Purpose |
|------|---------|
| sends an email to the donor when a Bible is fulfilled | Core notification: correct recipient, subject contains "bible" |
| includes tracking number in email when provided | Tracking number in HTML body |
| sends email without tracking number when not provided | Optional tracking number handled gracefully |
| throws when SMTP transport fails | Error propagation from transport |
| includes recipient location in email body | City + state in email body |

---

### `src/__tests__/middleware/admin-auth.test.ts`
Tests for Next.js `src/middleware.ts` — route-level admin auth guard.

| Test | Purpose |
|------|---------|
| redirects unauthenticated users from /admin to /auth/signin | 307 redirect for no session |
| redirects non-admin users from /admin to / (home) | 307 redirect for wrong role |
| allows admin users to access /admin | Pass-through for admin role |
| allows admin users to access /admin/shipments | Pass-through for sub-routes |
| allows admin users to access /admin/donors | Pass-through for sub-routes |
| allows admin users to access /admin/queue | Pass-through for sub-routes |
| does not affect non-admin routes | Middleware scoped to /admin/* only |

---

## Implementation Files Expected (to make tests pass)

| File | Description |
|------|-------------|
| `src/app/api/admin/stats/route.ts` | Stats aggregate endpoint |
| `src/app/api/admin/shipments/route.ts` | Shipments list endpoint |
| `src/app/api/admin/shipments/[id]/route.ts` | Shipment status update |
| `src/app/api/admin/donors/route.ts` | Donors list endpoint |
| `src/app/api/admin/queue/route.ts` | Queue list endpoint |
| `src/app/api/admin/queue/fulfill/route.ts` | Fulfill queue items + send emails |
| `src/lib/email.ts` | Email notification service (nodemailer) |
| `src/middleware.ts` | Next.js middleware for /admin/* auth guard |
| `src/app/admin/page.tsx` | Admin dashboard with sidebar + stats cards |
| `src/app/admin/shipments/page.tsx` | Sortable shipments table with status badges |
| `src/app/admin/donors/page.tsx` | Donors list with history |
| `src/app/admin/queue/page.tsx` | Queue management UI |

## Prisma Schema Notes

Uses existing `BibleDrop` model as the "Order" model (tracking shipments).
User `role` field needs to be added to the `User` model in `prisma/schema.prisma`.
