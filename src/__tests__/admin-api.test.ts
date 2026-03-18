import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock nodemailer to prevent real SMTP connections
vi.mock("nodemailer", () => ({
  default: {
    createTransport: () => ({ sendMail: vi.fn().mockResolvedValue(true) }),
  },
}));

// Mock email service
vi.mock("@/lib/email", () => ({
  sendFulfillmentEmail: vi.fn().mockResolvedValue(undefined),
}));

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    bibleDrop: {
      count: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    donation: {
      aggregate: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
  },
}));

// Mock adminAuth
vi.mock("@/lib/adminAuth", () => ({
  requireAdmin: vi.fn().mockResolvedValue({ session: { user: { id: "admin-1", isAdmin: true } } }),
}));

// Mock next/server
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return {
    ...actual,
    NextResponse: {
      json: (body: any, init?: { status?: number }) => ({
        json: async () => body,
        status: init?.status || 200,
        body,
      }),
    },
  };
});

describe("Admin Stats API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns stats with all required fields", async () => {
    const { prisma } = await import("@/lib/prisma");

    (prisma.bibleDrop.count as any)
      .mockResolvedValueOnce(42)  // totalBiblesSent
      .mockResolvedValueOnce(5);  // pendingOrders

    (prisma.donation.aggregate as any).mockResolvedValueOnce({ _sum: { amount: 50000 } });

    (prisma.bibleDrop.count as any).mockResolvedValueOnce(12); // fulfilledThisMonth

    (prisma.bibleDrop.findMany as any).mockResolvedValueOnce([]);

    const { GET } = await import("@/app/api/admin/stats/route");
    const response = await GET();
    const data = (response as any).body;

    expect(data.totalBiblesSent).toBe(42);
    expect(data.pendingOrders).toBe(5);
    expect(data.totalDonationsAmount).toBe(50000);
    expect(data).toHaveProperty("fulfilledThisMonth");
    expect(data).toHaveProperty("recentShipments");
  });

  it("returns zero for totalDonationsAmount when no donations", async () => {
    const { prisma } = await import("@/lib/prisma");

    (prisma.bibleDrop.count as any)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    (prisma.donation.aggregate as any).mockResolvedValueOnce({ _sum: { amount: null } });
    (prisma.bibleDrop.findMany as any).mockResolvedValueOnce([]);

    const { GET } = await import("@/app/api/admin/stats/route");
    const response = await GET();
    const data = (response as any).body;

    expect(data.totalDonationsAmount).toBe(0);
  });
});

describe("Admin Shipments API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns list of shipments", async () => {
    const { prisma } = await import("@/lib/prisma");

    const mockShipments = [
      {
        id: "ship-1",
        status: "pending",
        createdAt: new Date(),
        address: { name: "John Doe", city: "Atlanta", state: "GA" },
        donation: { quantity: 2, user: { name: "Donor A", email: "a@test.com" } },
      },
    ];

    (prisma.bibleDrop.findMany as any).mockResolvedValueOnce(mockShipments);

    const { GET } = await import("@/app/api/admin/shipments/route");
    const url = new URL("http://localhost/api/admin/shipments");
    const req = { url: url.toString() } as any;
    const response = await GET(req);
    const data = (response as any).body;

    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(1);
    expect(data[0].status).toBe("pending");
  });

  it("updates shipment status and sets shippedAt when status is shipped", async () => {
    const { prisma } = await import("@/lib/prisma");

    const updated = {
      id: "ship-1",
      status: "shipped",
      shippedAt: new Date(),
      trackingNumber: "TRK123",
      address: { name: "John" },
      donation: { user: { email: "a@test.com" } },
    };

    (prisma.bibleDrop.update as any).mockResolvedValueOnce(updated);

    const { PATCH } = await import("@/app/api/admin/shipments/route");
    const req = {
      json: async () => ({ id: "ship-1", status: "shipped", trackingNumber: "TRK123" }),
    } as any;

    const response = await PATCH(req);
    const data = (response as any).body;

    expect(data.status).toBe("shipped");
    expect(data.trackingNumber).toBe("TRK123");

    const updateCall = (prisma.bibleDrop.update as any).mock.calls[0][0];
    expect(updateCall.data.status).toBe("shipped");
    expect(updateCall.data.shippedAt).toBeInstanceOf(Date);
  });
});

describe("Admin Donors API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns donors with computed stats", async () => {
    const { prisma } = await import("@/lib/prisma");

    const mockDonors = [
      {
        id: "user-1",
        name: "Jane Doe",
        email: "jane@test.com",
        createdAt: new Date(),
        donations: [
          {
            id: "don-1",
            amount: 2500,
            quantity: 5,
            status: "completed",
            createdAt: new Date(),
            bibleDrops: [{ id: "b-1", status: "delivered" }],
          },
          {
            id: "don-2",
            amount: 1000,
            quantity: 2,
            status: "completed",
            createdAt: new Date(),
            bibleDrops: [],
          },
        ],
      },
    ];

    (prisma.user.findMany as any).mockResolvedValueOnce(mockDonors);

    const { GET } = await import("@/app/api/admin/donors/route");
    const response = await GET();
    const data = (response as any).body;

    expect(Array.isArray(data)).toBe(true);
    expect(data[0].totalDonated).toBe(3500);
    expect(data[0].bibleCount).toBe(7);
    expect(data[0].donationCount).toBe(2);
  });
});

describe("Admin Queue API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns only pending items", async () => {
    const { prisma } = await import("@/lib/prisma");

    const mockQueue = [
      {
        id: "drop-1",
        status: "pending",
        createdAt: new Date(),
        address: { name: "Alice", city: "NY", state: "NY" },
        donation: { quantity: 1, user: { name: "Bob", email: "bob@test.com" } },
      },
    ];

    (prisma.bibleDrop.findMany as any).mockResolvedValueOnce(mockQueue);

    const { GET } = await import("@/app/api/admin/queue/route");
    const response = await GET();
    const data = (response as any).body;

    expect(Array.isArray(data)).toBe(true);
    expect(data.every((item: any) => item.status === "pending")).toBe(true);

    const call = (prisma.bibleDrop.findMany as any).mock.calls[0][0];
    expect(call.where.status).toBe("pending");
  });

  it("fulfills an order and marks as shipped", async () => {
    const { prisma } = await import("@/lib/prisma");

    const fulfilled = {
      id: "drop-1",
      status: "shipped",
      shippedAt: new Date(),
      trackingNumber: "TRACK123",
      address: { name: "Alice", city: "NY", state: "NY", zip: "10001", line1: "123 Main St" },
      donation: {
        quantity: 1,
        user: { name: "Bob", email: "bob@test.com" },
      },
    };

    (prisma.bibleDrop.update as any).mockResolvedValueOnce(fulfilled);

    const { POST } = await import("@/app/api/admin/queue/route");
    const req = {
      json: async () => ({ id: "drop-1", trackingNumber: "TRACK123" }),
    } as any;

    const response = await POST(req);
    const data = (response as any).body;

    expect(data.status).toBe("shipped");
    expect(data.trackingNumber).toBe("TRACK123");

    const updateCall = (prisma.bibleDrop.update as any).mock.calls[0][0];
    expect(updateCall.data.status).toBe("shipped");
    expect(updateCall.data.shippedAt).toBeInstanceOf(Date);
  });
});

describe("Email service", () => {
  it("sendFulfillmentEmail is a callable function", async () => {
    // Verify the module exports a callable function
    const { sendFulfillmentEmail } = await import("@/lib/email");
    expect(sendFulfillmentEmail).toBeTypeOf("function");
  });
});
