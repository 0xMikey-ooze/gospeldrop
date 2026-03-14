import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/polar";
import { prisma } from "@/lib/prisma";
import { createBibleDrops } from "@/lib/lob-service";

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get("webhook-signature") || req.headers.get("x-polar-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    const secret = process.env.POLAR_WEBHOOK_SECRET!;
    if (!verifyWebhookSignature(body, signature, secret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(body);

    if (event.type === "checkout.updated" && event.data?.status === "succeeded") {
      const { id, metadata, customer_email } = event.data;
      const userId = metadata?.userId;
      const quantity = parseInt(metadata?.quantity || "1");

      // Prevent duplicate processing
      const existing = await prisma.donation.findFirst({
        where: { polarCheckoutId: id },
      });
      if (existing) {
        return NextResponse.json({ status: "already_processed" });
      }

      // Create donation record
      const donation = await prisma.donation.create({
        data: {
          userId,
          amount: quantity * 1500, // $15 per Bible in cents
          quantity,
          polarCheckoutId: id,
          status: "processing",
        },
      });

      // Trigger Lob Bible drops
      try {
        await createBibleDrops(donation.id, quantity);
      } catch (error: any) {
        console.error("Bible drop creation error:", error.message);
        // Don't fail the webhook - donation is recorded, drops can be retried
      }

      return NextResponse.json({ status: "processed", donationId: donation.id });
    }

    return NextResponse.json({ status: "ignored" });
  } catch (error: any) {
    console.error("Polar webhook error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
