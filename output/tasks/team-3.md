# Team 3: Test Architect (TDD Test Specifications)

## Prerequisites
- Tests are written BEFORE implementation (TDD)
- Tests define the expected behavior; Teams 1 & 2 make them pass

## Setup

### Install Test Dependencies
```bash
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

### Vitest Config
**File**: `vitest.config.ts`

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./__tests__/setup.ts"],
    include: ["__tests__/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

### Test Setup File
**File**: `__tests__/setup.ts`

```typescript
import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock next-auth
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/admin",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(() => ({
    data: { user: { id: "test-admin", email: "admin@test.com", name: "Admin" } },
    status: "authenticated",
  })),
  signOut: vi.fn(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));
```

### Add Script to package.json
Add to `scripts`:
```json
"test": "vitest",
"test:run": "vitest run"
```

---

## Test 3.1: Admin Auth Guard
**File**: `__tests__/lib/admin.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getServerSession } from "next-auth";
import { requireAdmin } from "@/lib/admin";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

import { prisma } from "@/lib/prisma";

describe("requireAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns unauthorized when no session exists", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const result = await requireAdmin();
    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      const body = await result.response.json();
      expect(body.error).toBe("Unauthorized");
    }
  });

  it("returns forbidden when user is not admin", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", email: "user@test.com" },
      expires: "",
    });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      role: "user",
    } as any);

    const result = await requireAdmin();
    expect(result.authorized).toBe(false);
    if (!result.authorized) {
      const body = await result.response.json();
      expect(body.error).toBe("Forbidden");
    }
  });

  it("returns authorized with userId when user is admin", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "admin-1", email: "admin@test.com" },
      expires: "",
    });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      role: "admin",
    } as any);

    const result = await requireAdmin();
    expect(result.authorized).toBe(true);
    if (result.authorized) {
      expect(result.userId).toBe("admin-1");
    }
  });

  it("returns forbidden when user not found in database", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "ghost-user", email: "ghost@test.com" },
      expires: "",
    });
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const result = await requireAdmin();
    expect(result.authorized).toBe(false);
  });
});
```

---

## Test 3.2: Email Service
**File**: `__tests__/lib/email.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock nodemailer before importing
const mockSendMail = vi.fn().mockResolvedValue({ messageId: "test-id" });
vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: mockSendMail,
    })),
  },
}));

import { sendFulfillmentEmail } from "@/lib/email";

