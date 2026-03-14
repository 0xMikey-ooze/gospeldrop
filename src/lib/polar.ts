import crypto from "crypto";

const POLAR_BASE_URL = "https://api.polar.sh/v1";

interface CheckoutParams {
  productPriceId: string;
  successUrl: string;
  customerEmail: string;
  metadata?: Record<string, string>;
}

interface CheckoutResponse {
  id: string;
  url: string;
  status: string;
  customer_email: string;
  metadata: Record<string, string>;
  created_at: string;
}

async function polarFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${POLAR_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.POLAR_ACCESS_TOKEN}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Polar API error (${res.status}): ${error}`);
  }

  return res.json();
}

export async function createCheckout(params: CheckoutParams): Promise<CheckoutResponse> {
  return polarFetch("/checkouts/custom", {
    method: "POST",
    body: JSON.stringify({
      product_price_id: params.productPriceId,
      success_url: params.successUrl,
      customer_email: params.customerEmail,
      metadata: params.metadata || {},
    }),
  });
}

export async function getCheckout(id: string): Promise<CheckoutResponse> {
  return polarFetch(`/checkouts/custom/${id}`);
}

export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
