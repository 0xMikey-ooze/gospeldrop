import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { sendFulfillmentEmail } from "@/lib/email";
import { z } from "zod";

export const dynamic = "force-dynamic";

const fulfillSchema = z.object({
  trackingNumber: z.string().min(1).max(100).optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => ({}));
  const parsed = fulfillSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { trackingNumber } = parsed.data;

  try {
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

    if (updated.donation.user.email) {
      await sendFulfillmentEmail(
        updated.donation.user.email,
        updated.donation.user.name || "Friend",
        1,
        updated.trackingNumber ?? undefined
      );
    }

    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
