import nodemailer from "nodemailer";
import { getEnv } from "./env";

function createTransport() {
  const env = getEnv();

  if (env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
  }
  // Fallback: ethereal/test transport
  return nodemailer.createTransport({ jsonTransport: true });
}

export async function sendFulfillmentEmail(
  toEmail: string,
  toName: string,
  bibleCount: number,
  trackingNumber?: string
) {
  const transport = createTransport();
  const from = getEnv().EMAIL_FROM;

  const text = `Dear ${toName},

Great news! Your ${bibleCount} Bible${bibleCount !== 1 ? "s" : ""} ${bibleCount !== 1 ? "have" : "has"} been fulfilled and shipped.

${trackingNumber ? `Tracking number: ${trackingNumber}` : ""}

Thank you for spreading the Good News!

The GospelDrop Team`;

  const html = `
<div style="font-family: 'Nunito', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <h1 style="color: #654AF5; font-size: 28px; margin-bottom: 8px;">Bibles Fulfilled! 🎉</h1>
  <p style="color: #52525b; font-size: 16px;">Dear <strong>${toName}</strong>,</p>
  <p style="color: #52525b; font-size: 16px;">
    Great news! Your <strong>${bibleCount} Bible${bibleCount !== 1 ? "s" : ""}</strong>
    ${bibleCount !== 1 ? "have" : "has"} been fulfilled and shipped.
  </p>
  ${trackingNumber ? `<p style="color: #52525b; font-size: 16px;">Tracking number: <strong>${trackingNumber}</strong></p>` : ""}
  <p style="color: #52525b; font-size: 16px;">Thank you for spreading the Good News!</p>
  <p style="color: #52525b; font-size: 16px; font-weight: 700;">The GospelDrop Team</p>
</div>`;

  await transport.sendMail({
    from,
    to: toEmail,
    subject: `Your ${bibleCount} Bible${bibleCount !== 1 ? "s" : ""} ${bibleCount !== 1 ? "have" : "has"} been shipped!`,
    text,
    html,
  });
}