describe("sendFulfillmentEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SMTP_HOST = "smtp.test.com";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_USER = "testuser";
    process.env.SMTP_PASS = "testpass";
    process.env.SMTP_FROM = "test@gospeldrop.org";
  });

  it("sends email with correct recipient and subject", async () => {
    await sendFulfillmentEmail({
      donorEmail: "donor@test.com",
      donorName: "John",
      city: "Austin",
      state: "TX",
      trackingNumber: "TRACK123",
    });

    expect(mockSendMail).toHaveBeenCalledOnce();
    const call = mockSendMail.mock.calls[0][0];
    expect(call.to).toBe("donor@test.com");
    expect(call.subject).toBe("Your Bible has been delivered!");
    expect(call.from).toBe("test@gospeldrop.org");
  });

  it("includes city and state in email body", async () => {
    await sendFulfillmentEmail({
      donorEmail: "donor@test.com",
      donorName: "Jane",
      city: "Portland",
      state: "OR",
      trackingNumber: null,
    });

    const call = mockSendMail.mock.calls[0][0];
    expect(call.text).toContain("Portland");
    expect(call.text).toContain("OR");
  });

  it("includes tracking number when provided", async () => {
    await sendFulfillmentEmail({
      donorEmail: "donor@test.com",
      donorName: "Bob",
      city: "Denver",
      state: "CO",
      trackingNumber: "ABC123XYZ",
    });

    const call = mockSendMail.mock.calls[0][0];
    expect(call.text).toContain("ABC123XYZ");
  });

  it("uses fallback name when donorName is null", async () => {
    await sendFulfillmentEmail({
      donorEmail: "anon@test.com",
      donorName: null,
      city: "Seattle",
      state: "WA",
      trackingNumber: null,
    });

    const call = mockSendMail.mock.calls[0][0];
    expect(call.text).toContain("Hi Friend");
  });
});
```

---

## Test 3.3: Admin Stats API
**File**: `__tests__/api/admin-stats.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock requireAdmin
const mockRequireAdmin = vi.fn();
vi.mock("@/lib/admin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

// Mock prisma
const mockPrisma = {
  bibleDrop: {
    count: vi.fn(),
  },
  user: {
    count: vi.fn(),
  },
  donation: {
    aggregate: vi.fn(),
  },
};
vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import { GET } from "@/app/api/admin/stats/route";

describe("GET /api/admin/stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAdmin.mockResolvedValue({
      authorized: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    });

    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns 403 when not admin", async () => {
    mockRequireAdmin.mockResolvedValue({
      authorized: false,
      response: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }),
    });

    const response = await GET();
    expect(response.status).toBe(403);
  });

  it("returns aggregated stats when admin", async () => {
    mockRequireAdmin.mockResolvedValue({ authorized: true, userId: "admin-1" });
    mockPrisma.bibleDrop.count
      .mockResolvedValueOnce(42)  // totalBiblesSent
      .mockResolvedValueOnce(10) // pendingOrders
      .mockResolvedValueOnce(5); // fulfilledThisMonth
    mockPrisma.user.count.mockResolvedValue(15);
    mockPrisma.donation.aggregate.mockResolvedValue({ _sum: { amount: 63000 } });

    const response = await GET();
    const data = await response.json();

    expect(data.totalBiblesSent).toBe(42);
    expect(data.pendingOrders).toBe(10);
    expect(data.fulfilledThisMonth).toBe(5);
    expect(data.totalDonations).toBe(63000);
    expect(data.totalDonors).toBe(15);
  });

  it("returns 0 for totalDonations when no donations exist", async () => {
    mockRequireAdmin.mockResolvedValue({ authorized: true, userId: "admin-1" });
    mockPrisma.bibleDrop.count.mockResolvedValue(0);
    mockPrisma.user.count.mockResolvedValue(0);
    mockPrisma.donation.aggregate.mockResolvedValue({ _sum: { amount: null } });

    const response = await GET();
    const data = await response.json();
    expect(data.totalDonations).toBe(0);
  });
});
```

---

## Test 3.4: Admin Shipments API
**File**: `__tests__/api/admin-shipments.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/admin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

const mockPrisma = {
  bibleDrop: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
};
vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import { GET } from "@/app/api/admin/shipments/route";

describe("GET /api/admin/shipments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ authorized: true, userId: "admin-1" });
  });

  it("returns paginated shipments with default params", async () => {
    const mockShipments = [
      {
        id: "drop-1",
        donationId: "don-1",
        trackingNumber: "TRACK1",
        status: "shipped",
        shippedAt: new Date().toISOString(),
        deliveredAt: null,
        createdAt: new Date().toISOString(),
        address: { city: "Austin", state: "TX" },
        donation: { user: { name: "John", email: "john@test.com" } },
      },
    ];
    mockPrisma.bibleDrop.findMany.mockResolvedValue(mockShipments);
    mockPrisma.bibleDrop.count.mockResolvedValue(1);

    const req = new NextRequest("http://localhost/api/admin/shipments");
    const response = await GET(req);
    const data = await response.json();

    expect(data.shipments).toHaveLength(1);
    expect(data.total).toBe(1);
    expect(data.page).toBe(1);
    expect(data.pageSize).toBe(20);
  });

  it("respects sortBy and sortOrder params", async () => {
    mockPrisma.bibleDrop.findMany.mockResolvedValue([]);
    mockPrisma.bibleDrop.count.mockResolvedValue(0);

    const req = new NextRequest("http://localhost/api/admin/shipments?sortBy=status&sortOrder=asc");
    await GET(req);

    expect(mockPrisma.bibleDrop.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { status: "asc" },
      })
    );
  });

  it("filters by status when provided", async () => {
    mockPrisma.bibleDrop.findMany.mockResolvedValue([]);
    mockPrisma.bibleDrop.count.mockResolvedValue(0);

    const req = new NextRequest("http://localhost/api/admin/shipments?status=pending");
    await GET(req);

    expect(mockPrisma.bibleDrop.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "pending" },
      })
    );
  });

  it("paginates correctly", async () => {
    mockPrisma.bibleDrop.findMany.mockResolvedValue([]);
    mockPrisma.bibleDrop.count.mockResolvedValue(50);

    const req = new NextRequest("http://localhost/api/admin/shipments?page=3&pageSize=10");
    const response = await GET(req);
    const data = await response.json();

    expect(mockPrisma.bibleDrop.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 10,
      })
    );
    expect(data.page).toBe(3);
    expect(data.pageSize).toBe(10);
  });

  it("rejects invalid sortBy fields", async () => {
    mockPrisma.bibleDrop.findMany.mockResolvedValue([]);
    mockPrisma.bibleDrop.count.mockResolvedValue(0);

    const req = new NextRequest("http://localhost/api/admin/shipments?sortBy=INVALID_FIELD");
    await GET(req);

    // Should fall back to createdAt
    expect(mockPrisma.bibleDrop.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: "desc" },
      })
    );
  });
});
```

---

## Test 3.5: Admin Donors API
**File**: `__tests__/api/admin-donors.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/admin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

