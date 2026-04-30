import { beforeEach, describe, expect, it, vi } from "vitest";

const { getServerSessionMock, updateMock, sendFulfillmentEmailMock } = vi.hoisted(() => ({
  getServerSessionMock: vi.fn(),
  updateMock: vi.fn(),
  sendFulfillmentEmailMock: vi.fn(),
}));

vi.mock("next-auth", () => ({
  getServerSession: getServerSessionMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    bibleDrop: {
      update: updateMock,
    },
  },
}));

vi.mock("@/lib/email", () => ({
  sendFulfillmentEmail: sendFulfillmentEmailMock,
}));

import { POST } from "@/app/api/admin/queue/[id]/fulfill/route";

describe("POST /api/admin/queue/[id]/fulfill", () => {
  beforeEach(() => {
    getServerSessionMock.mockReset();
    updateMock.mockReset();
    sendFulfillmentEmailMock.mockReset();
    process.env.ADMIN_EMAIL = "admin@example.com";
  });

  it("sends the fulfillment email with bible count and tracking number", async () => {
    getServerSessionMock.mockResolvedValue({
      user: {
        email: "admin@example.com",
      },
    });
    updateMock.mockResolvedValue({
      id: "drop_123",
      trackingNumber: "TRACK-123",
      donation: {
        quantity: 3,
        user: {
          email: "donor@example.com",
          name: "Faithful Donor",
        },
      },
      address: {
        id: "addr_123",
        line1: "123 Main St",
      },
    });

    const response = await POST(
      new Request("http://localhost/api/admin/queue/drop_123/fulfill", {
        method: "POST",
        body: JSON.stringify({ trackingNumber: "TRACK-123" }),
      }),
      { params: { id: "drop_123" } }
    );

    expect(response.status).toBe(200);
    expect(sendFulfillmentEmailMock).toHaveBeenCalledWith(
      "donor@example.com",
      "Faithful Donor",
      3,
      "TRACK-123"
    );
  });
});
