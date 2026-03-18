# GospelDrop Admin Dashboard — Architecture

## Directory Structure (new files only)
```
src/
├── app/
│   └── admin/
│       ├── layout.tsx              # Admin layout with sidebar (Team 1)
│       ├── page.tsx                # Dashboard stats page (Team 1)
│       ├── shipments/
│       │   └── page.tsx            # Shipments table (Team 1)
│       ├── donors/
│       │   └── page.tsx            # Donors list (Team 1)
│       └── queue/
│           └── page.tsx            # Queue management (Team 1)
│   └── api/
│       └── admin/
│           ├── stats/route.ts      # GET dashboard stats (Team 2)
│           ├── shipments/route.ts  # GET shipments list (Team 2)
│           ├── donors/route.ts     # GET donors list (Team 2)
│           ├── queue/route.ts      # GET queue, PATCH update status (Team 2)
│           └── queue/bulk/route.ts # PATCH bulk status update (Team 2)
├── components/
│   └── admin/
│       ├── AdminSidebar.tsx        # Sidebar nav (Team 1)
│       ├── StatsCard.tsx           # Reusable stat card (Team 1)
│       ├── StatusBadge.tsx         # Status badge component (Team 1)
│       ├── ShipmentsTable.tsx      # Sortable shipments table (Team 1)
│       ├── DonorsTable.tsx         # Donors table with expand (Team 1)
│       └── QueueList.tsx           # Queue management list (Team 1)
├── lib/
│   ├── admin.ts                    # Admin auth guard helper (Team 2)
│   └── email.ts                    # Email service (Team 2)
prisma/
│   └── schema.prisma              # Add role field to User (Team 2)
__tests__/
├── api/
│   ├── admin-stats.test.ts         # (Team 3)
│   ├── admin-shipments.test.ts     # (Team 3)
│   ├── admin-donors.test.ts        # (Team 3)
│   └── admin-queue.test.ts         # (Team 3)
├── components/
│   ├── AdminSidebar.test.tsx       # (Team 3)
│   ├── StatsCard.test.tsx          # (Team 3)
│   ├── ShipmentsTable.test.tsx     # (Team 3)
│   ├── DonorsTable.test.tsx        # (Team 3)
│   └── QueueList.test.tsx          # (Team 3)
├── lib/
│   ├── admin.test.ts               # (Team 3)
│   └── email.test.ts               # (Team 3)
└── pages/
    ├── admin-dashboard.test.tsx     # (Team 3)
    ├── admin-shipments.test.tsx     # (Team 3)
    ├── admin-donors.test.tsx        # (Team 3)
    └── admin-queue.test.tsx         # (Team 3)
```

## API Contracts

### GET /api/admin/stats
**Auth**: Admin only (403 if not admin)
```typescript
// Response 200
interface AdminStatsResponse {
  totalBiblesSent: number;      // shipped + delivered count
  pendingOrders: number;        // pending count
  fulfilledThisMonth: number;   // delivered this calendar month
  totalDonations: number;       // sum of all donation amounts in cents
  totalDonors: number;          // distinct users with donations
}
```

### GET /api/admin/shipments
**Auth**: Admin only
```typescript
// Query params
interface ShipmentsQuery {
  sortBy?: "status" | "shippedAt" | "createdAt";  // default: "createdAt"
  sortOrder?: "asc" | "desc";                       // default: "desc"
  page?: number;                                     // default: 1
  pageSize?: number;                                 // default: 20
  status?: "pending" | "shipped" | "delivered";      // filter
}

// Response 200
interface ShipmentsResponse {
  shipments: Array<{
    id: string;
    donationId: string;
    trackingNumber: string | null;
    status: string;
    shippedAt: string | null;
    deliveredAt: string | null;
    createdAt: string;
    address: {
      city: string;
      state: string;
    };
    donation: {
      user: {
        name: string | null;
        email: string;
      };
    };
  }>;
  total: number;
  page: number;
  pageSize: number;
}
```

### GET /api/admin/donors
**Auth**: Admin only
```typescript
// Query params
interface DonorsQuery {
  sortBy?: "totalDonated" | "bibleCount" | "createdAt";  // default: "createdAt"
  sortOrder?: "asc" | "desc";                              // default: "desc"
}

// Response 200
interface DonorsResponse {
  donors: Array<{
    id: string;
    name: string | null;
    email: string;
    createdAt: string;
    totalDonated: number;    // cents
    bibleCount: number;
    donations: Array<{
      id: string;
      amount: number;
      quantity: number;
      status: string;
      createdAt: string;
    }>;
  }>;
}
```

### GET /api/admin/queue
**Auth**: Admin only
```typescript
// Response 200
interface QueueResponse {
  items: Array<{
    id: string;
    donationId: string;
    trackingNumber: string | null;
    status: string;
    createdAt: string;
    address: {
      name: string;
      line1: string;
      line2: string | null;
      city: string;
      state: string;
      zip: string;
    };
    donation: {
      user: {
        name: string | null;
        email: string;
      };
    };
  }>;
  total: number;
}
```

### PATCH /api/admin/queue
**Auth**: Admin only
```typescript
// Request body
interface QueueUpdateRequest {
  id: string;
  status: "shipped" | "delivered";
  trackingNumber?: string;  // required when status = "shipped"
}

// Response 200
interface QueueUpdateResponse {
  id: string;
  status: string;
  trackingNumber: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
}
```

### PATCH /api/admin/queue/bulk
**Auth**: Admin only
```typescript
// Request body
interface BulkUpdateRequest {
  ids: string[];
  status: "shipped" | "delivered";
  trackingNumbers?: Record<string, string>;  // id -> tracking number map
}

// Response 200
interface BulkUpdateResponse {
  updated: number;
}
```

## Admin Auth Guard
```typescript
// src/lib/admin.ts
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "./prisma";
import { NextResponse } from "next/server";

export async function requireAdmin(): Promise<
  { authorized: true; userId: string } | { authorized: false; response: NextResponse }
> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { authorized: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const userId = (session.user as any).id;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role !== "admin") {
    return { authorized: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { authorized: true, userId };
}
```

## Email Service
```typescript
// src/lib/email.ts
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendFulfillmentEmail(params: {
  donorEmail: string;
  donorName: string | null;
  city: string;
  state: string;
  trackingNumber: string | null;
}): Promise<void> {
  await transporter.sendMail({
    from: process.env.SMTP_FROM || "noreply@gospeldrop.org",
    to: params.donorEmail,
    subject: "Your Bible has been delivered!",
    text: `Hi ${params.donorName || "Friend"},

Great news! A Bible you sponsored has been delivered to a household in ${params.city}, ${params.state}.

${params.trackingNumber ? `Tracking number: ${params.trackingNumber}` : ""}

Thank you for spreading the Word!

— The GospelDrop Team`,
  });
}
```

## Schema Migration
```prisma
model User {
  id           String     @id @default(cuid())
  email        String     @unique
  name         String?
  passwordHash String
  role         String     @default("user")  // NEW: "user" | "admin"
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
  donations    Donation[]
}
```

## Key Conventions (from existing code)
- Tailwind utility classes, custom colors via config (primary, accent-lavender, etc.)
- `rounded-card` (32px), `shadow-soft`, `shadow-primary` custom utilities
- `font-[800]` for headings, `text-text-main` / `text-text-sub` for text colors
- API routes use `NextResponse.json()`, `getServerSession(authOptions)` pattern
- Client components use `"use client"` directive, fetch from API routes
- `@/*` path alias maps to `./src/*`
