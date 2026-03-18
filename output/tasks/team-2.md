# Team 2: Backend (Schema, API Routes, Email Service)

## Prerequisites
- None — Team 2 has no dependencies on Team 1
- All API response shapes must match contracts in `output/architecture.md` exactly

## Dependencies (install)
```bash
npm install nodemailer
npm install -D @types/nodemailer
```

---

## Task 2.1: Prisma Schema — Add Role to User
**File**: `prisma/schema.prisma`

Add the `role` field to the User model:

```prisma
model User {
  id           String     @id @default(cuid())
  email        String     @unique
  name         String?
  passwordHash String
  role         String     @default("user")
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
  donations    Donation[]
}
```

After editing, run:
```bash
npx prisma db push
npx prisma generate
```

**Important**: Only add the `role` field. Do NOT modify any other models or fields.

---

## Task 2.2: Admin Auth Guard
**File**: `src/lib/admin.ts`

```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "./prisma";
import { NextResponse } from "next/server";

export interface AdminAuthSuccess {
  authorized: true;
  userId: string;
}

export interface AdminAuthFailure {
  authorized: false;
  response: NextResponse;
}

export type AdminAuthResult = AdminAuthSuccess | AdminAuthFailure;

export async function requireAdmin(): Promise<AdminAuthResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  const userId = (session.user as any).id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (user?.role !== "admin") {
    return {
      authorized: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { authorized: true, userId };
}
```

---

## Task 2.3: Email Service
**File**: `src/lib/email.ts`

```typescript
import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

export interface FulfillmentEmailParams {
  donorEmail: string;
  donorName: string | null;
  city: string;
  state: string;
  trackingNumber: string | null;
}

export async function sendFulfillmentEmail(params: FulfillmentEmailParams): Promise<void> {
  const { donorEmail, donorName, city, state, trackingNumber } = params;

  const trackingLine = trackingNumber
    ? `\nTracking number: ${trackingNumber}\n`
    : "";

  await getTransporter().sendMail({
    from: process.env.SMTP_FROM || "noreply@gospeldrop.org",
    to: donorEmail,
    subject: "Your Bible has been delivered!",
    text: `Hi ${donorName || "Friend"},

Great news! A Bible you sponsored has been delivered to a household in ${city}, ${state}.
${trackingLine}
Thank you for spreading the Word!

— The GospelDrop Team`,
  });
}
```

---

## Task 2.4: Admin Stats API Route
**File**: `src/app/api/admin/stats/route.ts`

```typescript
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalBiblesSent, pendingOrders, fulfilledThisMonth, totalDonors] = await Promise.all([
    prisma.bibleDrop.count({
      where: { status: { in: ["shipped", "delivered"] } },
    }),
    prisma.bibleDrop.count({
      where: { status: "pending" },
    }),
    prisma.bibleDrop.count({
      where: {
        status: "delivered",
        deliveredAt: { gte: startOfMonth },
      },
    }),
    prisma.user.count({
      where: {
        role: "user",
        donations: { some: {} },
      },
    }),
  ]);

  const donationAgg = await prisma.donation.aggregate({
    _sum: { amount: true },
  });

  return NextResponse.json({
    totalBiblesSent,
    pendingOrders,
    fulfilledThisMonth,
    totalDonations: donationAgg._sum.amount || 0,
    totalDonors,
  });
}
```

---

## Task 2.5: Admin Shipments API Route
**File**: `src/app/api/admin/shipments/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { searchParams } = req.nextUrl;
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortOrder = (searchParams.get("sortOrder") || "desc") as "asc" | "desc";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20")));
  const statusFilter = searchParams.get("status");

  const allowedSortFields = ["status", "shippedAt", "createdAt"];
  const orderBy = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";

  const where = statusFilter ? { status: statusFilter } : {};

  const [shipments, total] = await Promise.all([
    prisma.bibleDrop.findMany({
      where,
      include: {
        address: { select: { city: true, state: true } },
        donation: {
          select: {
            user: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { [orderBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.bibleDrop.count({ where }),
  ]);

  return NextResponse.json({
    shipments,
    total,
    page,
    pageSize,
  });
}
```

---

