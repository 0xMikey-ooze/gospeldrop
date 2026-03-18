/**
 * Tests for GET /api/admin/stats
 * Returns aggregate stats: total Bibles sent, pending orders, fulfilled this month.
 */
import { NextRequest } from "next/server";
import { GET } from "@/app/api/admin/stats/route";

// Mock next-auth session
jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

// Mock prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    bibleDrop: {
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    donation: {
      count: jest.fn(),
      aggregate: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth", () => ({ authOptions: {} }));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockBibleDropCount = prisma.bibleDrop.count as jest.MockedFunction<typeof prisma.bibleDrop.count>;
const mockDonationCount = prisma.donation.count as jest.MockedFunction<typeof prisma.donation.count>;
const mockDonationAggregate = prisma.donation.aggregate as jest.MockedFunction<typeof prisma.donation.aggregate>;

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost/api/admin/stats");
}

describe("GET /api/admin/stats", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("returns 403 when authenticated but not admin", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "u1", email: "user@example.com", role: "user" },
      expires: "",
    });
    const res = await GET(makeRequest());
    expect(res.status).toBe(403);
  });

  it("returns stats object for admin user", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "u1", email: "admin@example.com", role: "admin" },
      expires: "",
    });
    mockBibleDropCount
      .mockResolvedValueOnce(150)  // total sent
      .mockResolvedValueOnce(12)   // fulfilled this month
      .mockResolvedValueOnce(38);  // pending
    mockDonationCount.mockResolvedValue(25);
    mockDonationAggregate.mockResolvedValue({
      _sum: { amount: 50000 },
      _avg: { amount: null },
      _min: { amount: null },
      _max: { amount: null },
      _count: { amount: 25 },
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      totalBiblesSent: 150,
      pendingOrders: 38,
      fulfilledThisMonth: 12,
    });
  });

  it("returns 500 on database error", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "u1", email: "admin@example.com", role: "admin" },
      expires: "",
    });
    mockBibleDropCount.mockRejectedValue(new Error("DB error"));

    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });
});
