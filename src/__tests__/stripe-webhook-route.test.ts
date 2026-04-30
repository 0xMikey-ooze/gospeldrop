import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  constructEventMock,
  findFirstMock,
  createMock,
} = vi.hoisted(() => ({
  constructEventMock: vi.fn(),
  findFirstMock: vi.fn(),
  createMock: vi.fn(),
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
      findFirst: findFirstMock,
      create: createMock,
    },
  },
}));

import { POST } from "@/app/api/stripe/webhook/route";

describe("POST /api/stripe/webhook", () => {
  beforeEach(() => {
    constructEventMock.mockReset();
    findFirstMock.mockReset();
    createMock.mockReset();
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
    findFirstMock.mockResolvedValue(null);
    createMock.mockResolvedValue({ id: "donation_123" });

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
    expect(findFirstMock).toHaveBeenCalledWith({
      where: { stripeSessionId: "cs_test_123" },
    });
    expect(createMock).toHaveBeenCalledWith({
      data: {
        userId: "user_123",
        amount: 4500,
        quantity: 3,
        stripeSessionId: "cs_test_123",
        status: "pending",
      },
    });
  });

  it("does not create a duplicate donation when Stripe retries the webhook", async () => {
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
    findFirstMock.mockResolvedValue({ id: "donation_existing" });

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
    expect(createMock).not.toHaveBeenCalled();
  });
});