## Task 2.6: Admin Donors API Route
**File**: `src/app/api/admin/donors/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { searchParams } = req.nextUrl;
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortOrder = (searchParams.get("sortOrder") || "desc") as "asc" | "desc";

  // Fetch users who have at least one donation
  const users = await prisma.user.findMany({
    where: {
      role: "user",
      donations: { some: {} },
    },
    include: {
      donations: {
        select: {
          id: true,
          amount: true,
          quantity: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: sortBy === "createdAt" ? { createdAt: sortOrder } : undefined,
  });

  // Compute aggregated fields
  const donors = users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    totalDonated: user.donations.reduce((sum, d) => sum + d.amount, 0),
    bibleCount: user.donations.reduce((sum, d) => sum + d.quantity, 0),
    donations: user.donations,
  }));

  // Sort by computed fields if needed
  if (sortBy === "totalDonated") {
    donors.sort((a, b) => sortOrder === "asc" ? a.totalDonated - b.totalDonated : b.totalDonated - a.totalDonated);
  } else if (sortBy === "bibleCount") {
    donors.sort((a, b) => sortOrder === "asc" ? a.bibleCount - b.bibleCount : b.bibleCount - a.bibleCount);
  }

  return NextResponse.json({ donors });
}
```

---

## Task 2.7: Admin Queue API Route
**File**: `src/app/api/admin/queue/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { sendFulfillmentEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const [items, total] = await Promise.all([
    prisma.bibleDrop.findMany({
      where: { status: "pending" },
      include: {
        address: true,
        donation: {
          select: {
            user: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.bibleDrop.count({ where: { status: "pending" } }),
  ]);

  return NextResponse.json({ items, total });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const body = await req.json();
  const { id, status, trackingNumber } = body;

  if (!id || !status || !["shipped", "delivered"].includes(status)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (status === "shipped" && !trackingNumber) {
    return NextResponse.json({ error: "Tracking number required for shipping" }, { status: 400 });
  }

  const updateData: any = { status };
  if (status === "shipped") {
    updateData.trackingNumber = trackingNumber;
    updateData.shippedAt = new Date();
  } else if (status === "delivered") {
    updateData.deliveredAt = new Date();
  }

  const updated = await prisma.bibleDrop.update({
    where: { id },
    data: updateData,
    include: {
      address: true,
      donation: {
        select: {
          user: { select: { name: true, email: true } },
        },
      },
    },
  });

  // Send email notification when delivered
  if (status === "delivered") {
    try {
      await sendFulfillmentEmail({
        donorEmail: updated.donation.user.email,
        donorName: updated.donation.user.name,
        city: updated.address.city,
        state: updated.address.state,
        trackingNumber: updated.trackingNumber,
      });
    } catch (emailError) {
      // Log but don't fail the request
      console.error("Failed to send fulfillment email:", emailError);
    }
  }

  return NextResponse.json({
    id: updated.id,
    status: updated.status,
    trackingNumber: updated.trackingNumber,
    shippedAt: updated.shippedAt,
    deliveredAt: updated.deliveredAt,
  });
}
```

---

## Task 2.8: Admin Queue Bulk API Route
**File**: `src/app/api/admin/queue/bulk/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { sendFulfillmentEmail } from "@/lib/email";

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const body = await req.json();
  const { ids, status, trackingNumbers } = body;

  if (!Array.isArray(ids) || ids.length === 0 || !["shipped", "delivered"].includes(status)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  let updatedCount = 0;

  for (const id of ids) {
    const updateData: any = { status };

    if (status === "shipped") {
      const tracking = trackingNumbers?.[id];
      if (!tracking) continue; // skip items without tracking numbers
      updateData.trackingNumber = tracking;
      updateData.shippedAt = new Date();
    } else if (status === "delivered") {
      updateData.deliveredAt = new Date();
    }

    const updated = await prisma.bibleDrop.update({
      where: { id },
      data: updateData,
      include: {
        address: true,
        donation: {
          select: {
            user: { select: { name: true, email: true } },
          },
        },
      },
    });

    updatedCount++;

    if (status === "delivered") {
      try {
        await sendFulfillmentEmail({
          donorEmail: updated.donation.user.email,
          donorName: updated.donation.user.name,
          city: updated.address.city,
          state: updated.address.state,
          trackingNumber: updated.trackingNumber,
        });
      } catch (emailError) {
        console.error("Failed to send fulfillment email for", id, emailError);
      }
    }
  }

  return NextResponse.json({ updated: updatedCount });
}
```

---

## File Ownership Summary
All files in this task belong to **Team 2 only**:
- `prisma/schema.prisma` (modify existing — add `role` field only)
- `src/lib/admin.ts` (new)
- `src/lib/email.ts` (new)
- `src/app/api/admin/stats/route.ts` (new)
- `src/app/api/admin/shipments/route.ts` (new)
- `src/app/api/admin/donors/route.ts` (new)
- `src/app/api/admin/queue/route.ts` (new)
- `src/app/api/admin/queue/bulk/route.ts` (new)

## Environment Variables Required
```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_FROM=noreply@gospeldrop.org
```