const mockPrisma = {
  user: {
    findMany: vi.fn(),
  },
};
vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import { GET } from "@/app/api/admin/donors/route";

describe("GET /api/admin/donors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ authorized: true, userId: "admin-1" });
  });

  it("returns donors with computed totalDonated and bibleCount", async () => {
    mockPrisma.user.findMany.mockResolvedValue([
      {
        id: "user-1",
        name: "Alice",
        email: "alice@test.com",
        createdAt: new Date(),
        donations: [
          { id: "d1", amount: 1500, quantity: 1, status: "completed", createdAt: new Date() },
          { id: "d2", amount: 4500, quantity: 3, status: "completed", createdAt: new Date() },
        ],
      },
    ]);

    const req = new NextRequest("http://localhost/api/admin/donors");
    const response = await GET(req);
    const data = await response.json();

    expect(data.donors).toHaveLength(1);
    expect(data.donors[0].totalDonated).toBe(6000);
    expect(data.donors[0].bibleCount).toBe(4);
    expect(data.donors[0].donations).toHaveLength(2);
  });

  it("sorts by totalDonated descending", async () => {
    mockPrisma.user.findMany.mockResolvedValue([
      {
        id: "user-1", name: "Low", email: "low@test.com", createdAt: new Date(),
        donations: [{ id: "d1", amount: 1500, quantity: 1, status: "completed", createdAt: new Date() }],
      },
      {
        id: "user-2", name: "High", email: "high@test.com", createdAt: new Date(),
        donations: [{ id: "d2", amount: 9000, quantity: 6, status: "completed", createdAt: new Date() }],
      },
    ]);

    const req = new NextRequest("http://localhost/api/admin/donors?sortBy=totalDonated&sortOrder=desc");
    const response = await GET(req);
    const data = await response.json();

    expect(data.donors[0].name).toBe("High");
    expect(data.donors[1].name).toBe("Low");
  });

  it("sorts by bibleCount ascending", async () => {
    mockPrisma.user.findMany.mockResolvedValue([
      {
        id: "user-1", name: "Many", email: "many@test.com", createdAt: new Date(),
        donations: [{ id: "d1", amount: 6000, quantity: 4, status: "completed", createdAt: new Date() }],
      },
      {
        id: "user-2", name: "Few", email: "few@test.com", createdAt: new Date(),
        donations: [{ id: "d2", amount: 1500, quantity: 1, status: "completed", createdAt: new Date() }],
      },
    ]);

    const req = new NextRequest("http://localhost/api/admin/donors?sortBy=bibleCount&sortOrder=asc");
    const response = await GET(req);
    const data = await response.json();

    expect(data.donors[0].name).toBe("Few");
    expect(data.donors[1].name).toBe("Many");
  });
});
```

---

## Test 3.6: Admin Queue API
**File**: `__tests__/api/admin-queue.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockRequireAdmin = vi.fn();
vi.mock("@/lib/admin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

const mockSendFulfillmentEmail = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/email", () => ({
  sendFulfillmentEmail: (...args: any[]) => mockSendFulfillmentEmail(...args),
}));

