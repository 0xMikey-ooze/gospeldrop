import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1).max(100).optional(),
});

export const checkoutSchema = z.object({
  quantity: z.coerce.number().int().min(1).max(1000),
});

export const queueActionSchema = z.object({
  action: z.enum(["fulfill", "skip", "cancel"]),
  trackingNumber: z.string().min(1).max(100).optional(),
});

export const shipmentPatchSchema = z.object({
  status: z.enum(["pending", "shipped", "delivered", "failed"]).optional(),
  trackingNumber: z.string().min(1).max(100).optional(),
});

export const fulfillSchema = z.object({
  trackingNumber: z.string().min(1).max(100).optional(),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
