import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendFulfillmentEmail } from "@/lib/email";

function isAdmin(email: string) {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@gospeldrop.org";
  return email === adminEmail;
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !isAdmin(session.user.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { status, trackingNumber } = await req.json();
    const validStatuses = ["pending", "processing", "shipped", "delivered"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const updateData: any = { status };
    if (trackingNumber) updateData.trackingNumber = trackingNumber;
    if (status === "shipped") updateData.shippedAt = new Date();
    if (status === "delivered") updateData.deliveredAt = new Date();

    const updated = await prisma.bibleDrop.update({
      where: { id: params.id },
      data: updateData,
      include: {
        donation: { include: { user: true } },
        address: true,
      },
    });

    if (status === "delivered" && updated.donation.user.email) {
      await sendFulfillmentEmail(updated.donation.user.email, updated.donation.user.name || "Friend", updated.address);
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
