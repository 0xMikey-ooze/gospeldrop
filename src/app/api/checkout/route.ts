import { NextResponse } from "next/server";
import { createCheckout } from "@/lib/polar";
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

    const checkout = await createCheckout({
      productPriceId: process.env.POLAR_PRODUCT_PRICE_ID!,
      successUrl: `${process.env.NEXTAUTH_URL}/donate/success?checkout_id={CHECKOUT_ID}`,
      customerEmail: session.user.email,
      metadata: {
        userId: (session.user as any).id,
        quantity: qty.toString(),
      },
    });

    return NextResponse.json({ url: checkout.url });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
