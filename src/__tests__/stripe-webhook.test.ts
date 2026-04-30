/**
 * Tests for Stripe webhook handler.
 * Covers checkout.session.completed event, signature verification, and donation creation.
 */

const mockConstructEvent = jest.fn();
const mockCreate = jest.fn();
const mockFindFirst = jest.fn();
const mockDonationCreate = jest.fn();
const mockFindMany = jest.fn();
const mockAddressCreate = jest.fn();
const mockBibleDropCreate = jest.fn();

jest.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: {
      constructEvent: (...args: unknown[]) => mockConstructEvent(...args),
    },
  },
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
    },
    donation: {
      create: (...args: unknown[]) => mockDonationCreate(...args),
    },
    address: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      create: (...args: unknown[]) => mockAddressCreate(...args),
    },
    bibleDrop: {
      create: (...args: unknown[]) => mockBibleDropCreate(...args),
    },
  },
}));

import { POST } from "@/app/api/webhooks/stripe/route";

function makeRequest(body: string, sig: string) {
  return {
    text: () => Promise.resolve(body),
    headers: {
      get: (key: string) => (key === "stripe-signature" ? sig : null),
    },
  } as unknown as Request;
}

describe("Stripe webhook POST", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  });

  it("returns 400 when stripe-signature header is missing", async () => {
    const req = makeRequest("{}", "");
    mockConstructEvent.mockImplementation(() => {
      throw new Error("No signature");
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when webhook signature verification fails", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("Webhook signature verification failed");
    });
    const res = await POST(makeRequest("{}", "bad-sig"));
    expect(res.status).toBe(400);
  });

  it("returns 200 and ignores unhandled event types", async () => {
    mockConstructEvent.mockReturnValue({ type: "payment_intent.created", data: { object: {} } });
    const res = await POST(makeRequest("{}", "valid-sig"));
    expect(res.status).toBe(200);
  });

  it("returns 400 when checkout.session.completed is missing userId metadata", async () => {
    mockConstructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_001",
          amount_total: 3000,
          metadata: { quantity: "2" }, // userId missing
        },
      },
    });
    const res = await POST(makeRequest("{}", "valid-sig"));
    expect(res.status).toBe(400);
  });

  it("creates a donation and bibleDrops on checkout.session.completed", async () => {
    mockConstructEvent.mockReturnValue({
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_002",
          amount_total: 3000,
          metadata: { userId: "user-1", quantity: "2" },
        },
      },
    });
    mockFindFirst.mockResolvedValue({ id: "user-1", email: "user@example.com" });
    mockDonationCreate.mockResolvedValue({ id: "donation-1", quantity: 2 });
    mockFindMany.mockResolvedValue([
      { id: "addr-1", hasReceived: false },
      { id: "addr-2", hasReceived: false },
    ]);
    mockBibleDropCreate.mockResolvedValue({});

    const res = await POST(makeRequest("{}", "valid-sig"));

    expect(res.status).toBe(200);
    expect(mockDonationCreate).toHaveBeenCalledTimes(1);
    expect(mockDonationCreate.mock.calls[0][0].data).toMatchObject({
      userId: "user-1",
      quantity: 2,
      status: "completed",
      stripeSessionId: "cs_test_002",
    });
    // Should create bibleDrop for each bible
    expect(mockBibleDropCreate).toHaveBeenCalledTimes(2);
  });
});
