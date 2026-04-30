import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAdminMock, updateMock, sendFulfillmentEmailMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  updateMock: vi.fn(),
  sendFulfillmentEmailMock: vi.fn(),
}));

vi.mock("@/lib/admin", () => ({
  requireAdmin: requireAdminMock,
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

import { PATCH } from "@/app/api/admin/queue/[id]/route";

describe("PATCH /api/admin/queue/[id]", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    updateMock.mockReset();
    sendFulfillmentEmailMock.mockReset();
    requireAdminMock.mockResolvedValue({ session: { user: { id: "admin_123" } } });
  });

  it("sends the donor's bible quantity and tracking number on fulfillment", async () => {
    updateMock.mockResolvedValue({
      id: "drop_123",
      trackingNumber: "TRACK-456",
      donation: {
        quantity: 4,
        user: {
          email: "donor@example.com",
          name: "Generous Donor",
        },
      },
    });

    const response = await PATCH(
      new Request("http://localhost/api/admin/queue/drop_123", {
        method: "PATCH",
        body: JSON.stringify({ action: "fulfill", trackingNumber: "TRACK-456" }),
      }) as never,
      { params: { id: "drop_123" } }
    );

    expect(response.status).toBe(200);
    expect(sendFulfillmentEmailMock).toHaveBeenCalledWith(
      "donor@example.com",
      "Generous Donor",
      4,
      "TRACK-456"
    );
  });
});
