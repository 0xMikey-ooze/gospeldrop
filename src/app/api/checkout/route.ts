import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { checkoutBodySchema } from "@/lib/validation";
import { parseJsonBody, validationErrorResponse } from "@/lib/api";
import { getEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const env = getEnv();
    const session = await getServerSession(getAuthOptions());
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Please sign in first" }, { status: 401 });
    }
    const { quantity } = await parseJsonBody(req, checkoutBodySchema);
    const qty = quantity;

    const checkoutSession = await getStripe().checkout.sessions.create({
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
      success_url: `${env.NEXTAUTH_URL}/donate/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.NEXTAUTH_URL}/donate`,
      metadata: {
        userId: session.user.id,
        quantity: qty.toString(),
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error: any) {
    const validationError = validationErrorResponse(error);
    if (validationError) {
      return validationError;
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
