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

async function enqueueBibleDrops(donationId: string, quantity: number) {
  const addresses = await prisma.address.findMany({
    where: { hasReceived: false },
    orderBy: { createdAt: "asc" },
    take: quantity,
    select: { id: true },
  });

  if (addresses.length === 0) {
    return;
  }

  await prisma.address.updateMany({
    where: {
      id: {
        in: addresses.map((address) => address.id),
      },
    },
    data: {
      hasReceived: true,
    },
  });

  await prisma.bibleDrop.createMany({
    data: addresses.map((address) => ({
      donationId,
      addressId: address.id,
      status: "pending",
    })),
    skipDuplicates: true,
  });
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

      const donation = await prisma.donation.upsert({
        where: { stripeSessionId: donationData.stripeSessionId },
        update: {
          amount: donationData.amount,
          quantity: donationData.quantity,
          status: "completed",
        },
        create: {
          stripeSessionId: donationData.stripeSessionId,
          userId: donationData.userId,
          amount: donationData.amount,
          quantity: donationData.quantity,
          status: "completed",
        },
      });

      await enqueueBibleDrops(donation.id, donationData.quantity);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
