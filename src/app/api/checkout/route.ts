import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { donorName, donorEmail, bibleCount } = await req.json();

    if (!donorName || !donorEmail || !bibleCount) {
      return NextResponse.json(
        { error: "donorName, donorEmail, and bibleCount are required" },
        { status: 400 }
      );
    }

    const count = parseInt(bibleCount);
    if (!count || count < 1) {
      return NextResponse.json(
        { error: "bibleCount must be at least 1" },
        { status: 400 }
      );
    }

    const amount = count * 2500;

    const order = await prisma.order.create({
      data: {
        donorName,
        donorEmail,
        bibleCount: count,
        amount,
        status: "pending",
      },
    });

    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Bible Drop",
              description: `Send ${count} Bible(s) to random US households`,
            },
            unit_amount: 2500,
          },
          quantity: count,
        },
      ],
      mode: "payment",
      customer_email: donorEmail,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/donate/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/donate`,
      metadata: {
        orderId: order.id,
        donorName,
        bibleCount: count.toString(),
      },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { stripeSessionId: checkoutSession.id },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
