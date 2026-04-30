import { z } from "zod";

const paginationNumber = z.coerce.number().int();

export const paginationQuerySchema = z.object({
  page: paginationNumber.min(1, "page must be at least 1").default(1),
  limit: paginationNumber.min(1, "limit must be at least 1").max(100, "limit must be 100 or less").default(20),
});

export const checkoutBodySchema = z.object({
  quantity: z.coerce.number().int().min(1, "quantity must be at least 1").max(100, "quantity must be 100 or less").default(1),
});

export const registerBodySchema = z.object({
  email: z.string().trim().email("email must be a valid email address"),
  password: z.string().min(8, "password must be at least 8 characters long"),
  name: z.string().trim().min(1).max(100).optional(),
});

export const bibleDropStatusSchema = z.enum(["pending", "shipped", "delivered", "failed"]);

export const shipmentsQuerySchema = paginationQuerySchema.extend({
  sortBy: z.enum(["createdAt", "shippedAt", "deliveredAt", "status"]).default("createdAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
  status: bibleDropStatusSchema.optional(),
});

export const shipmentUpdateSchema = z
  .object({
    status: bibleDropStatusSchema.optional(),
    trackingNumber: z.string().trim().max(100).optional(),
  })
  .refine((value) => value.status !== undefined || value.trackingNumber !== undefined, {
    message: "At least one field must be provided",
  });

export const adminQueueActionSchema = z.object({
  action: z.enum(["fulfill", "skip", "cancel"]),
  trackingNumber: z.string().trim().max(100).optional(),
});

