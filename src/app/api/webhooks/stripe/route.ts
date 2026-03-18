import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature") ?? "";

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any;
    const orderId = session.metadata?.orderId;

    if (orderId) {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
      });

      if (order) {
        await prisma.order.update({
          where: { id: orderId },
          data: { status: "paid" },
        });

        console.log(
          `Order ${orderId} marked as paid. Fulfillment pending for ${session.metadata?.bibleCount} Bible(s) to ${session.metadata?.donorName}.`
        );
      } else {
        console.warn(`Order ${orderId} not found for session ${session.id}`);
      }
    }
  }

  return NextResponse.json({ received: true });
}
