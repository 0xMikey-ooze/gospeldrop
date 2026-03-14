import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.text();

    // Verify webhook signature if secret is configured
    const secret = process.env.LOB_WEBHOOK_SECRET;
    if (secret) {
      const signature = req.headers.get("lob-signature") || "";
      const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
      if (signature !== expected) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const event = JSON.parse(body);
    const eventType = event.event_type?.type;
    const lobLetterId = event.body?.id;

    if (!eventType || !lobLetterId) {
      return NextResponse.json({ error: "Invalid event payload" }, { status: 400 });
    }

    // Find the BibleDrop by Lob letter ID
    const bibleDrop = await prisma.bibleDrop.findFirst({
      where: { lobLetterId },
    });

    if (!bibleDrop) {
      return NextResponse.json({ status: "no_matching_drop" });
    }

    // Update BibleDrop based on event type
    const updateData: any = {};

    switch (eventType) {
      case "letter.mailed":
        updateData.status = "mailed";
        updateData.shippedAt = new Date();
        break;
      case "letter.in_transit":
        updateData.status = "in_transit";
        break;
      case "letter.in_local_area":
        updateData.status = "in_local_area";
        break;
      case "letter.processed_for_delivery":
        updateData.status = "out_for_delivery";
        break;
      case "letter.delivered":
        updateData.status = "delivered";
        updateData.deliveredAt = new Date();
        break;
      case "letter.returned_to_sender":
        updateData.status = "returned";
        break;
      case "letter.failed":
        updateData.status = "failed";
        break;
      default:
        return NextResponse.json({ status: "ignored", eventType });
    }

    // Update tracking number if available
    if (event.body?.tracking_number) {
      updateData.trackingNumber = event.body.tracking_number;
    }

    await prisma.bibleDrop.update({
      where: { id: bibleDrop.id },
      data: updateData,
    });

    return NextResponse.json({ status: "processed", bibleDropId: bibleDrop.id });
  } catch (error: any) {
    console.error("Lob webhook error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
