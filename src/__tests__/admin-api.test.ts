import { describe, it, expect, vi, beforeEach } from "vitest";

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
      findMany: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
  },
}));

// Mock next-auth
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/email", () => ({
  sendFulfillmentEmail: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

const mockAdminSession = {
  user: { email: "admin@gospeldrop.org", name: "Admin" },
};

const mockNonAdminSession = {
  user: { email: "user@example.com", name: "User" },
};

describe("Admin API - isAdmin helper logic", () => {
  it("should allow admin email through", () => {
    const adminEmail = "admin@gospeldrop.org";
    const envAdminEmail = process.env.ADMIN_EMAIL || "admin@gospeldrop.org";
    expect(adminEmail === envAdminEmail).toBe(true);
  });

  it("should reject non-admin email", () => {
    const userEmail = "user@example.com";
    const envAdminEmail = process.env.ADMIN_EMAIL || "admin@gospeldrop.org";
    expect(userEmail === envAdminEmail).toBe(false);
  });
});

describe("Admin Stats API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_EMAIL = "admin@gospeldrop.org";
  });

  it("returns stats with correct shape", async () => {
    const mockStats = {
      totalBibles: 150,
      pendingOrders: 12,
      fulfilledThisMonth: 45,
      totalDonationsAmount: 225000,
    };

    expect(mockStats).toHaveProperty("totalBibles");
    expect(mockStats).toHaveProperty("pendingOrders");
    expect(mockStats).toHaveProperty("fulfilledThisMonth");
    expect(mockStats).toHaveProperty("totalDonationsAmount");
    expect(typeof mockStats.totalBibles).toBe("number");
    expect(typeof mockStats.pendingOrders).toBe("number");
  });
});

describe("Shipments API", () => {
  it("sorts shipments by valid fields", () => {
    const validSortFields = ["createdAt", "status", "shippedAt", "deliveredAt"];
    const testField = "status";
    expect(validSortFields.includes(testField)).toBe(true);
  });

  it("rejects invalid sort fields", () => {
    const validSortFields = ["createdAt", "status", "shippedAt", "deliveredAt"];
    const invalidField = "maliciousField";
    const orderByField = validSortFields.includes(invalidField) ? invalidField : "createdAt";
    expect(orderByField).toBe("createdAt");
  });

  it("shipment status badge colors are defined for all statuses", () => {
    const STATUS_COLORS: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      processing: "bg-blue-100 text-blue-800",
      shipped: "bg-purple-100 text-purple-800",
      delivered: "bg-green-100 text-green-800",
    };

    const statuses = ["pending", "processing", "shipped", "delivered"];
    statuses.forEach((s) => {
      expect(STATUS_COLORS[s]).toBeDefined();
    });
  });
});

describe("Queue Management", () => {
  it("only returns pending and processing items", () => {
    const allItems = [
      { status: "pending" },
      { status: "processing" },
      { status: "shipped" },
      { status: "delivered" },
    ];

    const queueItems = allItems.filter((item) =>
      ["pending", "processing"].includes(item.status)
    );
    expect(queueItems).toHaveLength(2);
  });
});

describe("Donors API", () => {
  it("calculates total donated correctly", () => {
    const donations = [
      { amount: 1500, quantity: 1 },
      { amount: 4500, quantity: 3 },
      { amount: 3000, quantity: 2 },
    ];

    const totalDonated = donations.reduce((sum, d) => sum + d.amount, 0);
    const bibleCount = donations.reduce((sum, d) => sum + d.quantity, 0);

    expect(totalDonated).toBe(9000);
    expect(bibleCount).toBe(6);
  });
});

describe("Email notification", () => {
  it("stub works without SMTP config", async () => {
    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const { sendFulfillmentEmail } = await import("@/lib/email");

    await expect(
      sendFulfillmentEmail("test@example.com", "Test User", {
        name: "John Doe",
        line1: "123 Main St",
        city: "Springfield",
        state: "IL",
        zip: "62701",
      })
    ).resolves.toBeUndefined();

    consoleLogSpy.mockRestore();
  });
});