const mockPrisma = {
  bibleDrop: {
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
  },
};
vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import { GET, PATCH } from "@/app/api/admin/queue/route";

describe("GET /api/admin/queue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ authorized: true, userId: "admin-1" });
  });

  it("returns only pending bible drops", async () => {
    const mockItems = [
      {
        id: "drop-1",
        donationId: "don-1",
        trackingNumber: null,
        status: "pending",
        createdAt: new Date().toISOString(),
        address: { name: "John Doe", line1: "123 Main St", line2: null, city: "Austin", state: "TX", zip: "78701" },
        donation: { user: { name: "Donor", email: "donor@test.com" } },
      },
    ];
    mockPrisma.bibleDrop.findMany.mockResolvedValue(mockItems);
    mockPrisma.bibleDrop.count.mockResolvedValue(1);

    const response = await GET();
    const data = await response.json();

    expect(data.items).toHaveLength(1);
    expect(data.total).toBe(1);
    expect(data.items[0].status).toBe("pending");
  });

  it("orders by createdAt ascending (oldest first)", async () => {
    mockPrisma.bibleDrop.findMany.mockResolvedValue([]);
    mockPrisma.bibleDrop.count.mockResolvedValue(0);

    await GET();

    expect(mockPrisma.bibleDrop.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: "asc" },
      })
    );
  });
});

describe("PATCH /api/admin/queue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ authorized: true, userId: "admin-1" });
  });

  it("marks item as shipped with tracking number", async () => {
    const updatedDrop = {
      id: "drop-1",
      status: "shipped",
      trackingNumber: "TRACK123",
      shippedAt: new Date(),
      deliveredAt: null,
      address: { city: "Austin", state: "TX" },
      donation: { user: { name: "Donor", email: "donor@test.com" } },
    };
    mockPrisma.bibleDrop.update.mockResolvedValue(updatedDrop);

    const req = new NextRequest("http://localhost/api/admin/queue", {
      method: "PATCH",
      body: JSON.stringify({ id: "drop-1", status: "shipped", trackingNumber: "TRACK123" }),
    });

    const response = await PATCH(req);
    const data = await response.json();

    expect(data.status).toBe("shipped");
    expect(data.trackingNumber).toBe("TRACK123");
    expect(mockSendFulfillmentEmail).not.toHaveBeenCalled();
  });

  it("marks item as delivered and sends email", async () => {
    const updatedDrop = {
      id: "drop-1",
      status: "delivered",
      trackingNumber: "TRACK123",
      shippedAt: new Date(),
      deliveredAt: new Date(),
      address: { city: "Austin", state: "TX" },
      donation: { user: { name: "Donor", email: "donor@test.com" } },
    };
    mockPrisma.bibleDrop.update.mockResolvedValue(updatedDrop);

    const req = new NextRequest("http://localhost/api/admin/queue", {
      method: "PATCH",
      body: JSON.stringify({ id: "drop-1", status: "delivered" }),
    });

    const response = await PATCH(req);
    const data = await response.json();

    expect(data.status).toBe("delivered");
    expect(mockSendFulfillmentEmail).toHaveBeenCalledWith({
      donorEmail: "donor@test.com",
      donorName: "Donor",
      city: "Austin",
      state: "TX",
      trackingNumber: "TRACK123",
    });
  });

  it("returns 400 for invalid status", async () => {
    const req = new NextRequest("http://localhost/api/admin/queue", {
      method: "PATCH",
      body: JSON.stringify({ id: "drop-1", status: "invalid" }),
    });

    const response = await PATCH(req);
    expect(response.status).toBe(400);
  });

  it("returns 400 when shipping without tracking number", async () => {
    const req = new NextRequest("http://localhost/api/admin/queue", {
      method: "PATCH",
      body: JSON.stringify({ id: "drop-1", status: "shipped" }),
    });

    const response = await PATCH(req);
    expect(response.status).toBe(400);
  });

  it("does not fail request when email sending fails", async () => {
    mockSendFulfillmentEmail.mockRejectedValueOnce(new Error("SMTP error"));
    const updatedDrop = {
      id: "drop-1",
      status: "delivered",
      trackingNumber: null,
      shippedAt: null,
      deliveredAt: new Date(),
      address: { city: "Dallas", state: "TX" },
      donation: { user: { name: "Donor", email: "donor@test.com" } },
    };
    mockPrisma.bibleDrop.update.mockResolvedValue(updatedDrop);

    const req = new NextRequest("http://localhost/api/admin/queue", {
      method: "PATCH",
      body: JSON.stringify({ id: "drop-1", status: "delivered" }),
    });

    const response = await PATCH(req);
    expect(response.status).toBe(200);
  });
});
```

---

## Test 3.7: StatsCard Component
**File**: `__tests__/components/StatsCard.test.tsx`

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatsCard } from "@/components/admin/StatsCard";

describe("StatsCard", () => {
  it("renders title and value", () => {
    render(<StatsCard title="Total Bibles" value={42} color="purple" />);
    expect(screen.getByText("Total Bibles")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("renders subtitle when provided", () => {
    render(<StatsCard title="Revenue" value="$630" subtitle="this month" color="green" />);
    expect(screen.getByText("this month")).toBeInTheDocument();
  });

  it("applies correct color classes for purple", () => {
    const { container } = render(<StatsCard title="Test" value={1} color="purple" />);
    expect(container.querySelector(".bg-accent-lavender")).toBeTruthy();
  });

  it("applies correct color classes for orange", () => {
    const { container } = render(<StatsCard title="Test" value={1} color="orange" />);
    expect(container.innerHTML).toContain("FFF4E0");
  });
});
```

