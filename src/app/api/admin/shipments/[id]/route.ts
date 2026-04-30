import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { parseJsonBody, validationErrorResponse } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { sendFulfillmentEmail } from "@/lib/email";
import { shipmentUpdateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { status, trackingNumber } = await parseJsonBody(request, shipmentUpdateSchema);

    const updateData: Record<string, string | Date> = {};
    if (status) updateData.status = status;
    if (trackingNumber !== undefined) updateData.trackingNumber = trackingNumber;
    if (status === "shipped") updateData.shippedAt = new Date();
    if (status === "delivered") updateData.deliveredAt = new Date();

    const drop = await prisma.bibleDrop.update({
      where: { id: params.id },
      data: updateData,
      include: {
        donation: { include: { user: { select: { email: true, name: true } } } },
      },
    });

    if (status === "delivered") {
      try {
        await sendFulfillmentEmail(
          drop.donation.user.email,
          drop.donation.user.name || "Friend",
          1,
          drop.trackingNumber ?? undefined
        );
      } catch (err) {
        console.error("Email send failed:", err);
      }
    }

    return NextResponse.json(drop);
  } catch (error) {
    const validationError = validationErrorResponse(error);
    if (validationError) {
      return validationError;
    }

    return NextResponse.json({ error: "Failed to update shipment" }, { status: 500 });
  }
}
