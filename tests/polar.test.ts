import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Set env vars before import
process.env.POLAR_ACCESS_TOKEN = "test_polar_token";
process.env.POLAR_WEBHOOK_SECRET = "test_webhook_secret";
process.env.POLAR_PRODUCT_PRICE_ID = "price_test_123";

import { createCheckout, getCheckout, verifyWebhookSignature } from "@/lib/polar";

beforeEach(() => {
  mockFetch.mockReset();
});

describe("createCheckout", () => {
  it("should create checkout session", async () => {
    const checkoutData = {
      id: "checkout_123",
      url: "https://polar.sh/checkout/123",
      status: "open",
      customer_email: "test@example.com",
      metadata: { userId: "user_1", quantity: "2" },
      created_at: "2026-03-14T00:00:00Z",
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(checkoutData),
    });

    const result = await createCheckout({
      productPriceId: "price_test_123",
      successUrl: "https://example.com/success",
      customerEmail: "test@example.com",
      metadata: { userId: "user_1", quantity: "2" },
    });

    expect(result.id).toBe("checkout_123");
    expect(result.url).toBe("https://polar.sh/checkout/123");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.polar.sh/v1/checkouts/custom",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test_polar_token",
        }),
      })
    );
  });

  it("should throw on API error", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 422,
      text: () => Promise.resolve("Invalid product price"),
    });

    await expect(
      createCheckout({
        productPriceId: "bad_price",
        successUrl: "https://example.com",
        customerEmail: "test@example.com",
      })
    ).rejects.toThrow("Polar API error (422)");
  });
});

describe("getCheckout", () => {
  it("should retrieve checkout by ID", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "checkout_123", status: "succeeded" }),
    });

    const result = await getCheckout("checkout_123");
    expect(result.status).toBe("succeeded");
  });
});

describe("verifyWebhookSignature", () => {
  it("should return true for valid signature", () => {
    const payload = '{"type":"checkout.updated"}';
    const secret = "test_secret";
    const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");

    expect(verifyWebhookSignature(payload, signature, secret)).toBe(true);
  });

  it("should return false for invalid signature", () => {
    const payload = '{"type":"checkout.updated"}';
    expect(verifyWebhookSignature(payload, "invalid_signature_hex_00", "secret")).toBe(false);
  });

  it("should return false for tampered payload", () => {
    const secret = "test_secret";
    const original = '{"type":"checkout.updated"}';
    const signature = crypto.createHmac("sha256", secret).update(original).digest("hex");
    const tampered = '{"type":"checkout.updated","amount":0}';

    expect(verifyWebhookSignature(tampered, signature, secret)).toBe(false);
  });
});
