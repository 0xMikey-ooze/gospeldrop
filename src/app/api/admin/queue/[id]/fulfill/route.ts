import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendFulfillmentEmail } from "@/lib/email";

function isAdmin(email: string) {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@gospeldrop.org";
  return email === adminEmail;
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !isAdmin(session.user.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { trackingNumber } = await req.json().catch(() => ({}));

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
        updated.address
      );
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
