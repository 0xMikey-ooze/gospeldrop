import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature") ?? "";

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as {
      id: string;
      amount_total: number | null;
      metadata: { userId?: string; quantity?: string };
    };

    const { userId, quantity: quantityStr } = session.metadata ?? {};
    if (!userId) {
      return NextResponse.json({ error: "Missing userId in metadata" }, { status: 400 });
    }

    const quantity = Math.max(1, parseInt(quantityStr ?? "1") || 1);
    const amount = session.amount_total ?? 0;

    const donation = await prisma.donation.create({
      data: {
        userId,
        amount,
        quantity,
        status: "completed",
        stripeSessionId: session.id,
      },
    });

    // Assign random addresses that haven't received bibles yet
    const addresses = await prisma.address.findMany({
      where: { hasReceived: false },
      take: quantity,
    });

    for (let i = 0; i < quantity; i++) {
      const address = addresses[i];
      if (address) {
        await prisma.bibleDrop.create({
          data: {
            donationId: donation.id,
            addressId: address.id,
            status: "pending",
          },
        });
      }
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
