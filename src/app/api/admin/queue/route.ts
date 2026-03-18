import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const queue = await prisma.bibleDrop.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "asc" },
      include: {
        address: true,
        donation: { include: { user: true } },
      },
    });
    return NextResponse.json(queue);
  } catch {
    return NextResponse.json({ error: "Failed to fetch queue" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const { id, trackingNumber } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const drop = await prisma.bibleDrop.update({
      where: { id },
      data: {
        status: "shipped",
        trackingNumber,
        shippedAt: new Date(),
      },
      include: { address: true, donation: { include: { user: true } } },
    });

    // Send fulfillment email
    try {
      const { sendFulfillmentEmail } = await import("@/lib/email");
      await sendFulfillmentEmail({
        to: drop.donation.user.email,
        donorName: drop.donation.user.name || "Friend",
        bibleCount: drop.donation.quantity,
        recipientName: drop.address.name,
        trackingNumber: drop.trackingNumber || undefined,
      });
    } catch (emailErr) {
      console.error("Failed to send fulfillment email:", emailErr);
    }

    return NextResponse.json(drop);
  } catch {
    return NextResponse.json({ error: "Failed to fulfill order" }, { status: 500 });
  }
}
