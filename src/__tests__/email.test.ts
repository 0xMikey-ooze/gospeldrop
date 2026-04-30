import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendFulfillmentEmail } from "@/lib/email";
import nodemailer from "nodemailer";

const { createTransportMock, sendMailMock } = vi.hoisted(() => ({
  createTransportMock: vi.fn(),
  sendMailMock: vi.fn().mockResolvedValue({ messageId: "test-id" }),
}));

vi.mock("nodemailer", () => ({
  default: {
    createTransport: createTransportMock,
  },
}));

describe("sendFulfillmentEmail", () => {
  beforeEach(() => {
    createTransportMock.mockReset();
    sendMailMock.mockClear();
    createTransportMock.mockReturnValue({ sendMail: sendMailMock });
  });

  it("sends an email with correct recipient and subject for single bible", async () => {
    await sendFulfillmentEmail("test@example.com", "John", 1, "TRK123");

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const call = sendMailMock.mock.calls[0][0];
    expect(call.to).toBe("test@example.com");
    expect(call.subject).toContain("1 Bible");
    expect(call.subject).toContain("shipped");
    expect(call.html).toContain("John");
    expect(call.html).toContain("TRK123");
  });

  it("uses plural form for multiple bibles", async () => {
    await sendFulfillmentEmail("donor@example.com", "Jane", 3);

    const call = sendMailMock.mock.calls[0][0];
    expect(call.subject).toContain("3 Bibles");
    expect(call.subject).toContain("have been shipped");
  });

  it("omits tracking number when not provided", async () => {
    await sendFulfillmentEmail("donor@example.com", "Bob", 1);

    const call = sendMailMock.mock.calls[0][0];
    expect(call.html).not.toContain("Tracking number:");
  });

  it("includes tracking number when provided", async () => {
    await sendFulfillmentEmail("donor@example.com", "Alice", 2, "XYZ-987");

    const call = sendMailMock.mock.calls[0][0];
    expect(call.html).toContain("XYZ-987");
  });
});
