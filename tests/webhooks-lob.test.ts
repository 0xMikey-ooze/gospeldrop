import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockPrisma, sampleBibleDrop } from "./setup";

// We test the webhook handler logic directly
import { POST } from "@/app/api/webhooks/lob/route";

function createMockRequest(body: any, headers: Record<string, string> = {}) {
  return {
    text: () => Promise.resolve(JSON.stringify(body)),
    headers: new Headers(headers),
  } as unknown as Request;
}

describe("Lob Webhook Handler", () => {
  beforeEach(() => {
    delete process.env.LOB_WEBHOOK_SECRET;
  });

  it("should update BibleDrop status on letter.mailed", async () => {
    mockPrisma.bibleDrop.findFirst.mockResolvedValue(sampleBibleDrop);
    mockPrisma.bibleDrop.update.mockResolvedValue({});

    const req = createMockRequest({
      event_type: { type: "letter.mailed" },
      body: { id: "ltr_test123", tracking_number: "TRK001" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(data.status).toBe("processed");
    expect(mockPrisma.bibleDrop.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "mailed", trackingNumber: "TRK001" }),
      })
    );
  });

  it("should update BibleDrop on letter.delivered", async () => {
    mockPrisma.bibleDrop.findFirst.mockResolvedValue(sampleBibleDrop);
    mockPrisma.bibleDrop.update.mockResolvedValue({});

    const req = createMockRequest({
      event_type: { type: "letter.delivered" },
      body: { id: "ltr_test123" },
    });

    const res = await POST(req);
    const data = await res.json();

    expect(data.status).toBe("processed");
    expect(mockPrisma.bibleDrop.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "delivered" }),
      })
    );
  });

  it("should update BibleDrop on letter.returned_to_sender", async () => {
    mockPrisma.bibleDrop.findFirst.mockResolvedValue(sampleBibleDrop);
    mockPrisma.bibleDrop.update.mockResolvedValue({});

    const req = createMockRequest({
      event_type: { type: "letter.returned_to_sender" },
      body: { id: "ltr_test123" },
    });

    const res = await POST(req);
    expect(mockPrisma.bibleDrop.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "returned" }),
      })
    );
  });

  it("should handle missing BibleDrop gracefully", async () => {
    mockPrisma.bibleDrop.findFirst.mockResolvedValue(null);

    const req = createMockRequest({
      event_type: { type: "letter.mailed" },
      body: { id: "ltr_unknown" },
    });

    const res = await POST(req);
    const data = await res.json();
    expect(data.status).toBe("no_matching_drop");
  });

  it("should reject invalid payload", async () => {
    const req = createMockRequest({ invalid: true });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("should ignore unknown event types", async () => {
    mockPrisma.bibleDrop.findFirst.mockResolvedValue(sampleBibleDrop);

    const req = createMockRequest({
      event_type: { type: "letter.some_future_event" },
      body: { id: "ltr_test123" },
    });

    const res = await POST(req);
    const data = await res.json();
    expect(data.status).toBe("ignored");
  });

  it("should reject invalid signature when secret is set", async () => {
    process.env.LOB_WEBHOOK_SECRET = "test_secret";

    const req = createMockRequest(
      { event_type: { type: "letter.mailed" }, body: { id: "ltr_test123" } },
      { "lob-signature": "invalid_sig" }
    );

    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});
