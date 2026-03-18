/**
 * Tests for GET /api/admin/queue
 * Bible request queue: pending BibleDrops awaiting address assignment / fulfillment.
 * Also tests POST /api/admin/queue/fulfill for marking items fulfilled.
 */
import { NextRequest } from "next/server";
import { GET } from "@/app/api/admin/queue/route";
import { POST as FULFILL } from "@/app/api/admin/queue/fulfill/route";

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    bibleDrop: {
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    address: {
      findFirst: jest.fn(),
    },
  },
}));

jest.mock("@/lib/auth", () => ({ authOptions: {} }));
jest.mock("@/lib/email", () => ({
  sendFulfillmentEmail: jest.fn(),
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { sendFulfillmentEmail } from "@/lib/email";

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockFindMany = prisma.bibleDrop.findMany as jest.MockedFunction<typeof prisma.bibleDrop.findMany>;
const mockCount = prisma.bibleDrop.count as jest.MockedFunction<typeof prisma.bibleDrop.count>;
const mockUpdate = prisma.bibleDrop.update as jest.MockedFunction<typeof prisma.bibleDrop.update>;
const mockSendFulfillmentEmail = sendFulfillmentEmail as jest.MockedFunction<typeof sendFulfillmentEmail>;

const ADMIN_SESSION = {
  user: { id: "u1", email: "admin@example.com", role: "admin" },
  expires: "",
};

const PENDING_DROPS = [
  {
    id: "bd1",
    status: "pending",
    trackingNumber: null,
    createdAt: new Date("2026-03-01"),
    donation: {
      id: "d1",
      amount: 1500,
      quantity: 1,
      user: { id: "u1", email: "alice@example.com", name: "Alice" },
    },
    address: {
      id: "a1",
      name: "Bob Smith",
      line1: "123 Main St",
      city: "Dallas",
      state: "TX",
      zip: "75201",
    },
  },
];

describe("GET /api/admin/queue", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 for unauthenticated requests", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/admin/queue");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin users", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "u2", email: "user@example.com", role: "user" },
      expires: "",
    });
    const req = new NextRequest("http://localhost/api/admin/queue");
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it("returns pending BibleDrops with full details", async () => {
    mockGetServerSession.mockResolvedValue(ADMIN_SESSION);
    mockFindMany.mockResolvedValue(PENDING_DROPS as any);
    mockCount.mockResolvedValue(1);

    const req = new NextRequest("http://localhost/api/admin/queue");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.queue).toHaveLength(1);
    expect(body.total).toBe(1);
    expect(body.queue[0]).toMatchObject({
      id: "bd1",
      status: "pending",
      address: expect.objectContaining({ city: "Dallas" }),
    });
  });

  it("fetches only pending status by default", async () => {
    mockGetServerSession.mockResolvedValue(ADMIN_SESSION);
    mockFindMany.mockResolvedValue([] as any);
    mockCount.mockResolvedValue(0);

    const req = new NextRequest("http://localhost/api/admin/queue");
    await GET(req);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "pending" }),
      })
    );
  });

  it("supports pagination", async () => {
    mockGetServerSession.mockResolvedValue(ADMIN_SESSION);
    mockFindMany.mockResolvedValue(PENDING_DROPS as any);
    mockCount.mockResolvedValue(10);

    const req = new NextRequest("http://localhost/api/admin/queue?page=2&limit=5");
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 5, take: 5 }));
  });
});

describe("POST /api/admin/queue/fulfill", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 401 for unauthenticated requests", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/api/admin/queue/fulfill", {
      method: "POST",
      body: JSON.stringify({ ids: ["bd1"] }),
    });
    const res = await FULFILL(req);
    expect(res.status).toBe(401);
  });

  it("marks BibleDrops as fulfilled and sends email notifications", async () => {
    mockGetServerSession.mockResolvedValue(ADMIN_SESSION);
    const fulfilledDrop = {
      ...PENDING_DROPS[0],
      status: "fulfilled",
      shippedAt: new Date(),
    };
    mockUpdate.mockResolvedValue(fulfilledDrop as any);
    mockSendFulfillmentEmail.mockResolvedValue(undefined);

    const req = new NextRequest("http://localhost/api/admin/queue/fulfill", {
      method: "POST",
      body: JSON.stringify({ ids: ["bd1"], trackingNumber: "1ZTEST" }),
    });
    const res = await FULFILL(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.fulfilled).toBe(1);
    expect(mockSendFulfillmentEmail).toHaveBeenCalledTimes(1);
  });

  it("returns 400 when ids array is empty", async () => {
    mockGetServerSession.mockResolvedValue(ADMIN_SESSION);
    const req = new NextRequest("http://localhost/api/admin/queue/fulfill", {
      method: "POST",
      body: JSON.stringify({ ids: [] }),
    });
    const res = await FULFILL(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when ids is missing from request body", async () => {
    mockGetServerSession.mockResolvedValue(ADMIN_SESSION);
    const req = new NextRequest("http://localhost/api/admin/queue/fulfill", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await FULFILL(req);
    expect(res.status).toBe(400);
  });

  it("returns partial success count when some updates fail", async () => {
    mockGetServerSession.mockResolvedValue(ADMIN_SESSION);
    mockUpdate
      .mockResolvedValueOnce({ ...PENDING_DROPS[0], status: "fulfilled" } as any)
      .mockRejectedValueOnce(new Error("Not found"));
    mockSendFulfillmentEmail.mockResolvedValue(undefined);

    const req = new NextRequest("http://localhost/api/admin/queue/fulfill", {
      method: "POST",
      body: JSON.stringify({ ids: ["bd1", "bd_missing"] }),
    });
    const res = await FULFILL(req);
    expect(res.status).toBe(207);
    const body = await res.json();
    expect(body.fulfilled).toBe(1);
    expect(body.failed).toBe(1);
  });
});
