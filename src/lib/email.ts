import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.ethereal.email",
  port: parseInt(process.env.SMTP_PORT || "587"),
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
});

export async function sendFulfillmentEmail(params: {
  to: string;
  donorName: string;
  bibleCount: number;
  recipientName: string;
  trackingNumber?: string;
}) {
  const { to, donorName, bibleCount, recipientName, trackingNumber } = params;

  const mailOptions = {
    from: process.env.EMAIL_FROM || "noreply@gospeldrop.org",
    to,
    subject: "Your Bible Has Been Fulfilled! 📖",
    html: `
      <div style="font-family: 'Nunito', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <h1 style="color: #654AF5; font-size: 28px; font-weight: 800;">GospelDrop</h1>
        <h2 style="color: #18181b; font-size: 22px;">Great news, ${donorName}! 🎉</h2>
        <p style="color: #52525b; font-size: 16px; line-height: 1.6;">
          Your donation of <strong>${bibleCount} Bible${bibleCount > 1 ? "s" : ""}</strong> has been fulfilled and shipped to ${recipientName}.
        </p>
        ${
          trackingNumber
            ? `<p style="color: #52525b; font-size: 16px;">Tracking number: <strong>${trackingNumber}</strong></p>`
            : ""
        }
        <p style="color: #52525b; font-size: 16px; line-height: 1.6;">
          Thank you for spreading the Word. Your generosity is making a difference!
        </p>
        <div style="margin-top: 32px; padding: 24px; background: #EBE5FF; border-radius: 16px;">
          <p style="color: #654AF5; font-weight: 700; margin: 0;">Want to send more Bibles?</p>
          <a href="${process.env.NEXTAUTH_URL || "https://gospeldrop.org"}/donate"
             style="display: inline-block; margin-top: 12px; background: #654AF5; color: white; padding: 12px 24px; border-radius: 100px; text-decoration: none; font-weight: 700;">
            Give Again
          </a>
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}
