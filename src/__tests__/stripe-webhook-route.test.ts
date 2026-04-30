import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  constructEventMock,
  upsertMock,
  findManyMock,
  updateManyMock,
  createManyMock,
} = vi.hoisted(() => ({
  constructEventMock: vi.fn(),
  upsertMock: vi.fn(),
  findManyMock: vi.fn(),
  updateManyMock: vi.fn(),
  createManyMock: vi.fn(),
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: {
      constructEvent: constructEventMock,
    },
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    donation: {
      upsert: upsertMock,
    },
    address: {
      findMany: findManyMock,
      updateMany: updateManyMock,
    },
    bibleDrop: {
      createMany: createManyMock,
    },
  },
}));

import { POST } from "@/app/api/stripe/webhook/route";

describe("POST /api/stripe/webhook", () => {
  beforeEach(() => {
    constructEventMock.mockReset();
    upsertMock.mockReset();
    findManyMock.mockReset();
    updateManyMock.mockReset();
    createManyMock.mockReset();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  });

  it("persists a donation for checkout.session.completed events", async () => {
    constructEventMock.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_123",
          amount_total: 4500,
          metadata: {
            userId: "user_123",
            quantity: "3",
          },
        },
      },
    });
    upsertMock.mockResolvedValue({ id: "donation_123" });
    findManyMock.mockResolvedValue([
      { id: "addr_1" },
      { id: "addr_2" },
      { id: "addr_3" },
    ]);
    updateManyMock.mockResolvedValue({ count: 3 });
    createManyMock.mockResolvedValue({ count: 3 });

    const response = await POST(
      new Request("http://localhost/api/stripe/webhook", {
        method: "POST",
        headers: {
          "stripe-signature": "sig_test",
        },
        body: JSON.stringify({ id: "evt_123" }),
      })
    );

    expect(response.status).toBe(200);
    expect(constructEventMock).toHaveBeenCalledWith(
      JSON.stringify({ id: "evt_123" }),
      "sig_test",
      "whsec_test"
    );
    expect(upsertMock).toHaveBeenCalledWith({
      where: { stripeSessionId: "cs_test_123" },
      update: {
        amount: 4500,
        quantity: 3,
        status: "completed",
      },
      create: {
        stripeSessionId: "cs_test_123",
        userId: "user_123",
        amount: 4500,
        quantity: 3,
        status: "completed",
      },
    });
    expect(findManyMock).toHaveBeenCalledWith({
      where: { hasReceived: false },
      orderBy: { createdAt: "asc" },
      take: 3,
      select: { id: true },
    });
    expect(createManyMock).toHaveBeenCalledWith({
      data: [
        { donationId: "donation_123", addressId: "addr_1", status: "pending" },
        { donationId: "donation_123", addressId: "addr_2", status: "pending" },
        { donationId: "donation_123", addressId: "addr_3", status: "pending" },
      ],
      skipDuplicates: true,
    });
    expect(updateManyMock).toHaveBeenCalledWith({
      where: { id: { in: ["addr_1", "addr_2", "addr_3"] } },
      data: { hasReceived: true },
    });
  });

  it("uses an idempotent upsert when Stripe retries the webhook", async () => {
    constructEventMock.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_123",
          amount_total: 1500,
          metadata: {
            userId: "user_123",
            quantity: "1",
          },
        },
      },
    });
    upsertMock.mockResolvedValue({ id: "donation_existing" });
    findManyMock.mockResolvedValue([]);

    const response = await POST(
      new Request("http://localhost/api/stripe/webhook", {
        method: "POST",
        headers: {
          "stripe-signature": "sig_test",
        },
        body: JSON.stringify({ id: "evt_retry" }),
      })
    );

    expect(response.status).toBe(200);
    expect(upsertMock).toHaveBeenCalledOnce();
    expect(createManyMock).not.toHaveBeenCalled();
    expect(updateManyMock).not.toHaveBeenCalled();
  });
});
