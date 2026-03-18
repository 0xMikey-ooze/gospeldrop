import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Please sign in first" }, { status: 401 });
    }
    const { quantity } = await req.json();
    const qty = Math.max(1, parseInt(quantity) || 1);

    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Bible Drop",
              description: `Send ${qty} Bible(s) to random US households`,
            },
            unit_amount: 1500,
          },
          quantity: qty,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXTAUTH_URL}/donate/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/donate`,
      metadata: {
        userId: (session.user as any).id,
        donorName: session.user?.name || "",
        quantity: qty.toString(),
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