---

## Test 3.8: StatusBadge Component
**File**: `__tests__/components/StatusBadge.test.tsx`

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "@/components/admin/StatusBadge";

describe("StatusBadge", () => {
  it("renders pending status with yellow styling", () => {
    const { container } = render(<StatusBadge status="pending" />);
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(container.firstChild).toHaveClass("bg-yellow-100", "text-yellow-700");
  });

  it("renders shipped status with blue styling", () => {
    const { container } = render(<StatusBadge status="shipped" />);
    expect(screen.getByText("Shipped")).toBeInTheDocument();
    expect(container.firstChild).toHaveClass("bg-blue-100", "text-blue-700");
  });

  it("renders delivered status with green styling", () => {
    const { container } = render(<StatusBadge status="delivered" />);
    expect(screen.getByText("Delivered")).toBeInTheDocument();
    expect(container.firstChild).toHaveClass("bg-green-100", "text-green-700");
  });
});
```

---

## Test 3.9: AdminSidebar Component
**File**: `__tests__/components/AdminSidebar.test.tsx`

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Override usePathname for this test
vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/shipments",
  useRouter: () => ({ push: vi.fn() }),
}));

import { AdminSidebar } from "@/components/admin/AdminSidebar";

describe("AdminSidebar", () => {
  it("renders all navigation items", () => {
    render(<AdminSidebar />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Shipments")).toBeInTheDocument();
    expect(screen.getByText("Donors")).toBeInTheDocument();
    expect(screen.getByText("Queue")).toBeInTheDocument();
  });

  it("renders back to site link", () => {
    render(<AdminSidebar />);
    const backLink = screen.getByText(/Back to Site/i);
    expect(backLink).toBeInTheDocument();
  });

  it("renders GospelDrop Admin branding", () => {
    render(<AdminSidebar />);
    expect(screen.getByText(/GospelDrop/)).toBeInTheDocument();
  });
});
```

---

## Test 3.10: ShipmentsTable Component
**File**: `__tests__/components/ShipmentsTable.test.tsx`

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ShipmentsTable } from "@/components/admin/ShipmentsTable";

