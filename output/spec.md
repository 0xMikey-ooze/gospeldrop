# GospelDrop Admin Dashboard — Specification

## Overview
Build a full admin dashboard for GospelDrop that provides operational visibility and management capabilities for Bible distribution operations.

## Current State
- Next.js 14 (App Router) + Tailwind CSS + Prisma (PostgreSQL)
- NextAuth credentials provider with JWT sessions
- Models: User, Address, Donation, BibleDrop
- No admin role differentiation exists
- No test framework installed
- No email infrastructure

## Requirements

### 1. Schema Changes
- Add `role` field to `User` model: `String @default("user")` — values: `"user"` | `"admin"`
- No new models needed; all dashboard data derives from existing Donation, BibleDrop, Address models

### 2. Admin Dashboard (`/admin`)
- Sidebar navigation: Dashboard, Shipments, Donors, Queue
- Stats cards:
  - **Total Bibles Sent**: `COUNT(BibleDrop WHERE status IN ('shipped','delivered'))`
  - **Pending Orders**: `COUNT(BibleDrop WHERE status = 'pending')`
  - **Fulfilled This Month**: `COUNT(BibleDrop WHERE status = 'delivered' AND deliveredAt >= startOfMonth)`
- Admin-only access: redirect non-admin users to `/`

### 3. Shipments Page (`/admin/shipments`)
- Sortable table of BibleDrop records
- Columns: ID, Donation ID, Recipient (city/state), Tracking #, Status, Shipped Date, Delivered Date
- Status badges: pending (yellow), shipped (blue), delivered (green)
- Sortable by: status, shippedAt, createdAt
- Pagination (20 per page)

### 4. Donors Page (`/admin/donors`)
- Table of Users with role="user" who have donations
- Columns: Name, Email, Total Donated ($), Bible Count, Join Date
- Expandable rows showing donation history
- Sortable by: totalDonated, bibleCount, createdAt

### 5. Queue Page (`/admin/queue`)
- List of BibleDrop records with status="pending"
- Actions: Mark as Shipped (set status, shippedAt, trackingNumber), Mark as Delivered
- Bulk select + bulk action support

### 6. Email Notifications
- Send email when BibleDrop status changes to "delivered"
- Email goes to the donor (via Donation → User relation)
- Use Nodemailer with SMTP config from env vars
- Template: plain text with Bible drop details (city/state, tracking number)

### 7. Testing (TDD)
- Install vitest + @testing-library/react + @testing-library/jest-dom
- Test admin API routes with mocked Prisma
- Test admin components with mocked data
- Test email service
- Test admin middleware/guards
