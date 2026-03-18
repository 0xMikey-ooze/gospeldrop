import { stripe } from "@/lib/stripe";

export type SessionData = {
  donorName: string;
  bibleCount: string;
};

export async function getSessionData(
  sessionId: string
): Promise<SessionData | null> {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const donorName =
      session.metadata?.donorName ||
      session.customer_details?.name ||
      "Friend";
    const bibleCount = session.metadata?.quantity || "1";
    return { donorName, bibleCount };
  } catch {
    return null;
  }
}
