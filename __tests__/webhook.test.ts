import { POST } from "@/app/api/webhooks/stripe/route";

const mockConstructEvent = jest.fn();
const mockOrderUpdate = jest.fn();
const mockOrderFindUnique = jest.fn();

jest.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: {
      constructEvent: (...args: any[]) => mockConstructEvent(...args),
    },
  },
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    order: {
      findUnique: (...args: any[]) => mockOrderFindUnique(...args),
      update: (...args: any[]) => mockOrderUpdate(...args),
    },
  },
}));

function makeWebhookRequest(body: string, signature: string): Request {
  return new Request("http://localhost:3000/api/webhooks/stripe", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "stripe-signature": signature,
    },
    body,
  });
}

describe("POST /api/webhooks/stripe", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";
  });

  it("updates order status to paid on checkout.session.completed", async () => {
    const event = {
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_123",
          metadata: {
            orderId: "order_123",
            donorName: "John Doe",
            bibleCount: "3",
          },
        },
      },
    };

    mockConstructEvent.mockReturnValue(event);
    mockOrderFindUnique.mockResolvedValue({
      id: "order_123",
      status: "pending",
    });
    mockOrderUpdate.mockResolvedValue({
      id: "order_123",
      status: "paid",
    });

    const req = makeWebhookRequest(JSON.stringify(event), "sig_test");
    const res = await POST(req);

    expect(res.status).toBe(200);

    expect(mockConstructEvent).toHaveBeenCalledWith(
      expect.any(String),
      "sig_test",
      "whsec_test_secret"
    );

    expect(mockOrderUpdate).toHaveBeenCalledWith({
      where: { id: "order_123" },
      data: { status: "paid" },
    });
  });

  it("returns 200 for unhandled event types", async () => {
    const event = {
      type: "payment_intent.succeeded",
      data: { object: {} },
    };

    mockConstructEvent.mockReturnValue(event);

    const req = makeWebhookRequest(JSON.stringify(event), "sig_test");
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockOrderUpdate).not.toHaveBeenCalled();
  });

  it("returns 400 if signature verification fails", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    const req = makeWebhookRequest("{}", "bad_sig");
    const res = await POST(req);

    expect(res.status).toBe(400);
  });

  it("handles missing order gracefully", async () => {
    const event = {
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_999",
          metadata: {
            orderId: "order_nonexistent",
          },
        },
      },
    };

    mockConstructEvent.mockReturnValue(event);
    mockOrderFindUnique.mockResolvedValue(null);

    const req = makeWebhookRequest(JSON.stringify(event), "sig_test");
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockOrderUpdate).not.toHaveBeenCalled();
  });
});