const mockShipments = [
  {
    id: "drop-1",
    donationId: "don-1",
    trackingNumber: "TRACK123",
    status: "shipped",
    shippedAt: "2026-03-01T00:00:00.000Z",
    deliveredAt: null,
    createdAt: "2026-02-28T00:00:00.000Z",
    address: { city: "Austin", state: "TX" },
    donation: { user: { name: "John", email: "john@test.com" } },
  },
  {
    id: "drop-2",
    donationId: "don-2",
    trackingNumber: null,
    status: "pending",
    shippedAt: null,
    deliveredAt: null,
    createdAt: "2026-03-01T00:00:00.000Z",
    address: { city: "Portland", state: "OR" },
    donation: { user: { name: "Jane", email: "jane@test.com" } },
  },
];

describe("ShipmentsTable", () => {
  const defaultProps = {
    shipments: mockShipments,
    total: 2,
    page: 1,
    pageSize: 20,
    sortBy: "createdAt",
    sortOrder: "desc" as const,
    onSort: vi.fn(),
    onPageChange: vi.fn(),
  };

  it("renders all shipment rows", () => {
    render(<ShipmentsTable {...defaultProps} />);
    expect(screen.getByText("Austin, TX")).toBeInTheDocument();
    expect(screen.getByText("Portland, OR")).toBeInTheDocument();
  });

  it("displays tracking numbers", () => {
    render(<ShipmentsTable {...defaultProps} />);
    expect(screen.getByText("TRACK123")).toBeInTheDocument();
  });

  it("displays donor names", () => {
    render(<ShipmentsTable {...defaultProps} />);
    expect(screen.getByText("John")).toBeInTheDocument();
    expect(screen.getByText("Jane")).toBeInTheDocument();
  });

  it("calls onSort when sortable column header clicked", () => {
    const onSort = vi.fn();
    render(<ShipmentsTable {...defaultProps} onSort={onSort} />);
    const statusHeader = screen.getByText("Status");
    fireEvent.click(statusHeader);
    expect(onSort).toHaveBeenCalledWith("status");
  });

  it("shows pagination controls", () => {
    render(<ShipmentsTable {...defaultProps} total={50} />);
    expect(screen.getByText(/Page 1/)).toBeInTheDocument();
  });
});
```

---

## Test 3.11: DonorsTable Component
**File**: `__tests__/components/DonorsTable.test.tsx`

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DonorsTable } from "@/components/admin/DonorsTable";

const mockDonors = [
  {
    id: "user-1",
    name: "Alice",
    email: "alice@test.com",
    createdAt: "2026-01-15T00:00:00.000Z",
    totalDonated: 6000,
    bibleCount: 4,
    donations: [
      { id: "d1", amount: 1500, quantity: 1, status: "completed", createdAt: "2026-01-20T00:00:00.000Z" },
      { id: "d2", amount: 4500, quantity: 3, status: "completed", createdAt: "2026-02-10T00:00:00.000Z" },
    ],
  },
];

describe("DonorsTable", () => {
  const defaultProps = {
    donors: mockDonors,
    sortBy: "createdAt",
    sortOrder: "desc" as const,
    onSort: vi.fn(),
  };

  it("renders donor name and email", () => {
    render(<DonorsTable {...defaultProps} />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("alice@test.com")).toBeInTheDocument();
  });

  it("renders formatted total donated", () => {
    render(<DonorsTable {...defaultProps} />);
    expect(screen.getByText("$60.00")).toBeInTheDocument();
  });

  it("renders bible count", () => {
    render(<DonorsTable {...defaultProps} />);
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("expands to show donation history on row click", () => {
    render(<DonorsTable {...defaultProps} />);
    const row = screen.getByText("Alice");
    fireEvent.click(row);
    // After expanding, individual donation amounts should be visible
    expect(screen.getByText("$15.00")).toBeInTheDocument();
    expect(screen.getByText("$45.00")).toBeInTheDocument();
  });

  it("calls onSort when sortable column header clicked", () => {
    const onSort = vi.fn();
    render(<DonorsTable {...defaultProps} onSort={onSort} />);
    fireEvent.click(screen.getByText("Total Donated"));
    expect(onSort).toHaveBeenCalledWith("totalDonated");
  });
});
```

