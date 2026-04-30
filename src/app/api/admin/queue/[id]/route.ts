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
  const { action, trackingNumber } = body;

  if (!["fulfill", "skip", "cancel"].includes(action)) {
    return NextResponse.json({ error: "Invalid action. Use fulfill, skip, or cancel." }, { status: 400 });
  }

  const statusMap: Record<string, string> = {
    fulfill: "shipped",
    skip: "pending",
    cancel: "failed",
  };

  const updateData: Record<string, unknown> = { status: statusMap[action] };
  if (trackingNumber) updateData.trackingNumber = trackingNumber;
  if (action === "fulfill") updateData.shippedAt = new Date();

  const drop = await prisma.bibleDrop.update({
    where: { id: params.id },
    data: updateData,
    include: {
      donation: { include: { user: { select: { email: true, name: true } } } },
    },
  });

  if (action === "fulfill") {
    try {
      await sendFulfillmentEmail(
        drop.donation.user.email,
        drop.donation.user.name || "Friend",
        drop.donation.quantity,
        drop.trackingNumber ?? undefined
      );
    } catch (err) {
      console.error("Email send failed:", err);
    }
  }

  return NextResponse.json(drop);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const drop = await prisma.bibleDrop.delete({ where: { id: params.id } });
  return NextResponse.json({ deleted: drop.id });
}
