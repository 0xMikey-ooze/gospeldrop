type Address = {
  name: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  zip: string;
};

export async function sendFulfillmentEmail(
  email: string,
  name: string,
  address: Address
): Promise<void> {
  try {
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.default.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || "noreply@gospeldrop.org",
        to: email,
        subject: "Your Bible Has Been Delivered!",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #654AF5;">Good news, ${name}!</h1>
            <p>A Bible you sponsored has been delivered to:</p>
            <p style="background: #f5f5f5; padding: 16px; border-radius: 8px;">
              <strong>${address.name}</strong><br/>
              ${address.line1}${address.line2 ? "<br/>" + address.line2 : ""}<br/>
              ${address.city}, ${address.state} ${address.zip}
            </p>
            <p>Thank you for spreading hope!</p>
            <p style="color: #666; font-size: 14px;">- The GospelDrop Team</p>
          </div>
        `,
      });
    } else {
      console.log(`[Email stub] Would send fulfillment email to ${email} for delivery to ${address.name}`);
    }
  } catch (error) {
    console.error("Failed to send fulfillment email:", error);
  }
}
