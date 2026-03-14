import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";
import { mockPrisma, sampleDonation } from "./setup";

// Mock lob-service
vi.mock("@/lib/lob-service", () => ({
  createBibleDrops: vi.fn().mockResolvedValue({ successCount: 1, results: [] }),
}));

import { POST } from "@/app/api/webhooks/polar/route";
import { createBibleDrops } from "@/lib/lob-service";

const WEBHOOK_SECRET = "test_webhook_secret";

beforeEach(() => {
  process.env.POLAR_WEBHOOK_SECRET = WEBHOOK_SECRET;
});

function createSignedRequest(body: any) {
  const payload = JSON.stringify(body);
  const signature = crypto.createHmac("sha256", WEBHOOK_SECRET).update(payload).digest("hex");
  return {
    text: () => Promise.resolve(payload),
    headers: new Headers({ "webhook-signature": signature }),
  } as unknown as Request;
}

function createUnsignedRequest(body: any, headers: Record<string, string> = {}) {
  return {
    text: () => Promise.resolve(JSON.stringify(body)),
    headers: new Headers(headers),
  } as unknown as Request;
}

describe("Polar Webhook Handler", () => {
  it("should reject missing signature", async () => {
    const req = createUnsignedRequest({ type: "checkout.updated" });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("should reject invalid signature", async () => {
    const req = createUnsignedRequest(
      { type: "checkout.updated" },
      { "webhook-signature": "bad_sig" }
    );
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("should process successful checkout and create donation", async () => {
    const event = {
      type: "checkout.updated",
      data: {
        id: "polar_checkout_999",
        status: "succeeded",
        customer_email: "donor@example.com",
        metadata: { userId: "user_1", quantity: "3" },
      },
    };

    mockPrisma.donation.findFirst.mockResolvedValue(null); // not a duplicate
    mockPrisma.donation.create.mockResolvedValue({
      ...sampleDonation,
      id: "don_new",
      polarCheckoutId: "polar_checkout_999",
    });

    const req = createSignedRequest(event);
    const res = await POST(req);
    const data = await res.json();

    expect(data.status).toBe("processed");
    expect(mockPrisma.donation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user_1",
        amount: 4500, // 3 * $15
        quantity: 3,
        polarCheckoutId: "polar_checkout_999",
        status: "processing",
      }),
    });
    expect(createBibleDrops).toHaveBeenCalled();
  });

  it("should skip duplicate webhooks", async () => {
    const event = {
      type: "checkout.updated",
      data: {
        id: "polar_checkout_duplicate",
        status: "succeeded",
        metadata: { userId: "user_1", quantity: "1" },
      },
    };

    mockPrisma.donation.findFirst.mockResolvedValue(sampleDonation); // already exists

    const req = createSignedRequest(event);
    const res = await POST(req);
    const data = await res.json();

    expect(data.status).toBe("already_processed");
    expect(mockPrisma.donation.create).not.toHaveBeenCalled();
  });

  it("should ignore non-succeeded checkout events", async () => {
    const event = {
      type: "checkout.updated",
      data: { id: "checkout_pending", status: "pending", metadata: {} },
    };

    const req = createSignedRequest(event);
    const res = await POST(req);
    const data = await res.json();
    expect(data.status).toBe("ignored");
  });

  it("should ignore non-checkout events", async () => {
    const event = { type: "subscription.created", data: {} };
    const req = createSignedRequest(event);
    const res = await POST(req);
    const data = await res.json();
    expect(data.status).toBe("ignored");
  });
});
