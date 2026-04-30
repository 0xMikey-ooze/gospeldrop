/**
 * Tests for the fulfillment route logic.
 * Verifies that sendFulfillmentEmail is called with the correct signature:
 * (email, name, bibleCount, trackingNumber?)
 */

// Mock dependencies
const mockUpdate = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: {
    bibleDrop: {
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}));

const mockGetServerSession = jest.fn();
jest.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

const mockSendFulfillmentEmail = jest.fn();
jest.mock("@/lib/email", () => ({
  sendFulfillmentEmail: (...args: unknown[]) => mockSendFulfillmentEmail(...args),
}));

// Import after mocks are set
import { POST } from "@/app/api/admin/queue/[id]/fulfill/route";

describe("Fulfillment route POST", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ADMIN_EMAIL = "admin@gospeldrop.org";
  });

  function makeRequest(body = {}) {
    return {
      json: () => Promise.resolve(body),
    } as unknown as Request;
  }

  it("returns 401 when not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await POST(makeRequest(), { params: { id: "drop-1" } });
    expect(res.status).toBe(401);
  });

  it("returns 401 when authenticated but not admin", async () => {
    mockGetServerSession.mockResolvedValue({ user: { email: "user@example.com" } });
    const res = await POST(makeRequest(), { params: { id: "drop-1" } });
    expect(res.status).toBe(401);
  });

  it("calls sendFulfillmentEmail with bibleCount (number), not address object", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { email: "admin@gospeldrop.org" },
    });
    mockUpdate.mockResolvedValue({
      id: "drop-1",
      trackingNumber: "TRK001",
      status: "shipped",
      donation: {
        quantity: 2,
        user: { email: "donor@example.com", name: "Jane" },
      },
      address: {
        name: "Jane",
        line1: "123 Main St",
        city: "Dallas",
        state: "TX",
        zip: "75201",
      },
    });

    await POST(makeRequest({ trackingNumber: "TRK001" }), { params: { id: "drop-1" } });

    expect(mockSendFulfillmentEmail).toHaveBeenCalledTimes(1);
    const [email, name, bibleCount, trackingNumber] = mockSendFulfillmentEmail.mock.calls[0];
    expect(email).toBe("donor@example.com");
    expect(name).toBe("Jane");
    // bibleCount must be a number (from donation.quantity), not an address object
    expect(typeof bibleCount).toBe("number");
    expect(bibleCount).toBe(2);
    expect(trackingNumber).toBe("TRK001");
  });

  it("returns 200 with updated bibleDrop on success", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { email: "admin@gospeldrop.org" },
    });
    const mockDrop = {
      id: "drop-1",
      trackingNumber: null,
      status: "shipped",
      donation: {
        quantity: 1,
        user: { email: "donor@example.com", name: "Bob" },
      },
      address: { name: "Bob", line1: "456 Oak Ave", city: "Austin", state: "TX", zip: "78701" },
    };
    mockUpdate.mockResolvedValue(mockDrop);

    const res = await POST(makeRequest({}), { params: { id: "drop-1" } });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe("drop-1");
  });
});
