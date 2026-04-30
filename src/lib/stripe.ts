import Stripe from "stripe";
import { getEnv } from "./env";

let stripeClient: Stripe | null = null;

export function getStripe() {
  if (!stripeClient) {
    stripeClient = new Stripe(getEnv().STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16" as any,
    });
  }

  return stripeClient;
}