---

## Test 3.12: QueueList Component
**File**: `__tests__/components/QueueList.test.tsx`

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueueList } from "@/components/admin/QueueList";

const mockItems = [
  {
    id: "drop-1",
    donationId: "don-1",
    trackingNumber: null,
    status: "pending",
    createdAt: "2026-03-01T00:00:00.000Z",
    address: { name: "John Doe", line1: "123 Main St", line2: null, city: "Austin", state: "TX", zip: "78701" },
    donation: { user: { name: "Donor Jane", email: "jane@test.com" } },
  },
  {
    id: "drop-2",
    donationId: "don-2",
    trackingNumber: null,
    status: "pending",
    createdAt: "2026-03-02T00:00:00.000Z",
    address: { name: "Bob Smith", line1: "456 Oak Ave", line2: "Apt 2", city: "Portland", state: "OR", zip: "97201" },
    donation: { user: { name: "Donor Bob", email: "bob@test.com" } },
  },
];

describe("QueueList", () => {
  const defaultProps = {
    items: mockItems,
    onUpdateStatus: vi.fn(),
    onBulkUpdate: vi.fn(),
  };

  it("renders all queue items", () => {
    render(<QueueList {...defaultProps} />);
    expect(screen.getByText("123 Main St")).toBeInTheDocument();
    expect(screen.getByText("456 Oak Ave")).toBeInTheDocument();
  });

  it("renders recipient addresses", () => {
    render(<QueueList {...defaultProps} />);
    expect(screen.getByText("Austin, TX 78701")).toBeInTheDocument();
  });

  it("renders donor information", () => {
    render(<QueueList {...defaultProps} />);
    expect(screen.getByText("Donor Jane")).toBeInTheDocument();
  });

  it("has tracking number input fields", () => {
    render(<QueueList {...defaultProps} />);
    const inputs = screen.getAllByPlaceholderText(/tracking/i);
    expect(inputs).toHaveLength(2);
  });

  it("has ship and deliver action buttons per item", () => {
    render(<QueueList {...defaultProps} />);
    const shipButtons = screen.getAllByText(/Ship/i);
    expect(shipButtons.length).toBeGreaterThanOrEqual(2);
  });

  it("supports select all checkbox", () => {
    render(<QueueList {...defaultProps} />);
    const selectAll = screen.getByRole("checkbox", { name: /select all/i });
    fireEvent.click(selectAll);
    const checkboxes = screen.getAllByRole("checkbox");
    // All checkboxes should be checked (selectAll + 2 items)
    checkboxes.forEach((cb) => expect(cb).toBeChecked());
  });

  it("shows bulk action buttons when items are selected", () => {
    render(<QueueList {...defaultProps} />);
    const selectAll = screen.getByRole("checkbox", { name: /select all/i });
    fireEvent.click(selectAll);
    expect(screen.getByText(/2 selected/i)).toBeInTheDocument();
  });
});
```

---

## File Ownership Summary
All files in this task belong to **Team 3 only**:
- `vitest.config.ts` (new)
- `__tests__/setup.ts` (new)
- `__tests__/lib/admin.test.ts` (new)
- `__tests__/lib/email.test.ts` (new)
- `__tests__/api/admin-stats.test.ts` (new)
- `__tests__/api/admin-shipments.test.ts` (new)
- `__tests__/api/admin-donors.test.ts` (new)
- `__tests__/api/admin-queue.test.ts` (new)
- `__tests__/components/StatsCard.test.tsx` (new)
- `__tests__/components/StatusBadge.test.tsx` (new)
- `__tests__/components/AdminSidebar.test.tsx` (new)
- `__tests__/components/ShipmentsTable.test.tsx` (new)
- `__tests__/components/DonorsTable.test.tsx` (new)
- `__tests__/components/QueueList.test.tsx` (new)
- `package.json` (modify — add test scripts)

## Running Tests
```bash
npm run test:run
```
All tests should FAIL initially (TDD red phase). Teams 1 & 2 make them green.
