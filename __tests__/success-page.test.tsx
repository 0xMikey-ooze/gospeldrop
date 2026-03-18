import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

jest.mock("@/lib/stripe", () => ({
  stripe: {
    checkout: {
      sessions: {
        retrieve: jest.fn(),
      },
    },
  },
}));

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(() => ({ data: null, status: "unauthenticated" })),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("next/navigation", () => ({
  useSearchParams: jest.fn(),
  useRouter: jest.fn(() => ({ push: jest.fn() })),
  usePathname: jest.fn(() => "/donate/success"),
}));

import { stripe } from "@/lib/stripe";
import SuccessDisplay from "@/app/donate/success/SuccessDisplay";
import { getSessionData } from "@/app/donate/success/getSessionData";

describe("SuccessDisplay", () => {
  it("renders donor name and bible count", () => {
    render(
      <SuccessDisplay
        donorName="Sarah"
        bibleCount="5"
        sessionId="cs_test_abcdef12345678"
      />
    );

    expect(screen.getByText("Thank you, Sarah!")).toBeInTheDocument();
    expect(
      screen.getByText(/5 Bible\(s\) on their way to a US household/)
    ).toBeInTheDocument();
  });

  it("shows estimated delivery time", () => {
    render(
      <SuccessDisplay
        donorName="Sarah"
        bibleCount="5"
        sessionId="cs_test_abcdef12345678"
      />
    );

    expect(screen.getByText(/4-6 weeks/)).toBeInTheDocument();
  });

  it("shows order reference from session ID", () => {
    render(
      <SuccessDisplay
        donorName="Sarah"
        bibleCount="5"
        sessionId="cs_test_abcdef12345678"
      />
    );

    expect(screen.getByText(/12345678/)).toBeInTheDocument();
  });

  it("renders Send more Bibles CTA linking to /donate", () => {
    render(
      <SuccessDisplay
        donorName="Sarah"
        bibleCount="5"
        sessionId="cs_test_abcdef12345678"
      />
    );

    const sendMoreLink = screen.getByRole("link", { name: /send more bibles/i });
    expect(sendMoreLink).toHaveAttribute("href", "/donate");
  });

  it("renders Share on Twitter CTA with pre-filled tweet", () => {
    render(
      <SuccessDisplay
        donorName="Sarah"
        bibleCount="5"
        sessionId="cs_test_abcdef12345678"
      />
    );

    const twitterLink = screen.getByRole("link", { name: /share on twitter/i });
    expect(twitterLink).toHaveAttribute("href",
      expect.stringContaining("twitter.com/intent/tweet")
    );
    expect(twitterLink).toHaveAttribute("href",
      expect.stringContaining("5")
    );
    expect(twitterLink).toHaveAttribute("href",
      expect.stringContaining("gospeldrop")
    );
  });
});

describe("getSessionData", () => {
  const mockRetrieve = stripe.checkout.sessions.retrieve as jest.Mock;

  beforeEach(() => {
    mockRetrieve.mockReset();
  });

  it("retrieves stripe session and returns donorName + bibleCount", async () => {
    mockRetrieve.mockResolvedValue({
      metadata: { donorName: "John", quantity: "3" },
      customer_details: { name: "John Doe" },
    });

    const data = await getSessionData("cs_test_abc123");

    expect(mockRetrieve).toHaveBeenCalledWith("cs_test_abc123");
    expect(data).toEqual({
      donorName: "John",
      bibleCount: "3",
    });
  });

  it("falls back to customer_details.name when metadata.donorName is missing", async () => {
    mockRetrieve.mockResolvedValue({
      metadata: { quantity: "2" },
      customer_details: { name: "Jane Smith" },
    });

    const data = await getSessionData("cs_test_xyz");

    expect(data).toEqual({
      donorName: "Jane Smith",
      bibleCount: "2",
    });
  });

  it("falls back to 'Friend' when no name is available", async () => {
    mockRetrieve.mockResolvedValue({
      metadata: { quantity: "1" },
      customer_details: {},
    });

    const data = await getSessionData("cs_test_noname");

    expect(data).toEqual({
      donorName: "Friend",
      bibleCount: "1",
    });
  });

  it("returns null for invalid session", async () => {
    mockRetrieve.mockRejectedValue(new Error("No such checkout session"));

    const data = await getSessionData("cs_invalid");

    expect(data).toBeNull();
  });
});
