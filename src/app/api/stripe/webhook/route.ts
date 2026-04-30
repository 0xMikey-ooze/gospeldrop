import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

function getWebhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET;
}

function parseCompletedCheckoutSession(event: {
  data?: {
    object?: {
      id?: string;
      amount_total?: number | null;
      metadata?: {
        userId?: string;
        quantity?: string;
      } | null;
    };
  };
}) {
  const session = event.data?.object;
  const userId = session?.metadata?.userId;
  const quantity = Number.parseInt(session?.metadata?.quantity ?? "", 10);
  const amount = session?.amount_total;

  if (!session?.id || !userId || !Number.isFinite(quantity) || quantity < 1 || typeof amount !== "number") {
    return null;
  }

  return {
    stripeSessionId: session.id,
    userId,
    quantity,
    amount,
  };
}

export async function POST(request: Request) {
  const webhookSecret = getWebhookSecret();
  const signature = request.headers.get("stripe-signature");

  if (!webhookSecret || !signature) {
    return NextResponse.json({ error: "Missing Stripe webhook configuration" }, { status: 400 });
  }

  const payload = await request.text();

  try {
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

    if (event.type === "checkout.session.completed") {
      const donationData = parseCompletedCheckoutSession(event);

      if (!donationData) {
        return NextResponse.json({ error: "Invalid checkout session payload" }, { status: 400 });
      }

      const existingDonation = await prisma.donation.findFirst({
        where: { stripeSessionId: donationData.stripeSessionId },
      });

      if (!existingDonation) {
        await prisma.donation.create({
          data: {
            userId: donationData.userId,
            amount: donationData.amount,
            quantity: donationData.quantity,
            stripeSessionId: donationData.stripeSessionId,
            status: "pending",
          },
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
