import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { parseJsonBody, validationErrorResponse } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { sendFulfillmentEmail } from "@/lib/email";
import { z } from "zod";

const fulfillBodySchema = z.object({
  trackingNumber: z.string().trim().max(100).optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { trackingNumber } = await parseJsonBody(req, fulfillBodySchema);

    const updated = await prisma.bibleDrop.update({
      where: { id: params.id },
      data: {
        status: "shipped",
        shippedAt: new Date(),
        ...(trackingNumber ? { trackingNumber } : {}),
      },
      include: {
        donation: { include: { user: true } },
        address: true,
      },
    });

    // Send fulfillment notification to donor
    if (updated.donation.user.email) {
      await sendFulfillmentEmail(
        updated.donation.user.email,
        updated.donation.user.name || "Friend",
        1,
        trackingNumber
      );
    }

    return NextResponse.json(updated);
  } catch (error: unknown) {
    const validationError = validationErrorResponse(error);
    if (validationError) return validationError;

    const message = error instanceof Error ? error.message : "Failed to fulfill shipment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
