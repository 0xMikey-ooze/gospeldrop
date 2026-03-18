import { sendFulfillmentEmail } from "@/lib/email";
import nodemailer from "nodemailer";

jest.mock("nodemailer");

const mockSendMail = jest.fn().mockResolvedValue({ messageId: "test-id" });
const mockCreateTransport = nodemailer.createTransport as jest.Mock;
mockCreateTransport.mockReturnValue({ sendMail: mockSendMail });

describe("sendFulfillmentEmail", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateTransport.mockReturnValue({ sendMail: mockSendMail });
  });

  it("sends an email with correct recipient and subject for single bible", async () => {
    await sendFulfillmentEmail("test@example.com", "John", 1, "TRK123");

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const call = mockSendMail.mock.calls[0][0];
    expect(call.to).toBe("test@example.com");
    expect(call.subject).toContain("1 Bible");
    expect(call.subject).toContain("shipped");
    expect(call.html).toContain("John");
    expect(call.html).toContain("TRK123");
  });

  it("uses plural form for multiple bibles", async () => {
    await sendFulfillmentEmail("donor@example.com", "Jane", 3);

    const call = mockSendMail.mock.calls[0][0];
    expect(call.subject).toContain("3 Bibles");
    expect(call.subject).toContain("have been shipped");
  });

  it("omits tracking number when not provided", async () => {
    await sendFulfillmentEmail("donor@example.com", "Bob", 1);

    const call = mockSendMail.mock.calls[0][0];
    expect(call.html).not.toContain("Tracking number:");
  });

  it("includes tracking number when provided", async () => {
    await sendFulfillmentEmail("donor@example.com", "Alice", 2, "XYZ-987");

    const call = mockSendMail.mock.calls[0][0];
    expect(call.html).toContain("XYZ-987");
  });
});
