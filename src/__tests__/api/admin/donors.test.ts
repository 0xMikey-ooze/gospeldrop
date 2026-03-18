/**
 * Tests for GET /api/admin/donors
 * Returns list of donors with donation history, total donated (cents), bible count.
 */
import { NextRequest } from "next/server";
import { GET } from "@/app/api/admin/donors/route";

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth", () => ({ authOptions: {} }));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockFindMany = prisma.user.findMany as jest.MockedFunction<typeof prisma.user.findMany>;
const mockCount = prisma.user.count as jest.MockedFunction<typeof prisma.user.count>;

const ADMIN_SESSION = {
  user: { id: "u1", email: "admin@example.com", role: "admin" },
  expires: "",
};

const SAMPLE_DONORS = [
  {
    id: "u1",
    email: "alice@example.com",
    name: "Alice",
    createdAt: new Date("2025-01-15"),
    donations: [
      {
        id: "d1",
        amount: 1500,
        quantity: 1,
        status: "completed",
        createdAt: new Date("2025-01-15"),
        bibleDrops: [{ id: "bd1", status: "delivered" }],
      },
      {
        id: "d2",
        amount: 3000,
        quantity: 2,
        status: "completed",
        createdAt: new Date("2026-02-10"),
        bibleDrops: [
          { id: "bd2", status: "shipped" },
          { id: "bd3", status: "pending" },
        ],
      },
    ],
  },
  {
    id: "u2",
    email: "bob@example.com",
    name: "Bob",
    createdAt: new Date("2025-06-01"),
    donations: [
      {
        id: "d3",
        amount: 1500,
        quantity: 1,
        status: "completed",
        createdAt: new Date("2025-06-01"),
        bibleDrops: [{ id: "bd4", status: "pending" }],
      },
    ],
  },
];

describe("GET /api/admin/donors", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 for unauthenticated requests", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/admin/donors");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin users", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "u2", email: "user@example.com", role: "user" },
      expires: "",
    });
    const req = new NextRequest("http://localhost/api/admin/donors");
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it("returns donors with aggregated totals", async () => {
    mockGetServerSession.mockResolvedValue(ADMIN_SESSION);
    mockFindMany.mockResolvedValue(SAMPLE_DONORS as any);
    mockCount.mockResolvedValue(2);

    const req = new NextRequest("http://localhost/api/admin/donors");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.donors).toHaveLength(2);
    expect(body.total).toBe(2);

    const alice = body.donors.find((d: any) => d.email === "alice@example.com");
    expect(alice).toBeDefined();
    expect(alice.totalDonated).toBe(4500);   // 1500 + 3000
    expect(alice.bibleCount).toBe(3);        // 1 + 2
    expect(alice.donationCount).toBe(2);
  });

  it("includes donation history in each donor", async () => {
    mockGetServerSession.mockResolvedValue(ADMIN_SESSION);
    mockFindMany.mockResolvedValue([SAMPLE_DONORS[0]] as any);
    mockCount.mockResolvedValue(1);

    const req = new NextRequest("http://localhost/api/admin/donors");
    const res = await GET(req);
    const body = await res.json();
    const alice = body.donors[0];
    expect(alice.donations).toHaveLength(2);
    expect(alice.donations[0]).toMatchObject({ id: "d1", amount: 1500, quantity: 1 });
  });

  it("supports pagination", async () => {
    mockGetServerSession.mockResolvedValue(ADMIN_SESSION);
    mockFindMany.mockResolvedValue([SAMPLE_DONORS[0]] as any);
    mockCount.mockResolvedValue(2);

    const req = new NextRequest("http://localhost/api/admin/donors?page=1&limit=1");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.page).toBe(1);
    expect(body.total).toBe(2);
    expect(body.donors).toHaveLength(1);
    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, take: 1 }));
  });

  it("supports search by email", async () => {
    mockGetServerSession.mockResolvedValue(ADMIN_SESSION);
    mockFindMany.mockResolvedValue([SAMPLE_DONORS[0]] as any);
    mockCount.mockResolvedValue(1);

    const req = new NextRequest("http://localhost/api/admin/donors?search=alice");
    await GET(req);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ email: expect.objectContaining({ contains: "alice" }) }),
          ]),
        }),
      })
    );
  });

  it("returns 500 on database error", async () => {
    mockGetServerSession.mockResolvedValue(ADMIN_SESSION);
    mockFindMany.mockRejectedValue(new Error("DB connection lost"));

    const req = new NextRequest("http://localhost/api/admin/donors");
    const res = await GET(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });
});
