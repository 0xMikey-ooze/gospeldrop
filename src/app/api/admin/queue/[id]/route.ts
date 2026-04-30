import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { sendFulfillmentEmail } from "@/lib/email";
import { queueActionSchema } from "@/lib/schemas";

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

  const parsed = queueActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { action, trackingNumber } = parsed.data;

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
        1,
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
