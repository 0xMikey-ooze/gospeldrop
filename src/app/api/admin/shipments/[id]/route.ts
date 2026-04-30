import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { sendFulfillmentEmail } from "@/lib/email";
import { shipmentPatchSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = shipmentPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { status, trackingNumber } = parsed.data;

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
