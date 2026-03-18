/**
 * Tests for src/lib/email.ts
 * Email notification service: sendFulfillmentEmail
 * Called when Bibles are marked as fulfilled in the admin queue.
 */
import { sendFulfillmentEmail } from "@/lib/email";

// Mock nodemailer (or whichever transport is used)
jest.mock("nodemailer", () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: "test-message-id" }),
  }),
}));

import nodemailer from "nodemailer";

const mockSendMail = (nodemailer.createTransport({}) as any).sendMail as jest.MockedFunction<any>;

describe("sendFulfillmentEmail", () => {
  beforeEach(() => jest.clearAllMocks());

  it("sends an email to the donor when a Bible is fulfilled", async () => {
    await sendFulfillmentEmail({
      donorEmail: "alice@example.com",
      donorName: "Alice",
      recipientName: "Bob Smith",
      recipientCity: "Dallas",
      recipientState: "TX",
      trackingNumber: "1ZTEST123",
      bibleDropId: "bd1",
    });

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const callArgs = mockSendMail.mock.calls[0][0];
    expect(callArgs.to).toBe("alice@example.com");
    expect(callArgs.subject).toMatch(/bible/i);
    expect(callArgs.html).toContain("Bob Smith");
  });

  it("includes tracking number in email when provided", async () => {
    await sendFulfillmentEmail({
      donorEmail: "carol@example.com",
      donorName: "Carol",
      recipientName: "Dave Jones",
      recipientCity: "Austin",
      recipientState: "TX",
      trackingNumber: "1ZTEST999",
      bibleDropId: "bd2",
    });

    const callArgs = mockSendMail.mock.calls[0][0];
    expect(callArgs.html).toContain("1ZTEST999");
  });

  it("sends email without tracking number when not provided", async () => {
    await sendFulfillmentEmail({
      donorEmail: "carol@example.com",
      donorName: "Carol",
      recipientName: "Dave Jones",
      recipientCity: "Austin",
      recipientState: "TX",
      trackingNumber: null,
      bibleDropId: "bd3",
    });

    expect(mockSendMail).toHaveBeenCalledTimes(1);
  });

  it("throws when SMTP transport fails", async () => {
    mockSendMail.mockRejectedValueOnce(new Error("SMTP connection refused"));

    await expect(
      sendFulfillmentEmail({
        donorEmail: "fail@example.com",
        donorName: "Fail User",
        recipientName: "No One",
        recipientCity: "Nowhere",
        recipientState: "TX",
        trackingNumber: null,
        bibleDropId: "bd_fail",
      })
    ).rejects.toThrow("SMTP connection refused");
  });

  it("includes recipient location in email body", async () => {
    await sendFulfillmentEmail({
      donorEmail: "eve@example.com",
      donorName: "Eve",
      recipientName: "Frank Miller",
      recipientCity: "Houston",
      recipientState: "TX",
      trackingNumber: "TRACK007",
      bibleDropId: "bd5",
    });

    const callArgs = mockSendMail.mock.calls[0][0];
    expect(callArgs.html).toContain("Houston");
    expect(callArgs.html).toContain("TX");
  });
});
