import { lettersApi, usVerificationsApi } from "./lob";
import { prisma } from "./prisma";

interface AddressInput {
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
}

interface VerificationResult {
  deliverable: boolean;
  deliverability: string;
  standardizedAddress?: AddressInput;
}

const SENDER_ADDRESS = {
  name: "GospelDrop Ministry",
  address_line1: process.env.SENDER_ADDRESS_LINE1 || "123 Ministry Lane",
  address_city: process.env.SENDER_CITY || "Nashville",
  address_state: process.env.SENDER_STATE || "TN",
  address_zip: process.env.SENDER_ZIP || "37201",
};

const BIBLE_LETTER_HTML = `
<html>
<body style="font-family: Georgia, serif; padding: 40px; line-height: 1.6;">
  <h2>A Gift For You</h2>
  <p>Dear Friend,</p>
  <p>Someone in your community wanted to share something meaningful with you.
  Enclosed is a Bible — a gift freely given with no strings attached.</p>
  <p>We believe that God's word has the power to transform lives, bring hope,
  and provide comfort in all seasons of life.</p>
  <p>This Bible is yours to keep, share, or pass along to someone who might
  need it. No response is expected or required.</p>
  <p>With love,<br/>The GospelDrop Community</p>
  <p style="font-size: 12px; color: #666; margin-top: 40px;">
    gospeldrop.vercel.app — Sending God's word to every doorstep
  </p>
</body>
</html>`;

export async function verifyAddress(address: AddressInput): Promise<VerificationResult> {
  const verification = await usVerificationsApi.verifySingle({
    primary_line: address.line1,
    secondary_line: address.line2 || "",
    city: address.city,
    state: address.state,
    zip_code: address.zip,
  });

  const deliverability = verification.deliverability || "undeliverable";
  const isDeliverable = deliverability.startsWith("deliverable");

  return {
    deliverable: isDeliverable,
    deliverability,
    standardizedAddress: isDeliverable
      ? {
          name: address.name,
          line1: verification.primary_line || address.line1,
          line2: verification.secondary_line || address.line2,
          city: verification.components?.city || address.city,
          state: verification.components?.state || address.state,
          zip: verification.components?.zip_code || address.zip,
        }
      : undefined,
  };
}

export async function sendBibleLetter(
  to: AddressInput,
  bibleDropId: string
): Promise<{ lobLetterId: string; trackingNumber?: string }> {
  const letter = await lettersApi.create({
    description: `Bible Drop ${bibleDropId}`,
    to: {
      name: to.name,
      address_line1: to.line1,
      address_line2: to.line2 || undefined,
      address_city: to.city,
      address_state: to.state,
      address_zip: to.zip,
    } as any,
    from: SENDER_ADDRESS as any,
    file: BIBLE_LETTER_HTML,
    color: false,
    metadata: { bibleDropId },
  } as any);

  const lobLetterId = (letter as any).id;
  const trackingNumber = (letter as any).tracking_number || null;

  await prisma.bibleDrop.update({
    where: { id: bibleDropId },
    data: { lobLetterId, trackingNumber },
  });

  return { lobLetterId, trackingNumber };
}

export async function getLetterStatus(lobLetterId: string) {
  const letter = await lettersApi.get(lobLetterId);
  return {
    id: (letter as any).id,
    status: (letter as any).status,
    expectedDeliveryDate: (letter as any).expected_delivery_date,
    trackingNumber: (letter as any).tracking_number,
    trackingEvents: (letter as any).tracking_events || [],
  };
}

export async function createBibleDrops(donationId: string, quantity: number) {
  // Pick random addresses that haven't received a Bible yet
  const addresses = await prisma.address.findMany({
    where: { hasReceived: false },
    take: quantity,
  });

  if (addresses.length === 0) {
    throw new Error("No available addresses for Bible drops");
  }

  const results = [];
  let successCount = 0;

  for (const address of addresses) {
    const bibleDrop = await prisma.bibleDrop.create({
      data: {
        donationId,
        addressId: address.id,
        status: "pending",
      },
    });

    try {
      const { lobLetterId, trackingNumber } = await sendBibleLetter(
        {
          name: address.name,
          line1: address.line1,
          line2: address.line2 || undefined,
          city: address.city,
          state: address.state,
          zip: address.zip,
        },
        bibleDrop.id
      );

      await prisma.address.update({
        where: { id: address.id },
        data: { hasReceived: true },
      });

      results.push({ bibleDropId: bibleDrop.id, lobLetterId, trackingNumber, success: true });
      successCount++;
    } catch (error: any) {
      await prisma.bibleDrop.update({
        where: { id: bibleDrop.id },
        data: { status: "failed" },
      });
      results.push({ bibleDropId: bibleDrop.id, error: error.message, success: false });
    }
  }

  // Update donation status
  const status = successCount === quantity ? "completed" : successCount > 0 ? "partial" : "failed";
  await prisma.donation.update({
    where: { id: donationId },
    data: { status },
  });

  return { results, successCount, totalRequested: quantity };
}
