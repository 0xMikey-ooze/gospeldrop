import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkApiRateLimit } from "@/lib/rateLimit";
import { checkoutSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const limited = checkApiRateLimit(req);
  if (limited) return limited;

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Please sign in first" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { quantity } = parsed.data;

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Bible Drop",
              description: `Send ${quantity} Bible(s) to random US households`,
            },
            unit_amount: 1500,
          },
          quantity,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXTAUTH_URL}/donate/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/donate`,
      metadata: {
        userId: (session.user as { id?: string }).id ?? "",
        quantity: String(quantity),
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
