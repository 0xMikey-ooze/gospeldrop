import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { sendFulfillmentEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await request.json();
  const { status, trackingNumber } = body;

  const validStatuses = ["pending", "shipped", "delivered", "failed"];
  if (status && !validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
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

  // Send email on fulfillment (delivered)
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
}
