import { POST } from "@/app/api/checkout/route";

const mockCreate = jest.fn();
const mockOrderCreate = jest.fn();
const mockOrderUpdate = jest.fn();

jest.mock("@/lib/stripe", () => ({
  stripe: {
    checkout: {
      sessions: {
        create: (...args: any[]) => mockCreate(...args),
      },
    },
  },
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    order: {
      create: (...args: any[]) => mockOrderCreate(...args),
      update: (...args: any[]) => mockOrderUpdate(...args),
    },
  },
}));

function makeRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost:3000/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/checkout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    mockOrderUpdate.mockResolvedValue({});
  });

  it("creates an order and returns the Stripe session URL", async () => {
    mockOrderCreate.mockResolvedValue({
      id: "order_123",
      donorName: "John Doe",
      donorEmail: "john@example.com",
      bibleCount: 3,
      amount: 7500,
      status: "pending",
    });

    mockCreate.mockResolvedValue({
      id: "cs_test_123",
      url: "https://checkout.stripe.com/pay/cs_test_123",
    });

    const req = makeRequest({
      donorName: "John Doe",
      donorEmail: "john@example.com",
      bibleCount: 3,
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.url).toBe("https://checkout.stripe.com/pay/cs_test_123");

    expect(mockOrderCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        donorName: "John Doe",
        donorEmail: "john@example.com",
        bibleCount: 3,
        amount: 7500,
        status: "pending",
      }),
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "payment",
        customer_email: "john@example.com",
        line_items: [
          expect.objectContaining({
            quantity: 3,
            price_data: expect.objectContaining({
              unit_amount: 2500,
            }),
          }),
        ],
        metadata: expect.objectContaining({
          orderId: "order_123",
          donorName: "John Doe",
          bibleCount: "3",
        }),
      })
    );
  });

  it("updates the order with stripeSessionId after session creation", async () => {
    mockOrderUpdate.mockResolvedValue({});

    mockOrderCreate.mockResolvedValue({
      id: "order_456",
      donorName: "Jane",
      donorEmail: "jane@example.com",
      bibleCount: 1,
      amount: 2500,
      status: "pending",
    });

    mockCreate.mockResolvedValue({
      id: "cs_test_456",
      url: "https://checkout.stripe.com/pay/cs_test_456",
    });

    const req = makeRequest({
      donorName: "Jane",
      donorEmail: "jane@example.com",
      bibleCount: 1,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    expect(mockOrderUpdate).toHaveBeenCalledWith({
      where: { id: "order_456" },
      data: { stripeSessionId: "cs_test_456" },
    });
  });

  it("returns 400 if required fields are missing", async () => {
    const req = makeRequest({ donorName: "John" });
    const res = await POST(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it("returns 400 if bibleCount is less than 1", async () => {
    const req = makeRequest({
      donorName: "John",
      donorEmail: "john@example.com",
      bibleCount: 0,
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 500 if Stripe throws an error", async () => {
    mockOrderCreate.mockResolvedValue({
      id: "order_789",
      donorName: "Error",
      donorEmail: "err@example.com",
      bibleCount: 1,
      amount: 2500,
      status: "pending",
    });

    mockCreate.mockRejectedValue(new Error("Stripe error"));

    const req = makeRequest({
      donorName: "Error",
      donorEmail: "err@example.com",
      bibleCount: 1,
    });

    const res = await POST(req);
    expect(res.status).toBe(500);

    const data = await res.json();
    expect(data.error).toBe("Stripe error");
  });
});
