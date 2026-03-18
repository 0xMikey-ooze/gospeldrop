/**
 * Tests for GET /api/admin/shipments
 * Returns paginated, sortable list of BibleDrop shipments with status, tracking, address.
 * Also tests PATCH /api/admin/shipments/[id] for status updates.
 */
import { NextRequest } from "next/server";
import { GET } from "@/app/api/admin/shipments/route";
import { PATCH } from "@/app/api/admin/shipments/[id]/route";

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    bibleDrop: {
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth", () => ({ authOptions: {} }));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockFindMany = prisma.bibleDrop.findMany as jest.MockedFunction<typeof prisma.bibleDrop.findMany>;
const mockCount = prisma.bibleDrop.count as jest.MockedFunction<typeof prisma.bibleDrop.count>;
const mockUpdate = prisma.bibleDrop.update as jest.MockedFunction<typeof prisma.bibleDrop.update>;

const ADMIN_SESSION = {
  user: { id: "u1", email: "admin@example.com", role: "admin" },
  expires: "",
};

const SAMPLE_SHIPMENTS = [
  {
    id: "bd1",
    status: "pending",
    trackingNumber: null,
    shippedAt: null,
    deliveredAt: null,
    createdAt: new Date("2026-03-01"),
    donation: { id: "d1", amount: 1500, user: { id: "u1", email: "alice@example.com", name: "Alice" } },
    address: { id: "a1", name: "Bob Smith", line1: "123 Main St", city: "Dallas", state: "TX", zip: "75201" },
  },
  {
    id: "bd2",
    status: "shipped",
    trackingNumber: "1Z999AA10123456784",
    shippedAt: new Date("2026-03-10"),
    deliveredAt: null,
    createdAt: new Date("2026-03-05"),
    donation: { id: "d2", amount: 1500, user: { id: "u2", email: "carol@example.com", name: "Carol" } },
    address: { id: "a2", name: "Dave Jones", line1: "456 Elm St", city: "Austin", state: "TX", zip: "78701" },
  },
];

describe("GET /api/admin/shipments", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 for unauthenticated requests", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/admin/shipments");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin users", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "u2", email: "user@example.com", role: "user" },
      expires: "",
    });
    const req = new NextRequest("http://localhost/api/admin/shipments");
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it("returns shipments list with pagination metadata", async () => {
    mockGetServerSession.mockResolvedValue(ADMIN_SESSION);
    mockFindMany.mockResolvedValue(SAMPLE_SHIPMENTS as any);
    mockCount.mockResolvedValue(2);

    const req = new NextRequest("http://localhost/api/admin/shipments?page=1&limit=20");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.shipments).toHaveLength(2);
    expect(body.total).toBe(2);
    expect(body.page).toBe(1);
    expect(body.shipments[0]).toMatchObject({ id: "bd1", status: "pending" });
  });

  it("supports sorting by createdAt asc", async () => {
    mockGetServerSession.mockResolvedValue(ADMIN_SESSION);
    mockFindMany.mockResolvedValue(SAMPLE_SHIPMENTS as any);
    mockCount.mockResolvedValue(2);

    const req = new NextRequest("http://localhost/api/admin/shipments?sort=createdAt&order=asc");
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: "asc" },
      })
    );
  });

  it("supports sorting by status", async () => {
    mockGetServerSession.mockResolvedValue(ADMIN_SESSION);
    mockFindMany.mockResolvedValue(SAMPLE_SHIPMENTS as any);
    mockCount.mockResolvedValue(2);

    const req = new NextRequest("http://localhost/api/admin/shipments?sort=status&order=desc");
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { status: "desc" },
      })
    );
  });

  it("filters by status query param", async () => {
    mockGetServerSession.mockResolvedValue(ADMIN_SESSION);
    mockFindMany.mockResolvedValue([SAMPLE_SHIPMENTS[0]] as any);
    mockCount.mockResolvedValue(1);

    const req = new NextRequest("http://localhost/api/admin/shipments?status=pending");
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "pending" },
      })
    );
  });
});

describe("PATCH /api/admin/shipments/[id]", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 for unauthenticated requests", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/admin/shipments/bd1", {
      method: "PATCH",
      body: JSON.stringify({ status: "shipped", trackingNumber: "ABC123" }),
    });
    const res = await PATCH(req, { params: { id: "bd1" } });
    expect(res.status).toBe(401);
  });

  it("updates shipment status and tracking number", async () => {
    mockGetServerSession.mockResolvedValue(ADMIN_SESSION);
    const updated = { ...SAMPLE_SHIPMENTS[0], status: "shipped", trackingNumber: "ABC123" };
    mockUpdate.mockResolvedValue(updated as any);

    const req = new NextRequest("http://localhost/api/admin/shipments/bd1", {
      method: "PATCH",
      body: JSON.stringify({ status: "shipped", trackingNumber: "ABC123" }),
    });
    const res = await PATCH(req, { params: { id: "bd1" } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("shipped");
    expect(body.trackingNumber).toBe("ABC123");
  });

  it("rejects invalid status values", async () => {
    mockGetServerSession.mockResolvedValue(ADMIN_SESSION);
    const req = new NextRequest("http://localhost/api/admin/shipments/bd1", {
      method: "PATCH",
      body: JSON.stringify({ status: "not-a-valid-status" }),
    });
    const res = await PATCH(req, { params: { id: "bd1" } });
    expect(res.status).toBe(400);
  });
});
