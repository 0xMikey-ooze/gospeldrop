import { describe, expect, it } from "vitest";
import {
  adminQueueActionSchema,
  checkoutBodySchema,
  paginationQuerySchema,
  registerBodySchema,
  shipmentUpdateSchema,
  shipmentsQuerySchema,
} from "@/lib/validation";

describe("validation schemas", () => {
  it("coerces checkout quantity and enforces a positive upper bound", () => {
    expect(checkoutBodySchema.parse({ quantity: "3" }).quantity).toBe(3);
    expect(() => checkoutBodySchema.parse({ quantity: "0" })).toThrow(/quantity/i);
  });

  it("validates registration payloads", () => {
    const payload = registerBodySchema.parse({
      email: "person@example.com",
      password: "password123",
      name: "Person",
    });

    expect(payload.email).toBe("person@example.com");
    expect(() => registerBodySchema.parse({ email: "not-an-email", password: "short" })).toThrow();
  });

  it("validates queue actions and optional tracking number", () => {
    expect(
      adminQueueActionSchema.parse({
        action: "fulfill",
        trackingNumber: "TRACK-123",
      }).action
    ).toBe("fulfill");

    expect(() => adminQueueActionSchema.parse({ action: "delete" })).toThrow(/action/i);
  });

  it("normalizes pagination query params", () => {
    const query = paginationQuerySchema.parse({
      page: "2",
      limit: "50",
    });

    expect(query.page).toBe(2);
    expect(query.limit).toBe(50);
    expect(() => paginationQuerySchema.parse({ page: "-1" })).toThrow(/page/i);
  });

  it("validates shipment filters and updates", () => {
    const shipmentsQuery = shipmentsQuerySchema.parse({
      status: "shipped",
      sortBy: "createdAt",
      sortDir: "asc",
    });

    expect(shipmentsQuery.status).toBe("shipped");
    expect(() => shipmentsQuerySchema.parse({ sortBy: "email" })).toThrow(/sortBy/i);

    expect(
      shipmentUpdateSchema.parse({
        status: "delivered",
        trackingNumber: "TRACK-999",
      }).status
    ).toBe("delivered");
    expect(() => shipmentUpdateSchema.parse({ status: "unknown" })).toThrow(/status/i);
  });
});
